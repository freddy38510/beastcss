# Beastcss Webpack Plugin

> Inline critical CSS and async load the rest.

## Installation

```sh
npm i -D beastcss-webpack-plugin
```

or

```sh
yarn add -D beastcss-webpack-plugin
```

or

```sh
pnpm add -D beastcss-webpack-plugin
```

## Usage

```js
// webpack.config.js
const BeastcssWebpackPlugin = require('beastcss-webpack-plugin');

module.exports = {
  plugins: [
    new BeastcssWebpackPlugin({
      // optional configuration (see below)
    }),
  ],
};
```

## Options

The Webpack plugin supports the same [options](../beastcss/README.md#options) as the standalone [beastcss package](../beastcss).
