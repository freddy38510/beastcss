import { parse, HTMLElement, type Node } from 'node-html-parser';

export declare class ExtendedHTMLElement extends HTMLElement {
  public $$external: boolean;

  public before(node: Node): Node;
  public after(node: Node): Node;

  public querySelector(selector: string): ExtendedHTMLElement | null;
  public querySelectorAll(selector: string): ExtendedHTMLElement[];
}

/**
 * Extend `node-html-parser` HTMLElement with `before` and `after` methods.
 */
export const extendHTMLElement = (el: HTMLElement) => {
  const elProto: unknown = Object.getPrototypeOf(el);

  Object.defineProperties(elProto, {
    before: {
      value(this: HTMLElement, node: Node) {
        const idx = this.parentNode.childNodes.findIndex(
          (child: Node) => child === this
        );

        this.parentNode.childNodes.splice(idx, 0, node);

        if (node instanceof HTMLElement) {
          node.parentNode = this.parentNode;
        }

        return node;
      },
      enumerable: true,
      configurable: true,
    },

    after: {
      value(this: HTMLElement, node: Node) {
        const idx = this.parentNode.childNodes.findIndex(
          (child: Node) => child === this
        );

        this.parentNode.childNodes.splice(idx + 1, 0, node);

        if (node instanceof HTMLElement) {
          node.parentNode = this.parentNode;
        }

        return node;
      },
      enumerable: true,
      configurable: true,
    },
  });

  return el as ExtendedHTMLElement;
};

/**
 * Parse HTML into a mutable, serializable DOM Object.
 */
export function parseHTML(html: string): ExtendedHTMLElement {
  const rootElement = parse(html, { comment: true }); // very important to keep comments for SSR

  return extendHTMLElement(rootElement);
}

export { HTMLElement };
