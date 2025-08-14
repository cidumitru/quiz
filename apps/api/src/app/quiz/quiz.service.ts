import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizStatistics } from '../entities/quiz-statistics.entity';
import { QuestionBank } from '../entities/question-bank.entity';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import {
  ClearHistoryResponse,
  CreateQuizDto,
  CreateQuizResponse,
  QuizDetailResponse,
  QuizFinishResponse,
  QuizListItem,
  QuizListQueryDto,
  QuizListResponse,
  QuizMode,
  SubmitAnswersDto,
  SubmitAnswersResponse,
} from '@aqb/data-access';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizStatistics)
    private quizStatisticsRepository: Repository<QuizStatistics>,
    @InjectRepository(QuestionBank)
    private questionBankRepository: Repository<QuestionBank>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>
  ) {}

  async create(
    userId: string,
    dto: CreateQuizDto
  ): Promise<CreateQuizResponse> {
    // Verify question bank exists and belongs to user
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: dto.questionBankId, userId, isDeleted: false },
      relations: ['questions', 'questions.answers'],
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    // Select questions based on mode
    const selectedQuestions = await this.selectQuestionsByMode(
      userId,
      questionBank,
      dto.mode || QuizMode.All,
      dto.questionsCount
    );

    if (selectedQuestions.length === 0) {
      throw new BadRequestException(
        'No questions available for the selected mode'
      );
    }

    // Create quiz
    const quiz = this.quizRepository.create({
      userId,
      questionBankId: dto.questionBankId,
      mode: dto.mode || QuizMode.All,
    });

    const savedQuiz = await this.quizRepository.save(quiz);

    // Create quiz questions
    const quizQuestions = selectedQuestions.map((question, index) =>
      this.quizQuestionRepository.create({
        quizId: savedQuiz.id,
        questionId: question.id,
        orderIndex: index,
      })
    );

    await this.quizQuestionRepository.save(quizQuestions);

    // Load the full quiz with relations and return
    return this.getQuizById(userId, savedQuiz.id);
  }

  async selectQuestionsByMode(
    userId: string,
    questionBank: QuestionBank,
    mode: QuizMode,
    count: number
  ): Promise<Question[]> {
    let availableQuestions = questionBank.questions;

    switch (mode) {
      case QuizMode.Mistakes: {
        // Get questions where user has low success rate
        const mistakeQuestions = await this.getMistakeQuestions(
          userId,
          questionBank.id
        );
        availableQuestions = availableQuestions.filter((q) =>
          mistakeQuestions.includes(q.id)
        );
        break;
      }

      case QuizMode.Discovery: {
        // Get questions user hasn't answered yet
        const answeredQuestions = await this.getAnsweredQuestions(
          userId,
          questionBank.id
        );
        availableQuestions = availableQuestions.filter(
          (q) => !answeredQuestions.includes(q.id)
        );
        break;
      }

      case QuizMode.All:
      default:
        // Use all questions
        break;
    }

    // Randomly select questions up to the requested count
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async getMistakeQuestions(
    userId: string,
    questionBankId: string
  ): Promise<string[]> {
    const result = await this.quizQuestionRepository
      .createQueryBuilder('qq')
      .select('qq.questionId')
      .addSelect('COUNT(qq.id) as total')
      .addSelect(
        'SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) as correct'
      )
      .innerJoin('qq.quiz', 'q')
      .leftJoin('qq.userAnswer', 'a')
      .where('q.userId = :userId', { userId })
      .andWhere('q.questionBankId = :questionBankId', { questionBankId })
      .andWhere('qq.answerId IS NOT NULL')
      .groupBy('qq.questionId')
      .having(
        '(SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) / COUNT(qq.id)) < 0.7'
      )
      .getRawMany();

    return result.map((r) => r.qq_questionId);
  }

  async getAnsweredQuestions(
    userId: string,
    questionBankId: string
  ): Promise<string[]> {
    const result = await this.quizQuestionRepository
      .createQueryBuilder('qq')
      .select('DISTINCT qq.questionId')
      .innerJoin('qq.quiz', 'q')
      .where('q.userId = :userId', { userId })
      .andWhere('q.questionBankId = :questionBankId', { questionBankId })
      .andWhere('qq.answerId IS NOT NULL')
      .getRawMany();

    return result.map((r) => r.questionId);
  }

  async findAll(
    userId: string,
    query: QuizListQueryDto
  ): Promise<QuizListResponse> {
    const { take = 10, skip = 0, questionBankId } = query;

    // First query: Get quiz list with minimal relations
    const queryBuilder = this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.userId = :userId', { userId })
      .leftJoinAndSelect('quiz.questionBank', 'qb')
      .orderBy('quiz.startedAt', 'DESC');

    if (questionBankId) {
      queryBuilder.andWhere('quiz.questionBankId = :questionBankId', {
        questionBankId,
      });
    }

    const [items, total] = await queryBuilder
      .take(take)
      .skip(skip)
      .getManyAndCount();

    // Second query: Batch load quiz questions with answers for scoring
    if (items.length > 0) {
      const quizIds = items.map((q) => q.id);

      // Get aggregated data for all quizzes in one query
      const quizStats = await this.quizQuestionRepository
        .createQueryBuilder('qq')
        .select('qq.quizId', 'quizId')
        .addSelect('COUNT(qq.id)', 'totalQuestions')
        .addSelect('COUNT(qq.answerId)', 'answeredQuestions')
        .addSelect(
          'SUM(CASE WHEN ua.isCorrect = true THEN 1 ELSE 0 END)',
          'correctAnswers'
        )
        .leftJoin('qq.userAnswer', 'ua')
        .where('qq.quizId IN (:...quizIds)', { quizIds })
        .groupBy('qq.quizId')
        .getRawMany();

      // Create a map for quick lookup
      const statsMap = new Map(quizStats.map((s) => [s.quizId, s]));

      // Attach stats to quiz items
      items.forEach((quiz) => {
        const stats = statsMap.get(quiz.id);
        if (stats) {
          (
            quiz as Quiz & {
              _stats?: {
                totalQuestions: number;
                answeredQuestions: number;
                correctAnswers: number;
              };
            }
          )['_stats'] = {
            totalQuestions: parseInt(stats.totalQuestions),
            answeredQuestions: parseInt(stats.answeredQuestions),
            correctAnswers: parseInt(stats.correctAnswers || '0'),
          };
        }
      });
    }

    const quizListItems = items.map((quiz) => this.mapQuizToListItem(quiz));

    return {
      items: quizListItems,
      total,
    };
  }

  async getQuizById(
    userId: string,
    quizId: string
  ): Promise<QuizDetailResponse> {
    // Use query builder for better performance with selective loading
    const quiz = await this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.id = :quizId', { quizId })
      .andWhere('quiz.userId = :userId', { userId })
      .leftJoinAndSelect('quiz.questionBank', 'qb')
      .leftJoinAndSelect('quiz.quizQuestions', 'qq')
      .orderBy('qq.orderIndex', 'ASC')
      .getOne();

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Load questions and answers in a separate optimized query
    if (quiz.quizQuestions && quiz.quizQuestions.length > 0) {
      const questionIds = quiz.quizQuestions.map((qq) => qq.questionId);

      // Batch load all questions with their answers
      const questions = await this.questionRepository
        .createQueryBuilder('q')
        .whereInIds(questionIds)
        .leftJoinAndSelect('q.answers', 'a')
        .getMany();

      // Create a map for quick lookup
      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // Load user answers separately
      const answerIds = quiz.quizQuestions
        .filter((qq) => qq.answerId)
        .map((qq) => qq.answerId);

      let answerMap = new Map();
      if (answerIds.length > 0) {
        const userAnswers = await this.answerRepository
          .createQueryBuilder('a')
          .whereInIds(answerIds)
          .getMany();
        answerMap = new Map(userAnswers.map((a) => [a.id, a]));
      }

      // Attach questions and answers to quiz questions
      quiz.quizQuestions.forEach((qq) => {
        const question = questionMap.get(qq.questionId);
        if (question) {
          qq.question = question;
        }
        if (qq.answerId) {
          qq.userAnswer = answerMap.get(qq.answerId);
        }
      });
    }

    return { quiz: await this.mapQuizToResponse(quiz, true) };
  }

  async submitAnswers(
    userId: string,
    quizId: string,
    dto: SubmitAnswersDto
  ): Promise<SubmitAnswersResponse> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, userId },
      relations: [
        'quizQuestions',
        'quizQuestions.question',
        'quizQuestions.question.answers',
      ],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.finishedAt) {
      throw new BadRequestException('Quiz is already finished');
    }

    // Update answers
    for (const answer of dto.answers) {
      await this.quizQuestionRepository.update(
        { quizId, questionId: answer.questionId },
        { answerId: answer.answerId }
      );
    }

    // Calculate score
    const totalQuestions = quiz.quizQuestions.length;
    let correctAnswers = 0;

    for (const answer of dto.answers) {
      const quizQuestion = quiz.quizQuestions.find(
        (qq) => qq.questionId === answer.questionId
      );
      if (quizQuestion) {
        const submittedAnswer = quizQuestion.question.answers.find(
          (a) => a.id === answer.answerId
        );
        if (submittedAnswer?.isCorrect) {
          correctAnswers++;
        }
      }
    }

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Update statistics
    await this.updateStatistics(userId, quiz.questionBankId);

    return {
      success: true,
      correctAnswers,
      totalQuestions,
      score,
    };
  }

  async finishQuiz(
    userId: string,
    quizId: string
  ): Promise<QuizFinishResponse> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.finishedAt) {
      throw new BadRequestException('Quiz is already finished');
    }

    quiz.finishedAt = new Date();
    await this.quizRepository.save(quiz);

    // Update statistics
    await this.updateStatistics(userId, quiz.questionBankId);

    // Get the complete quiz response
    const quizResponse = await this.getQuizById(userId, quizId);

    return {
      success: true,
      quiz: quizResponse.quiz,
    };
  }

  async clearHistory(userId: string): Promise<ClearHistoryResponse> {
    const deletedQuizzes = await this.quizRepository.delete({ userId });
    await this.quizStatisticsRepository.delete({ userId });

    return {
      success: true,
      deletedCount: deletedQuizzes.affected || 0,
    };
  }

  private async updateStatistics(
    userId: string,
    questionBankId: string
  ): Promise<void> {
    // Get or create statistics record
    let stats = await this.quizStatisticsRepository.findOne({
      where: { userId, questionBankId },
    });

    if (!stats) {
      stats = this.quizStatisticsRepository.create({
        userId,
        questionBankId,
      });
    }

    // Calculate statistics
    const quizzes = await this.quizRepository.find({
      where: { userId, questionBankId },
      relations: ['quizQuestions', 'quizQuestions.userAnswer'],
    });

    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId },
      relations: ['questions'],
    });

    stats.totalQuizzes = quizzes.filter((q) => q.finishedAt).length;
    stats.totalAnswers = 0;
    stats.correctAnswers = 0;
    stats.incorrectAnswers = 0;

    const uniqueQuestions = new Set<string>();

    // Calculate today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayCorrectAnswers = 0;
    let todayTotalAnswers = 0;

    for (const quiz of quizzes) {
      const quizDate = new Date(quiz.startedAt);
      quizDate.setHours(0, 0, 0, 0);
      const isToday = quizDate.getTime() === today.getTime();

      for (const qq of quiz.quizQuestions) {
        if (qq.answerId) {
          stats.totalAnswers++;
          uniqueQuestions.add(qq.questionId);

          if (qq.userAnswer?.isCorrect) {
            stats.correctAnswers++;
            if (isToday) {
              todayCorrectAnswers++;
            }
          } else {
            stats.incorrectAnswers++;
          }

          if (isToday) {
            todayTotalAnswers++;
          }
        }
      }
    }

    stats.uniqueQuestionsAnswered = uniqueQuestions.size;
    stats.coverage = questionBank
      ? (uniqueQuestions.size / questionBank.questions.length) * 100
      : 0;
    stats.averageScore =
      stats.totalAnswers > 0
        ? (stats.correctAnswers / stats.totalAnswers) * 100
        : 0;
    stats.averageScoreToday =
      todayTotalAnswers > 0
        ? (todayCorrectAnswers / todayTotalAnswers) * 100
        : 0;
    stats.lastQuizDate =
      quizzes.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0]?.startedAt || null;

    await this.quizStatisticsRepository.save(stats);
  }

  private mapQuizToListItem(
    quiz: Quiz & {
      _stats?: {
        totalQuestions: number;
        answeredQuestions: number;
        correctAnswers: number;
      };
    }
  ): QuizListItem {
    let score = 0;
    let answerCount = 0;
    let questionCount = 0;

    // Use pre-calculated stats if available (from optimized query)
    if (quiz._stats) {
      questionCount = quiz._stats.totalQuestions;
      answerCount = quiz._stats.answeredQuestions;
      if (quiz.finishedAt && quiz._stats.totalQuestions > 0) {
        score = (quiz._stats.correctAnswers / quiz._stats.totalQuestions) * 100;
      }
    } else if (quiz.quizQuestions) {
      // Fallback to direct calculation if stats not available
      questionCount = quiz.quizQuestions.length;
      answerCount = quiz.quizQuestions.filter((qq) => qq.answerId).length;
      if (quiz.finishedAt) {
        const correctAnswers = quiz.quizQuestions.filter(
          (qq) => qq.userAnswer?.isCorrect
        ).length;
        score = questionCount > 0 ? (correctAnswers / questionCount) * 100 : 0;
      }
    }

    return {
      id: quiz.id,
      mode: quiz.mode,
      startedAt: quiz.startedAt,
      finishedAt: quiz.finishedAt,
      answerCount,
      questionCount,
      questionBankName: quiz.questionBank?.name || '',
      score: Math.round(score),
    };
  }

  private async mapQuizToResponse(
    quiz: Quiz,
    includeQuestions: boolean
  ): Promise<Record<string, unknown>> {
    const response: Record<string, unknown> = {
      id: quiz.id,
      questionBankId: quiz.questionBankId,
      mode: quiz.mode,
      startedAt: quiz.startedAt,
      finishedAt: quiz.finishedAt,
      questionBankName: quiz.questionBank?.name,
      questions: [],
    };

    if (includeQuestions && quiz.quizQuestions) {
      response.questions = quiz.quizQuestions
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((qq) => ({
          id: qq.id,
          questionId: qq.questionId,
          question: qq.question.question,
          imageUrl: undefined, // Question entity doesn't have imageUrl yet
          answers: qq.question.answers.map((a) => ({
            id: a.id,
            text: a.text,
            correct: quiz.finishedAt ? a.isCorrect : undefined,
          })),
          userAnswerId: qq.answerId,
          correctAnswerId: qq.question.answers.find((a) => a.isCorrect)?.id,
          orderIndex: qq.orderIndex,
        }));
    }

    return response;
  }
}
