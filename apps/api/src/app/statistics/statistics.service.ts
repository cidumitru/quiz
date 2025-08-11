import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, Repository} from 'typeorm';
import {QuizStatistics} from '../entities/quiz-statistics.entity';
import {Quiz} from '../entities/quiz.entity';
import {QuizQuestion} from '../entities/quiz-question.entity';
import {QuestionBank} from '../entities/question-bank.entity';
import {DailyStats, OverallStatsResponse, QuestionBankStats, QuestionBankSummaryStats} from '@aqb/data-access';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(QuizStatistics)
    private quizStatisticsRepository: Repository<QuizStatistics>,
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuestionBank)
    private questionBankRepository: Repository<QuestionBank>,
  ) {
  }

  async getQuestionBankStats(
    userId: string,
    questionBankId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<QuestionBankStats> {
    // Verify question bank exists and belongs to user
    const questionBank = await this.questionBankRepository.findOne({
      where: {id: questionBankId, userId, isDeleted: false},
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    // Get precomputed stats
    const stats = await this.quizStatisticsRepository.findOne({
      where: {userId, questionBankId},
    });

    if (!stats) {
      return {
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        uniqueQuestionsAnswered: 0,
        coverage: 0,
        averageScore: 0,
        lastQuizDate: undefined,
      };
    }

    // If date range is specified, calculate stats for that period
    if (startDate && endDate) {
      return this.calculatePeriodStats(userId, questionBankId, startDate, endDate);
    }

    return {
      totalQuizzes: stats.totalQuizzes,
      totalAnswers: stats.totalAnswers,
      correctAnswers: stats.correctAnswers,
      incorrectAnswers: stats.incorrectAnswers,
      uniqueQuestionsAnswered: stats.uniqueQuestionsAnswered,
      coverage: stats.coverage,
      averageScore: stats.averageScore,
      lastQuizDate: stats.lastQuizDate,
    };
  }

  async getDailyStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyStats[]> {
    const quizzes = await this.quizRepository.find({
      where: {
        userId,
        finishedAt: Between(startDate, endDate),
      },
      relations: ['quizQuestions', 'quizQuestions.userAnswer'],
    });

    // Group by day
    const dailyStats = new Map<string, DailyStats>();

    // Initialize all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyStats.set(dateKey, {
        date: dateKey,
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        quizzesCompleted: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual data
    for (const quiz of quizzes) {
      const dateKey = quiz.finishedAt.toISOString().split('T')[0];
      const dayStats = dailyStats.get(dateKey);

      if (dayStats) {
        dayStats.quizzesCompleted++;

        for (const qq of quiz.quizQuestions) {
          if (qq.answerId) {
            dayStats.totalAnswers++;

            if (qq.userAnswer?.isCorrect) {
              dayStats.correctAnswers++;
            } else {
              dayStats.incorrectAnswers++;
            }
          }
        }
      }
    }

    return Array.from(dailyStats.values());
  }

  async getOverallStats(userId: string): Promise<OverallStatsResponse> {
    const stats = await this.quizStatisticsRepository.find({
      where: {userId},
      relations: ['questionBank'],
    });

    let totalQuizzes = 0;
    let totalAnswers = 0;
    let correctAnswers = 0;

    const questionBankStats: QuestionBankSummaryStats[] = [];

    for (const stat of stats) {
      totalQuizzes += stat.totalQuizzes;
      totalAnswers += stat.totalAnswers;
      correctAnswers += stat.correctAnswers;

      if (stat.questionBank && !stat.questionBank.isDeleted) {
        const qb = await this.questionBankRepository.findOne({
          where: {id: stat.questionBankId},
          relations: ['questions'],
        });

        questionBankStats.push({
          questionBankId: stat.questionBankId,
          questionBankName: stat.questionBank.name,
          totalQuestions: qb?.questions.length || 0,
          answeredQuestions: stat.uniqueQuestionsAnswered,
          coverage: stat.coverage,
          averageScore: stat.averageScore,
          lastActivity: stat.lastQuizDate,
        });
      }
    }

    return {
      totalQuizzes,
      totalAnswers,
      correctAnswers,
      averageScore: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
      questionBanks: questionBankStats.sort((a, b) =>
        (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0)
      ),
    };
  }

  private async calculatePeriodStats(
    userId: string,
    questionBankId: string,
    startDate: Date,
    endDate: Date
  ): Promise<QuestionBankStats> {
    const quizzes = await this.quizRepository.find({
      where: {
        userId,
        questionBankId,
        finishedAt: Between(startDate, endDate),
      },
      relations: ['quizQuestions', 'quizQuestions.userAnswer'],
    });

    const questionBank = await this.questionBankRepository.findOne({
      where: {id: questionBankId},
      relations: ['questions'],
    });

    let totalAnswers = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const uniqueQuestions = new Set<string>();

    for (const quiz of quizzes) {
      for (const qq of quiz.quizQuestions) {
        if (qq.answerId) {
          totalAnswers++;
          uniqueQuestions.add(qq.questionId);

          if (qq.userAnswer?.isCorrect) {
            correctAnswers++;
          } else {
            incorrectAnswers++;
          }
        }
      }
    }

    return {
      totalQuizzes: quizzes.length,
      totalAnswers,
      correctAnswers,
      incorrectAnswers,
      uniqueQuestionsAnswered: uniqueQuestions.size,
      coverage: questionBank ? (uniqueQuestions.size / questionBank.questions.length) * 100 : 0,
      averageScore: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
      lastQuizDate: quizzes.sort((a, b) =>
        new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
      )[0]?.finishedAt || null,
    };
  }
}
