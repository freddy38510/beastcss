module.exports = {
  testEnvironment: 'node',
  verbose: true,
  bail: 1,
  collectCoverage: true,
  collectCoverageFrom: ['packages/**/src/**/*.js', '!**/node_modules/**'],
  coverageReporters: ['text'],
  moduleNameMapper: {
    '^beastcss$': '<rootDir>/packages/beastcss/src/index.js',
  },
  modulePaths: [
    '<rootDir>/packages/beastcss/node_modules',
    '<rootDir>/packages/beastcss-webpack-plugin/node_modules',
  ],
  watchPathIgnorePatterns: ['node_modules', 'dist'],
};
