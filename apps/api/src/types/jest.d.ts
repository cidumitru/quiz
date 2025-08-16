/// <reference types="jest" />

// This file ensures Jest globals are available in TypeScript
// without needing to import them in every test file

declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom Jest matchers here if needed
    }
  }
}

// Ensure Jest globals are available
declare const describe: jest.Describe;
declare const it: jest.It;
declare const test: jest.It;
declare const expect: jest.Expect;
declare const beforeAll: jest.Lifecycle;
declare const beforeEach: jest.Lifecycle;
declare const afterAll: jest.Lifecycle;
declare const afterEach: jest.Lifecycle;
declare const jest: jest.Jest;

export {};