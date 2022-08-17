/* eslint-disable import/no-dynamic-require */
import fs, { readdirSync } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import memoized from 'nano-memoize';
import CachedInputFileSystem from 'enhanced-resolve/lib/CachedInputFileSystem';
import BeastcssWebpackPlugin from '../src/index';

export const getAvailableWebpackVersions = memoized(() =>
  readdirSync(path.resolve(__dirname, 'webpack-versions'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((dir) => dir.name)
);

// returns a promise resolving to the contents of a file
export const readFile = async (file) =>
  fs.promises.readFile(path.resolve(__dirname, file), 'utf8');

/**
 * invoke webpack on a given fixture module, optionally mutating the default configuration
 *
 * @param {string} fixture fixture dir name
 * @param {Function} configDecorator a function to decorate webpack config
 * @param {string} version webpack version
 * @returns {Promise<JSON>} webpack Stats formated to json
 */
export async function compile(fixture, configDecorator, version) {
  if (version === undefined || version === null) {
    throw new Error('Webpack version is not specified');
  }

  if (!getAvailableWebpackVersions().includes(version)) {
    throw new Error(
      `Webpack version "${version}" is not available for testing`
    );
  }

  let webpack;

  try {
    // eslint-disable-next-line global-require
    webpack = require(`./webpack-versions/${version}/node_modules/webpack`);
  } catch (err) {
    throw new Error(
      `Error requiring Webpack ${version}:\n${err}\n\n` +
        'Try running "pnpm install".'
    );
  }

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
    config = configDecorator(config, version) || config;
  }

  const compiler = webpack(config);

  if (version.startsWith('4')) {
    // fix worker process that failed to exit gracefully
    compiler.inputFileSystem = new CachedInputFileSystem(fs, 60000);
  }

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
 * @param {string} version webpack version
 * @param {import('beastcss/src/index.d.ts').options} beastcssOptions options to passed to Beastcss
 * @returns {object} returns the compiled html file content and webpack stats formated to JSON
 */
export async function compileToHtml(
  fixture,
  configDecorator,
  version,
  beastcssOptions = {}
) {
  const info = await compile(
    `fixtures/${fixture}/index.js`,
    (config) => {
      configDecorator(config, version);
      config.plugins.push(new BeastcssWebpackPlugin(beastcssOptions));
    },
    version
  );

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
