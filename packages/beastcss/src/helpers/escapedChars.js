/**
 * Replace escaped specials characters in html class attributes by unique strings
 *
 * @param {string} html an html string
 * @returns {string} html string ready for drop-css parser
 */
export function replaceHTMLClasses(html) {
  return html.replace(/class=["'][^"']*["']/gm, (m) =>
    m
      .replace(/:/gm, '__0')
      .replace(/\//gm, '__1')
      .replace(/\?/gm, '__2')
      .replace(/\(/gm, '__3')
      .replace(/\)/gm, '__4')
  );
}

/**
 * Replace escaped specials characters in css selectors by unique strings
 *
 * @param {string} css a css string
 * @returns {string} css string ready for drop-css parser
 */
export function replaceCSSSelectors(css) {
  return css
    .replace(/\\:/gm, '__0')
    .replace(/\\\//gm, '__1')
    .replace(/\\\?/gm, '__2')
    .replace(/\\\(/gm, '__3')
    .replace(/\\\)/gm, '__4');
}

/**
 * Restore escaped specials characters in css selectors replaced by unique strings with cleanCSSForParser()
 *
 * @param {string} css a css string
 * @returns {string} css string with escaped/specials characters in css selectors restored
 */
export function restoreCSSSelectors(css) {
  return css
    .replace(/__0/gm, '\\:')
    .replace(/__1/gm, '\\/')
    .replace(/__2/gm, '\\?')
    .replace(/__3/gm, '\\(')
    .replace(/__4/gm, '\\)');
}
