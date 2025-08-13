import {Global, Module} from '@nestjs/common';
import {CacheModule as NestCacheModule} from '@nestjs/cache-manager';
import {ConfigModule, ConfigService} from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import {CacheService} from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        ttl: 300, // Default TTL in seconds (5 minutes)
        max: 100, // Maximum number of items in cache
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {
}
