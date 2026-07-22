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
    '^@seo-kb/content-processing$':
      '<rootDir>/packages/content-processing/src',
    '^@seo-kb/content-processing/(.*)$':
      '<rootDir>/packages/content-processing/src/$1',
    '^@seo-kb/context-pack$': '<rootDir>/packages/context-pack/src',
    '^@seo-kb/context-pack/(.*)$':
      '<rootDir>/packages/context-pack/src/$1',
    '^@seo-kb/chunking$': '<rootDir>/packages/chunking/src',
    '^@seo-kb/chunking/(.*)$': '<rootDir>/packages/chunking/src/$1',
    '^@seo-kb/crawler$': '<rootDir>/packages/crawler/src',
    '^@seo-kb/crawler/(.*)$': '<rootDir>/packages/crawler/src/$1',
    '^@seo-kb/db$': '<rootDir>/packages/db/src',
    '^@seo-kb/db/(.*)$': '<rootDir>/packages/db/src/$1',
    '^@seo-kb/embeddings$': '<rootDir>/packages/embeddings/src',
    '^@seo-kb/embeddings/(.*)$': '<rootDir>/packages/embeddings/src/$1',
    '^@seo-kb/entities$': '<rootDir>/packages/entities/src',
    '^@seo-kb/entities/(.*)$': '<rootDir>/packages/entities/src/$1',
    '^@seo-kb/fact-extraction$':
      '<rootDir>/packages/fact-extraction/src',
    '^@seo-kb/fact-extraction/(.*)$':
      '<rootDir>/packages/fact-extraction/src/$1',
    '^@seo-kb/knowledge-pack$':
      '<rootDir>/packages/knowledge-pack/src',
    '^@seo-kb/knowledge-pack/(.*)$':
      '<rootDir>/packages/knowledge-pack/src/$1',
    '^@seo-kb/ontology$': '<rootDir>/packages/ontology/src',
    '^@seo-kb/ontology/(.*)$': '<rootDir>/packages/ontology/src/$1',
    '^@seo-kb/retrieval$': '<rootDir>/packages/retrieval/src',
    '^@seo-kb/retrieval/(.*)$': '<rootDir>/packages/retrieval/src/$1',
    '^@seo-kb/discovery-sources$': '<rootDir>/packages/discovery-sources/src',
    '^@seo-kb/discovery-sources/(.*)$':
      '<rootDir>/packages/discovery-sources/src/$1',
    '^@seo-kb/topic-engine$': '<rootDir>/packages/topic-engine/src',
    '^@seo-kb/topic-engine/(.*)$': '<rootDir>/packages/topic-engine/src/$1',
    '^@seo-kb/url-frontier$': '<rootDir>/packages/url-frontier/src',
    '^@seo-kb/url-frontier/(.*)$':
      '<rootDir>/packages/url-frontier/src/$1',
  },
};
