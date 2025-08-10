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

@Controller('question-banks')
@UseGuards(JwtAuthGuard)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(@Request() req, @Body() dto?: CreateQuestionBankDto) {
    return this.questionBankService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.questionBankService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.questionBankService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return this.questionBankService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.questionBankService.remove(req.user.id, id);
  }

  @Post('import')
  import(@Request() req, @Body() dto: ImportQuestionBankDto) {
    return this.questionBankService.import(req.user.id, dto);
  }

  @Post(':id/questions')
  addQuestions(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddQuestionsDto,
  ) {
    return this.questionBankService.addQuestions(req.user.id, id, dto);
  }

  @Delete(':id/questions/:questionId')
  deleteQuestion(
    @Request() req,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionBankService.deleteQuestion(req.user.id, id, questionId);
  }

  @Put(':id/questions/:questionId/correct-answer')
  setCorrectAnswer(
    @Request() req,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SetCorrectAnswerDto,
  ) {
    return this.questionBankService.setCorrectAnswer(
      req.user.id,
      id,
      questionId,
      dto,
    );
  }
}