import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {ScheduleModule} from '@nestjs/schedule';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule, ConfigService} from '@nestjs/config';

// Entities
import {UserAchievement} from '../entities/user-achievement.entity';
import {AchievementEvent} from '../entities/achievement-event.entity';
import {Quiz} from '../entities/quiz.entity';
import {QuizStatistics} from '../entities/quiz-statistics.entity';

// Domain Services
import {AchievementRegistry} from './domain/services/achievement-registry';
import {ComparativeStatisticsService} from './domain/services/comparative-statistics.service';

// Application Services
import {AchievementService} from './application/services/achievement.service';
import {AchievementProcessor} from './application/services/achievement-processor.service';
import {RealtimeAchievementService} from './application/services/realtime-achievement.service';

// Infrastructure
import {UserAchievementRepository} from './infrastructure/repositories/user-achievement.repository';
import {AchievementEventRepository} from './infrastructure/repositories/achievement-event.repository';
import {AchievementCacheService} from './infrastructure/cache/achievement-cache.service';
import {AchievementBackgroundProcessor} from './infrastructure/processors/achievement-background.processor';
import {AchievementGateway} from './infrastructure/gateways/achievement.gateway';

// Security & Monitoring
import {TransactionManager} from './infrastructure/database/transaction.manager';
import {AchievementSaga} from './infrastructure/saga/achievement-saga';
import {CircuitBreakerService} from './infrastructure/resilience/circuit-breaker';
import {RetryService} from './infrastructure/resilience/retry.service';
import {AchievementMonitorService} from './infrastructure/monitoring/achievement-monitor.service';
import {AchievementValidationService} from './infrastructure/validation/achievement-validation.service';
import {FraudDetectionService} from './infrastructure/security/fraud-detection.service';
import {WsJwtGuard} from './infrastructure/guards/ws-jwt.guard';
import {RateLimitGuard} from './infrastructure/guards/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAchievement, AchievementEvent, Quiz, QuizStatistics]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '24h' },
        };
      },
      inject: [ConfigService],
    })
  ],
  providers: [
    // Domain Services
    ComparativeStatisticsService,
    AchievementRegistry,
    
    // Application Services
    AchievementService,
    AchievementProcessor,
    RealtimeAchievementService,
    
    // Infrastructure Services
    AchievementCacheService,
    AchievementBackgroundProcessor,
    AchievementGateway,
    
    // Security & Resilience
    TransactionManager,
    AchievementSaga,
    CircuitBreakerService,
    RetryService,
    AchievementMonitorService,
    AchievementValidationService,
    FraudDetectionService,
    WsJwtGuard,
    RateLimitGuard,
    
    // Repository Implementations
    UserAchievementRepository,
    AchievementEventRepository
  ],
  exports: [
    // Core Services
    AchievementService,
    RealtimeAchievementService,
    AchievementRegistry,
    AchievementProcessor,
    ComparativeStatisticsService,
    
    // Infrastructure
    UserAchievementRepository,
    AchievementEventRepository,
    AchievementCacheService,
    
    // Security & Monitoring (for admin access)
    AchievementMonitorService,
    AchievementValidationService,
    FraudDetectionService,
    CircuitBreakerService,
    RetryService
  ]
})
export class AchievementModule {}