module.exports = {
  testEnvironment: 'node',
  projects: [
    {
      preset: 'es-jest',
      displayName: 'beastcss',
      rootDir: '<rootDir>/packages/beastcss',
    },
    {
      preset: 'es-jest',
      displayName: 'beastcss-webpack-plugin',
      rootDir: '<rootDir>/packages/beastcss-webpack-plugin',
      moduleNameMapper: {
        '^beastcss$': '<rootDir>/../beastcss/src/index.ts',
      },
    },
  ],
  verbose: true,
  collectCoverage: true,

  coverageReporters: ['text'],
  watchPathIgnorePatterns: ['node_modules', 'dist'],
};
