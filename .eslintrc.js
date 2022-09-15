const { defineConfig } = require('eslint-define-config');
const path = require('path');

module.exports = defineConfig({
  root: true,
  env: {
    node: true,
    jest: true,
  },
  plugins: ['jest'],
  extends: ['airbnb-base', 'plugin:jest/recommended', 'prettier'],
  ignorePatterns: ['node_modules', 'dist', 'temp'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:jest/recommended',
        'prettier',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: [
          './packages/beastcss/tsconfig.json',
          './packages/beastcss-webpack-plugin/tsconfig.json',
        ],
      },
      rules: {
        'no-param-reassign': ['error', { props: false }],
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            packageDir: [
              __dirname,
              path.join(__dirname, 'packages/beastcss'),
              path.join(__dirname, 'packages/beastcss-webpack-plugin'),
            ],
          },
        ],
      },
    },
  ],
});
