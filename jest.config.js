/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  silent: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: false,
  coverageDirectory: 'coverage', // папка для отчётов
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Какие файлы включать в покрытие
  collectCoverageFrom: [
    'src/**/*.js',
  ],
  transform: {},
}
