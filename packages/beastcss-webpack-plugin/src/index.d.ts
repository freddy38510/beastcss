export default BeastcssWebpackPlugin;

import type Beastcss from 'beastcss';
import type { Compilation, Compiler, Asset } from 'webpack';
import type { RawSource } from 'webpack-sources';

declare class BeastcssWebpackPlugin extends Beastcss {
  private compilation: Compilation;
  private sources: { RawSource: RawSource };

  apply(compiler: Compiler): void;

  run(compiler: Compiler): void;

  runWithoutHtmlWebpackPlugin(
    assets: { [key: string]: Asset }[]
  ): Promise<void>;

  findHtmlAssets(
    assets: { [key: string]: Asset }[]
  ): { name: string; html: string | Buffer }[];
}
