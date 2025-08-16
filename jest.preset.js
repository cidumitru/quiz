const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.entity.ts',
    '!**/*.dto.ts',
    '!**/*.interface.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};