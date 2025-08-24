import {QuizMode} from './quiz-request.dto';

export interface QuizAnswer {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionId: string;
  question: string;
  imageUrl?: string;
  tags?: string[];
  answers: QuizAnswer[];
  userAnswerId?: string;
  correctAnswerId?: string;
  orderIndex: number;
}

export interface Quiz {
  id: string;
  questionBankId: string;
  mode: QuizMode;
  startedAt: Date;
  finishedAt?: Date;
  questions: QuizQuestion[];
  questionBankName: string;
}


export interface QuizListItem {
  id: string;
  mode: QuizMode;
  startedAt: Date;
  finishedAt?: Date;
  questionCount: number;
  answerCount: number;
  questionBankName: string;
  score: number;
}

export interface CreateQuizResponse {
  quiz: Quiz;
}

export interface QuizDetailResponse {
  quiz: Quiz;
}

export interface QuizListResponse {
  items: QuizListItem[];
  total: number;
}

export interface QuizFinishResponse {
  success: boolean;
  quiz: Quiz;
}

export interface SubmitAnswersResponse {}

export interface ClearHistoryResponse {
  success: boolean;
  deletedCount: number;
}
