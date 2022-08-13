import copy from 'rollup-plugin-copy';
import { main, module, dependencies } from './package.json';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: './src/index.js',
  output: [
    {
      format: 'cjs',
      file: main,
      sourcemap: true,
      strict: false,
      interop: 'default',
      exports: 'default',
      preferConst: true,
    },
    {
      format: 'es',
      file: module,
      sourcemap: true,
      minifyInternalExports: false,
      preferConst: true,
    },
  ],
  external: [...Object.keys(dependencies), 'path', 'fs', './schema.json'],
  plugins: [
    copy({
      targets: [
        { src: 'src/schema.json', dest: 'dist' },
        { src: 'src/index.d.ts', dest: 'dist' },
      ],
    }),
  ],
};

export default config;
