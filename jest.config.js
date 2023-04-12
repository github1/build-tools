module.exports = {
  verbose: true,
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'node', 'json'],
  testRegex: process.env.TEST_REGEX || '.*\\.test\\.ts$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
