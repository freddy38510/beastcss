import { defineConfig, type RollupOptions } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';

const name = 'beastcss';

const bundle = (config: RollupOptions) => ({
  input: 'src/index.ts',
  external: (id: string) => !/^[./]/.test(id),
  ...config,
});

export default defineConfig((args) => {
  const isWatch = !!args.w || !!args.watch;

  const options = [
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
  ];

  if (isWatch) {
    return options;
  }

  options.push(
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
    })
  );

  return options;
});
