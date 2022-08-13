const path = require('path');

module.exports = {
  env: {
    es2017: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'prettier',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:jsdoc/recommended',
  ],
  // parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
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
};
