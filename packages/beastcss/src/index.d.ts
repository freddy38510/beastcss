export default Beastcss;

import type { HTMLElement } from 'node-html-parser';
import type { readFile, writeFile, rm } from 'fs/promises';
import type {
  readFile as readFileSync,
  writeFile as writeFileSync,
  rm as rmSync,
} from 'fs';

export type logLevel = 'info' | 'warn' | 'error' | 'trace' | 'debug' | 'silent';

export interface Logger {
  info: (msg: string, id?: string) => void;
  warn: (msg: string, id?: string) => void;
  error: (msg: string, id?: string) => void;
  trace: (msg: string, id?: string) => void;
  debug: (msg: string, id?: string) => void;
}

interface FileSystem {
  readFile: typeof readFileSync | typeof readFile;
  writeFile: typeof writeFileSync | typeof writeFile;
  rm: typeof rmSync | typeof rm;
}

export interface Options {
  path?: string;
  publicPath?: string;
  external?: boolean;
  internal?: boolean;
  externalThreshold?: number;
  pruneSource?: boolean;
  merge?: boolean;
  additionalStylesheets?: string[];
  asyncLoadExternalStylesheets?: boolean;
  preloadExternalStylesheets?: boolean;
  noscriptFallback?: boolean;
  whitelist?: Array<string | RegExp>;
  fontFace?: boolean;
  keyframes?: boolean;
  exclude?: ((href: string) => boolean) | RegExp;
  fs?: FileSystem;
  logger?: Logger;
  logLevel?: logLevel;
}

type stylesheet = {
  path: string;
  name: string;
  link?: HTMLElement | null;
};

declare class Beastcss {
  constructor(options: Options);
  options: Options;
  logger: Logger;
  usedSelectors: Set<string>;
  cachedStylesheetsSource: Map<string, object>;
  stylesheetsToPrune: Map<string, object>;
  fs: {
    readFile: (filePath: string) => Promise<Buffer | string>;
    writeFile: (filePath: string, data: string) => Promise<void>;
    removeFile: (filePath: string) => Promise<void>;
  };

  exclude: (href: string) => boolean;

  process: (html: string, id?: string | null) => Promise<string>;

  static cssToInternal(
    astHTML: HTMLElement,
    css: string,
    link: HTMLElement
  ): void;

  static preloadExternalStylesheet(
    astHTML: HTMLElement,
    link: HTMLElement
  ): void;

  isSelectorWhitelisted(selector: string): boolean;

  getStylesheetSource(
    stylesheet: stylesheet,
    processId: string | null
  ): Promise<{ content: string; size: number }>;

  getStylesheetPath(src: string): string;

  getAdditionalStylesheets(): Promise<stylesheet[]>;

  getExternalStylesheets(astHTML: HTMLElement): stylesheet[];

  processInternalStylesheet(
    html: string,
    style: HTMLElement,
    processId: string | null
  ): Promise<void>;

  setExternalStylesheetAsync(link: HTMLElement): void;

  updateStylesheet(stylesheet: stylesheet, css: string): Promise<void>;

  removeStylesheet(stylesheet: stylesheet): Promise<void>;

  pruneSource(stylesheet: stylesheet, processId: string): Promise<boolean>;

  dropUnusedCSS(html: string, originalCss: string, processId: string): string;

  mergeInternalStylesheets(astHTML: HTMLElement): void;

  clear(): void;
}
