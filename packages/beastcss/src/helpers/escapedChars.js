/**
 * Replace specials characters in html class attributes by unique strings
 *
 * @param {string} html an html string
 * @returns {string} html string ready for dropcss parser
 */
export function replaceHTMLClasses(html) {
  return html.replace(
    /class=["'][^"']*["']/gm,
    (m) =>
      m
        .replace(/:/gm, '__0') // :
        .replace(/\//gm, '__1') // /
        .replace(/\?/gm, '__2') // ?
        .replace(/\(/gm, '__3') // (
        .replace(/\)/gm, '__4') // )
        .replace(/!/gm, '__5') // !
        .replace(/<|&lt;/gm, '__6') // < or &lt;
        .replace(/>|&gt;/gm, '__7') // > or &gt;
        .replace(/{/gm, '__8') // {
        .replace(/}/gm, '__9') // }
        .replace(/\[/gm, '__10') // [
        .replace(/\]/gm, '__11') // ]
  );
}

/**
 * Replace escaped specials characters in css selectors by unique strings
 *
 * @param {string} css a css string
 * @returns {string} css string ready for dropcss parser
 */
export function replaceCSSSelectors(css) {
  return css
    .replace(/\\:/gm, '__0') // \:
    .replace(/\\\//gm, '__1') // \/
    .replace(/\\\?/gm, '__2') // \?
    .replace(/\\\(/gm, '__3') // \(
    .replace(/\\\)/gm, '__4') // \)
    .replace(/\\!/gm, '__5') // \!
    .replace(/\\</gm, '__6') // \<
    .replace(/\\>/gm, '__7') // \>
    .replace(/\\{/gm, '__8') // \{
    .replace(/\\}/gm, '__9') // \}
    .replace(/\\\[/gm, '__10') // \[
    .replace(/\\\]/gm, '__11'); // \]
}

/**
 * Restore escaped specials characters in css selectors replaced by unique strings
 *
 * Done in reverse order to avoid mismatching unique strings
 *
 * @param {string} css a css string
 * @returns {string} css string with escaped/specials characters in css selectors restored
 */
export function restoreCSSSelectors(css) {
  return css
    .replace(/__11/gm, '\\]')
    .replace(/__10/gm, '\\[')
    .replace(/__9/gm, '\\}')
    .replace(/__8/gm, '\\{')
    .replace(/__7/gm, '\\>')
    .replace(/__6/gm, '\\<')
    .replace(/__5/gm, '\\!')
    .replace(/__4/gm, '\\)')
    .replace(/__3/gm, '\\(')
    .replace(/__2/gm, '\\?')
    .replace(/__1/gm, '\\/')
    .replace(/__0/gm, '\\:');
}
