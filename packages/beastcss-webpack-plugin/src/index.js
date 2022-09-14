import Beastcss from 'beastcss';
import { validate } from 'schema-utils';
import { setVerbosity } from 'beastcss/src/helpers/log';
import schema from './schema.json';

const privateCompilation = new WeakMap();

const privateSources = new WeakMap();

export default class BeastcssWebpackPlugin extends Beastcss {
  constructor(options) {
    validate(schema, options, {
      name: BeastcssWebpackPlugin.name,
      baseDataPath: 'options',
    });

    super(options);

    this.processedAssets = new Set();
  }

  /**
   * @private
   * @returns {import('webpack').Compilation} Webpack Compilation
   */
  get compilation() {
    if (privateCompilation.has(this)) {
      return privateCompilation.get(this);
    }

    throw new Error('compilation is undefined.');
  }

  set compilation(compilation) {
    privateCompilation.set(this, compilation);
  }

  /**
   * @private
   * @returns {import('webpack').sources} Webpack Sources
   */
  get sources() {
    if (privateSources.has(this)) {
      return privateSources.get(this);
    }

    throw new Error('sources is undefined.');
  }

  set sources(sources) {
    privateSources.set(this, sources);
  }

  /** @param {import("webpack").Compiler} compiler Webpack Compiler */
  apply(compiler) {
    this.sources = compiler.webpack.sources;

    this.options.path = compiler.options.output.path;
    this.options.publicPath = compiler.options.output.publicPath || '';

    const logger = compiler.getInfrastructureLogger(BeastcssWebpackPlugin.name);

    this.logger = setVerbosity(
      Object.fromEntries(
        Object.entries(this.logger).map(([level]) => [
          level,
          (msg, processId) =>
            logger[level](`${processId ? `[${processId}] ` : ''}${msg}`),
        ])
      ),

      this.options.logLevel
    );

    this.run(compiler);
  }

  run(compiler) {
    const { name } = BeastcssWebpackPlugin;
    const htmlWebpackPlugins = compiler.options.plugins.filter(
      ({ constructor }) => constructor.name === 'HtmlWebpackPlugin'
    );

    compiler.hooks.afterEmit.tap(name, () => this.clear());

    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      this.compilation = compilation;
      this.fs = Beastcss.createFsAdapter(compiler.outputFileSystem);

      htmlWebpackPlugins.forEach((HtmlWebpackPlugin) => {
        HtmlWebpackPlugin.constructor
          .getHooks(compilation)
          .beforeEmit.tapPromise(name, async (htmlPluginData) => {
            if (this.processedAssets.has(htmlPluginData.outputName)) {
              return htmlPluginData;
            }

            try {
              const html = await this.process(
                htmlPluginData.html,
                htmlPluginData.outputName
              );

              this.processedAssets.add(htmlPluginData.outputName);

              htmlPluginData.html = html;
            } catch (e) {
              compilation.errors.push(e);

              return htmlPluginData;
            }

            return htmlPluginData;
          });
      });

      compilation.hooks.processAssets.tapPromise(
        {
          name,
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        async (assets) => {
          try {
            const htmlAssets = this.findHtmlAssets(assets);

            if (htmlAssets.length === 0 && htmlWebpackPlugins.length === 0) {
              this.logger.warn('Could not find any HTML asset.');
            }

            await Promise.all(
              htmlAssets.map(async (htmlAsset) => {
                if (this.processedAssets.has(htmlAsset.name)) {
                  return;
                }

                const html = await this.process(
                  htmlAsset.html.toString(),
                  htmlAsset.name
                );

                this.processedAssets.add(htmlAsset.name);

                this.compilation.updateAsset(
                  htmlAsset.name,
                  new this.sources.RawSource(html)
                );
              })
            );

            if (this.options.pruneSource) {
              await this.pruneSources();
            }
          } catch (e) {
            this.compilation.errors.push(e);
          }
        }
      );

      if (this.options.pruneSource) {
        compilation.hooks.processAssets.tapPromise(
          {
            name,
            // html-webpack-plugin uses PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
            stage:
              compilation.constructor.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE +
              100,
          },
          async () => this.pruneSources()
        );
      }
    });
  }

  findHtmlAssets(assets) {
    const htmlAssets = [];

    Object.keys(assets).forEach((asset) => {
      if (asset.match(/\.html$/)) {
        const html = this.compilation.getAsset(asset).source.source();

        if (!html) {
          this.logger.warn('Empty HTML asset', asset);

          return;
        }

        htmlAssets.push({
          name: asset,
          html,
        });
      }
    });

    return htmlAssets;
  }

  async getStylesheetSource(stylesheet, processId) {
    if (this.cachedStylesheetsSource.has(stylesheet.name)) {
      return this.cachedStylesheetsSource.get(stylesheet.name);
    }

    const asset = this.compilation.getAsset(stylesheet.name);

    if (asset && asset.source) {
      this.cachedStylesheetsSource.set(stylesheet.name, {
        content: asset.source.source().toString(),
        size: asset.source.size(),
      });

      return this.cachedStylesheetsSource.get(stylesheet.name);
    }

    const promise = (async () => {
      try {
        const content = await this.fs.readFile(stylesheet.path);

        return {
          content,
          size: Buffer.byteLength(content),
        };
      } catch (e) {
        this.logger.warn(
          `Unable to locate stylesheet: ${stylesheet.path}`,
          processId
        );

        return undefined;
      }
    })();

    this.cachedStylesheetsSource.set(stylesheet.name, promise);

    return promise;
  }

  async getAdditionalStylesheets() {
    // eslint-disable-next-line global-require
    const micromatch = require('micromatch');

    const additionalStylesheets = [];

    if (this.options.additionalStylesheets.length > 0) {
      await Promise.all(
        micromatch(
          Object.keys(this.compilation.assets),
          this.options.additionalStylesheets,
          {
            basename: true,
            posixSlashes: true,
          }
        ).map(async (name) => {
          const stylesheet = {
            path: this.getStylesheetPath(name),
            name,
          };

          additionalStylesheets.push(stylesheet);
        })
      );
    }

    return additionalStylesheets;
  }

  async updateStylesheet(stylesheet, css) {
    if (this.compilation.assets[stylesheet.name]) {
      this.compilation.updateAsset(
        stylesheet.name,
        new this.sources.RawSource(css) // TODO: add sourceMap
      );
    } else {
      await this.fs.writeFile(stylesheet.path, css);
    }
  }

  async removeStylesheet(stylesheet) {
    if (stylesheet.link) {
      stylesheet.link.remove();

      if (this.compilation.assets[stylesheet.name]) {
        delete this.compilation.assets[stylesheet.name];
      } else {
        await this.fs.unlink(stylesheet.path);
      }
    }
  }

  clear() {
    super.clear();

    this.processedAssets.clear();
  }
}
