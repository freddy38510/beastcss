import path from 'path';
import Beastcss from 'beastcss';
import { validate } from 'schema-utils';
import { Compilation, Compiler, sources } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import type { JSONSchema7 } from 'schema-utils/declarations/ValidationError';

import schema from './schema.json';

export default class BeastcssWebpackPlugin extends Beastcss {
  private compilation!: Compilation;

  private hasCustomFs = false;

  private hasCustomLogger = false;

  constructor(
    options?: Partial<Omit<Beastcss.Options, 'path' | 'publicPath'>>
  ) {
    validate(schema as JSONSchema7, options || {}, {
      name: BeastcssWebpackPlugin.name,
      baseDataPath: 'options',
    });

    super(options);

    if (options && options.fs) {
      this.hasCustomFs = true;
    }

    if (options && options.logger) {
      this.hasCustomLogger = true;
    }
  }

  /**
   * Apply the plugin
   */
  public apply(compiler: Compiler): void {
    // if no logger option was passed, fallback to webpack infrastructure logger
    if (!this.hasCustomLogger) {
      const logger = compiler.getInfrastructureLogger(
        BeastcssWebpackPlugin.name
      );

      (
        Object.keys(this.opts.logger) as (keyof Beastcss.Options['logger'])[]
      ).forEach((level) => {
        this.opts.logger[level] = (msg, processId) =>
          logger[level](`${processId ? `[${processId}] ` : ''}${msg}`);
      });

      this.setVerbosity();
    }

    this.run(compiler);
  }

  protected async getStylesheetSource(stylesheetPath: string) {
    if (this.cachedStylesheetsSource.has(stylesheetPath)) {
      return this.cachedStylesheetsSource.get(stylesheetPath);
    }

    const asset = this.compilation.getAsset(path.basename(stylesheetPath));

    if (asset && asset.source) {
      this.cachedStylesheetsSource.set(
        stylesheetPath,
        Promise.resolve({
          content: asset.source.buffer(),
          size: asset.source.size(),
        })
      );

      return this.cachedStylesheetsSource.get(stylesheetPath);
    }

    return super.getStylesheetSource(stylesheetPath);
  }

  protected async getAdditionalStylesheets() {
    const { default: micromatch } = await import('micromatch');

    const additionalStylesheets: Beastcss.ExternalStylesheet[] = [];

    micromatch(
      Object.keys(this.compilation.assets),
      this.opts.additionalStylesheets,
      {
        cwd: this.opts.path,
        basename: true,
      }
    ).forEach((match: string) => {
      if (this.isExcluded(match)) {
        this.opts.logger.debug(
          `Excluded additional stylesheet "${match}".`,
          this.processId
        );

        return;
      }

      additionalStylesheets.push({
        path: this.getStylesheetPath(match),
        filename: path.basename(match),
      });
    });

    additionalStylesheets.push(...(await super.getAdditionalStylesheets()));

    return additionalStylesheets;
  }

  protected async updateExternalStylesheet(
    stylesheetPath: string,
    css: string
  ) {
    const filename = path.basename(stylesheetPath);

    if (this.compilation.assets[filename]) {
      this.compilation.updateAsset(filename, new sources.RawSource(css));
    } else {
      await super.updateExternalStylesheet(stylesheetPath, css);
    }
  }

  protected async removeExternalStylesheet(stylesheetPath: string) {
    const filename = path.basename(stylesheetPath);

    if (this.compilation.assets[filename]) {
      this.compilation.deleteAsset(filename);
    } else {
      await super.removeExternalStylesheet(stylesheetPath);
    }
  }

  private run(compiler: Compiler) {
    const { name } = BeastcssWebpackPlugin;

    // if no fs option was passed, fallback to webpack output filesystem
    if (!this.hasCustomFs) {
      compiler.hooks.beforeRun.tap(name, (compilerBeforeRun) => {
        this.fs = Beastcss.createFsAdapter(
          compilerBeforeRun.outputFileSystem as unknown as Beastcss.FSLike
        );
      });
    }

    compiler.hooks.afterEmit.tap(name, () => this.clear());

    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      this.compilation = compilation;

      this.opts.path = compilation.outputOptions.path as string;

      this.opts.publicPath = compilation.getPath(
        compilation.outputOptions.publicPath as NonNullable<
          Compilation['outputOptions']['publicPath']
        >
      );

      const hasHtmlWebpackPlugin = compiler.options.plugins.some(
        ({ constructor }) => constructor.name === HtmlWebpackPlugin.name
      );

      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(
        name,
        async (htmlPluginData) => {
          const html = await this.process(
            htmlPluginData.html,
            htmlPluginData.outputName
          );

          htmlPluginData.html = html;

          return htmlPluginData;
        }
      );

      compilation.hooks.processAssets.tapPromise(
        {
          name,
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        async (assets) => {
          const htmlAssets = this.getHtmlAssets(assets);

          if (htmlAssets.length === 0 && !hasHtmlWebpackPlugin) {
            this.opts.logger.warn(
              'Unable to find any HTML asset.',
              this.processId
            );
          }

          await Promise.all(
            htmlAssets.map(async (asset) => {
              const html = await this.process(asset.html, asset.name);

              this.compilation.updateAsset(
                asset.name,
                new sources.RawSource(html)
              );
            })
          );
        }
      );

      if (this.opts.pruneSource) {
        compilation.hooks.processAssets.tapPromise(
          {
            name,
            stage:
              // html-webpack-plugin uses PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
              Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE + 100,
          },
          async () => {
            await this.pruneSources();
          }
        );
      }
    });
  }

  private getHtmlAssets(assets: Compilation['assets']) {
    const htmlAssets: { name: string; html: string }[] = [];

    Object.entries(assets).forEach(([pathname, source]) => {
      if (pathname.match(/\.html$/)) {
        const html = source.source().toString();

        if (html.length === 0) {
          this.opts.logger.warn(
            `Empty HTML asset "${pathname}".`,
            this.processId
          );
        }

        htmlAssets.push({
          name: pathname,
          html,
        });
      }
    });

    return htmlAssets;
  }
}
