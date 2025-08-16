export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/jest-setup.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest', 
      { 
        tsconfig: '<rootDir>/tsconfig.spec.json',
      }
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
    '!src/migrations/**',
    '!src/jest-setup.ts',
  ],
};