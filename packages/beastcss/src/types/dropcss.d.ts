declare module '@freddy38510/dropcss' {
  interface DropcssOptions {
    html: string;
    css: string;
    keepText?: boolean;
    dropUsedFontFace?: boolean;
    dropUsedKeyframes?: boolean;
    shouldDrop?: (sel: string) => boolean;
    didRetain?: (sel: string) => void;
  }

  export default function dropcss(opts: DropcssOptions): {
    css: string;
  };
}
