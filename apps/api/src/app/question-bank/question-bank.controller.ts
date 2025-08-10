import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionBankService } from './question-bank.service';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  AddQuestionsDto,
  SetCorrectAnswerDto,
  ImportQuestionBankDto,
} from '../dto/question-bank.dto';

@Controller('api/question-banks')
@UseGuards(JwtAuthGuard)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(@Request() req, @Body() dto?: CreateQuestionBankDto) {
    return this.questionBankService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.questionBankService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.questionBankService.findOne(req.user.userId, id);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return this.questionBankService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.questionBankService.remove(req.user.userId, id);
  }

  @Post('import')
  import(@Request() req, @Body() dto: ImportQuestionBankDto) {
    return this.questionBankService.import(req.user.userId, dto);
  }

  @Post(':id/questions')
  addQuestions(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddQuestionsDto,
  ) {
    return this.questionBankService.addQuestions(req.user.userId, id, dto);
  }

  @Delete(':id/questions/:questionId')
  deleteQuestion(
    @Request() req,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionBankService.deleteQuestion(req.user.userId, id, questionId);
  }

  @Put(':id/questions/:questionId/correct-answer')
  setCorrectAnswer(
    @Request() req,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SetCorrectAnswerDto,
  ) {
    return this.questionBankService.setCorrectAnswer(
      req.user.userId,
      id,
      questionId,
      dto,
    );
  }
}