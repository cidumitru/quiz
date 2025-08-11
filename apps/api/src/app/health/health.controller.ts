import {Controller, Get} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {HealthService} from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {
  }

  @Get()
  @SkipThrottle()
  check() {
    return this.healthService.getHealth();
  }
}
