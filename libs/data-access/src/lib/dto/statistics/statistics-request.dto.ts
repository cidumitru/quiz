import {IsDateString} from 'class-validator';

export class DailyStatsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

// Type exports for frontend usage
export type DailyStatsQueryRequest = DailyStatsQueryDto;
