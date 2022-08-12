/* eslint-disable global-require */
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { instantiateBeastcss, copyDir, cleanDist } from './_helpers';

describe('Beastcss', () => {
  describe('Basic Usage', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/basic/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('basic');

      html = await Beastcss.process(originalHtml);
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('modifiers', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/modifiers/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('modifiers');

      html = await Beastcss.process(originalHtml);
    });

    it('should insert used css to internal', () => {
      const stylesTagContent = html.match(/<style>(.*)<\/style>/gms)[0];

      expect(stylesTagContent).toMatch('.with\\:colon');
      expect(stylesTagContent).toMatch('.with\\/slash');
      expect(stylesTagContent).toMatch('.with\\?questionmark');
      expect(stylesTagContent).toMatch('.with\\(parentheses\\)');
      expect(stylesTagContent).toMatch('.with\\!exclamationmark');
      expect(stylesTagContent).toMatch('.with\\<guillemets\\>');
      expect(stylesTagContent).toMatch('.with\\{brackets\\}');
      expect(stylesTagContent).toMatch('.with\\[square-brackets\\]');
    });

    it('should correctly restore html class names', () => {
      const bodyTagContent = html.match(/<body>(.*)<\/body>/gms)[0];

      expect(bodyTagContent).toMatch('with:colon');
      expect(bodyTagContent).toMatch('with/slash');
      expect(bodyTagContent).toMatch('with?questionmark');
      expect(bodyTagContent).toMatch('with(parentheses)');
      expect(bodyTagContent).toMatch('with!exclamationmark');
      expect(bodyTagContent).toMatch('with<guillemets>');
      expect(bodyTagContent).toMatch('with&lt;guillemets&gt;');
      expect(bodyTagContent).toMatch('with{brackets}');
      expect(bodyTagContent).toMatch('with[square-brackets]');
    });
  });

  describe('whitelist', () => {
    let html;

    describe('with string', () => {
      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/basic/index.html'),
          'utf8'
        );

        const Beastcss = instantiateBeastcss('basic', {
          whitelist: ['h2.unused', 'p.unused'],
        });

        html = await Beastcss.process(originalHtml);
      });

      it('should insert whitelisted selectors with used css to internal', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}h2.unused{color: red;}p{color: purple;}p.unused{color: orange;}</style>'
        );
      });

      it('should load stylesheet async', () => {
        expect(html).toMatch(
          `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should match html snapshot', () => {
        expect(html).toMatchSnapshot();
      });
    });

    describe('with regexp', () => {
      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/basic/index.html'),
          'utf8'
        );

        const Beastcss = instantiateBeastcss('basic', {
          whitelist: [/h2/, /p/],
        });

        html = await Beastcss.process(originalHtml);
      });

      it('should insert whitelisted selectors with used css to internal', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}h2.unused{color: red;}p{color: purple;}p.unused{color: orange;}</style>'
        );
      });

      it('should load stylesheet async', () => {
        expect(html).toMatch(
          `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should match html snapshot', () => {
        expect(html).toMatchSnapshot();
      });
    });
  });

  describe('External Threshold', () => {
    let html;
    let originalStylesheet;

    beforeAll(async () => {
      const fixture = 'basic';
      const dir = path.resolve(__dirname, `fixtures/${fixture}`);

      await copyDir(dir, path.join(dir, '/dist'));

      const originalHtml = await fs.promises.readFile(
        path.resolve(__dirname, `fixtures/${fixture}/index.html`),
        'utf8'
      );

      originalStylesheet = await fs.promises.readFile(
        path.resolve(__dirname, `fixtures/${fixture}/style.css`),
        'utf8'
      );

      const Beastcss = instantiateBeastcss(`${fixture}/dist`, {
        externalThreshold: 10000,
      });

      html = await Beastcss.process(originalHtml);
    });

    afterAll(async () => {
      await cleanDist('basic');
    });

    it('should completely insert external stylesheet to internal', () => {
      expect(html).toMatch(originalStylesheet);
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('Clear', () => {
    let Beastcss;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/basic/index.html'),
        'utf8'
      );

      Beastcss = instantiateBeastcss('basic');

      await Beastcss.process(originalHtml);

      Beastcss.clear();
    });

    it('should clear usedSelectors', () => {
      expect(Beastcss.usedSelectors.has('h1')).toBeFalsy();
    });

    it('should clear cachedStylesheetsSource', () => {
      expect(Beastcss.cachedStylesheetsSource.has('style.css')).toBeFalsy();
    });
  });

  describe('Internal styles', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/internal/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('internal');

      html = await Beastcss.process(originalHtml);
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('exclude', () => {
    describe('with a function', () => {
      let html;

      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/exclude/index.html'),
          'utf8'
        );

        const Beastcss = instantiateBeastcss('exclude', {
          exclude: (url) => (url || '').match(/excluded\.css$/),
        });

        html = await Beastcss.process(originalHtml);
      });

      it('should insert used css to internal', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}p{color: purple;}</style>'
        );
      });

      it('should load processed stylesheet async', () => {
        expect(html).toMatch(
          `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should not process excluded stylesheet', () => {
        expect(html).not.toMatch(
          `<link rel="stylesheet" href="/excluded.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should match html snapshot', () => {
        expect(html).toMatchSnapshot();
      });
    });

    describe('with a regexp', () => {
      let html;

      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/exclude/index.html'),
          'utf8'
        );

        const Beastcss = instantiateBeastcss('exclude', {
          exclude: /excluded\.css$/,
        });

        html = await Beastcss.process(originalHtml);
      });

      it('should insert used css to internal', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}p{color: purple;}</style>'
        );
      });

      it('should load processed stylesheet async', () => {
        expect(html).toMatch(
          `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should not process excluded stylesheet', () => {
        expect(html).not.toMatch(
          `<link rel="stylesheet" href="/excluded.css" media="print" onload="this.media='all'; this.onload=null;">`
        );
      });

      it('should match html snapshot', () => {
        expect(html).toMatchSnapshot();
      });
    });
  });

  describe('external=false', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/basic/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('basic', {
        external: false,
      });

      html = await Beastcss.process(originalHtml);
    });

    it('should skip processing of external stylesheets', () => {
      expect(html).not.toMatch(
        '<style>h1{color: blue;}p{color: purple;}</style>'
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('fs', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/basic/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('basic', {
        fs,
      });

      html = await Beastcss.process(originalHtml);
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('additional stylesheets', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/additional/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('additional', {
        additionalStylesheets: ['**/additional.css'],
      });

      html = await Beastcss.process(originalHtml);
    });

    it('should insert used css to internal including one from additional style', () => {
      expect(html).toMatch(
        '<style>h1{color: blue;}p{color: purple;}p{background-color: yellow;}</style>'
      );
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('prune source', () => {
    let Beastcss;
    let html;
    let prunedStylesheet;

    beforeAll(async () => {
      const fixture = 'basic';
      const dir = path.resolve(__dirname, `fixtures/${fixture}`);

      await copyDir(dir, path.join(dir, '/dist'));

      const originalHtml = await fs.promises.readFile(
        path.resolve(__dirname, `fixtures/${fixture}/index.html`),
        'utf8'
      );

      Beastcss = instantiateBeastcss(`${fixture}/dist`, { pruneSource: true });

      html = await Beastcss.process(originalHtml);

      await Beastcss.pruneSources();

      prunedStylesheet = await fs.promises.readFile(
        path.resolve(__dirname, `fixtures/basic/dist/style.css`),
        'utf8'
      );
    });

    afterAll(async () => {
      await cleanDist('basic');

      Beastcss.clear();
    });

    it('should insert used css to internal', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should load stylesheet async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });

    it('should prune source stylesheet', () => {
      expect(prunedStylesheet).toMatch(
        'h2.unused{color: red;}p.unused{color: orange;}'
      );
    });
  });

  describe('without asyncload', () => {
    let html;

    beforeAll(async () => {
      const originalHtml = await fs.promises.readFile(
        path.join(__dirname, 'fixtures/basic/index.html'),
        'utf8'
      );

      const Beastcss = instantiateBeastcss('basic', {
        asyncLoadExternalStylesheets: false,
      });

      html = await Beastcss.process(originalHtml);
    });

    it('should not load stylesheet async', () => {
      expect(html).not.toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });

    it('should match html snapshot', () => {
      expect(html).toMatchSnapshot();
    });
  });

  describe('logger', () => {
    beforeAll(() => {
      jest.spyOn(console, 'trace').mockImplementation();
      jest.spyOn(console, 'debug').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("should log until 'info' level", () => {
      const Beastcss = instantiateBeastcss('basic', { logLevel: 'info' });

      Beastcss.logger.trace();
      Beastcss.logger.debug();
      Beastcss.logger.info();
      Beastcss.logger.warn();
      Beastcss.logger.error();

      expect(console.trace.mock.results).toHaveLength(0);
      expect(console.debug.mock.results).toHaveLength(0);
      expect(console.info.mock.results).toHaveLength(1);
      expect(console.warn.mock.results).toHaveLength(1);
      expect(console.error.mock.results).toHaveLength(1);
    });

    it('should call console.info with correct value', () => {
      const Beastcss = instantiateBeastcss('basic', { logLevel: 'info' });

      Beastcss.logger.info('message');

      expect(console.info.mock.results).toHaveLength(1);
      expect(console.info.mock.calls[0][0]).toBe(chalk.bold.blue('message'));
    });

    it('should log with custom logger', () => {
      const Beastcss = instantiateBeastcss(null, {
        logger: {
          info: (msg) => console.info(`prefix ${msg}`),
        },
        logLevel: 'info',
      });

      Beastcss.logger.info('message');

      expect(console.info.mock.results).toHaveLength(1);
      expect(console.info.mock.calls[0][0]).toBe('prefix message');
    });
  });

  describe('prune source after multiple html processed', () => {
    let Beastcss;
    let html;
    let css;

    beforeAll(async () => {
      const fixture = 'multiple';
      const dir = path.join(__dirname, `fixtures/${fixture}/`);

      await copyDir(dir, path.join(dir, '/dist'));

      Beastcss = instantiateBeastcss(`${fixture}/dist`, {
        pruneSource: true,
      });
    });

    describe('first run', () => {
      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/multiple/index.html'),
          'utf8'
        );

        html = await Beastcss.process(originalHtml);
      });

      it('should insert used css to internal', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}p{color: purple;}</style>'
        );
      });
    });

    describe('last run', () => {
      beforeAll(async () => {
        const originalHtml = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/multiple/index2.html'),
          'utf8'
        );

        html = await Beastcss.process(originalHtml);

        await Beastcss.pruneSources();

        css = await fs.promises.readFile(
          path.join(__dirname, 'fixtures/multiple/dist/style.css'),
          'utf8'
        );
      });

      afterAll(async () => {
        await cleanDist('multiple');
      });

      it('should insert used css to internal', async () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}h2{color: red;}p{color: purple;}p.bold{font-weight: bold;}</style>'
        );
      });

      it('should match stylesheet snapshot', () => {
        expect(css).toMatchSnapshot();
      });
    });
  });
});
