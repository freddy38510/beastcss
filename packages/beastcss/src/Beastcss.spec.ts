import { vol } from 'memfs';
import Beastcss from './Beastcss';
import { defaultLogger } from './utils/logging';

describe('beastcss', () => {
  afterEach(() => {
    vol.reset();
  });

  describe('Basic Usage', () => {
    let html: string;

    beforeAll(async () => {
      html = [
        '<link rel="stylesheet" href="/style.css" media="screen">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
      });

      html = await beastcss.process(html);

      beastcss.clear();
    });

    it('should insert critical css from external stylesheet', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should make external stylesheet loading async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='screen'; this.onload=null;">`
      );
    });
  });

  describe('Html and css contains special characters', () => {
    let html: string;

    beforeAll(async () => {
      html = [
        '<link rel="stylesheet" href="/style.css">',
        '<body>',
        '<p class="with:colon"></p>',
        '<p class="with/slash"></p>',
        '<p class="with?questionmark"></p>',
        '<p class="with(parentheses)"></p>',
        '<p class="with!exclamationmark"></p>',
        '<p class="with<guillemets>"></p>',
        '<p class="with&lt;guillemets&gt;"></p>',
        '<p class="with{brackets}"></p>',
        '<p class="with[square-brackets]"></p>',
        '<p class="with:[mixed/chars]"></p>',
        '</body>',
      ].join('\n');

      // double the backslashes to actually include them.
      vol.fromJSON({
        './style.css': [
          `.with\\:colon { color: blue; }`,
          `.with\\/slash { color: blue; }`,
          `.with\\?questionmark { color: blue; }`,
          `.with\\(parentheses\\) { color: blue; }`,
          `.with\\!exclamationmark { color: blue; }`,
          `.with\\<guillemets\\> { color: blue; }`,
          `.with\\{brackets\\} { color: blue; }`,
          `.with\\[square-brackets\\] { color: blue; }`,
          `.with\\:\\[mixed\\/chars\\] { color: blue; }`,
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
      });

      html = await beastcss.process(html);

      beastcss.clear();
    });

    it('should insert critical css from external stylesheet', () => {
      const matches = html.match(/<style>(.*)<\/style>/gms);

      const stylesTagContent = matches && matches[0];

      expect(stylesTagContent).toMatch('.with\\:colon');
      expect(stylesTagContent).toMatch('.with\\/slash');
      expect(stylesTagContent).toMatch('.with\\?questionmark');
      expect(stylesTagContent).toMatch('.with\\(parentheses\\)');
      expect(stylesTagContent).toMatch('.with\\!exclamationmark');
      expect(stylesTagContent).toMatch('.with\\<guillemets\\>');
      expect(stylesTagContent).toMatch('.with\\{brackets\\}');
      expect(stylesTagContent).toMatch('.with\\[square-brackets\\]');
      expect(stylesTagContent).toMatch('.with\\:\\[mixed\\/chars\\]');
    });

    it('should keep original html class names', () => {
      const matches = html.match(/<body>(.*)<\/body>/gms);

      const bodyTagContent = matches && matches[0];

      expect(bodyTagContent).toMatch('with:colon');
      expect(bodyTagContent).toMatch('with/slash');
      expect(bodyTagContent).toMatch('with?questionmark');
      expect(bodyTagContent).toMatch('with(parentheses)');
      expect(bodyTagContent).toMatch('with!exclamationmark');
      expect(bodyTagContent).toMatch('with<guillemets>');
      expect(bodyTagContent).toMatch('with&lt;guillemets&gt;');
      expect(bodyTagContent).toMatch('with{brackets}');
      expect(bodyTagContent).toMatch('with[square-brackets]');
      expect(bodyTagContent).toMatch('with:[mixed/chars]');
    });
  });

  describe('whitelist option', () => {
    describe('Array of Strings', () => {
      it('should insert whitelisted css rules from external stylesheet', async () => {
        let html = [
          '<link rel="stylesheet" href="/style.css">',
          '<h1>Hello World!</h1>',
          '<p>This is a paragraph</p>',
        ].join('\n');

        vol.fromJSON({
          './style.css': [
            'h1 { color: blue; }',
            'h2.unused { color: red; }',
            'p { color: purple; }',
            'p.unused { color: orange; }',
          ].join('\n'),
        });

        const beastcss = new Beastcss({
          logLevel: 'silent',
          fs: vol as unknown as Beastcss.FSLike,
          whitelist: ['h2.unused', 'p.unused'],
        });

        html = await beastcss.process(html);

        beastcss.clear();

        expect(html).toMatch(
          '<style>h1{color: blue;}h2.unused{color: red;}p{color: purple;}p.unused{color: orange;}</style>'
        );
      });
    });

    describe('Array of Regexp', () => {
      it('should insert whitelisted css rules from external stylesheet', async () => {
        let html = [
          '<link rel="stylesheet" href="/style.css">',
          '<h1>Hello World!</h1>',
          '<p>This is a paragraph</p>',
        ].join('\n');

        vol.fromJSON({
          './style.css': [
            'h1 { color: blue; }',
            'h2.unused { color: red; }',
            'p { color: purple; }',
            'p.unused { color: orange; }',
          ].join('\n'),
        });

        const beastcss = new Beastcss({
          logLevel: 'silent',
          fs: vol as unknown as Beastcss.FSLike,
          whitelist: [/h2/, /p/],
        });

        html = await beastcss.process(html);

        beastcss.clear();

        expect(html).toMatch(
          '<style>h1{color: blue;}h2.unused{color: red;}p{color: purple;}p.unused{color: orange;}</style>'
        );
      });
    });
  });

  describe('externalThreshold option matched', () => {
    it('should insert all css from external stylesheet', async () => {
      const css = [
        'h1 { color: blue; }',
        'h2.unused { color: red; }',
        'p { color: purple; }',
        'p.unused { color: orange; }',
      ].join('\n');

      let html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': css,
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        externalThreshold: 10000,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(css);
    });
  });

  describe('internal option by default', () => {
    it('should remove non critical css from internal stylesheet', async () => {
      jest.spyOn(console, 'info').mockImplementation(() => {});

      const css = [
        'h1 { color: blue; }',
        'h2.unused { color: red; }',
        'p { color: purple; }',
        'p.unused { color: orange; }',
      ].join('\n');

      let html = [
        `<style>${css}</style>`,
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss();

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should remove style tag if there is no critical css', async () => {
      const css = [
        'h2.unused { color: red; }',
        'p.unused { color: orange; }',
      ].join('\n');

      let html = [
        `<style>${css}</style>`,
        `<style empty></style>`,
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss({
        logLevel: 'silent',
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).not.toMatch(/<style>.*<\/style>/);
    });
  });

  describe('exclude option matched', () => {
    describe('Function', () => {
      let html: string;

      beforeAll(async () => {
        html = [
          '<link rel="stylesheet" href="/style.css">',
          '<h1>Hello World!</h1>',
          '<p>This is a paragraph</p>',
        ].join('\n');

        vol.fromJSON({
          './style.css': [
            'h1 { color: blue; }',
            'h2.unused { color: red; }',
            'p { color: purple; }',
            'p.unused { color: orange; }',
          ].join('\n'),
          './excluded.css': 'p { color: green; }',
        });

        const beastcss = new Beastcss({
          logLevel: 'silent',
          fs: vol as unknown as Beastcss.FSLike,
          additionalStylesheets: ['excluded.css'],
          exclude: (url: string) => /excluded\.css$/.test(url),
        });

        html = await beastcss.process(html);

        beastcss.clear();
      });

      it('should insert critical css from non-excluded external stylesheet', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}p{color: purple;}</style>'
        );
      });
    });

    describe('Regexp', () => {
      let html: string;

      beforeAll(async () => {
        html = [
          '<link rel="stylesheet" href="/style.css">',
          '<link rel="stylesheet" href="/excluded.css">',
          '<h1>Hello World!</h1>',
          '<p>This is a paragraph</p>',
        ].join('\n');

        vol.fromJSON({
          './style.css': [
            'h1 { color: blue; }',
            'h2.unused { color: red; }',
            'p { color: purple; }',
            'p.unused { color: orange; }',
          ].join('\n'),
          './excluded.css': 'p { color: green; }',
        });

        const beastcss = new Beastcss({
          logLevel: 'silent',
          fs: vol as unknown as Beastcss.FSLike,
          exclude: /excluded\.css$/,
        });

        html = await beastcss.process(html);

        beastcss.clear();
      });

      it('should insert critical css from non-excluded external stylesheet', () => {
        expect(html).toMatch(
          '<style>h1{color: blue;}p{color: purple;}</style>'
        );
      });

      it('should make non-excluded external stylesheet loading async', () => {
        expect(html).toMatch(
          `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
        );

        expect(html).toMatch(`<link rel="stylesheet" href="/excluded.css">`);
      });
    });
  });

  describe('external option disabled', () => {
    it('should skip processing of external stylesheets', async () => {
      let html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        external: false,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).not.toMatch(/<style>.*<\/style>/);

      expect(html).not.toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });
  });

  describe('fs option customized', () => {
    it('should insert critical css from external stylesheet', async () => {
      let html = [
        '<head><link rel="stylesheet" href="/style.css"></head>',
        '<h1>Hello World!</h1>',
        '<h3>An other title</h3>',
        '<h4>Again a title</h4>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
        ].join('\n'),
        './additional.css': [
          'h3 { color: blue; }',
          'h4.unused { color: red; }',
        ].join('\n'),
        './additional2.css': [
          'h3.unused { color: blue; }',
          'h4 { color: red; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol.promises as unknown as Beastcss.FSLike,
        additionalStylesheets: ['**/additional*.css'],
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style>h1{color: blue;}h3{color: blue;}h4{color: red;}</style>'
      );
    });
  });

  describe('additionalStylesheets option', () => {
    it('should insert critical css from additional stylesheets', async () => {
      let html = [
        '<head><link rel="stylesheet" href="/style.css"></head>',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
        ].join('\n'),
        './additional.css': 'p { background-color: yellow; }',
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        additionalStylesheets: ['additional.css'],
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style>h1{color: blue;}p{background-color: yellow;}</style>'
      );
    });
  });

  describe('pruneSource option enabled', () => {
    it('should prune external stylesheet', async () => {
      const html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const html2 = [
        '<link rel="stylesheet" href="/style.css">',
        '<h2>Hello World from html 2!</h2>',
        '<p class="bold">This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2 { color: red; }',
          'p { color: purple; }',
          'p.unused { color: orange; }',
          'p.bold { font-weight: bold; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        pruneSource: true,
      });

      await Promise.all([
        beastcss.process(html, 'html1'),
        beastcss.process(html2, 'html2'),
      ]);

      await beastcss.pruneSources();

      beastcss.clear();

      const prunedStylesheet = await vol.promises.readFile(
        './style.css',
        'utf8'
      );

      expect(prunedStylesheet).toMatch('p.unused{color: orange;}');
    });

    it('should remove external stylesheet totally pruned', async () => {
      const html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
      ].join('\n');

      const html2 = [
        '<link rel="stylesheet" href="/style.css">',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': ['h1 { color: blue; }', 'p { color: purple; }'].join(
          '\n'
        ),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        pruneSource: true,
      });

      await Promise.all([beastcss.process(html), beastcss.process(html2)]);

      await beastcss.pruneSources();

      beastcss.clear();

      const files = await vol.promises.readdir('./');

      expect(files).not.toContain('style.css');
    });
  });

  describe('asyncLoadExternalStylesheets option disabled', () => {
    it('should not make external stylesheet loading async', async () => {
      const html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        asyncLoadExternalStylesheets: false,
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(html).not.toMatch(
        `<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });
  });

  describe('keyframes option by default', () => {
    it('should insert critical @keyframes rules from external stylesheet', async () => {
      let html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1 class="used">Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          '.used { animation: used 100ms ease forwards 1; }',
          '@keyframes used { 0% { opacity: 0; } }',
          '.unused { animation: unused 100ms ease forwards 1; }',
          '@keyframes unused { 0% { opacity: 0; } }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style>.used{animation: used 100ms ease forwards 1;}@keyframes used{0% { opacity: 0; } }</style>'
      );
    });
  });

  describe('fontFace option enabled', () => {
    it('should insert critical @font-face rules from external stylesheet', async () => {
      let html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1 class="used">Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          ".used { font-family: 'Used'; }",
          '@font-face { font-family: Used; src: local("Helvetica Neue Bold"); }',
          ".unused { font-family: 'Unused';}",
          '@font-face { font-family: Unused; src: local("HelveticaNeue-Bold"); }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        fontFace: true,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style>.used{font-family: \'Used\';}@font-face{font-family: Used; src: local("Helvetica Neue Bold"); }</style>'
      );
    });
  });

  describe('preloadExternalStylesheets option enabled', () => {
    it('should insert a link tag for preloading before the original link tag', async () => {
      let html = [
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        asyncLoadExternalStylesheets: false,
        preloadExternalStylesheets: true,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        `<link rel="preload" href="/style.css" as="style"><link rel="stylesheet" href="/style.css">`
      );
    });
  });

  describe('publicPath option customized', () => {
    let html: string;

    beforeAll(async () => {
      html = [
        '<link rel="stylesheet" href="/public/style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'h1 { color: blue; }',
          'h2.unused { color: red; }',
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        publicPath: '/public/',
      });

      html = await beastcss.process(html);

      beastcss.clear();
    });

    it('should insert critical css from external stylesheet', () => {
      expect(html).toMatch('<style>h1{color: blue;}p{color: purple;}</style>');
    });

    it('should make external stylesheet loading async', () => {
      expect(html).toMatch(
        `<link rel="stylesheet" href="/public/style.css" media="print" onload="this.media='all'; this.onload=null;">`
      );
    });
  });

  describe('merge option by default', () => {
    it('should merge all stylesheets in one style tag', async () => {
      let html = [
        `<style attr="value">h1 { color: blue; } h2.unused { color: red; }</style>`,
        `<style attr="valuebis" attr2="value">h1 { font-size: 24px; } h2.unused { font-size: 24px; }</style>`,
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
        '<h2>Hello World bis!</h2>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style attr="value valuebis" attr2="value">h1{color: blue;}h1{font-size: 24px;}p{color: purple;}</style>'
      );
    });

    it('should merge all stylesheets except internal ones in one style tag', async () => {
      let html = [
        `<style>h1 { color: blue; } h2.unused { color: red; }</style>`,
        '<link rel="stylesheet" href="/style.css">',
        '<link rel="stylesheet" href="/style2.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
        './style2.css': [
          'p { font-weight: bold; }',
          'p.unused { font-size: 14px; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        internal: false,
        fs: vol as unknown as Beastcss.FSLike,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<style>h1 { color: blue; } h2.unused { color: red; }</style>'
      );

      expect(html).toMatch(
        '<style>p{color: purple;}p{font-weight: bold;}</style>'
      );
    });
  });

  describe('noScript option enabled', () => {
    it('should insert a noscript tag containing original link tag', async () => {
      let html = [
        '<link rel="stylesheet" href="/style.css" media="screen">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logLevel: 'silent',
        fs: vol as unknown as Beastcss.FSLike,
        noscriptFallback: true,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(
        '<noscript><link rel="stylesheet" href="/style.css" media="screen"></noscript>'
      );
    });
  });

  describe('Debugs logging', () => {
    let spyDebug: jest.SpyInstance;

    beforeAll(() => {
      jest.spyOn(defaultLogger, 'info').mockImplementation();
      spyDebug = jest.spyOn(defaultLogger, 'debug').mockImplementation();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should output debug message if preload link is already there', async () => {
      const html = [
        '<link rel="preload" href="/style.css" as="style">',
        '<link rel="stylesheet" href="/style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': [
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        fs: vol as unknown as Beastcss.FSLike,
        logLevel: 'debug',
        logger: defaultLogger,
        preloadExternalStylesheets: true,
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(spyDebug.mock.results).toHaveLength(1);
      expect((spyDebug.mock.calls[0] as string[])[0]).toBe(
        'Skip adding the preload link as it is already there.'
      );
    });

    it('should output debug message when stylesheet is excluded', async () => {
      const html = [
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/css/bootstrap.min.css">',
        '<h1>Hello World!</h1>',
      ].join('\n');

      vol.fromJSON({
        './additional.css': 'p { color: purple; }',
      });

      const beastcss = new Beastcss({
        fs: vol as unknown as Beastcss.FSLike,
        logLevel: 'debug',
        logger: defaultLogger,
        exclude: /additional\.css/,
        additionalStylesheets: ['additional.css'],
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(spyDebug.mock.results).toHaveLength(2);
      expect((spyDebug.mock.calls[0] as string[])[0]).toMatch(
        'Excluded external stylesheet'
      );
      expect((spyDebug.mock.calls[1] as string[])[0]).toMatch(
        'Excluded additional stylesheet'
      );
    });
  });

  describe('Infos logging', () => {
    let spyInfo: jest.SpyInstance;

    beforeAll(() => {
      spyInfo = jest.spyOn(defaultLogger, 'info').mockImplementation();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should output info message if no non-critical css rules was removed.', async () => {
      const css = 'h1{color: blue;}p{color: purple;}';

      let html = [
        `<style>${css}</style>`,
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss({
        logger: defaultLogger,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).toMatch(`<style>${css}</style>`);

      expect(spyInfo.mock.results).toHaveLength(1);
      expect((spyInfo.mock.calls[0] as string[])[0]).toBe(
        'No non-critical css rules was removed.'
      );
    });

    it('should output info message if no stylesheets was pruned', async () => {
      const html = [
        '<link rel="stylesheet" href="/style.css">',
        '<link rel="stylesheet" href="/unvailable.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const css = 'h2{color: blue;}a{color: purple;}';

      vol.fromJSON({
        './style.css': css,
      });

      const beastcss = new Beastcss({
        fs: vol as unknown as Beastcss.FSLike,
        logger: defaultLogger,
        pruneSource: true,
      });

      await beastcss.process(html);

      await beastcss.pruneSources();

      beastcss.clear();

      const stylesheet = await vol.promises.readFile('./style.css', 'utf-8');

      expect(stylesheet).toBe(css);

      expect(spyInfo.mock.results).toHaveLength(3);
      expect((spyInfo.mock.calls[2] as string[])[0]).toBe(
        'No stylesheets was pruned.'
      );
    });

    it('should output info message if internal stylesheet was removed', async () => {
      const css = 'h2{color: blue;}a{color: purple;}';

      let html = [
        `<style>${css}</style>`,
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss({
        logger: defaultLogger,
      });

      html = await beastcss.process(html);

      beastcss.clear();

      expect(html).not.toMatch(`<style>.*</style>`);

      expect(spyInfo.mock.results).toHaveLength(2);
      expect((spyInfo.mock.calls[0] as string[])[0]).toMatch(
        'Removed internal stylesheet'
      );
    });

    it('should output info message if external stylesheet was removed', async () => {
      let html = [
        '<link rel="stylesheet" href="./style.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      vol.fromJSON({
        './style.css': 'h1{color: blue;}p{color: purple;}',
      });

      const beastcss = new Beastcss({
        logger: defaultLogger,
        fs: vol as unknown as Beastcss.FSLike,
        pruneSource: true,
      });

      html = await beastcss.process(html);

      await beastcss.pruneSources();

      beastcss.clear();

      const files = await vol.promises.readdir('./');

      expect(html).not.toMatch(`<style>.*</style>`);
      expect(files).not.toContain('style.css');
      expect(spyInfo.mock.results).toHaveLength(2);
      expect((spyInfo.mock.calls[1] as string[])[0]).toMatch(
        'Removed external stylesheet'
      );
    });
  });

  describe('Warnings logging', () => {
    let spyWarn: jest.SpyInstance;

    beforeAll(() => {
      spyWarn = jest.spyOn(defaultLogger, 'warn').mockImplementation();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should output warning message if external stylesheet is not found', async () => {
      const html = [
        '<link rel="stylesheet" href="/unvailable.css">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss({
        logger: defaultLogger,
        logLevel: 'warn',
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(spyWarn.mock.results).toHaveLength(1);
      expect((spyWarn.mock.calls[0] as string[])[0]).toMatch(
        /External stylesheet ".*" not found\./
      );
    });

    it('should output warning message if external stylesheet is missing href attribute', async () => {
      const html = [
        '<link rel="stylesheet">',
        '<h1>Hello World!</h1>',
        '<p>This is a paragraph</p>',
      ].join('\n');

      const beastcss = new Beastcss({
        logger: defaultLogger,
        logLevel: 'warn',
        preloadExternalStylesheets: true,
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(spyWarn.mock.results).toHaveLength(1);

      expect((spyWarn.mock.calls[0] as string[])[0]).toBe(
        'External stylesheet href attribute is missing.'
      );
    });

    it('should output warning message if head tag is missing', async () => {
      const html = ['<h1>Hello World!</h1>', '<p>This is a paragraph</p>'].join(
        '\n'
      );

      vol.fromJSON({
        './additional.css': [
          'p { color: purple; }',
          'p.unused { color: orange; }',
        ].join('\n'),
      });

      const beastcss = new Beastcss({
        logger: defaultLogger,
        logLevel: 'warn',
        fs: vol as unknown as Beastcss.FSLike,
        additionalStylesheets: ['additional.css'],
      });

      await beastcss.process(html);

      beastcss.clear();

      expect(spyWarn.mock.results).toHaveLength(1);

      expect((spyWarn.mock.calls[0] as string[])[0]).toBe(
        'Unable to insert style tag because head tag is missing.'
      );
    });
  });

  describe('Errors logging', () => {
    let spyError: jest.SpyInstance;

    beforeAll(() => {
      spyError = jest.spyOn(defaultLogger, 'error').mockImplementation();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should output and throw error if unable to parse css', async () => {
      const beastcss = new Beastcss({
        logger: defaultLogger,
        logLevel: 'error',
      });

      await expect(
        beastcss.process(
          '<style>.dark:error() { color: black }</style><div class="dark"></div>'
        )
      ).rejects.toThrow(Error);

      beastcss.clear();

      expect(spyError.mock.results).toHaveLength(1);
      expect((spyError.mock.calls[0] as string[])[0]).toMatch(
        /Unable to parse css or html/
      );
    });
  });
});
