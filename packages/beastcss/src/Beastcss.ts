import * as path from 'path';
import * as fs from 'fs';
import { callbackify, promisify } from 'util';
import { AsyncLocalStorage } from 'async_hooks';

import dropcss, { type DropcssOptions } from '@freddy38510/dropcss';
import type { FileSystemAdapter } from 'fast-glob';
import { htmlParser, specialChars, logging, formatter } from './utils';

class Beastcss {
  public opts: Beastcss.Options;

  protected fs: Beastcss.FSAdapter;

  protected cachedStylesheetsSource = new Map<
    string,
    Promise<Beastcss.StylesheetSource | undefined>
  >();

  protected get processId() {
    return this.executionContext.getStore();
  }

  private criticalSelectors = new Set<string>();

  private executionContext = new AsyncLocalStorage<Beastcss.ProcessId>();

  constructor(options?: Partial<Beastcss.Options>) {
    this.opts = {
      path: process.cwd(),
      publicPath: '',
      additionalStylesheets: [],
      externalThreshold: 0,
      logger: logging.defaultLogger,
      logLevel: 'info',
      ...(options || {}),
    };

    this.setVerbosity();

    this.fs = Beastcss.createFsAdapter(this.opts.fs || fs);

    // no need to keep it in memory
    delete this.opts.fs;
  }

  /**
   * Apply critical CSS processing to the html.
   */
  public async process(html: string, processId?: Beastcss.ProcessId) {
    return this.executionContext.run(processId, async () => {
      const start = process.hrtime.bigint();

      const astHTML = htmlParser.parseHTML(html);

      const escapedHtml = specialChars.replaceHTMLClasses(html);

      const hasRemovedNonCriticalCss: boolean[] = [];

      if (this.opts.internal !== false) {
        hasRemovedNonCriticalCss.push(
          ...astHTML
            .querySelectorAll('style')
            .map((style) => this.processInternalStylesheet(escapedHtml, style))
        );
      }

      if (this.opts.external !== false) {
        const externalStylesheets = await this.getExternalStylesheets(astHTML);

        hasRemovedNonCriticalCss.push(
          ...(await Promise.all(
            externalStylesheets.map(async (stylesheet) =>
              this.processExternalStylesheet(astHTML, escapedHtml, stylesheet)
            )
          ))
        );
      }

      if (!hasRemovedNonCriticalCss.includes(true)) {
        this.opts.logger.info(
          'No non-critical css rules was removed.',
          processId
        );

        return html;
      }

      if (this.opts.merge !== false) {
        this.mergeStylesheets(astHTML);
      }

      const output = astHTML.toString();

      const end = process.hrtime.bigint();

      this.opts.logger.info(
        `Processed in ${formatter.formatToMs(end - start)}.`,
        processId
      );

      return output;
    });
  }

  /**
   * Remove all previously collected critical CSS from external stylesheets.
   */
  public async pruneSources(processId?: Beastcss.ProcessId) {
    return this.executionContext.run(processId, async () => {
      const hasPrunedStylesheets = await Promise.all(
        [...this.cachedStylesheetsSource.keys()].map(async (stylesheetPath) =>
          this.pruneSource(stylesheetPath)
        )
      );

      if (!hasPrunedStylesheets.includes(true)) {
        this.opts.logger.info('No stylesheets was pruned.', this.processId);
      }
    });
  }

  /**
   * Free up memory by clearing cached stylesheets and critical selectors.
   */
  public clear() {
    this.criticalSelectors.clear();

    this.cachedStylesheetsSource.clear();
  }

  /**
   * Set the logging verbosity.
   */
  public setVerbosity(logLevel?: logging.LogLevel) {
    this.opts.logger = logging.setVerbosity(
      this.opts.logger,
      logLevel || this.opts.logLevel
    );
  }

  protected static createFsAdapter(fileSystem: Beastcss.FSLike) {
    return {
      readFile: fileSystem.readFile.toString().match(/callback/i)
        ? promisify(fileSystem.readFile.bind(fileSystem) as typeof fs.readFile)
        : fileSystem.readFile,
      writeFile: fileSystem.writeFile.toString().match(/callback/i)
        ? promisify(
            fileSystem.writeFile.bind(fileSystem) as typeof fs.writeFile
          )
        : fileSystem.writeFile,
      unlink: fileSystem.unlink.toString().match(/callback/i)
        ? promisify(fileSystem.unlink.bind(fileSystem) as typeof fs.unlink)
        : fileSystem.unlink,
      readdir: fileSystem.readdir.toString().match(/callback/i)
        ? (fileSystem.readdir.bind(fileSystem) as typeof fs.readdir)
        : (callbackify(
            fileSystem.readdir.bind(fileSystem) as typeof fs.promises.readdir
          ) as Beastcss.FSAdapter['readdir']),
      lstat: fileSystem.lstat.toString().match(/callback/i)
        ? fileSystem.lstat.bind(fileSystem)
        : callbackify(
            fileSystem.lstat.bind(fileSystem) as typeof fs.promises.lstat
          ),
      stat: fileSystem.stat.toString().match(/callback/i)
        ? fileSystem.stat.bind(fileSystem)
        : callbackify(
            fileSystem.stat.bind(fileSystem) as typeof fs.promises.stat
          ),
    } as Beastcss.FSAdapter;
  }

  protected async getStylesheetSource(stylesheetPath: string) {
    if (this.cachedStylesheetsSource.has(stylesheetPath)) {
      return this.cachedStylesheetsSource.get(stylesheetPath);
    }

    const promise = (async () => {
      try {
        const content = await this.fs.readFile(stylesheetPath);

        return {
          content,
          size: Buffer.byteLength(content),
        };
      } catch (e) {
        this.opts.logger.warn(
          `External stylesheet "${stylesheetPath}" not found.`,
          this.processId
        );

        return undefined;
      }
    })();

    this.cachedStylesheetsSource.set(stylesheetPath, promise);

    return promise;
  }

  protected getStylesheetPath(src: string) {
    const pathPrefix = `${this.opts.publicPath.replace(/(^\/|\/$)/g, '')}/`;

    let normalizedPath = src.replace(/^\//, '').replace(/\?\w+$/, '');

    if (normalizedPath.indexOf(pathPrefix) === 0) {
      normalizedPath = normalizedPath
        .substring(pathPrefix.length)
        .replace(/^\//, '');
    }

    return path.resolve(this.opts.path, normalizedPath);
  }

  protected async getAdditionalStylesheets() {
    const { default: fastGlob } = await import('fast-glob');

    const additionalStylesheets: Beastcss.ExternalStylesheet[] = [];

    const matches = await fastGlob(this.opts.additionalStylesheets, {
      cwd: this.opts.path,
      baseNameMatch: true,
      unique: true,
      suppressErrors: true,
      onlyFiles: true,
      fs: this.fs,
    });

    matches.forEach((match) => {
      if (this.isExcluded(match)) {
        this.opts.logger.debug(
          `Excluded additional stylesheet "${match}".`,
          this.processId
        );

        return;
      }

      additionalStylesheets.push({
        path: this.getStylesheetPath(match),
        filename: path.basename(match),
      });
    });

    return additionalStylesheets;
  }

  protected async updateExternalStylesheet(
    stylesheetPath: string,
    css: string
  ) {
    return this.fs.writeFile(stylesheetPath, css);
  }

  protected async removeExternalStylesheet(stylesheetPath: string) {
    try {
      await this.fs.unlink(stylesheetPath);
    } catch (e) {
      // continue regardless of error
    }
  }

  protected isExcluded(stylesheetPath: string) {
    // Exclude remote stylesheets
    if (
      /^https?:\/\//.test(stylesheetPath) ||
      stylesheetPath.startsWith('//')
    ) {
      return true;
    }

    if (
      this.opts.exclude instanceof RegExp &&
      this.opts.exclude.test(stylesheetPath)
    ) {
      return true;
    }

    if (
      this.opts.exclude instanceof Function &&
      this.opts.exclude(stylesheetPath)
    ) {
      return true;
    }

    return !/\.css$/.test(stylesheetPath.replace(/\?\w+$/, ''));
  }

  private async getExternalStylesheets(
    astHTML: htmlParser.ExtendedHTMLElement
  ) {
    const externalStylesheets: Beastcss.ExternalStylesheet[] = [];
    const stylesheetPaths: string[] = [];

    astHTML.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');

      if (!href) {
        this.opts.logger.warn(
          `External stylesheet href attribute is missing.`,
          this.processId
        );

        return;
      }

      if (this.isExcluded(href)) {
        this.opts.logger.debug(
          `Excluded external stylesheet "${href}".`,
          this.processId
        );

        return;
      }

      const stylesheetPath = this.getStylesheetPath(href);

      if (!stylesheetPaths.includes(stylesheetPath)) {
        externalStylesheets.push({
          path: stylesheetPath,
          filename: path.basename(href),
          link,
        });

        stylesheetPaths.push(stylesheetPath);
      }
    });

    if (this.opts.additionalStylesheets.length > 0) {
      const additionalStylesheets: Beastcss.ExternalStylesheet[] =
        await this.getAdditionalStylesheets();

      additionalStylesheets.forEach((stylesheet) => {
        if (!stylesheetPaths.includes(stylesheet.path)) {
          externalStylesheets.push(stylesheet);

          stylesheetPaths.push(stylesheet.path);
        }
      });
    }

    return externalStylesheets;
  }

  private isSelectorWhitelisted(selector: string) {
    if (Array.isArray(this.opts.whitelist)) {
      return this.opts.whitelist.some((whitelistedSelector) =>
        typeof whitelistedSelector === 'string'
          ? whitelistedSelector === selector
          : whitelistedSelector.test(selector)
      );
    }

    return false;
  }

  private getCriticalCss(html: string, css: string, reverse = false) {
    const fontFace = this.opts.fontFace !== true; // @font-face rules are not critical unless set to true
    const keyframes = this.opts.keyframes === false; // @keyframes rules are critical unless set to false

    const options = {
      html,
      css: specialChars.replaceCSSSelectors(css),
      dropUsedFontFace: reverse ? !fontFace : fontFace,
      dropUsedKeyframes: reverse ? !keyframes : keyframes,
      shouldDrop: (sel: string) =>
        reverse
          ? this.criticalSelectors.has(sel) || this.isSelectorWhitelisted(sel)
          : !this.isSelectorWhitelisted(sel),
    } as DropcssOptions;

    if (this.opts.pruneSource) {
      options.didRetain = (sel: string) => this.criticalSelectors.add(sel);
    }

    let criticalCss: string;

    try {
      ({ css: criticalCss } = dropcss(options));
    } catch (e) {
      this.opts.logger.error('Unable to parse css or html.', this.processId);

      throw e;
    }

    criticalCss = specialChars.restoreCSSSelectors(criticalCss);

    return { content: criticalCss, size: Buffer.byteLength(criticalCss) };
  }

  private insertStyle(
    astHTML: htmlParser.ExtendedHTMLElement,
    css: string,
    link?: htmlParser.ExtendedHTMLElement
  ) {
    const style = htmlParser.extendHTMLElement(
      new htmlParser.HTMLElement('style', {}, '', null, [-1, -1])
    );

    style.textContent = css;

    style.$$external = true;

    if (link) {
      link.before(style);

      return;
    }

    const headTag = astHTML.querySelector('head');

    if (!headTag) {
      this.opts.logger.warn(
        'Unable to insert style tag because head tag is missing.',
        this.processId
      );

      return;
    }

    headTag.appendChild(style);
  }

  private insertPreloadLink(
    astHTML: htmlParser.ExtendedHTMLElement,
    link: htmlParser.ExtendedHTMLElement
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const href = link.getAttribute('href')!;

    if (astHTML.querySelector(`link[rel="preload"][href="${href}"]`)) {
      this.opts.logger.debug(
        'Skip adding the preload link as it is already there.',
        this.processId
      );

      return;
    }

    const linkPreload = link.clone() as htmlParser.ExtendedHTMLElement;

    linkPreload.setAttribute('rel', 'preload');
    linkPreload.setAttribute('as', 'style');

    link.before(linkPreload);
  }

  private processInternalStylesheet(
    html: string,
    style: htmlParser.ExtendedHTMLElement
  ) {
    const css = style.rawText.trim();
    const size = Buffer.byteLength(css);

    // Skip empty stylesheet
    if (size === 0) return false;

    const criticalCss = this.getCriticalCss(html, css);

    // Skip, no change
    if (size === criticalCss.size) return false;

    if (criticalCss.size === 0) {
      style.remove();

      this.opts.logger.info(
        `Removed internal stylesheet (${formatter.formatToKB(
          size
        )}), no critical css rules was found.`,
        this.processId
      );

      return true;
    }

    style.textContent = criticalCss.content;

    this.opts.logger.info(
      `Reduced internal style to ${formatter.formatToKB(
        criticalCss.size
      )} (${formatter.formatToPercent(
        criticalCss.size,
        size
      )} of original ${formatter.formatToKB(size)}).`,
      this.processId
    );

    return true;
  }

  private async processExternalStylesheet(
    astHTML: htmlParser.ExtendedHTMLElement,
    html: string,
    stylesheet: Beastcss.ExternalStylesheet
  ) {
    const source = await this.getStylesheetSource(stylesheet.path);

    // Skip not found or empty stylesheet
    if (!source || source.size === 0) {
      return false;
    }

    // is below externalThreshold
    if (source.size < Number(this.opts.externalThreshold)) {
      this.insertStyle(astHTML, source.content.toString(), stylesheet.link);

      if (stylesheet.link) {
        stylesheet.link.remove();

        delete stylesheet.link;
      }

      this.opts.logger.info(
        `Inserted all of ${stylesheet.filename} (${formatter.formatToKB(
          source.size
        )} was below the threshold of ${formatter.formatToKB(
          this.opts.externalThreshold
        )}).`,
        this.processId
      );

      return true;
    }

    const criticalCss = this.getCriticalCss(html, source.content.toString());

    // Skip, no change
    if (source.size === criticalCss.size) return false;

    this.insertStyle(astHTML, criticalCss.content, stylesheet.link);

    if (stylesheet.link) {
      if (this.opts.preloadExternalStylesheets === true) {
        this.insertPreloadLink(astHTML, stylesheet.link);
      }

      if (this.opts.asyncLoadExternalStylesheets !== false) {
        this.makeLoadingAsync(stylesheet.link);
      }
    }

    this.opts.logger.info(
      `Inserted ${formatter.formatToKB(
        criticalCss.size
      )} (${formatter.formatToPercent(
        criticalCss.size,
        source.size
      )} of original ${formatter.formatToKB(source.size)}) of ${
        stylesheet.filename
      }.`,
      this.processId
    );

    return true;
  }

  private makeLoadingAsync(link: htmlParser.ExtendedHTMLElement) {
    this.insertNoscriptTag(link);

    const media = link.getAttribute('media') || 'all';

    // @see http://filamentgroup.github.io/loadCSS/test/mediatoggle.html
    link.setAttribute('media', 'print');
    link.setAttribute('onload', `this.media='${media}'; this.onload=null;`);
  }

  private insertNoscriptTag(link: htmlParser.ExtendedHTMLElement) {
    if (this.opts.noscriptFallback !== true) {
      return;
    }

    const noscript = htmlParser.extendHTMLElement(
      new htmlParser.HTMLElement('noscript', {}, '', null, [-1, -1])
    );

    const fallbackLink = link.clone();

    noscript.appendChild(fallbackLink);

    link.after(noscript);
  }

  private async pruneSource(stylesheetPath: string) {
    const source = await this.getStylesheetSource(stylesheetPath);

    // skip not found stylesheet
    if (!source) {
      return false;
    }

    const nonCriticalCss = this.getCriticalCss(
      '',
      source.content.toString(),
      true
    );

    if (
      nonCriticalCss.size === 0 ||
      nonCriticalCss.size < Number(this.opts.externalThreshold)
    ) {
      await this.removeExternalStylesheet(stylesheetPath);

      this.opts.logger.info(
        `Removed external stylesheet ${stylesheetPath} (${formatter.formatToKB(
          source.size
        )}).`,
        this.processId
      );

      return true;
    }

    // skip no change
    if (source.size === nonCriticalCss.size) {
      return false;
    }

    await this.updateExternalStylesheet(stylesheetPath, nonCriticalCss.content);

    this.opts.logger.info(
      `Pruned ${formatter.formatToKB(
        source.size - nonCriticalCss.size
      )} (${formatter.formatToPercent(
        source.size - nonCriticalCss.size,
        source.size
      )} of original ${formatter.formatToKB(
        source.size
      )}) of external stylesheet ${path.basename(stylesheetPath)}`,
      this.processId
    );

    return true;
  }

  private mergeStylesheets(astHTML: htmlParser.ExtendedHTMLElement) {
    let styles = astHTML.querySelectorAll('style');

    // skip merging internal stylesheets
    if (this.opts.internal === false) {
      styles = styles.filter((style) => style.$$external);
    }

    if (styles.length === 0) {
      return;
    }

    for (let i = 1; i < styles.length; i += 1) {
      styles[0].textContent += styles[i].rawText;

      Object.entries(styles[i].attributes).forEach(([key, value]) => {
        const oldValue = styles[0].getAttribute(key);

        styles[0].setAttribute(key, oldValue ? `${oldValue} ${value}` : value);
      });

      styles[i].remove();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Beastcss {
  export type ProcessId = string | number | undefined;

  export interface StylesheetSource {
    content: Buffer;
    size: number;
  }

  export interface ExternalStylesheet {
    path: string;
    filename: string;
    link?: htmlParser.ExtendedHTMLElement;
  }

  export type FSLike = Pick<typeof fs | typeof fs.promises, keyof FSAdapter>;

  export interface FSAdapter {
    readFile: (path: fs.PathLike) => Promise<Buffer>;
    writeFile: (file: fs.PathLike, data: string) => Promise<void>;
    unlink: (path: fs.PathLike) => Promise<void>;
    readdir: FileSystemAdapter['readdir'];
    lstat: FileSystemAdapter['lstat'];
    stat: FileSystemAdapter['stat'];
  }

  export interface Options {
    /**
     * Absolute path location of the CSS files. Set to the current working directory by default.
     */
    path: string;
    /**
     * Public path of the CSS resources. This prefix is removed from the `href` attribute.
     */
    publicPath: string;
    /**
     * Array of Glob for matching other stylesheets to be used while looking for critical CSS.
     */
    additionalStylesheets: string[];
    /**
     * The level of logging verbosity.
     */
    logLevel: logging.LogLevel;
    /**
     * Provide a custom `Logger`.
     */
    logger: logging.Logger;
    /**
     * Completely inline external stylesheets below a given size in bytes.
     */
    externalThreshold: number;
    /**
     * Custom File system to read, write and remove external stylesheets.
     */
    fs?: FSLike;
    /**
     * Exclude matching external stylesheets from processing.
     */
    exclude?: ((href: string) => boolean) | RegExp;
    /**
     * Process external stylesheets `<link href="path/to/external/stylesheet.css" rel="stylesheet" />`.
     */
    external?: boolean;
    /**
     * Process internal stylesheets `<style></style>`.
     */
    internal?: boolean;
    /**
     * Remove critical CSS from external stylesheets.
     */
    pruneSource?: boolean;
    /**
     * Merge `<style>` tags into a single one.
     */
    merge?: boolean;
    /**
     * Load external stylesheets asynchronously.
     */
    asyncLoadExternalStylesheets?: boolean;
    /**
     * Preload external stylesheets.
     */
    preloadExternalStylesheets?: boolean;
    /**
     * Add the `<noscript>` tag as a fallback to loading external stylesheets asynchronously.
     */
    noscriptFallback?: boolean;
    /**
     * An array of css selectors to be considered as critical CSS.
     */
    whitelist?: Array<string | RegExp>;
    /**
     * Inline critical `@font-face` rules.
     */
    fontFace?: boolean;
    /**
     * Inline critical `@keyframes` rules.
     */
    keyframes?: boolean;
  }
}

export default Beastcss;