import path from 'path';
import fs from 'fs';
import FastGlob from 'fast-glob';
import dropcss from '@freddy38510/dropcss';
import { HTMLElement } from 'node-html-parser';
import parseHTML from './dom';
import * as escapedChars from './helpers/escapedChars';
import { formatToKB, formatToMs, formatToPercent } from './helpers/formatter';
import { defaultLogger, setVerbosity } from './helpers/log';
import { readFile, writeFile, removeFile } from './helpers/promisify-fs';

export default class Beastcss {
  constructor(options) {
    this.options = {
      logLevel: 'info',
      path: '',
      publicPath: '',
      additionalStylesheets: [],
      pruneSource: false,
      ...options,
    };

    this.exclude = options.exclude
      ? options.exclude
      : (href) => !(href || '').match(/\.css$/);

    if (this.exclude instanceof RegExp) {
      this.exclude = this.exclude.test.bind(this.exclude);
    }

    this.logger = setVerbosity(
      options.logger || defaultLogger,
      this.options.logLevel
    );

    this.fs = {
      readFile: readFile.bind(options.fs || fs.promises),
      writeFile: writeFile.bind(options.fs || fs.promises),
      removeFile: removeFile.bind(options.fs || fs.promises),
    };

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

    // eslint-disable-next-line no-param-reassign
    html = escapedChars.replaceHTMLClasses(html);

    if (this.options.internal !== false) {
      await Promise.all(
        astHTML
          .querySelectorAll('style')
          .map(async (style) => this.processInternalStylesheet(html, style, id))
      );
    }

    if (this.options.additionalStylesheets.length > 0) {
      const additionalStylesheets = await this.getAdditionalStylesheets(
        this.options.additionalStylesheets
      );

      await Promise.all(
        additionalStylesheets.map(async (stylesheet) =>
          this.processExternalStylesheet(astHTML, html, stylesheet, id)
        )
      );
    }

    if (this.options.external !== false) {
      const externalStylesheets = this.getExternalStylesheets(astHTML);

      await Promise.all(
        externalStylesheets.map(async (stylesheet) =>
          this.processExternalStylesheet(astHTML, html, stylesheet, id)
        )
      );
    }

    if (this.options.merge !== false) {
      this.mergeInternalStylesheets(astHTML);
    }

    // serialize the document back to HTML and we're done
    const output = astHTML.toString();

    const end = process.hrtime.bigint();

    this.logger.info(`Processed in ${formatToMs(end - start)}`, id);

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
          `Unable to locate stylesheet: ${stylesheet.path}`,
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

  async getAdditionalStylesheets(sources) {
    // const { default: FastGlob } = await import('fast-glob');

    const additionalStylesheets = [];

    const entries = await FastGlob(sources, {
      cwd: this.options.path || process.cwd(),
      baseNameMatch: true,
      unique: true,
      suppressErrors: true,
      absolute: false,
    });

    entries.forEach((entry) => {
      if (entry.endsWith('.css')) {
        const stylesheet = {
          path: this.getStylesheetPath(entry),
        };

        stylesheet.name = path
          .relative(this.options.path, stylesheet.path)
          .replace(/^\.\//, '');

        additionalStylesheets.push(stylesheet);
      }
    });

    return additionalStylesheets;
  }

  getExternalStylesheets(astHTML) {
    const externalStylesheets = [];

    astHTML.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');

      if (this.exclude(href)) {
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

    return this.fs.removeFile(stylesheet.path);
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
      this.logger.error(`Unable to parse css or html`, null);

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

  static cssToInternal(astHTML, css, link) {
    const style = new HTMLElement('style', {}, '', null);

    style.textContent = css;

    style.$$external = true;

    if (link) {
      link.before(style);

      return;
    }

    const head = astHTML.querySelector('head');

    head.appendChild(style);
  }

  static preloadExternalStylesheet(astHTML, link) {
    const href = link.getAttribute('href');

    if (astHTML.querySelector(`link[rel="preload"][href="${href}"]`)) {
      // already present
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

    if (usedCSS.size === 0) {
      if (style.parentNode) {
        style.remove();
      }

      return;
    }

    if (style.rawText === usedCSS.content) {
      // did not drop any selectors
      return;
    }

    const originalSize = Buffer.byteLength(style.rawText);

    style.textContent = usedCSS.content;

    this.logger.info(
      `Reduced internal style to ${formatToKB(usedCSS.size)} (${formatToPercent(
        usedCSS.size,
        originalSize
      )} of original ${formatToKB(originalSize)}).`,
      processId
    );
  }

  async processExternalStylesheet(astHTML, html, stylesheet, processId) {
    const minSize = Number(this.options.externalThreshold || 0);

    stylesheet.source = await this.getStylesheetSource(stylesheet, processId);

    if (!stylesheet.source) {
      return;
    }

    // is below externalThreshold
    if (stylesheet.source.size < minSize) {
      Beastcss.cssToInternal(
        astHTML,
        stylesheet.source.content,
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
        `Inserted all of ${stylesheet.name} to internal (${formatToKB(
          stylesheet.source.size
        )} was below the threshold of ${formatToKB(
          this.options.externalThreshold
        )})`,
        processId
      );

      return;
    }

    const usedCSS = {
      content: this.dropUnusedCSS(
        html,
        stylesheet.source.content,
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
      } to internal`,
      processId
    );
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

    if (this.options.noscriptFallback !== false) {
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
  }

  async pruneSource(stylesheet, logId) {
    stylesheet.source = await this.getStylesheetSource(stylesheet, logId);

    if (!stylesheet.source) {
      return;
    }

    const unusedCSS = {
      content: this.dropCSSByUsedSelectors(stylesheet.source.content),
    };

    if (stylesheet.source.content === unusedCSS.content) {
      // did not drop any selectors
      return;
    }

    unusedCSS.size = Buffer.byteLength(unusedCSS.content);

    await this.updateStylesheet(stylesheet, unusedCSS.content);

    this.logger.info(
      `Pruned ${formatToKB(
        stylesheet.source.size - unusedCSS.size
      )} of external stylesheet ${stylesheet.name}`,
      logId
    );
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

    return Promise.all(promises);
  }
}
