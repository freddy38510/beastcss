module.exports = {
  testEnvironment: 'node',
  projects: [
    {
      preset: 'es-jest',
      displayName: 'beastcss',
      testMatch: ['<rootDir>/packages/beastcss/**/?(*.)+(spec|test).[jt]s?(x)'],
    },
    {
      preset: 'es-jest',
      displayName: 'beastcss-webpack-plugin',
      testMatch: [
        '<rootDir>/packages/beastcss-webpack-plugin/**/?(*.)+(spec|test).[jt]s?(x)',
      ],
      moduleNameMapper: {
        '^beastcss$': '<rootDir>/packages/beastcss/src/index.ts',
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
