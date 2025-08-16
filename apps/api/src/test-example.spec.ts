// Simple test to verify Jest TypeScript configuration
describe('TypeScript Jest Configuration', () => {
  it('should recognize Jest globals without imports', () => {
    expect(true).toBe(true);
  });

  it('should support modern TypeScript features', () => {
    const testData = {
      id: 'test-123',
      name: 'Test User',
      email: 'test@gmail.com',
    };

    expect(testData).toMatchObject({
      id: expect.any(String),
      email: expect.stringMatching(/@gmail\.com$/),
    });
  });

  it('should support async/await', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  beforeEach(() => {
    // Jest beforeEach works without imports
  });

  afterEach(() => {
    // Jest afterEach works without imports
  });
});