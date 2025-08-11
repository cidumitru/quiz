import {Module, ValidationPipe} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ThrottlerGuard, ThrottlerModule} from '@nestjs/throttler';
import {APP_GUARD, APP_PIPE} from '@nestjs/core';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {UserModule} from './user/user.module';
import {HealthController} from './health/health.controller';
import {HealthService} from './health/health.service';
import {Answer, OtpCode, Question, QuestionBank, Quiz, QuizQuestion, QuizStatistics, User} from './entities';
import {QuestionBankModule} from './question-bank/question-bank.module';
import {QuizModule} from './quiz/quiz.module';
import {StatisticsModule} from './statistics/statistics.module';
import {rateLimitConfig} from './middleware/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env'],
    }),
    ThrottlerModule.forRoot(rateLimitConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [User, OtpCode, QuestionBank, Question, Answer, Quiz, QuizQuestion, QuizStatistics],
        synchronize: true, // Enable for production setup - consider using migrations later
        migrations: [],
        migrationsRun: false,
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    QuestionBankModule,
    QuizModule,
    StatisticsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    HealthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
