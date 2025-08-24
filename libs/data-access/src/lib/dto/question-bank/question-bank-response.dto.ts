// Response interfaces for question-bank endpoints
import * as z from 'zod';

// Zod schemas for validation and typing
export const answerScheme = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.optional(z.boolean()),
});

export const questionScheme = z.object({
  id: z.string(),
  question: z.string(),
  answers: z.array(answerScheme),
  tags: z.array(z.string()).optional().default([]),
});

export const questionBankScheme = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  editedAt: z.optional(z.string()),
  name: z.string(),
  isDeleted: z.optional(z.boolean()),
  questions: z.array(questionScheme),
});

export type ParsedAnswer = z.infer<typeof answerScheme>;
export type ParsedQuestion = z.infer<typeof questionScheme>;
export type ParsedQuestionBank = z.infer<typeof questionBankScheme>;

export enum QuestionType {
  MultipleChoice = 'MultipleChoice',
}

// Request/Response DTOs for API endpoints
export interface IQuestionCreate {
  question: string;
  answers: Pick<ParsedAnswer, 'text' | 'correct'>[];
  tags?: string[];
}

export interface QuestionCountResult {
  q_questionBankId: string;
  count: string;
}

export interface QuestionBankStatistics {
  totalQuizzes: number;
  totalAnswers: number;
  correctAnswers: number;
  coverage: number;
  averageScore: number;
  averageScoreToday: number;
  lastQuizDate: Date | null;
}

export interface QuestionBankSummary {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  questionsCount: number;
  statistics: QuestionBankStatistics;
}

export interface QuestionBankListResponse {
  questionBanks: QuestionBankSummary[];
}

export interface Answer {
  id: string;
  text: string;
  correct?: boolean;
}

export interface Question {
  id: string;
  question: string;
  answers: Answer[];
  tags?: string[];
}

export interface QuestionBankDetail {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isDeleted: boolean;
  questions: Question[];
  statistics: QuestionBankStatistics;
}

export interface QuestionBankDetailResponse {
  questionBank: QuestionBankDetail;
}

export interface CreateQuestionBankResponse {
  questionBank: QuestionBankDetail;
}

export interface QuestionBankSuccessResponse {
  success: boolean;
}

export interface QuestionsAddedResponse {
  success: boolean;
  questionsAdded: number;
  duplicatesSkipped?: number;
}

export interface QuestionsPaginatedResponse {
  questions: Question[];
  totalItems: number;
  offset: number;
  limit: number;
}
