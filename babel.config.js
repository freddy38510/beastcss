module.exports = {
  targets: {
    node: '12.0.0',
  },
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: '3.16',
        // debug: true,
      },
    ],
  ],
};
