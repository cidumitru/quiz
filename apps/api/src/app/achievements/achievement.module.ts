import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {ScheduleModule} from '@nestjs/schedule';

// Entities
import {UserAchievement} from '../entities/user-achievement.entity';
import {AchievementEvent} from '../entities/achievement-event.entity';

// Domain Services
import {AchievementRegistry} from './domain/services/achievement-registry';

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

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAchievement, AchievementEvent]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot()
  ],
  providers: [
    // Domain Services
    AchievementRegistry,
    
    // Application Services
    AchievementService,
    AchievementProcessor,
    RealtimeAchievementService,
    
    // Infrastructure Services
    AchievementCacheService,
    AchievementBackgroundProcessor,
    AchievementGateway,
    
    // Repository Implementations
    UserAchievementRepository,
    AchievementEventRepository
  ],
  exports: [
    AchievementService,
    RealtimeAchievementService,
    AchievementRegistry,
    AchievementProcessor,
    UserAchievementRepository,
    AchievementEventRepository
  ]
})
export class AchievementModule {}