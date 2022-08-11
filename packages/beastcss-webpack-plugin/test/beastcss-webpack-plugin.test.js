/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import path from 'path';
import { JSDOM } from 'jsdom';

import {
  getAvailableWebpackVersions,
  readFile,
  compileToHtml,
  cleanDist,
} from './_helpers';

const webpackVersions = getAvailableWebpackVersions();

const HtmlWebpackPlugin = [];
const MiniCssExtractPlugin = [];

webpackVersions.forEach((version) => {
  try {
    HtmlWebpackPlugin[
      version
    ] = require(`./webpack-versions/${version}/node_modules/html-webpack-plugin`);
  } catch (err) {
    throw new Error(
      `Error requiring html-webpack-plugin ${version}:\n${err}\n\n` +
        'Try running "yarn install-test-webpack-versions".'
    );
  }

  try {
    MiniCssExtractPlugin[
      version
    ] = require(`./webpack-versions/${version}/node_modules/mini-css-extract-plugin`);
  } catch (err) {
    throw new Error(
      `Error requiring mini-css-extract-plugin ${version}:\n${err}\n\n` +
        'Try running "yarn install-test-webpack-versions".'
    );
  }
});

/**
 * Webpack configuration options
 *
 * @param {object} config webpack configuration
 * @param {string} version webpack version
 */
function configure(config, version) {
  config.module.rules.push({
    test: /\.css$/,
    use: [
      MiniCssExtractPlugin[version].loader,
      path.resolve(
        __dirname,
        'webpack-versions/',
        version,
        'node_modules/css-loader'
      ),
    ],
  });
  config.plugins.push(
    new MiniCssExtractPlugin[version]({
      filename: '[name].css',
      chunkFilename: '[name].chunk.css',
    }),
    new HtmlWebpackPlugin[version]({
      filename: 'index.html',
      template: 'index.html',
      inject: true,
      minify: false,
    })
  );
}

describe('Beastcss Webpack Plugin', () => {
  describe.each(webpackVersions)('webpack compilation', (version) => {
    describe(`webpack@${version}`, () => {
      let info;
      let html;

      beforeAll(async () => {
        ({ info, html } = await compileToHtml('basic', configure, version));
      });

      afterAll(async () => {
        await cleanDist('basic');
      });

      it('should have compiled with correct webpack version', () => {
        expect(info.version).toBe(version);
      });

      it('should have compiled 2 assets', () => {
        expect(info.assets).toHaveLength(2);
      });

      it('should match html snapshot', () => {
        expect(html).toMatchSnapshot();
      });
    });
  });

  describe.each(webpackVersions)('Without html-webpack-plugin', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let window;
      let document;

      beforeAll(async () => {
        ({ html } = await compileToHtml(
          'raw',
          (config) => {
            config.module.rules.push(
              {
                test: /\.css$/,
                loader: path.resolve(
                  __dirname,
                  'webpack-versions/',
                  version,
                  'node_modules/css-loader'
                ),
              },
              {
                test: /\.html$/,
                loader: 'file-loader',
                options: {
                  name: '[name].[ext]',
                },
              }
            );
          },
          version
        ));
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
  });

  describe.each(webpackVersions)('additional stylesheets', (version) => {
    describe(`webpack@${version}`, () => {
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
          version,
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
  });

  describe.each(webpackVersions)('Internal stylesheets', (version) => {
    describe(`webpack@${version}`, () => {
      afterAll(async () => {
        await cleanDist('basic');
        await cleanDist('unused');
      });

      it('should remove unused rules', async () => {
        const { html } = await compileToHtml('basic', configure, version);

        expect(html).not.toMatch(/\.extra-style/);
        expect(html).toMatchSnapshot();
      });

      it('should remove entire unused internal stylesheets', async () => {
        const { html } = await compileToHtml('unused', configure, version);
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
  });

  describe.each(webpackVersions)('External stylesheets', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let window;

      beforeAll(async () => {
        ({ html } = await compileToHtml('external', configure, version, {
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
  });

  describe.each(webpackVersions)('publicPath', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let window;
      let document;

      beforeAll(async () => {
        ({ html } = await compileToHtml(
          'external',
          (config) => {
            configure(config, version);
            config.output.publicPath = '/_public/';
          },
          version,
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
  });

  describe.each(webpackVersions)('preloadExternalStylesheets', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let window;
      let document;

      beforeAll(async () => {
        ({ html } = await compileToHtml('external', configure, version, {
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
  });

  describe.each(webpackVersions)('externalThreshold', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let window;
      let document;

      beforeAll(async () => {
        ({ html } = await compileToHtml('external', configure, version, {
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
  });

  describe.each(webpackVersions)('keyframes', (version) => {
    describe('by default', () => {
      describe(`webpack@${version}`, () => {
        let html;

        beforeAll(async () => {
          ({ html } = await compileToHtml('keyframes', configure, version));
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
    });

    describe("set to 'false'", () => {
      describe(`webpack@${version}`, () => {
        let html;

        beforeAll(async () => {
          ({ html } = await compileToHtml('keyframes', configure, version, {
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
  });

  describe.each(webpackVersions)('fontFace', (version) => {
    describe('by default', () => {
      describe(`webpack@${version}`, () => {
        let html;

        beforeAll(async () => {
          ({ html } = await compileToHtml('font-face', configure, version));
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
    });

    describe("set to 'true'", () => {
      describe(`webpack@${version}`, () => {
        let html;

        beforeAll(async () => {
          ({ html } = await compileToHtml('font-face', configure, version, {
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
  });

  describe.each(webpackVersions)('prune source on multiple html', (version) => {
    describe(`webpack@${version}`, () => {
      let html;
      let html2;
      let css;

      beforeAll(async () => {
        ({ html } = await compileToHtml(
          'multiple',
          (config) => {
            configure(config, version);
            config.plugins.push(
              new HtmlWebpackPlugin[version]({
                filename: 'index2.html',
                template: 'index2.html',
                inject: true,
                minify: false,
              })
            );
          },
          version,
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
  });

  describe.each(webpackVersions)(
    'prune source on multiple html without html-webpack-plugin',
    (version) => {
      describe(`webpack@${version}`, () => {
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
            version,
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
    }
  );

  describe.each(webpackVersions)('webpack logging', (version) => {
    describe(`webpack@${version}`, () => {
      let info;

      beforeAll(async () => {
        ({ info } = await compileToHtml('basic', configure, version));
      });

      afterAll(async () => {
        await cleanDist('basic');
      });

      it('should output logging in webpack logging stats', () => {
        expect(info.logging['beastcss-webpack-plugin']).not.toBeNull();
        expect(info.logging['beastcss-webpack-plugin'].entries).toHaveLength(2);
      });
    });
  });
});
