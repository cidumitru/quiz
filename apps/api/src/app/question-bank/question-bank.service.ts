import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOperator, In, Like, Repository } from 'typeorm';
import { Answer, Question, QuestionBank, QuizStatistics } from '../entities';
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
  QuestionsPaginatedResponse,
  SetCorrectAnswerDto,
  UpdateQuestionBankDto,
  UpdateQuestionDto,
} from '@aqb/data-access';
import {
  QuestionCountMap,
  QuestionCountRawResult,
} from '../types/common.types';
import { CacheService } from '../cache/cache.service';

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
    private cacheService: CacheService
  ) {}

  async findAll(userId: string): Promise<QuestionBankListResponse> {
    // Try to get from cache first
    const cachedData = await this.cacheService.getQuestionBankList(userId);
    if (cachedData) {
      return cachedData;
    }

    // Get question banks with basic info only (no questions loaded)
    const questionBanks = await this.questionBankRepository
      .createQueryBuilder('qb')
      .select(['qb.id', 'qb.name', 'qb.createdAt', 'qb.updatedAt'])
      .where('qb.userId = :userId', { userId })
      .andWhere('qb.isDeleted = :isDeleted', { isDeleted: false })
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
          questionBankIds: questionBanks.map((qb) => qb.id),
        })
        .groupBy('q.questionBankId')
        .getRawMany();
    }

    const questionCountMap: QuestionCountMap = questionCounts.reduce(
      (acc: QuestionCountMap, item) => {
        acc[item.q_questionBankId] = parseInt(item.count);
        return acc;
      },
      {}
    );

    // Get statistics for each question bank
    let statistics: QuizStatistics[] = [];
    if (questionBanks.length > 0) {
      statistics = await this.quizStatisticsRepository.find({
        where: {
          userId,
          questionBankId: In(questionBanks.map((qb) => qb.id)),
        },
      });
    }

    const statsMap = statistics.reduce(
      (acc: Record<string, QuestionBankStatistics>, stat) => {
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
      },
      {}
    );

    // Transform to simplified response
    const simplifiedBanks = questionBanks.map((qb) => ({
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

    const response = {
      questionBanks: simplifiedBanks,
    };

    // Cache the response
    await this.cacheService.setQuestionBankList(userId, response);

    return response;
  }

  async create(
    userId: string,
    dto?: CreateQuestionBankDto
  ): Promise<QuestionBankDetailResponse> {
    const questionBank = this.questionBankRepository.create({
      name: dto?.name || `NEW QUESTION BANK: ${new Date().toISOString()}`,
      userId,
      questions: [],
    });

    const saved = await this.questionBankRepository.save(questionBank);

    // Invalidate the list cache since we added a new question bank
    await this.cacheService.invalidateQuestionBankList(userId);

    return this.findOne(userId, saved.id);
  }

  async findOne(
    userId: string,
    id: string
  ): Promise<QuestionBankDetailResponse> {
    // Try to get from cache first
    const cachedData = await this.cacheService.getQuestionBankDetail(
      userId,
      id
    );
    if (cachedData) {
      return { questionBank: cachedData };
    }

    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
      relations: ['questions', 'questions.answers'], // Load full data for single item
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const transformed = await this.transformQuestionBankFull(
      questionBank,
      userId
    );

    const response = { questionBank: transformed as QuestionBankDetail };

    // Cache the response
    await this.cacheService.setQuestionBankDetail(
      userId,
      id,
      response.questionBank
    );

    return response;
  }

  async getQuestions(
    userId: string,
    questionBankId: string,
    offset: number,
    limit: number,
    search?: string
  ): Promise<QuestionsPaginatedResponse> {
    // First verify the user owns this question bank
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    // If no search term, use the simpler query
    if (!search || !search.trim()) {
      const totalItems = await this.questionRepository.count({
        where: { questionBankId },
      });

      const questions = await this.questionRepository.find({
        where: { questionBankId },
        relations: ['answers'],
        skip: offset,
        take: limit,
        order: { createdAt: 'ASC' },
      });

      const transformedQuestions = questions.map((question) => ({
        id: question.id,
        question: question.question,
        tags: question.tags,
        answers: question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          correct: answer.isCorrect,
        })),
      }));

      return {
        questions: transformedQuestions,
        totalItems,
        offset,
        limit,
      };
    }

    // Enhanced search: search in both question text and answer text
    const searchTerm = `%${search.trim()}%`;

    // First, get the IDs of questions that match the search criteria
    const matchingQuestionIds = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoin('question.answers', 'answer')
      .select(['question.id', 'question.createdAt'])
      .distinct(true)
      .where('question.questionBankId = :questionBankId', { questionBankId })
      .andWhere(
        '(question.question ILIKE :searchTerm OR answer.text ILIKE :searchTerm)',
        { searchTerm }
      )
      .orderBy('question.createdAt', 'ASC')
      .addOrderBy('question.id', 'ASC') // Add secondary ordering for consistency
      .offset(offset)
      .limit(limit)
      .getRawMany();

    // Get total count of distinct questions that match the search
    const totalCountResult = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoin('question.answers', 'answer')
      .select('COUNT(DISTINCT question.id)', 'count')
      .where('question.questionBankId = :questionBankId', { questionBankId })
      .andWhere(
        '(question.question ILIKE :searchTerm OR answer.text ILIKE :searchTerm)',
        { searchTerm }
      )
      .getRawOne();

    const totalItems = parseInt(totalCountResult.count, 10);

    // If no matching questions, return empty result
    if (matchingQuestionIds.length === 0) {
      return {
        questions: [],
        totalItems,
        offset,
        limit,
      };
    }

    // Get the full question data with answers for the matching IDs
    const questionIds = matchingQuestionIds.map(row => row.question_id);

    // Preserve the original ordering from the search query
    const questions = await this.questionRepository.find({
      where: { id: In(questionIds) },
      relations: ['answers'],
    });

    // Sort questions to match the order from the search query
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const sortedQuestions = questionIds.map(id => questionMap.get(id)).filter((q): q is NonNullable<typeof q> => q !== undefined);

    // Transform questions to match frontend interface
    const transformedQuestions = sortedQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        correct: answer.isCorrect,
      })),
    }));

    return {
      questions: transformedQuestions,
      totalItems,
      offset,
      limit,
    };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateQuestionBankDto
  ): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    questionBank.name = dto.name;
    await this.questionBankRepository.save(questionBank);

    // Invalidate both detail and list caches
    await this.cacheService.invalidateQuestionBankDetail(userId, id);

    return { success: true };
  }

  async remove(
    userId: string,
    id: string
  ): Promise<QuestionBankSuccessResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    questionBank.isDeleted = true;
    await this.questionBankRepository.save(questionBank);

    // Invalidate both detail and list caches
    await this.cacheService.invalidateQuestionBankDetail(userId, id);

    return { success: true };
  }

  async import(
    userId: string,
    dto: ImportQuestionBankDto
  ): Promise<QuestionBankDetailResponse> {
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
        where: { id: dto.id },
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

    const savedQuestionBank = await this.questionBankRepository.save(
      questionBank
    );
    const shouldGenerateNewIds =
      existingQuestionBank || savedQuestionBank.id !== dto.id;

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

    // Invalidate the list cache since we added a new question bank
    await this.cacheService.invalidateQuestionBankList(userId);

    return this.findOne(userId, savedQuestionBank.id);
  }

  async addQuestions(
    userId: string,
    questionBankId: string,
    dto: AddQuestionsDto
  ): Promise<QuestionsAddedResponse> {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id: questionBankId, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    const questionsToAdd = Array.isArray(dto.questions)
      ? dto.questions
      : [dto.questions];

    // Get existing questions for deduplication (case-insensitive)
    const existingQuestions = await this.questionRepository.find({
      where: { questionBankId },
      select: ['question'],
    });

    const existingQuestionTexts = new Set(
      existingQuestions.map(q => q.question.toLowerCase().trim())
    );

    let questionsAdded = 0;
    let duplicatesSkipped = 0;

    for (const questionDto of questionsToAdd) {
      const normalizedQuestion = questionDto.question.toLowerCase().trim();

      // Skip if question already exists (case-insensitive)
      if (existingQuestionTexts.has(normalizedQuestion)) {
        duplicatesSkipped++;
        continue;
      }

      const question = this.questionRepository.create({
        question: questionDto.question.trim(),
        questionBankId,
        answers: [],
        tags: questionDto.tags,
      });

      const savedQuestion = await this.questionRepository.save(question);

      // Deduplicate answers within the question
      const seenAnswers = new Set<string>();
      for (const answerDto of questionDto.answers) {
        const normalizedAnswer = answerDto.text.toLowerCase().trim();

        // Skip duplicate answers within the same question
        if (seenAnswers.has(normalizedAnswer)) {
          continue;
        }
        seenAnswers.add(normalizedAnswer);

        const answer = this.answerRepository.create({
          text: answerDto.text.trim(),
          isCorrect: answerDto.correct || false,
          questionId: savedQuestion.id,
        });

        await this.answerRepository.save(answer);
      }

      // Add to our tracking set to avoid duplicates within this batch
      existingQuestionTexts.add(normalizedQuestion);
      questionsAdded++;
    }

    // Invalidate both detail and list caches since questions changed
    await this.cacheService.invalidateQuestionBankDetail(
      userId,
      questionBankId
    );

    return {
      success: true,
      questionsAdded,
      ...(duplicatesSkipped > 0 && { duplicatesSkipped })
    };
  }

  async deleteQuestion(
    userId: string,
    questionBankId: string,
    questionId: string
  ): Promise<QuestionBankSuccessResponse> {
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

    // Invalidate both detail and list caches since questions changed
    await this.cacheService.invalidateQuestionBankDetail(
      userId,
      questionBankId
    );

    return { success: true };
  }

  async updateQuestion(
    userId: string,
    questionBankId: string,
    questionId: string,
    dto: UpdateQuestionDto
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

    // Update question text
    question.question = dto.question;
    await this.questionRepository.save(question);

    // Handle answers update
    if (dto.answers && dto.answers.length > 0) {
      // Get existing answers
      const existingAnswers = question.answers;
      const existingAnswerIds = existingAnswers.map((a) => a.id);

      // Process each answer in the DTO
      for (const answerDto of dto.answers) {
        if (answerDto.id && existingAnswerIds.includes(answerDto.id)) {
          // Update existing answer
          const existingAnswer = existingAnswers.find(
            (a) => a.id === answerDto.id
          );
          if (existingAnswer) {
            existingAnswer.text = answerDto.text;
            existingAnswer.isCorrect = answerDto.correct || false;
            await this.answerRepository.save(existingAnswer);
          }
        } else {
          // Create new answer
          const newAnswer = this.answerRepository.create({
            text: answerDto.text,
            isCorrect: answerDto.correct || false,
            questionId: questionId,
          });
          await this.answerRepository.save(newAnswer);
        }
      }

      // Delete answers that are no longer in the DTO
      const dtoAnswerIds = dto.answers
        .filter((a) => a.id)
        .map((a) => a.id || '');
      const toDelete = existingAnswerIds.filter(
        (id) => !dtoAnswerIds.includes(id)
      );

      if (toDelete.length > 0) {
        await this.answerRepository.delete({ id: In(toDelete) });
      }
    }

    // Handle correct answer setting (for backward compatibility)
    if (dto.correctAnswerId) {
      // Reset all answers for this question
      const updatedQuestion = await this.questionRepository.findOne({
        where: { id: questionId },
        relations: ['answers'],
      });

      if (updatedQuestion) {
        for (const answer of updatedQuestion.answers) {
          answer.isCorrect = answer.id === dto.correctAnswerId;
          await this.answerRepository.save(answer);
        }
      }
    }

    // Invalidate detail cache since question changed
    await this.cacheService.invalidateQuestionBankDetail(
      userId,
      questionBankId
    );

    return {
      success: true,
    };
  }

  async setCorrectAnswer(
    userId: string,
    questionBankId: string,
    questionId: string,
    dto: SetCorrectAnswerDto
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

    const correctAnswer = question.answers.find(
      (a) => a.id === dto.correctAnswerId
    );
    if (!correctAnswer) {
      throw new BadRequestException('Answer not found');
    }

    for (const answer of question.answers) {
      answer.isCorrect = answer.id === dto.correctAnswerId;
      await this.answerRepository.save(answer);
    }

    // Invalidate detail cache since answer correctness changed
    await this.cacheService.invalidateQuestionBankDetail(
      userId,
      questionBankId
    );

    return { success: true };
  }

  private async transformQuestionBankFull(
    questionBank: QuestionBank,
    userId?: string
  ): Promise<QuestionBankDetail> {
    const baseData = {
      ...questionBank,
      questions: questionBank.questions.map((question) => ({
        ...question,
        answers: question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          correct: answer.isCorrect, // Map isCorrect to correct
        })),
      })),
    };

    // Always include statistics, use defaults if not found
    let statistics: QuestionBankStatistics = {
      totalQuizzes: 0,
      totalAnswers: 0,
      correctAnswers: 0,
      coverage: 0,
      averageScore: 0,
      averageScoreToday: 0,
      lastQuizDate: null,
    };

    if (userId) {
      const stats = await this.quizStatisticsRepository.findOne({
        where: { userId, questionBankId: questionBank.id },
      });

      if (stats) {
        statistics = {
          totalQuizzes: stats.totalQuizzes,
          totalAnswers: stats.totalAnswers,
          correctAnswers: stats.correctAnswers,
          coverage: stats.coverage,
          averageScore: stats.averageScore,
          averageScoreToday: stats.averageScoreToday,
          lastQuizDate: stats.lastQuizDate,
        };
      }
    }

    return {
      ...baseData,
      statistics,
    };
  }
}
