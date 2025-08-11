import {IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

export class CreateAnswerDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  @IsOptional()
  correct?: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ValidateNested({each: true})
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}

export class CreateQuestionBankDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class UpdateQuestionBankDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AddQuestionsDto {
  @ValidateNested({each: true})
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto | CreateQuestionDto[];
}

export class SetCorrectAnswerDto {
  @IsUUID()
  correctAnswerId: string;
}

export class ImportQuestionBankDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  createdAt: string;

  @IsString()
  @IsOptional()
  editedAt?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @IsArray()
  @ValidateNested({each: true})
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}

class AnswerDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  @IsOptional()
  correct?: boolean;
}

class QuestionDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ValidateNested({each: true})
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

// Type exports for frontend usage
export type CreateAnswerRequest = CreateAnswerDto;
export type CreateQuestionRequest = CreateQuestionDto;
export type CreateQuestionBankRequest = CreateQuestionBankDto;
export type UpdateQuestionBankRequest = UpdateQuestionBankDto;
export type AddQuestionsRequest = AddQuestionsDto;
export type SetCorrectAnswerRequest = SetCorrectAnswerDto;
export type ImportQuestionBankRequest = ImportQuestionBankDto;
