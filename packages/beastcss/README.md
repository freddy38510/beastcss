# Beastcss

> Inline critical CSS and async load the rest.

## Installation

```sh
npm i -D beastcss
```

or

```sh
yarn add -D beastcss
```

## Usage

Create a Beastcss instance with the given options.

Then call the async `process(html)` method with a HTML string as parameter.

```js
const Beastcss = require('beastcss');

const beastcss = new Beastcss({
  // optional configuration (see below)
});

(async () => {
  const processedHTML = await beastcss.process(originalHTML);
})();
```

That's it! The resultant html will have its critical CSS inlined and the stylesheets async loaded.

### Prune Source

Process one or multiple html strings then call the `pruneSources()` method to remove critical css from your external stylesheets files.

```js
const Beastcss = require('beastcss');

const beastcss = new Beastcss({
  pruneSource: true,
  // ... others options
});

(async () => {
  const processedHTML = await beastcss.process(originalHTML);

  const processedHTML2 = await beastcss.process(originalHTML2);

  const processedHTML3 = await beastcss.process(originalHTML3);

  await beastcss.pruneSources();
})();
```

## Options

### `path`

Type: `String`

Default: `''`

Base path location of the CSS files.

### `publicPath`

Type: `String`

Default: `''`

Public path of the CSS resources. This prefix is removed from the href attribute.

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

### `fs`

Type: `Object`

Filesystem to be used when reading/writing to external stylesheets files.

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
