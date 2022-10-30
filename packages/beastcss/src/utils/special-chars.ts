/**
 * Replace specials characters in html class attributes by unique strings.
 */
export function replaceHTMLClasses(html: string) {
  return html.replace(
    /class=["'][^"']*["']/gm,
    (m) =>
      m
        .replace(/:/gm, '__0__') // :
        .replace(/\//gm, '__1__') // /
        .replace(/\?/gm, '__2__') // ?
        .replace(/\(/gm, '__3__') // (
        .replace(/\)/gm, '__4__') // )
        .replace(/!/gm, '__5__') // !
        .replace(/<|&lt;/gm, '__6__') // < or &lt;
        .replace(/>|&gt;/gm, '__7__') // > or &gt;
        .replace(/{/gm, '__8__') // {
        .replace(/}/gm, '__9__') // }
        .replace(/\[/gm, '__10__') // [
        .replace(/\]/gm, '__11__') // ]
        .replace(/\./gm, '__12__') // .
  );
}

/**
 * Replace escaped specials characters in css selectors by unique strings.
 */
export function replaceCSSSelectors(css: string) {
  return css
    .replace(/\\:/gm, '__0__') // \:
    .replace(/\\\//gm, '__1__') // \/
    .replace(/\\\?/gm, '__2__') // \?
    .replace(/\\\(/gm, '__3__') // \(
    .replace(/\\\)/gm, '__4__') // \)
    .replace(/\\!/gm, '__5__') // \!
    .replace(/\\</gm, '__6__') // \<
    .replace(/\\>/gm, '__7__') // \>
    .replace(/\\{/gm, '__8__') // \{
    .replace(/\\}/gm, '__9__') // \}
    .replace(/\\\[/gm, '__10__') // \[
    .replace(/\\\]/gm, '__11__') // \]
    .replace(/\\\./gm, '__12__'); // \.
}

/**
 * Restore escaped specials characters in css selectors replaced by unique strings.
 */
export function restoreCSSSelectors(css: string) {
  return css
    .replace(/__0__/gm, '\\:')
    .replace(/__1__/gm, '\\/')
    .replace(/__2__/gm, '\\?')
    .replace(/__3__/gm, '\\(')
    .replace(/__4__/gm, '\\)')
    .replace(/__5__/gm, '\\!')
    .replace(/__6__/gm, '\\<')
    .replace(/__7__/gm, '\\>')
    .replace(/__8__/gm, '\\{')
    .replace(/__9__/gm, '\\}')
    .replace(/__10__/gm, '\\[')
    .replace(/__11__/gm, '\\]')
    .replace(/__12__/gm, '\\.');
}
