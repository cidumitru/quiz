import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {QuizController} from './quiz.controller';
import {QuizService} from './quiz.service';
import {Quiz} from '../entities/quiz.entity';
import {QuizQuestion} from '../entities/quiz-question.entity';
import {QuizStatistics} from '../entities/quiz-statistics.entity';
import {QuestionBank} from '../entities/question-bank.entity';
import {Question} from '../entities/question.entity';
import {Answer} from '../entities/answer.entity';
import {AchievementModule} from '../achievements/achievement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuizStatistics,
      QuestionBank,
      Question,
      Answer,
    ]),
    AchievementModule,
  ],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {
}
