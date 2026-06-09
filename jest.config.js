module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.ts',
    'packages/**/*.ts',
    '!**/main.ts',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@seo-kb/common$': '<rootDir>/packages/common/src',
    '^@seo-kb/db$': '<rootDir>/packages/db/src',
  },
};
