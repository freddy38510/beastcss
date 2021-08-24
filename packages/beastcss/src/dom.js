import { parse, HTMLElement } from 'node-html-parser';

const ElementPrototypeProperties = {
  before: {
    value(newNode) {
      const idx = this.parentNode.childNodes.findIndex(
        (child) => child === this
      );

      this.parentNode.childNodes.splice(idx, 0, newNode);

      if (newNode instanceof HTMLElement) {
        newNode.parentNode = this.parentNode;
      }

      return newNode;
    },
    enumerable: true,
  },

  after: {
    value(newNode) {
      const idx = this.parentNode.childNodes.findIndex(
        (child) => child === this
      );

      this.parentNode.childNodes.splice(idx + 1, 0, newNode);

      if (newNode instanceof HTMLElement) {
        newNode.parentNode = this.parentNode;
      }

      return newNode;
    },
    enumerable: true,
  },
};

/**
 * Parse HTML into a mutable, serializable DOM Object.
 * The DOM implementation is an node-html-parser DOM enhanced with basic DOM mutation methods.
 *
 * @param {string} html   HTML to parse
 * @augments node-html-parser.HTMLElement.prototype
 * @returns {import('node-html-parser').HTMLElement} root AST HTML element with its children augmented with `before` and `after` methods.
 */
export default function parseHTML(html) {
  const rootElement = parse(html, { comment: true }); // very important to keep comments for SSR

  const rootElementProto = Object.getPrototypeOf(rootElement);

  Object.defineProperties(rootElementProto, ElementPrototypeProperties);

  return rootElement;
}
