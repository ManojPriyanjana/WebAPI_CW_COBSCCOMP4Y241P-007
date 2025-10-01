export default {
  testEnvironment: 'node',
  transform: {},
  roots: ['<rootDir>/src/test'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/server.js',
    '!src/**/sse.js',
    '!src/**/config/*.js',
    '!src/**/middleware/logger.js',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
}
