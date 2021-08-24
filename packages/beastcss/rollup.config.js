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
  external: [...Object.keys(dependencies), /core-js/, 'path', 'fs'],
  plugins: [
    copy({
      targets: [{ src: 'src/index.d.ts', dest: 'dist' }],
    }),
  ],
};

export default config;
