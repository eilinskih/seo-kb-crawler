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
    '^@seo-kb/common/(.*)$': '<rootDir>/packages/common/src/$1',
    '^@seo-kb/crawler$': '<rootDir>/packages/crawler/src',
    '^@seo-kb/crawler/(.*)$': '<rootDir>/packages/crawler/src/$1',
    '^@seo-kb/db$': '<rootDir>/packages/db/src',
    '^@seo-kb/db/(.*)$': '<rootDir>/packages/db/src/$1',
    '^@seo-kb/discovery-sources$': '<rootDir>/packages/discovery-sources/src',
    '^@seo-kb/discovery-sources/(.*)$':
      '<rootDir>/packages/discovery-sources/src/$1',
    '^@seo-kb/topic-engine$': '<rootDir>/packages/topic-engine/src',
    '^@seo-kb/topic-engine/(.*)$': '<rootDir>/packages/topic-engine/src/$1',
  },
};
