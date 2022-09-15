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
  collectCoverageFrom: [
    'packages/**/src/**/*.ts',
    '!**/node_modules/**',
    '!**/src/**/*.spec.ts',
    '!**/src/**/index.ts',
  ],
  coverageReporters: ['text'],
  watchPathIgnorePatterns: ['node_modules', 'dist'],
};
