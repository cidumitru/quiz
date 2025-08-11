import {Injectable} from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class HealthService {
  getHealth() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        systemUsed: `${Math.round(usedMemory / 1024 / 1024)} MB`,
        systemFree: `${Math.round(freeMemory / 1024 / 1024)} MB`,
        systemTotal: `${Math.round(totalMemory / 1024 / 1024)} MB`,
        percentUsed: `${Math.round((usedMemory / totalMemory) * 100)}%`,
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      warnings: this.getWarnings(memoryUsage, totalMemory),
    };
  }

  private getWarnings(memoryUsage: NodeJS.MemoryUsage, totalMemory: number): string[] {
    const warnings: string[] = [];
    const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const systemUsedPercent = ((totalMemory - os.freemem()) / totalMemory) * 100;

    if (heapUsedPercent > 80) {
      warnings.push(`High heap usage: ${Math.round(heapUsedPercent)}%`);
    }

    if (systemUsedPercent > 85) {
      warnings.push(`High system memory usage: ${Math.round(systemUsedPercent)}%`);
    }

    if (memoryUsage.rss > 450 * 1024 * 1024) {
      warnings.push(`RSS memory approaching limit: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
    }

    return warnings;
  }
}
