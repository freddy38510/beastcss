import { JSDOM } from 'jsdom';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { readFile, compileToHtml, cleanDist } from './_helpers';
import BeastcssWebpackPlugin from '../src';

/**
 * Webpack configuration options
 *
 * @param {object} config webpack configuration
 */
function configure(config) {
  config.module.rules.push({
    test: /\.css$/,
    use: [MiniCssExtractPlugin.loader, 'css-loader'],
  });
  config.plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[name].chunk.css',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true,
      minify: false,
    })
  );
}

describe('Beastcss Webpack Plugin', () => {
  describe('webpack compilation', () => {
    let info;
    let html;

    beforeAll(async () => {
      ({ info, html } = await compileToHtml('basic', configure));
    });

    afterAll(async () => {
      await cleanDist('basic');
    });

    it('should have compiled 2 assets', () => {
      expect(info.assets).toHaveLength(2);
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('Without html-webpack-plugin', () => {
    let html;
    let window;
    let document;

    beforeAll(async () => {
      ({ html } = await compileToHtml('raw', (config) => {
        config.module.rules.push(
          {
            test: /\.css$/,
            loader: 'css-loader',
          },
          {
            test: /\.html$/,
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          }
        );
      }));
      ({ window } = new JSDOM(html));
      ({ document } = window);
    });

    afterAll(async () => {
      await cleanDist('raw');
      if (window) {
        window.close();
      }
    });

    it('should insert used css to internal', () => {
      expect(document.getElementById('used')).not.toBeNull();
    });

    it('should omit unsed css', () => {
      expect(document.getElementById('unused')).toBeNull();
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('additional stylesheets', () => {
    let html;
    let window;
    let document;

    beforeAll(async () => {
      ({ html } = await compileToHtml(
        'raw',
        (config) => {
          config.module.rules.push({
            test: /\.html|css$/,
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          });
        },
        {
          additionalStylesheets: ['**/additional.css'],
        }
      ));
      window = new JSDOM(html).window;
      document = window.document;
    });

    afterAll(async () => {
      await cleanDist('raw');
      if (window) {
        window.close();
      }
    });

    it('should insert used css to internal', () => {
      expect(document.getElementById('used')).not.toBeNull();
      expect(document.getElementById('used').textContent).toBe(
        'h1{color: green;}.additional{background: red;}'
      );
    });

    it('should omit unsed css', () => {
      expect(document.getElementById('unused')).toBeNull();
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('Internal stylesheets', () => {
    afterAll(async () => {
      await cleanDist('basic');
      await cleanDist('unused');
    });

    it('should remove unused rules', async () => {
      const { html } = await compileToHtml('basic', configure);

      expect(html).not.toMatch(/\.extra-style/);
      expect(html).toMatchSnapshot();
    });

    it('should remove entire unused internal stylesheets', async () => {
      const { html } = await compileToHtml('unused', configure);
      const { window } = new JSDOM(html);
      const { document } = window;

      expect(document.querySelectorAll('style')).toHaveLength(1);
      expect(document.getElementById('unused')).toBeNull();
      expect(document.getElementById('used')).not.toBeNull();
      expect(document.getElementById('used').textContent).toMatchSnapshot();

      if (window) {
        window.close();
      }
    });
  });

  describe('External stylesheets', () => {
    let html;
    let window;

    beforeAll(async () => {
      ({ html } = await compileToHtml('external', configure, {
        pruneSource: true,
      }));
    });

    afterAll(async () => {
      await cleanDist('external');

      if (window) {
        window.close();
      }
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch(/ul\.navbar\s*\{/);
    });

    it('should omit unsed css', () => {
      expect(html).not.toMatch(/\.extra-style/);
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link href="main.css" rel="stylesheet" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });

    it('should prune external stylesheet', async () => {
      const externalCss = await readFile('fixtures/external/dist/main.css');

      expect(externalCss).toMatch(/\.extra-style\s*\{/);
      expect(externalCss).toMatchSnapshot();
    });
  });

  describe('publicPath', () => {
    let html;
    let window;
    let document;

    beforeAll(async () => {
      ({ html } = await compileToHtml(
        'external',
        (config) => {
          configure(config);
          config.output.publicPath = '/_public/';
        },
        {
          pruneSource: true,
        }
      ));
      ({ window } = new JSDOM(html));
      ({ document } = window);
    });

    afterAll(async () => {
      await cleanDist('external');
      if (window) {
        window.close();
      }
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch(/ul\.navbar\s*\{/);
    });

    it('should omit unsed css', () => {
      expect(html).not.toMatch(/\.extra-style/);
    });

    it('should reference from publicPath', () => {
      const link = document.querySelector('link[rel="stylesheet"]');

      expect(link).not.toBeNull();
      expect(link).toHaveProperty('href');
      expect(link.getAttribute('href')).toBe('/_public/main.css');
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });

    it('should prune external sheet', async () => {
      const externalCss = await readFile('fixtures/external/dist/main.css');

      expect(externalCss).toMatch(/\.extra-style\s*\{/);
      expect(externalCss).toMatchSnapshot();
    });
  });

  describe('preloadExternalStylesheets', () => {
    let html;
    let window;
    let document;

    beforeAll(async () => {
      ({ html } = await compileToHtml('external', configure, {
        preloadExternalStylesheets: true,
      }));
      ({ window } = new JSDOM(html));
      ({ document } = window);
    });

    afterAll(async () => {
      await cleanDist('external');
      if (window) {
        window.close();
      }
    });

    it('should omit unsed css', () => {
      expect(html).not.toMatch(/\.extra-style/);
    });

    it('should place a link rel="preload" in <head>', () => {
      const preload = document.querySelector('link[rel="preload"]');

      expect(preload).not.toBeNull();
      expect(preload).toHaveProperty('href');
      expect(preload.getAttribute('href')).toBe('main.css');
      expect(preload.parentNode).toBe(document.head);
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link href="main.css" rel="stylesheet" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('externalThreshold', () => {
    let html;
    let window;
    let document;

    beforeAll(async () => {
      ({ html } = await compileToHtml('external', configure, {
        externalThreshold: 10000,
      }));
      ({ window } = new JSDOM(html));
      ({ document } = window);
    });

    afterAll(async () => cleanDist('external'));

    it('should fully insert stylesheets below the given size to internal', () => {
      expect(document.querySelectorAll('style')).toHaveLength(1);
      expect(html).toMatch(/\.extra-style/);
    });
  });

  describe('keyframes', () => {
    describe('by default', () => {
      let html;

      beforeAll(async () => {
        ({ html } = await compileToHtml('keyframes', configure));
      });

      afterAll(async () => {
        await cleanDist('keyframes');
      });

      it('should insert used @keyframes to internal', () => {
        expect(html).toMatch(/@keyframes present/);
      });

      it('should omit unsed @keyframes', () => {
        expect(html).not.toMatch(/@keyframes not-present/);
      });
    });

    describe("set to 'false'", () => {
      let html;

      beforeAll(async () => {
        ({ html } = await compileToHtml('keyframes', configure, {
          keyframes: false,
        }));
      });

      afterAll(async () => {
        await cleanDist('keyframes');
      });

      it('should not insert used @keyframes to internal', () => {
        expect(html).not.toMatch(/@keyframes present/);
      });

      it('should not insert unsed @keyframes to internal', () => {
        expect(html).not.toMatch(/@keyframes not-present/);
      });
    });
  });

  describe('fontFace', () => {
    describe('by default', () => {
      let html;

      beforeAll(async () => {
        ({ html } = await compileToHtml('font-face', configure));
        // console.log(html);
      });

      afterAll(async () => {
        await cleanDist('font-face');
      });

      it('should not insert used @font-face to internal', () => {
        expect(html).not.toMatch(/@font-face.*Present/);
      });

      it('should not insert unused @font-face', () => {
        expect(html).not.toMatch(/@font-face.*NotPresent/);
      });
    });

    describe("set to 'true'", () => {
      let html;

      beforeAll(async () => {
        ({ html } = await compileToHtml('font-face', configure, {
          fontFace: true,
        }));
      });

      afterAll(async () => {
        await cleanDist('font-face');
      });

      it('should insert used @font-face to internal', () => {
        expect(html).toMatch(/@font-face.*Present/);
      });

      it('should not insert unsed @font-face to internal', () => {
        expect(html).not.toMatch(/@font-face.*NotPresent/);
      });
    });
  });

  describe('prune source on multiple html', () => {
    let html;
    let html2;
    let css;

    beforeAll(async () => {
      ({ html } = await compileToHtml(
        'multiple',
        (config) => {
          configure(config);
          config.plugins.push(
            new HtmlWebpackPlugin({
              filename: 'index2.html',
              template: 'index2.html',
              inject: true,
              minify: false,
            })
          );
        },
        {
          pruneSource: true,
        }
      ));

      html2 = await readFile('fixtures/multiple/dist/index2.html');

      css = await readFile('fixtures/multiple/dist/main.css');
    });

    afterAll(async () => {
      await cleanDist('multiple');
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch(/ul\.navbar\s*\{/);
      expect(html2).toMatch(/ul\.navbar\s*\{/);
    });

    it('should omit unsed css', () => {
      expect(html).not.toMatch(/\.extra-style/);
      expect(html2).not.toMatch(/\.extra-style/);
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });

    it('should match html2 snapshot', () => {
      expect(html2).toMatchSnapshot('test');
    });

    it('should match stylesheet snapshot', () => {
      expect(css).toMatchSnapshot();
    });
  });

  describe('prune source on multiple html without html-webpack-plugin', () => {
    let html;
    let html2;
    let css;

    beforeAll(async () => {
      ({ html } = await compileToHtml(
        'rawMultiple',
        (config) => {
          config.module.rules.push({
            test: /\.html|css$/,
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          });
        },
        { pruneSource: true }
      ));

      html2 = await readFile('fixtures/rawMultiple/dist/index2.html');

      css = await readFile('fixtures/rawMultiple/dist/style.css');
    });

    afterAll(async () => {
      await cleanDist('rawMultiple');
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch(/ul\.navbar\s*\{/);
      expect(html2).toMatch(/ul\.navbar\s*\{/);
    });

    it('should omit unsed css', () => {
      expect(html).not.toMatch(/\.extra-style/);
      expect(html2).not.toMatch(/\.extra-style/);
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });

    it('should match html2 snapshot', () => {
      expect(html2).toMatchSnapshot('test');
    });

    it('should match stylesheet snapshot', () => {
      expect(css).toMatchSnapshot();
    });
  });

  describe('webpack logging', () => {
    let spyTrace;
    let spyDebug;
    let spyInfo;
    let spyWarn;
    let spyError;

    beforeAll(async () => {
      await compileToHtml(
        'basic',
        (config) => {
          configure(config);

          config.plugins.push({
            apply: (compiler) => {
              const getLogger = compiler.getInfrastructureLogger.bind(compiler);

              compiler.getInfrastructureLogger = jest.fn((name) => {
                const logger = getLogger(name);

                if (name === BeastcssWebpackPlugin.name) {
                  spyTrace = jest.spyOn(logger, 'trace').mockImplementation();
                  spyDebug = jest.spyOn(logger, 'debug').mockImplementation();
                  spyInfo = jest.spyOn(logger, 'info').mockImplementation();
                  spyWarn = jest.spyOn(logger, 'warn').mockImplementation();
                  spyError = jest.spyOn(logger, 'error').mockImplementation();
                }

                return logger;
              });
            },
          });
        },
        { logLevel: 'info' }
      );
    });

    afterAll(async () => {
      await cleanDist('basic');

      jest.restoreAllMocks();
    });

    it('should output logging with correct formatting', () => {
      expect(spyTrace).not.toHaveBeenCalled();
      expect(spyDebug).not.toHaveBeenCalled();
      expect(spyInfo).toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
      expect(spyError).not.toHaveBeenCalled();
      expect(spyInfo.mock.calls[0][0]).toMatch(/^\[index\.html\] (.*)/);
    });
  });
});
