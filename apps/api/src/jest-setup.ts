import 'jest';

// Global Jest setup for the API project
// This file ensures Jest globals are available throughout test files

// Optional: Add any global test setup here
// Example: global database setup, test utilities, etc.

// Extend Jest matchers if needed
// import '@testing-library/jest-dom'; // if using testing-library

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});