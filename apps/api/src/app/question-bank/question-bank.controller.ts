import {Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards,} from '@nestjs/common';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {QuestionBankService} from './question-bank.service';
import {
  AddQuestionsDto,
  CreateQuestionBankDto,
  CreateQuestionBankResponse,
  ImportQuestionBankDto,
  QuestionBankDetailResponse,
  QuestionBankListResponse,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse,
  SetCorrectAnswerDto,
  UpdateQuestionBankDto,
} from '@aqb/data-access';
import {AuthenticatedRequest} from '../types/common.types';

@Controller('question-banks')
@UseGuards(JwtAuthGuard)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto?: CreateQuestionBankDto): Promise<CreateQuestionBankResponse> {
    return this.questionBankService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<QuestionBankListResponse> {
    return this.questionBankService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<QuestionBankDetailResponse> {
    return this.questionBankService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankDto,
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.remove(req.user.id, id);
  }

  @Post('import')
  import(@Request() req: AuthenticatedRequest, @Body() dto: ImportQuestionBankDto): Promise<CreateQuestionBankResponse> {
    return this.questionBankService.import(req.user.id, dto);
  }

  @Post(':id/questions')
  addQuestions(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddQuestionsDto,
  ): Promise<QuestionsAddedResponse> {
    return this.questionBankService.addQuestions(req.user.id, id, dto);
  }

  @Delete(':id/questions/:questionId')
  deleteQuestion(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.deleteQuestion(req.user.id, id, questionId);
  }

  @Put(':id/questions/:questionId/correct-answer')
  setCorrectAnswer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SetCorrectAnswerDto,
  ): Promise<QuestionBankSuccessResponse> {
    return this.questionBankService.setCorrectAnswer(
      req.user.id,
      id,
      questionId,
      dto,
    );
  }
}
