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

Create a Beastcss plugin instance with the given options.

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

That's it! Now when you run Webpack, the CSS used by your HTML will be inlined and the imports for your full CSS will be converted to load asynchronously.

## Options

### `external`

Type: `Boolean`

Default `true`

Process external stylesheets.

### `internal`

Type: `Boolean`

Default `true`

Process internal stylesheets.

### `additionalStylesheets`

Type: `Array`

Default `[]`

Array of Glob for matching other stylesheets to be used while looking for critical CSS.

### `externalThreshold`

Type: `Number`

Default `0`

Completely inline external stylesheets smaller than a given size.

### `merge`

Type: `Boolean`

Default `true`

Merged inlined stylesheets into a single `<style></style>` tag.

### `pruneSource`

Type: `Boolean`

Default `false`

Remove inlined rules from the external stylesheet.

### `preloadExternalStylesheets`

Type: `Boolean`

Default `false`

Preload external stylesheets.

### `asyncLoadExternalStylesheets`

Type: `Boolean`

Default `true`

Async load external stylesheets.

### `noscriptFallback`

Type: `Boolean`

Default `true`

Add `<noscript>` fallback to load external stylesheets.

### `exclude`

Type: `Function|Regexp`

Exclude matching external stylesheets from processing.

### `whitelist`

Type: `String[]|Regexp[]`

An array of css selectors to be considered as used rules.

### `fontFace`

Type: `Boolean`

Default: `false`

Inline used @font-face rules.

### `keyframes`

Type: `Boolean`

Default: `false`

Inline used @keyframes rules.

### `logLevel`

Type: `String`

Default: `'info'`

Set the printed output verbosity. See [available levels](#log-Level).

### `logger`

Type: `Object`

Provide a custom logger interface.

## Log Level

Controls the printed output verbosity. Specifies the level the logger should use. A logger will
not produce output for any log level beneath the specified level. Available levels and order
are:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `silent`

## Custom Logger Interface

```typescript
interface Logger {
  info: (msg: string, id?: string) => void;
  warn: (msg: string, id?: string) => void;
  error: (msg: string, id?: string) => void;
  trace: (msg: string, id?: string) => void;
  debug: (msg: string, id?: string) => void;
}
```
