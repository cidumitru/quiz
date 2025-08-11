import {IsArray, IsEnum, IsNumber, IsOptional, IsUUID, Max, Min, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

export enum QuizMode {
  All = 'all',
  Mistakes = 'mistakes',
  Discovery = 'discovery',
}

export class CreateQuizDto {
  @IsUUID()
  questionBankId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  questionsCount: number;

  @IsOptional()
  @IsEnum(QuizMode)
  mode?: QuizMode;
}

export class SubmitAnswerDto {
  @IsUUID()
  questionId: string;

  @IsUUID()
  answerId: string;
}

export class SubmitAnswersDto {
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}

export class QuizListQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  take?: number = 10;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsUUID()
  questionBankId?: string;
}

// Type exports for frontend usage
export type CreateQuizRequest = CreateQuizDto;
export type SubmitAnswerRequest = SubmitAnswerDto;
export type SubmitAnswersRequest = SubmitAnswersDto;
export type QuizListQueryRequest = QuizListQueryDto;
