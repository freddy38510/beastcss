import path from 'path';
import fs from 'fs';
import { callbackify, promisify } from 'util';
import FastGlob from 'fast-glob';
import dropcss from '@freddy38510/dropcss';
import { HTMLElement } from 'node-html-parser';
import parseHTML from './dom';
import * as escapedChars from './helpers/escapedChars';
import { formatToKB, formatToMs, formatToPercent } from './helpers/formatter';
import { defaultLogger, setVerbosity } from './helpers/log';

export default class Beastcss {
  constructor(options = {}) {
    this.options = {
      logLevel: 'info',
      path: process.cwd(),
      publicPath: '',
      additionalStylesheets: [],
      pruneSource: false,
      ...options,
    };

    this.fs = Beastcss.createFsAdapter(this.options.fs || fs);

    // no need to keep it in memory
    delete this.options.fs;

    this.logger = setVerbosity(
      options.logger || defaultLogger,
      this.options.logLevel
    );

    this.usedSelectors = new Set();

    this.cachedStylesheetsSource = new Map();

    this.stylesheetsToPrune = new Map();
  }

  /**
   * Apply critical CSS processing to the html
   *
   * @param  {string} html original html
   * @param {any} id identifier passed to logger (useful for custom logging)
   * @returns {Promise<string>} processed html
   */
  async process(html, id = null) {
    const start = process.hrtime.bigint();

    const astHTML = parseHTML(html);

    const escapedHtml = escapedChars.replaceHTMLClasses(html);

    const hasRemovedNonCriticalCss = [];

    if (this.options.internal !== false) {
      hasRemovedNonCriticalCss.push(
        ...(await Promise.all(
          astHTML
            .querySelectorAll('style')
            .map(async (style) =>
              this.processInternalStylesheet(escapedHtml, style, id)
            )
        ))
      );
    }

    if (this.options.additionalStylesheets.length > 0) {
      const additionalStylesheets = await this.getAdditionalStylesheets();

      hasRemovedNonCriticalCss.push(
        ...(await Promise.all(
          additionalStylesheets.map(async (stylesheet) =>
            this.processExternalStylesheet(astHTML, escapedHtml, stylesheet, id)
          )
        ))
      );
    }

    if (this.options.external !== false) {
      const externalStylesheets = this.getExternalStylesheets(astHTML);

      hasRemovedNonCriticalCss.push(
        ...(await Promise.all(
          externalStylesheets.map(async (stylesheet) =>
            this.processExternalStylesheet(astHTML, escapedHtml, stylesheet, id)
          )
        ))
      );
    }

    if (!hasRemovedNonCriticalCss.includes(true)) {
      this.logger.info('No non-critical css rules was removed.', id);

      return html;
    }

    if (this.options.merge !== false) {
      this.mergeInternalStylesheets(astHTML);
    }

    // serialize the document back to HTML and we're done
    const output = astHTML.toString();

    const end = process.hrtime.bigint();

    this.logger.info(`Processed in ${formatToMs(end - start)}.`, id);

    return output;
  }

  async getStylesheetSource(stylesheet, processId) {
    if (this.cachedStylesheetsSource.has(stylesheet.name)) {
      return this.cachedStylesheetsSource.get(stylesheet.name);
    }

    const promise = (async () => {
      try {
        const content = await this.fs.readFile(stylesheet.path);

        return {
          content,
          size: Buffer.byteLength(content),
        };
      } catch (e) {
        this.logger.warn(
          `External stylesheet "${stylesheet.path}" not found.`,
          processId
        );

        return undefined;
      }
    })();

    this.cachedStylesheetsSource.set(stylesheet.name, promise);

    return promise;
  }

  /**
   * get asset path on disk (with publicPath removed)
   *
   * @param {string} src source path to asset
   * @returns {string} the absolute path on disk to the asset file
   */
  getStylesheetPath(src) {
    const pathPrefix = `${this.options.publicPath.replace(/(^\/|\/$)/g, '')}/`;
    let normalizedPath = src.replace(/^\//, '').replace(/\?\w+$/, '');

    if (normalizedPath.indexOf(pathPrefix) === 0) {
      normalizedPath = normalizedPath
        .substring(pathPrefix.length)
        .replace(/^\//, '');
    }

    return path.resolve(this.options.path, normalizedPath);
  }

  async getAdditionalStylesheets() {
    // const { default: FastGlob } = await import('fast-glob');

    const additionalStylesheets = [];

    const entries = await FastGlob(this.options.additionalStylesheets, {
      cwd: this.options.path,
      baseNameMatch: true,
      unique: true,
      suppressErrors: true,
      absolute: false,
      fs: this.fs,
    });

    entries.forEach((entry) => {
      if (this.isExcluded(entry)) {
        this.logger.debug(`Excluded additional stylesheet "${entry}".`);

        return;
      }

      const stylesheet = {
        path: this.getStylesheetPath(entry),
      };

      stylesheet.name = path
        .relative(this.options.path, stylesheet.path)
        .replace(/^\.\//, '');

      additionalStylesheets.push(stylesheet);
    });

    return additionalStylesheets;
  }

  getExternalStylesheets(astHTML) {
    const externalStylesheets = [];

    astHTML.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');

      if (!href) {
        this.logger.warn(`External stylesheet href attribute is missing.`);

        return;
      }

      if (this.isExcluded(href)) {
        this.logger.debug(`Excluded external stylesheet "${href}".`);

        return;
      }

      const stylesheet = {
        path: this.getStylesheetPath(href),
      };

      stylesheet.name = path
        .relative(this.options.path, stylesheet.path)
        .replace(/^\.\//, '');

      stylesheet.link = link;

      externalStylesheets.push(stylesheet);
    });

    return externalStylesheets;
  }

  async updateStylesheet(stylesheet, css) {
    return this.fs.writeFile(stylesheet.path, css);
  }

  async removeStylesheet(stylesheet) {
    stylesheet.link.remove();

    return this.fs.unlink(stylesheet.path);
  }

  isSelectorWhitelisted(selector) {
    if (Array.isArray(this.options.whitelist)) {
      return this.options.whitelist.some((whitelistedSelector) =>
        typeof whitelistedSelector === 'string'
          ? whitelistedSelector === selector
          : whitelistedSelector.test(selector)
      );
    }

    return false;
  }

  dropCSSByUsedSelectors(originalCss, reverse = false) {
    const options = {
      html: '',
      css: escapedChars.replaceCSSSelectors(originalCss),
      shouldDrop: (sel) =>
        reverse ? !this.usedSelectors.has(sel) : this.usedSelectors.has(sel),
    };

    if (this.options.whitelist) {
      options.shouldDrop = (sel) =>
        reverse
          ? !this.usedSelectors.has(sel) && !this.isSelectorWhitelisted(sel)
          : this.usedSelectors.has(sel) || this.isSelectorWhitelisted(sel);
    }

    let css;

    try {
      ({ css } = dropcss(options));
    } catch (e) {
      this.logger.error(`Unable to parse css or html.`, null);

      throw e;
    }

    return escapedChars.restoreCSSSelectors(css).trim();
  }

  dropUnusedCSS(html, originalCss, processId, accumulate = false) {
    const options = {
      html,
      css: escapedChars.replaceCSSSelectors(originalCss),
      dropUsedFontFace: this.options.fontFace !== true, // undefined by default
      dropUsedKeyframes: this.options.keyframes === false, // undefined by default
    };

    if (accumulate) {
      options.didRetain = (sel) => this.usedSelectors.add(sel);
    }

    if (this.options.whitelist) {
      options.shouldDrop = (sel) => !this.isSelectorWhitelisted(sel);
    }

    let css;

    try {
      ({ css } = dropcss(options));
    } catch (e) {
      this.logger.error(`Unable to parse css or html`, processId);

      throw e;
    }

    return escapedChars
      .restoreCSSSelectors(css)
      .trim()
      .replace(/@charset.*?;/is, '');
  }

  clear() {
    this.usedSelectors.clear();

    this.cachedStylesheetsSource.clear();

    this.stylesheetsToPrune.clear();
  }

  isExcluded(stylesheetPath) {
    // Exclude remote stylesheets
    if (
      /^https?:\/\//.test(stylesheetPath) ||
      stylesheetPath.startsWith('//')
    ) {
      return true;
    }

    if (
      this.options.exclude instanceof RegExp &&
      this.options.exclude.test(stylesheetPath)
    ) {
      return true;
    }

    if (
      this.options.exclude instanceof Function &&
      this.options.exclude(stylesheetPath)
    ) {
      return true;
    }

    return !/\.css$/.test(stylesheetPath.replace(/\?\w+$/, ''));
  }

  static cssToInternal(astHTML, css, link) {
    const style = new HTMLElement('style', {}, '', null);

    style.textContent = css;

    style.$$external = true;

    if (link) {
      link.before(style);

      return;
    }

    const headTag = astHTML.querySelector('head');

    if (!headTag) {
      this.logger.warn(
        'Unable to insert style tag because head tag is missing.'
      );

      return;
    }

    headTag.appendChild(style);
  }

  static preloadExternalStylesheet(astHTML, link) {
    const href = link.getAttribute('href');

    if (astHTML.querySelector(`link[rel="preload"][href="${href}"]`)) {
      this.logger.debug('Skip adding the preload link as it is already there.');

      return;
    }

    const linkPreload = new HTMLElement(
      'link',
      {},
      `rel="preload" href="${href}" as="style"`,
      null
    );

    linkPreload.setAttribute('href', href);
    linkPreload.setAttribute('rel', 'preload');
    linkPreload.setAttribute('as', 'style');

    link.before(linkPreload);
  }

  async processInternalStylesheet(html, style, processId) {
    const usedCSS = {
      content: this.dropUnusedCSS(html, style.rawText, processId),
    };

    usedCSS.size = Buffer.byteLength(usedCSS.content);
    const originalSize = Buffer.byteLength(style.rawText);

    if (usedCSS.size === 0) {
      style.remove();

      this.logger.info(
        `Removed internal stylesheet (${formatToKB(
          originalSize
        )}), no critical css rules was found.`,
        processId
      );

      return true;
    }

    if (style.rawText === usedCSS.content) {
      // did not drop any selectors
      return false;
    }

    style.textContent = usedCSS.content;

    this.logger.info(
      `Reduced internal style to ${formatToKB(usedCSS.size)} (${formatToPercent(
        usedCSS.size,
        originalSize
      )} of original ${formatToKB(originalSize)}).`,
      processId
    );

    return true;
  }

  async processExternalStylesheet(astHTML, html, stylesheet, processId) {
    const minSize = Number(this.options.externalThreshold || 0);

    stylesheet.source = await this.getStylesheetSource(stylesheet, processId);

    if (!stylesheet.source) {
      return false;
    }

    // is below externalThreshold
    if (stylesheet.source.size < minSize) {
      Beastcss.cssToInternal(
        astHTML,
        stylesheet.source.content.toString(),
        stylesheet.link
      );

      if (stylesheet.link) {
        try {
          await this.removeStylesheet(stylesheet);
        } catch (_e) {
          // continue regardless of error
        }
      }

      this.logger.info(
        `Inserted all of ${stylesheet.name} (${formatToKB(
          stylesheet.source.size
        )} was below the threshold of ${formatToKB(
          this.options.externalThreshold
        )}).`,
        processId
      );

      return true;
    }

    const usedCSS = {
      content: this.dropUnusedCSS(
        html,
        stylesheet.source.content.toString(),
        processId,
        this.options.pruneSource
      ),
    };

    usedCSS.size = Buffer.byteLength(usedCSS.content);

    if (
      this.options.pruneSource &&
      !this.stylesheetsToPrune.has(stylesheet.name)
    ) {
      this.stylesheetsToPrune.set(stylesheet.name, {
        path: stylesheet.path,
        name: stylesheet.name,
      });
    }

    if (usedCSS.size !== 0) {
      Beastcss.cssToInternal(astHTML, usedCSS.content, stylesheet.link);
    }

    if (stylesheet.link) {
      if (this.options.preloadExternalStylesheets === true) {
        Beastcss.preloadExternalStylesheet(astHTML, stylesheet.link);
      }

      if (this.options.asyncLoadExternalStylesheets !== false) {
        this.setExternalStylesheetAsync(stylesheet.link);
      }
    }

    this.logger.info(
      `Inserted ${formatToKB(usedCSS.size)} (${formatToPercent(
        usedCSS.size,
        stylesheet.source.size
      )} of original ${formatToKB(stylesheet.source.size)}) of ${
        stylesheet.name
      }.`,
      processId
    );

    return true;
  }

  setExternalStylesheetAsync(link) {
    const href = link.getAttribute('href');
    const media = link.getAttribute('media');

    // @see http://filamentgroup.github.io/loadCSS/test/mediatoggle.html
    link.setAttribute('media', 'print');

    link.setAttribute(
      'onload',
      `this.media='${media || 'all'}'; this.onload=null;`
    );

    if (this.options.noscriptFallback !== true) {
      return;
    }

    const noscript = new HTMLElement('noscript', {}, '', null);
    const fallbackLink = new HTMLElement(
      'link',
      {},
      `rel="stylesheet" href="${href}"`,
      null
    );

    if (media) {
      fallbackLink.setAttribute('media', media);
    }

    noscript.appendChild(fallbackLink);

    link.after(noscript);
  }

  async pruneSource(stylesheet, logId) {
    stylesheet.source = await this.getStylesheetSource(stylesheet, logId);

    if (!stylesheet.source) {
      return false;
    }

    const unusedCSS = {
      content: this.dropCSSByUsedSelectors(
        stylesheet.source.content.toString()
      ),
    };

    unusedCSS.size = Buffer.byteLength(unusedCSS.content);

    if (
      unusedCSS.size === 0 ||
      unusedCSS.size < Number(this.options.externalThreshold)
    ) {
      await this.removeStylesheet(stylesheet);

      this.logger.info(
        `Removed external stylesheet ${stylesheet.name} (${formatToKB(
          stylesheet.source.size
        )}).`,
        logId
      );

      return true;
    }

    if (stylesheet.source.content === unusedCSS.content) {
      // did not drop any selectors
      return false;
    }

    await this.updateStylesheet(stylesheet, unusedCSS.content);

    this.logger.info(
      `Pruned ${formatToKB(
        stylesheet.source.size - unusedCSS.size
      )} of external stylesheet ${stylesheet.name}`,
      logId
    );

    this.logger.info(
      `Pruned ${formatToKB(
        stylesheet.source.size - unusedCSS.size
      )} (${formatToPercent(
        stylesheet.source.size - unusedCSS.size,
        stylesheet.source.size
      )} of original ${formatToKB(
        stylesheet.source.size
      )}) of external stylesheet ${stylesheet.name}`,
      logId
    );

    return true;
  }

  mergeInternalStylesheets(astHTML) {
    let styles = astHTML.querySelectorAll('style');

    // skips processing of internal stylesheets
    if (this.options.internal === false) {
      styles = styles.filter((style) => style.$$external);
    }

    if (styles.length === 0) {
      return;
    }

    for (let i = 1; i < styles.length; i += 1) {
      styles[0].textContent += styles[i].rawText;

      Object.entries(styles[i].attributes).forEach(([key, value]) => {
        const attribute = styles[0].getAttribute(key);
        const newValue = attribute ? `${attribute} ${value}` : value;

        styles[0].setAttribute(key, newValue);
      });

      styles[i].remove();
    }
  }

  async pruneSources(logId = null) {
    const promises = [];

    this.stylesheetsToPrune.forEach((stylesheet) =>
      promises.push(this.pruneSource(stylesheet, logId))
    );

    const hasPrunedStylesheets = await Promise.all(promises);

    if (!hasPrunedStylesheets.includes(true)) {
      this.logger.info('No stylesheets was pruned.', logId);
    }
  }

  static createFsAdapter(fileSystem) {
    return {
      ...Object.fromEntries(
        ['readFile', 'writeFile', 'unlink'].map((method) => [
          method,
          fileSystem[method].toString().match(/callback/i)
            ? promisify(fileSystem[method].bind(fileSystem))
            : fileSystem[method],
        ])
      ),
      ...Object.fromEntries(
        ['readdir', 'lstat', 'stat'].map((method) => [
          method,
          fileSystem[method].toString().match(/callback/i)
            ? fileSystem[method].bind(fileSystem)
            : callbackify(fileSystem[method].bind(fileSystem)),
        ])
      ),
    };
  }
}
