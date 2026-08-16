/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  silent: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Какие файлы включать в покрытие
  collectCoverageFrom: [
    'src/**/*.js',
  ],
  transform: {},
}
