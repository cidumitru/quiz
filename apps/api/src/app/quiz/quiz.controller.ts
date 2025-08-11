import {Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards,} from '@nestjs/common';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {QuizService} from './quiz.service';
import {
  ClearHistoryResponse,
  CreateQuizDto,
  CreateQuizResponse,
  QuizDetailResponse,
  QuizFinishResponse,
  QuizListQueryDto,
  QuizListResponse,
  SubmitAnswersDto,
  SubmitAnswersResponse,
} from '@aqb/data-access';
import {AuthenticatedRequest} from '../types/common.types';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateQuizDto): Promise<CreateQuizResponse> {
    return this.quizService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query() query: QuizListQueryDto): Promise<QuizListResponse> {
    return this.quizService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<QuizDetailResponse> {
    return this.quizService.getQuizById(req.user.id, id);
  }

  @Put(':id/answers')
  submitAnswers(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SubmitAnswersDto,
  ): Promise<SubmitAnswersResponse> {
    return this.quizService.submitAnswers(req.user.id, id, dto);
  }

  @Put(':id/finish')
  finishQuiz(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<QuizFinishResponse> {
    return this.quizService.finishQuiz(req.user.id, id);
  }

  @Delete()
  clearHistory(@Request() req: AuthenticatedRequest): Promise<ClearHistoryResponse> {
    return this.quizService.clearHistory(req.user.id);
  }
}
