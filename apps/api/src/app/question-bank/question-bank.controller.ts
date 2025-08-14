import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionBankService } from './question-bank.service';
import {
  AddQuestionsDto,
  CreateQuestionBankDto,
  CreateQuestionBankResponse,
  ImportQuestionBankDto,
  QuestionBankDetailResponse,
  QuestionBankListResponse,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse,
  QuestionsPaginatedResponse,
  SetCorrectAnswerDto,
  UpdateQuestionBankDto,
  UpdateQuestionDto,
} from '@aqb/data-access';
import { AuthenticatedRequest } from '../types/common.types';

@Controller('question-banks')
@UseGuards(JwtAuthGuard)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto?: CreateQuestionBankDto
  ): Promise<CreateQuestionBankResponse> {
    return this.questionBankService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest
  ): Promise<QuestionBankListResponse> {
    return this.questionBankService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<QuestionBankDetailResponse> {
    return this.questionBankService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankDto
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.remove(req.user.id, id);
  }

  @Post('import')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  import(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ImportQuestionBankDto
  ): Promise<CreateQuestionBankResponse> {
    return this.questionBankService.import(req.user.id, dto);
  }

  @Post(':id/questions')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  addQuestions(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddQuestionsDto
  ): Promise<QuestionsAddedResponse> {
    return this.questionBankService.addQuestions(req.user.id, id, dto);
  }

  @Delete(':id/questions/:questionId')
  deleteQuestion(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('questionId') questionId: string
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.deleteQuestion(req.user.id, id, questionId);
  }

  @Put(':id/questions/:questionId')
  updateQuestion(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.updateQuestion(
      req.user.id,
      id,
      questionId,
      dto
    );
  }

  @Put(':id/questions/:questionId/correct-answer')
  setCorrectAnswer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SetCorrectAnswerDto
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.setCorrectAnswer(
      req.user.id,
      id,
      questionId,
      dto
    );
  }

  @Get(':id/questions')
  getQuestions(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('offset') offset = '0',
    @Query('limit') limit = '50',
    @Query('search') search?: string
  ): Promise<QuestionsPaginatedResponse> {
    const offsetNum = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);
    return this.questionBankService.getQuestions(
      req.user.id,
      id,
      offsetNum,
      limitNum,
      search
    );
  }
}
