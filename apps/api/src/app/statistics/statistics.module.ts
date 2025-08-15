import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {StatisticsController} from './statistics.controller';
import {StatisticsService} from './statistics.service';
import {QuizStatistics} from '../entities/quiz-statistics.entity';
import {Quiz} from '../entities/quiz.entity';
import {QuizQuestion} from '../entities/quiz-question.entity';
import {QuestionBank} from '../entities/question-bank.entity';
import {AchievementModule} from '../achievements/achievement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizStatistics,
      Quiz,
      QuizQuestion,
      QuestionBank,
    ]),
    AchievementModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {
}
