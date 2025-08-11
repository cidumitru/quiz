import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {Answer, Question, QuestionBank, QuizStatistics} from '../entities';
import {
  AddQuestionsDto,
  CreateQuestionBankDto,
  ImportQuestionBankDto,
  QuestionBankDetail,
  QuestionBankDetailResponse,
  QuestionBankListResponse,
  QuestionBankStatistics,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse,
  SetCorrectAnswerDto,
  UpdateQuestionBankDto,
} from '@aqb/data-access';
import {QuestionCountMap, QuestionCountRawResult} from '../types/common.types';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionBank)
    private questionBankRepository: Repository<QuestionBank>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(QuizStatistics)
    private quizStatisticsRepository: Repository<QuizStatistics>,
  ) {}

  async findAll(userId: string): Promise<QuestionBankListResponse> {
    // Get question banks with basic info only (no questions loaded)
    const questionBanks = await this.questionBankRepository
      .createQueryBuilder('qb')
      .select([
        'qb.id',
        'qb.name',
        'qb.createdAt',
        'qb.updatedAt'
      ])
      .where('qb.userId = :userId', {userId})
      .andWhere('qb.isDeleted = :isDeleted', {isDeleted: false})
      .orderBy('qb.createdAt', 'DESC')
      .getMany();

    // Get question counts for each question bank
    let questionCounts: QuestionCountRawResult[] = [];
    if (questionBanks.length > 0) {
      questionCounts = await this.questionRepository
        .createQueryBuilder('q')
        .select('q.questionBankId')
        .addSelect('COUNT(q.id)', 'count')
        .where('q.questionBankId IN (:...questionBankIds)', {
          questionBankIds: questionBanks.map(qb => qb.id)
        })
        .groupBy('q.questionBankId')
        .getRawMany();
    }

    const questionCountMap: QuestionCountMap = questionCounts.reduce((acc: QuestionCountMap, item) => {
      acc[item.q_questionBankId] = parseInt(item.count);
      return acc;
    }, {});

    // Get statistics for each question bank
    let statistics: QuizStatistics[] = [];
    if (questionBanks.length > 0) {
      statistics = await this.quizStatisticsRepository.find({
        where: {
          userId,
          questionBankId: In(questionBanks.map(qb => qb.id))
        },
      });
    }

    const statsMap = statistics.reduce((acc: Record<string, QuestionBankStatistics>, stat) => {
      acc[stat.questionBankId] = {
        totalQuizzes: stat.totalQuizzes,
        totalAnswers: stat.totalAnswers,
        correctAnswers: stat.correctAnswers,
        coverage: stat.coverage,
        averageScore: stat.averageScore,
        averageScoreToday: stat.averageScoreToday,
        lastQuizDate: stat.lastQuizDate,
      };
      return acc;
    }, {});

    // Transform to simplified response
    const simplifiedBanks = questionBanks.map(qb => ({
      id: qb.id,
      name: qb.name,
      createdAt: qb.createdAt,
      updatedAt: qb.updatedAt,
      questionsCount: questionCountMap[qb.id] || 0,
      statistics: statsMap[qb.id] || {
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        coverage: 0,
        averageScore: 0,
        averageScoreToday: 0,
        lastQuizDate: null,
      },
    }));

    return {
      questionBanks: simplifiedBanks
    };
  }

  async create(userId: string, dto?: CreateQuestionBankDto): Promise<QuestionBankDetailResponse> {
    const questionBank = this.questionBankRepository.create({
      name: dto?.name || `NEW QUESTION BANK: ${new Date().toISOString()}`,
      userId,
      questions: [],
    });

    const saved = await this.questionBankRepository.save(questionBank);
    return this.findOne(userId, saved.id);
  }

  async findOne(userId: string, id: string): Promise<QuestionBankDetailResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
      relations: ['questions', 'questions.answers'], // Load full data for single item
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const transformed = await this.transformQuestionBankFull(questionBank, userId);

    if ('statistics' in transformed) {
      return {questionBank: transformed};
    } else {
      throw new BadRequestException();
    }
  }

  async update(userId: string, id: string, dto: UpdateQuestionBankDto): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    questionBank.name = dto.name;
    await this.questionBankRepository.save(questionBank);

    return { success: true };
  }

  async remove(userId: string, id: string): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    questionBank.isDeleted = true;
    await this.questionBankRepository.save(questionBank);

    return { success: true };
  }

  async import(userId: string, dto: ImportQuestionBankDto): Promise<QuestionBankDetailResponse> {
    // Check if a question bank with this ID already exists for this user
    const existingQuestionBank = await this.questionBankRepository.findOne({
      where: { id: dto.id, userId },
    });

    let questionBank: QuestionBank;

    if (existingQuestionBank) {
      // If it exists for this user, create a copy with a new ID
      questionBank = this.questionBankRepository.create({
        name: `${dto.name} (copy)`,
        userId,
        questions: [],
      });
    } else {
      // Check if this ID exists for any other user (collision scenario)
      const idCollision = await this.questionBankRepository.findOne({
        where: {id: dto.id},
      });

      if (idCollision) {
        // If there's a collision with another user's question bank, generate new ID
        questionBank = this.questionBankRepository.create({
          name: dto.name,
          userId,
          questions: [],
        });
      } else {
        // No collision, use the original ID
        questionBank = this.questionBankRepository.create({
          id: dto.id,
          name: dto.name,
          userId,
          createdAt: new Date(dto.createdAt),
          questions: [],
        });
      }
    }

    const savedQuestionBank = await this.questionBankRepository.save(questionBank);
    const shouldGenerateNewIds = existingQuestionBank || savedQuestionBank.id !== dto.id;

    for (const questionDto of dto.questions) {
      const question = this.questionRepository.create({
        id: shouldGenerateNewIds ? undefined : questionDto.id,
        question: questionDto.question,
        questionBankId: savedQuestionBank.id,
        answers: [],
      });

      const savedQuestion = await this.questionRepository.save(question);

      for (const answerDto of questionDto.answers) {
        const answer = this.answerRepository.create({
          id: shouldGenerateNewIds ? undefined : answerDto.id,
          text: answerDto.text,
          isCorrect: answerDto.correct || false,
          questionId: savedQuestion.id,
        });

        await this.answerRepository.save(answer);
      }
    }

    return this.findOne(userId, savedQuestionBank.id);
  }

  async addQuestions(userId: string, questionBankId: string, dto: AddQuestionsDto): Promise<QuestionsAddedResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const questionsToAdd = Array.isArray(dto.questions) ? dto.questions : [dto.questions];
    let questionsAdded = 0;

    for (const questionDto of questionsToAdd) {
      const question = this.questionRepository.create({
        question: questionDto.question,
        questionBankId,
        answers: [],
      });

      const savedQuestion = await this.questionRepository.save(question);

      for (const answerDto of questionDto.answers) {
        const answer = this.answerRepository.create({
          text: answerDto.text,
          isCorrect: answerDto.correct || false,
          questionId: savedQuestion.id,
        });

        await this.answerRepository.save(answer);
      }

      questionsAdded++;
    }

    return { success: true, questionsAdded };
  }

  async deleteQuestion(userId: string, questionBankId: string, questionId: string): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, questionBankId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.questionRepository.remove(question);

    return { success: true };
  }

  async setCorrectAnswer(
    userId: string,
    questionBankId: string,
    questionId: string,
    dto: SetCorrectAnswerDto,
  ): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, questionBankId },
      relations: ['answers'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const correctAnswer = question.answers.find(a => a.id === dto.correctAnswerId);
    if (!correctAnswer) {
      throw new BadRequestException('Answer not found');
    }

    for (const answer of question.answers) {
      answer.isCorrect = answer.id === dto.correctAnswerId;
      await this.answerRepository.save(answer);
    }

    return { success: true };
  }

  private async transformQuestionBankFull(questionBank: QuestionBank, userId?: string): Promise<QuestionBankDetail | Omit<QuestionBankDetail, 'statistics'>> {
    const baseData = {
      ...questionBank,
      questions: questionBank.questions.map(question => ({
        ...question,
        answers: question.answers.map(answer => ({
          id: answer.id,
          text: answer.text,
          correct: answer.isCorrect, // Map isCorrect to correct
        })),
      })),
    };

    // Add statistics if userId is provided
    if (userId) {
      const stats = await this.quizStatisticsRepository.findOne({
        where: {userId, questionBankId: questionBank.id},
      });

      if (stats) {
        return {
          ...baseData,
          statistics: {
            totalQuizzes: stats.totalQuizzes,
            totalAnswers: stats.totalAnswers,
            correctAnswers: stats.correctAnswers,
            coverage: stats.coverage,
            averageScore: stats.averageScore,
            averageScoreToday: stats.averageScoreToday,
            lastQuizDate: stats.lastQuizDate,
          },
        };
      }
    }

    return baseData;
  }
}
