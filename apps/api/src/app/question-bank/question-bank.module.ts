import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {QuestionBankController} from './question-bank.controller';
import {QuestionBankService} from './question-bank.service';
import {Answer, Question, QuestionBank, QuizStatistics} from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionBank, Question, Answer, QuizStatistics])],
  controllers: [QuestionBankController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
