import Beastcss from 'beastcss';
import { validate } from 'schema-utils';
import schema from './schema.json';

const PLUGIN_NAME = 'beastcss-webpack-plugin';

const privateCompilation = new WeakMap();

const privateSources = new WeakMap();

export default class BeastcssWebpackPlugin extends Beastcss {
  constructor(options) {
    validate(schema, options, {
      name: PLUGIN_NAME,
      baseDataPath: 'options',
    });

    super(options);
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
   * @returns {import('webpack/sources')} Webpack Sources
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
    this.sources =
      (compiler.webpack && compiler.webpack.sources) ||
      // eslint-disable-next-line global-require
      require('webpack-sources');

    this.options.path = compiler.options.output.path;
    this.options.publicPath = compiler.options.output.publicPath || '';

    this.run(compiler);
  }

  run(compiler) {
    const isWebpack5 =
      (compiler.webpack && compiler.webpack.version.startsWith('5')) || false;

    const HtmlWebpackPlugins = compiler.options.plugins.filter(
      ({ constructor }) => constructor.name === 'HtmlWebpackPlugin'
    );

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.compilation = compilation;
      this.fs = compilation.outputFileSystem;
      this.logger = compilation.getLogger
        ? compilation.getLogger(PLUGIN_NAME)
        : this.logger;

      // free memory / is it really necessary ?
      // TODO: check if beastcss instance still exists
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => this.clear());

      // html-webpack-plugin beforeEmit hook
      HtmlWebpackPlugins.forEach((HtmlWebpackPlugin) => {
        HtmlWebpackPlugin.constructor
          .getHooks(compilation)
          .beforeEmit.tapPromise(PLUGIN_NAME, async (htmlPluginData) => {
            try {
              const html = await this.process(
                htmlPluginData.html,
                htmlPluginData.outputName
              );

              htmlPluginData.html = html;
            } catch (e) {
              compilation.errors.push(e);

              return htmlPluginData;
            }

            return htmlPluginData;
          });
      });

      if (HtmlWebpackPlugins.length === 0) {
        if (isWebpack5) {
          // Webpack5 processAssets (PROCESS_ASSETS_STAGE_OPTIMIZE) hook
          compilation.hooks.processAssets.tapPromise(
            {
              name: PLUGIN_NAME,
              stage: compilation.constructor.PROCESS_ASSETS_STAGE_OPTIMIZE,
            },
            async (assets) => this.runWithoutHtmlWebpackPlugin(assets)
          );

          return;
        }

        // Webpack4 compilation.optimizeAssets hook
        compilation.hooks.optimizeAssets.tapPromise(
          PLUGIN_NAME,
          async (assets) => this.runWithoutHtmlWebpackPlugin(assets)
        );

        return;
      }

      if (this.options.pruneSource) {
        if (isWebpack5) {
          // Webpack5 processAssets (PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE) hook
          compilation.hooks.processAssets.tapPromise(
            {
              name: PLUGIN_NAME,
              stage: compilation.constructor.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
            },
            async () => this.pruneSources()
          );

          return;
        }

        // Webpack4 compiler.emit hook
        compiler.hooks.emit.tapPromise(PLUGIN_NAME, async () =>
          this.pruneSources()
        );
      }
    });
  }

  async runWithoutHtmlWebpackPlugin(assets) {
    try {
      const htmlAssets = this.findHtmlAssets(assets);

      await Promise.all(
        htmlAssets.map(async (htmlAsset) => {
          const html = await this.process(
            htmlAsset.html.toString(),
            htmlAsset.name
          );

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

  findHtmlAssets(assets) {
    const htmlAssets = [];

    Object.keys(assets).forEach((asset) => {
      if (asset.match(/\.html$/)) {
        const html = this.compilation.getAsset(asset).source.source();

        if (!html) {
          throw Error('Empty HTML asset.');
        }

        htmlAssets.push({
          name: asset,
          html,
        });
      }
    });

    if (htmlAssets.length === 0) {
      throw Error('Could not find HTML asset.');
    }

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
        await this.fs.removeFile(stylesheet.path);
      }
    }
  }
}
