import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank, Question, Answer } from '../entities';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  CreateQuestionDto,
  AddQuestionsDto,
  SetCorrectAnswerDto,
  ImportQuestionBankDto,
} from '../dto/question-bank.dto';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionBank)
    private questionBankRepository: Repository<QuestionBank>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
  ) {}

  private transformQuestionBank(questionBank: QuestionBank) {
    return {
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
  }

  async create(userId: string, dto?: CreateQuestionBankDto) {
    const questionBank = this.questionBankRepository.create({
      name: dto?.name || `NEW QUESTION BANK: ${new Date().toISOString()}`,
      userId,
      questions: [],
    });

    const saved = await this.questionBankRepository.save(questionBank);
    return this.findOne(userId, saved.id);
  }

  async findAll(userId: string) {
    const questionBanks = await this.questionBankRepository.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    return { 
      questionBanks: questionBanks.map(qb => this.transformQuestionBank(qb))
    };
  }

  async findOne(userId: string, id: string) {
    const questionBank = await this.questionBankRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!questionBank) {
      throw new NotFoundException('Question bank not found');
    }

    return { questionBank: this.transformQuestionBank(questionBank) };
  }

  async update(userId: string, id: string, dto: UpdateQuestionBankDto) {
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

  async remove(userId: string, id: string) {
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

  async import(userId: string, dto: ImportQuestionBankDto) {
    const existingQuestionBank = await this.questionBankRepository.findOne({
      where: { id: dto.id, userId },
    });

    let questionBank: QuestionBank;
    
    if (existingQuestionBank) {
      questionBank = this.questionBankRepository.create({
        name: `${dto.name} (copy)`,
        userId,
        questions: [],
      });
    } else {
      questionBank = this.questionBankRepository.create({
        id: dto.id,
        name: dto.name,
        userId,
        createdAt: new Date(dto.createdAt),
        questions: [],
      });
    }

    const savedQuestionBank = await this.questionBankRepository.save(questionBank);

    for (const questionDto of dto.questions) {
      const question = this.questionRepository.create({
        id: existingQuestionBank ? undefined : questionDto.id,
        question: questionDto.question,
        questionBankId: savedQuestionBank.id,
        answers: [],
      });

      const savedQuestion = await this.questionRepository.save(question);

      for (const answerDto of questionDto.answers) {
        const answer = this.answerRepository.create({
          id: existingQuestionBank ? undefined : answerDto.id,
          text: answerDto.text,
          isCorrect: answerDto.correct || false,
          questionId: savedQuestion.id,
        });

        await this.answerRepository.save(answer);
      }
    }

    return this.findOne(userId, savedQuestionBank.id);
  }

  async addQuestions(userId: string, questionBankId: string, dto: AddQuestionsDto) {
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

  async deleteQuestion(userId: string, questionBankId: string, questionId: string) {
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
  ) {
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
}