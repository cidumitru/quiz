import {Controller, Get, Param, Query, Request, UseGuards,} from '@nestjs/common';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {StatisticsService} from './statistics.service';
import {DailyStats, DailyStatsQueryDto, OverallStatsResponse, QuestionBankStats} from '@aqb/data-access';
import {AuthenticatedRequest} from '../types/common.types';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {
  }

  @Get('question-banks/:id')
  getQuestionBankStats(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<QuestionBankStats> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getQuestionBankStats(req.user.id, id, start, end);
  }

  @Get('daily')
  getDailyStats(
    @Request() req: AuthenticatedRequest,
    @Query() query: DailyStatsQueryDto,
  ): Promise<DailyStats[]> {
    return this.statisticsService.getDailyStats(
      req.user.id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('summary')
  getOverallStats(@Request() req: AuthenticatedRequest): Promise<OverallStatsResponse> {
    return this.statisticsService.getOverallStats(req.user.id);
  }
}
