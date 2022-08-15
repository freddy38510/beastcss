/* eslint-disable no-console */
const spawn = require('cross-spawn');
const { resolve } = require('path');
const { readdirSync } = require('fs');

const rootDir = resolve(
  __dirname,
  '../packages/beastcss-webpack-plugin/test/webpack-versions'
);

let webpackVersions;

try {
  webpackVersions = readdirSync(rootDir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
} catch (err) {
  console.error(err);
  process.exit(1);
}

webpackVersions.forEach((version) => {
  spawn.sync('yarn', ['install'], {
    cwd: resolve(rootDir, version),
    stdio: 'inherit',
  });
});
