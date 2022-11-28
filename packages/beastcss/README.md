# Beastcss

> Inline critical CSS and asynchronous load the rest.

## Installation

```sh
npm i -D beastcss
```

or

```sh
yarn add -D beastcss
```

or

```sh
pnpm add -D beastcss
```

## Usage

```js
import fs from 'fs/promises';
import Beastcss from 'beastcss';

const beastcss = new Beastcss({
  // optional configuration (see below).
});

(async () => {
  // get the html string to process
  const html = await fs.readFile('index.html', 'utf-8');

  // call the process method of the previously instantiated Beastcss class
  const processedHTML = await beastcss.process(html);

  // do something with the processed html string
  await fs.writeFile('index.html', processedHTML, 'utf-8');
})();
```

The resulting HTML string will have its critical CSS inlined and any corresponding external stylesheet links tweaked to be loaded asynchronously by a browser.

### Prune Source

Process one or more html strings then call the `pruneSources()` method to remove critical css from external stylesheet files.

```js
const Beastcss = require('beastcss');

const beastcss = new Beastcss({
  pruneSource: true, // required
  // ... others options
});

(async () => {
  // process html strings sequentially
  const processedHtml = await beastcss.process(html);
  const processedHtml2 = await beastcss.process(html2);
  const processedHtml3 = await beastcss.process(html3);

  // or process html strings in parallel
  const processedHtmls = await Promise.all([
    beastcss.process(html),
    beastcss.process(html2),
    beastcss.process(html3),
  ]);

  // Remove critical css from external stylesheets
  await beastcss.pruneSources();
})();
```

## API Reference

### process(html)

Apply critical CSS processing to the html.

```typescript
async function process(
  html: string,
  processId?: string | number
): Promise<string>;
```

> Notes: `processId` parameter is passed to the logger. It helps to identify logging for each call to the `process` method in case multiple calls to the method are made in parallel.

### `pruneSources()`

Remove all previously collected critical CSS from external stylesheets.

```typescript
async function pruneSources(processId?: string | number): Promise<void>;
```

### `getScriptCSPHash()`

Returns the sha256 hash of the script containing the event handlers for asynchronously loaded external stylesheets.

This is useful for [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline_script).

```typescript
function getScriptCSPHash(): string | null;
```

### `clear()`

Free up memory by clearing cached stylesheets and critical selectors collected when pruneSource option is enabled.

```typescript
function clear(): void;
```

### `setVerbosity()`

Set the logging verbosity.

```typescript
function setVerbosity(
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'
): void;
```

> Notes: use the level set in the [`logLevel` option](#logLevel) if no parameter is passed.

## Options

### `path`

Type: `String`

Default: `process.cwd()`

Location of the absolute base path of CSS files. Set to the current working directory by default.

### `publicPath`

Type: `String`

Default: `''`

Public path to remove when finding actual CSS resource paths.

### `external`

Type: `Boolean`

Default `true`

Process external stylesheets `<link href="path/to/external/stylesheet.css" rel="stylesheet">`.

### `internal`

Type: `Boolean`

Default `true`

Process internal stylesheets `<style></style>`.

### `additionalStylesheets`

Type: `Array`

Default `[]`

Array of [Globs](https://github.com/mrmlnc/fast-glob#basic-syntax) for matching additional stylesheets to be used while looking for critical CSS.

### `externalThreshold`

Type: `Number`

Default `0`

Completely inline external stylesheets below a given size in bytes.

### `minifyCss`

Type: `Boolean`

Default: `false`

Minify css with [lightningcss](https://github.com/parcel-bundler/lightningcss).

### `minifyTargets`

Type: `string[]`

Default `['> 0.5%', 'last 2 versions', 'Firefox ESR', 'not dead']`

The browser targets passed to [lightningcss](https://github.com/parcel-bundler/lightningcss) when minifying css.

### `merge`

Type: `Boolean`

Default `true`

Merge `<style>` tags into a single one.

### `pruneSource`

Type: `Boolean`

Default `false`

Remove critical CSS from external stylesheets. Critical css selectors are collected on every call to the `process()` method. To actually remove critical css from external stylesheets, the `pruneSources()` method must be called last.

### `preloadExternalStylesheets`

Type: `Boolean`

Default `false`

Add a `link` tag to preload external stylesheets.

### `asyncLoadExternalStylesheets`

Type: `Boolean`

Default `true`

Make the loading of external stylesheets asynchronous.

### `autoRemoveStyleTags`

Type: `Boolean`

Default `false`

Remove style tags containing critical css once the corresponding external stylesheet is loaded.

> Notes: This avoid duplicate css rules.

### `eventHandlers`

Type: `'attr' | 'script'`

Default: `'attr'`

Weither event handlers should be inline inside link tag attribute (`'attr'`) or a separate script (`'script'`).

> Notes: Setting it to `'script'` can be useful for Content Security Policy.

### `noscriptFallback`

Type: `Boolean`

Default `false`

Add a `<noscript>` tag as an alternative to load external stylesheets in case JS is disabled.

> Notes: JS is used if the `asyncLoadExternalStylesheets` option or the `autoRemoveStyleTags` option is enabled.

### `exclude`

Type: `((stylesheetPath: string) => boolean) | RegExp`

Exclude matching external stylesheets from processing.

### `whitelist`

Type: `String[]|RegExp[]`

An array of css selectors to be considered as critical CSS.

### `fontFace`

Type: `Boolean`

Default: `false`

Inline critical `@font-face` rules.

### `keyframes`

Type: `Boolean`

Default: `true`

Inline critical `@keyframes` rules.

### `fs`

Type: `Object`

Default: built-in NodeJS [`fs`](https://nodejs.org/docs/latest-v12.x/api/fs.html) module.

Custom file system to read, write and remove external stylesheets. Methods with callback or promise are supported.

### `logLevel`

Type: `String` (see [Log Level](#log-level))

Default: `'info'`

The level of logging verbosity.

### `logger`

Type: `Object` (see [Custom Logger Interface](#custom-logger-interface))

Provide a custom `Logger`.

## Log Level

Controls logging verbosity by specifying the level the logger should use. The logger will not produce output for any logging level below the specified level. The levels available in order of verbosity are:

- `'debug'`
- `'info'`
- `'warn'`
- `'error'`
- `'silent'`

## Custom Logger Interface

```typescript
interface Logger {
  debug: (msg: string, processId?: string | number) => void;
  info: (msg: string, processId?: string | number) => void;
  warn: (msg: string, processId?: string | number) => void;
  error: (msg: string, processId?: string | number) => void;
}
```
