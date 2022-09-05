import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import webpack from 'webpack';
import BeastcssWebpackPlugin from '../src/index';

// returns a promise resolving to the contents of a file
export const readFile = async (file) =>
  fs.promises.readFile(path.resolve(__dirname, file), 'utf8');

/**
 * invoke webpack on a given fixture module, optionally mutating the default configuration
 *
 * @param {string} fixture fixture dir name
 * @param {Function} configDecorator a function to decorate webpack config
 * @returns {Promise<JSON>} webpack Stats formated to json
 */
export async function compile(fixture, configDecorator) {
  const context = path.dirname(path.resolve(__dirname, fixture));

  let config = {
    context,
    mode: 'none',
    target: 'node',
    devtool: 'eval',
    entry: path.resolve(context, path.basename(fixture)),
    output: {
      path: path.resolve(__dirname, path.resolve(context, 'dist')),
      filename: 'bundle.js',
      chunkFilename: '[name].chunk.js',
    },
    module: {
      rules: [],
    },
    plugins: [],
    optimization: {
      minimize: false,
    },
  };

  if (configDecorator) {
    config = configDecorator(config) || config;
  }

  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }

      const info = stats.toJson({
        all: false,
        assets: true,
        version: true,
        errors: true,
        logging: true,
      });

      if (stats.hasErrors()) {
        /*
        stats.compilation.errors.forEach((e) => {
          console.error(e.stack || e);
        });
        */

        return reject(
          new Error(stats.compilation.errors.map((e) => e.stack || e))
        );
      }

      return resolve(info);
    });
  });
}

/**
 * invoke webpack via compile(), applying Beastcss to inline CSS and injecting `html` property into the webpack build info.
 *
 * @param {string} fixture fixture dir name
 * @param {Function} configDecorator a function to decorate webpack config
 * @param {import('beastcss/src/index.d.ts').options} beastcssOptions options to passed to Beastcss
 * @returns {object} returns the compiled html file content and webpack stats formated to JSON
 */
export async function compileToHtml(fixture, configDecorator, beastcssOptions) {
  const info = await compile(`fixtures/${fixture}/index.js`, (config) => {
    configDecorator(config);
    config.plugins.push(
      new BeastcssWebpackPlugin({ logLevel: 'silent', ...beastcssOptions })
    );
  });

  const html = await readFile(`fixtures/${fixture}/dist/index.html`);

  return { info, html };
}

/**
 * Delete the distributable folder from the passed fixture folder
 *
 * @param {string} fixture fixture dir name
 */
export async function cleanDist(fixture) {
  await new Promise((resolve, reject) => {
    try {
      rimraf(path.resolve(__dirname, `fixtures/${fixture}`, 'dist'), resolve);
    } catch (e) {
      reject(e);
    }
  });
}
