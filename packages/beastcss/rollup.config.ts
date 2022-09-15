import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import type { RollupOptions } from 'rollup';

import { name } from './package.json';

const bundle = (config: RollupOptions) => ({
  input: 'src/index.ts',
  external: (id: string) => !/^[./]/.test(id),
  ...config,
});

export default [
  bundle({
    plugins: [
      esbuild({
        tsconfig: './tsconfig.build.json',
      }),
    ],
    output: [
      {
        file: `dist/${String(name)}.cjs`,
        format: 'cjs',
        sourcemap: true,
        exports: 'auto',
        generatedCode: {
          constBindings: true,
        },
      },
      {
        file: `dist/${String(name)}.mjs`,
        format: 'es',
        sourcemap: true,
        generatedCode: {
          constBindings: true,
        },
      },
    ],
  }),
  bundle({
    plugins: [
      dts({
        respectExternal: true,
      }),
      {
        name: 'fix-cjs-default-export',
        renderChunk(code) {
          return {
            code: code.replace(
              'export { Beastcss as default };',
              'export = Beastcss;'
            ),
          };
        },
      },
    ],
    input: './temp/index.d.ts',
    output: {
      file: `dist/${String(name)}.d.ts`,
      format: 'es',
      generatedCode: {
        constBindings: true,
      },
    },
  }),
];
