import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

// Mock os and process modules entirely
jest.mock('os');
jest.mock('process', () => ({
  ...jest.requireActual('process'),
  memoryUsage: jest.fn(),
  uptime: jest.fn(),
}));

describe('HealthService', () => {
  let service: HealthService;

  // Get the mocked modules
  const mockOs = jest.mocked(require('os'));
  const mockProcess = jest.mocked(require('process'));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);

    // Clear previous call history
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return health status with system metrics', () => {
      // Mock system data
      const mockMemoryData = {
        rss: 100 * 1024 * 1024, // 100 MB
        heapTotal: 80 * 1024 * 1024, // 80 MB
        heapUsed: 40 * 1024 * 1024, // 40 MB
        external: 10 * 1024 * 1024, // 10 MB
        arrayBuffers: 5 * 1024 * 1024, // 5 MB
      };

      const totalMemory = 8 * 1024 * 1024 * 1024; // 8 GB
      const freeMemory = 4 * 1024 * 1024 * 1024; // 4 GB
      const uptime = 3600; // 1 hour
      const loadAverage = [0.5, 0.3, 0.2];
      const cpuCores = [
        { model: 'CPU 1', speed: 2400 },
        { model: 'CPU 2', speed: 2400 },
        { model: 'CPU 3', speed: 2400 },
        { model: 'CPU 4', speed: 2400 },
      ];

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(uptime);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue(loadAverage);
      mockOs.cpus.mockReturnValue(cpuCores as any);

      const result = service.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        uptime,
        memory: {
          rss: '100 MB',
          heapTotal: '80 MB',
          heapUsed: '40 MB',
          external: '10 MB',
          systemUsed: '4096 MB', // 4 GB used
          systemFree: '4096 MB', // 4 GB free
          systemTotal: '8192 MB', // 8 GB total
          percentUsed: '50%', // 50% system memory used
        },
        cpu: {
          loadAverage,
          cores: 4,
        },
        warnings: [],
      });
    });

    it('should generate heap usage warning when heap is over 80%', () => {
      const mockMemoryData = {
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024, // 100 MB
        heapUsed: 85 * 1024 * 1024, // 85 MB (85% usage)
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 6 * 1024 * 1024 * 1024; // Low system memory usage

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.warnings).toContain('High heap usage: 85%');
    });

    it('should generate system memory warning when system usage is over 85%', () => {
      const mockMemoryData = {
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024, // Low heap usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 1 * 1024 * 1024 * 1024; // Only 1 GB free (87.5% used)

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.warnings).toContain('High system memory usage: 88%');
    });

    it('should generate RSS memory warning when approaching limit', () => {
      const mockMemoryData = {
        rss: 460 * 1024 * 1024, // 460 MB RSS (over 450 MB limit)
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 6 * 1024 * 1024 * 1024;

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.warnings).toContain('RSS memory approaching limit: 460 MB');
    });

    it('should generate multiple warnings when multiple thresholds are exceeded', () => {
      const mockMemoryData = {
        rss: 460 * 1024 * 1024, // Over RSS limit
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 85 * 1024 * 1024, // Over heap limit (85%)
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 1 * 1024 * 1024 * 1024; // Over system memory limit (87.5%)

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.warnings).toHaveLength(3);
      expect(result.warnings).toContain('High heap usage: 85%');
      expect(result.warnings).toContain('High system memory usage: 88%');
      expect(result.warnings).toContain('RSS memory approaching limit: 460 MB');
    });

    it('should handle zero free memory correctly', () => {
      const mockMemoryData = {
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 0; // No free memory

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.memory.systemFree).toBe('0 MB');
      expect(result.memory.percentUsed).toBe('100%');
      expect(result.warnings).toContain('High system memory usage: 100%');
    });

    it('should handle edge case with very low memory values', () => {
      const mockMemoryData = {
        rss: 1024, // 1 KB
        heapTotal: 1024,
        heapUsed: 512,
        external: 256,
        arrayBuffers: 128,
      };

      const totalMemory = 1024 * 1024; // 1 MB
      const freeMemory = 512 * 1024; // 512 KB

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(60); // 1 minute
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.1, 0.1, 0.1]);
      mockOs.cpus.mockReturnValue([{}] as any); // Single core

      const result = service.getHealth();

      expect(result.memory.rss).toBe('0 MB'); // Rounds down to 0
      expect(result.memory.systemTotal).toBe('1 MB');
      expect(result.cpu.cores).toBe(1);
      expect(result.uptime).toBe(60);
    });

    it('should handle high load average correctly', () => {
      const mockMemoryData = {
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const highLoadAverage = [5.2, 4.8, 3.9]; // High load

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      mockOs.loadavg.mockReturnValue(highLoadAverage);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.cpu.loadAverage).toEqual(highLoadAverage);
      expect(result.cpu.cores).toBe(4);
    });

    it('should format timestamp correctly', () => {
      const fixedDate = new Date('2024-01-15T10:30:45.123Z');
      const originalDateNow = Date.now;
      const originalDateConstructor = Date;

      // Mock Date constructor
      global.Date = jest.fn(() => fixedDate) as any;
      global.Date.now = jest.fn(() => fixedDate.getTime());

      mockProcess.memoryUsage.mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.timestamp).toBe('2024-01-15T10:30:45.123Z');

      // Restore original Date
      global.Date = originalDateConstructor;
    });
  });

  describe('getWarnings (private method testing through public interface)', () => {
    it('should return empty warnings array when all metrics are healthy', () => {
      const mockMemoryData = {
        rss: 100 * 1024 * 1024, // 100 MB (well below 450 MB limit)
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024, // 60% heap usage (below 80% limit)
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };

      const totalMemory = 8 * 1024 * 1024 * 1024;
      const freeMemory = 5 * 1024 * 1024 * 1024; // 62.5% system usage (below 85% limit)

      mockProcess.memoryUsage.mockReturnValue(mockMemoryData);
      mockProcess.uptime.mockReturnValue(3600);
      mockOs.totalmem.mockReturnValue(totalMemory);
      mockOs.freemem.mockReturnValue(freeMemory);
      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

      const result = service.getHealth();

      expect(result.warnings).toEqual([]);
    });

    it('should handle boundary conditions for warning thresholds', () => {
      // Test exactly at threshold boundaries
      const testCases = [
        {
          name: 'exactly 80% heap usage',
          heapUsed: 80 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          freeMemory: 2 * 1024 * 1024 * 1024, // Well below system threshold
          rss: 100 * 1024 * 1024,
          expectedWarnings: [], // Should not trigger at exactly 80%
        },
        {
          name: 'exactly 85% system usage',
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          freeMemory: 1.2 * 1024 * 1024 * 1024, // Exactly 85% system usage
          rss: 100 * 1024 * 1024,
          expectedWarnings: [], // Should not trigger at exactly 85%
        },
        {
          name: 'exactly 450 MB RSS',
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          freeMemory: 4 * 1024 * 1024 * 1024,
          rss: 450 * 1024 * 1024, // Exactly at RSS threshold
          expectedWarnings: [], // Should not trigger at exactly 450 MB
        },
      ];

      for (const testCase of testCases) {
        mockProcess.memoryUsage.mockReturnValue({
          rss: testCase.rss,
          heapTotal: testCase.heapTotal,
          heapUsed: testCase.heapUsed,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024,
        });
        mockProcess.uptime.mockReturnValue(3600);
        mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
        mockOs.freemem.mockReturnValue(testCase.freeMemory);
        mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);
        mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any);

        const result = service.getHealth();

        expect(result.warnings).toEqual(testCase.expectedWarnings);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing or undefined values gracefully', () => {
      // Test with minimal mock data
      mockProcess.memoryUsage.mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
      });
      mockProcess.uptime.mockReturnValue(0);
      mockOs.totalmem.mockReturnValue(0);
      mockOs.freemem.mockReturnValue(0);
      mockOs.loadavg.mockReturnValue([0, 0, 0]);
      mockOs.cpus.mockReturnValue([]);

      const result = service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.cpu.cores).toBe(0);
      expect(result.memory.systemTotal).toBe('0 MB');
    });

    it('should handle NaN and Infinity values in calculations', () => {
      mockProcess.memoryUsage.mockReturnValue({
        rss: Infinity,
        heapTotal: 0, // Will cause division by zero
        heapUsed: 50 * 1024 * 1024,
        external: NaN,
        arrayBuffers: 5 * 1024 * 1024,
      });
      mockProcess.uptime.mockReturnValue(Infinity);
      mockOs.totalmem.mockReturnValue(0); // Will cause division by zero
      mockOs.freemem.mockReturnValue(0);
      mockOs.loadavg.mockReturnValue([NaN, Infinity, -1]);
      mockOs.cpus.mockReturnValue([{}, {}] as any);

      const result = service.getHealth();

      expect(result.status).toBe('ok');
      expect(typeof result.memory.rss).toBe('string');
      expect(typeof result.memory.percentUsed).toBe('string');
    });

    it('should handle system calls throwing errors', () => {
      // Mock system calls to throw errors
      mockProcess.memoryUsage.mockImplementation(() => {
        throw new Error('Memory access denied');
      });
      mockProcess.uptime.mockImplementation(() => {
        throw new Error('Uptime access denied');
      });

      expect(() => service.getHealth()).toThrow();
    });

    it('should handle very large memory values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;

      mockProcess.memoryUsage.mockReturnValue({
        rss: largeValue,
        heapTotal: largeValue,
        heapUsed: largeValue / 2,
        external: largeValue / 4,
        arrayBuffers: largeValue / 8,
      });
      mockProcess.uptime.mockReturnValue(largeValue);
      mockOs.totalmem.mockReturnValue(largeValue);
      mockOs.freemem.mockReturnValue(largeValue / 2);
      mockOs.loadavg.mockReturnValue([100, 200, 300]);
      mockOs.cpus.mockReturnValue(new Array(128).fill({})); // 128 cores

      const result = service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.cpu.cores).toBe(128);
      expect(typeof result.memory.rss).toBe('string');
      expect(result.memory.rss.endsWith(' MB')).toBe(true);
    });
  });
});
