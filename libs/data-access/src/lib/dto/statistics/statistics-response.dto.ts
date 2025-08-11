// Response interfaces for statistics endpoints

export interface QuestionBankStats {
  totalQuizzes: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  uniqueQuestionsAnswered: number;
  coverage: number;
  averageScore: number;
  lastQuizDate?: Date;
}

export interface DailyStats {
  date: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  quizzesCompleted: number;
}

export interface QuestionBankSummaryStats {
  questionBankId: string;
  questionBankName: string;
  totalQuestions: number;
  answeredQuestions: number;
  coverage: number;
  averageScore: number;
  lastActivity?: Date;
}

export interface OverallStatsResponse {
  totalQuizzes: number;
  totalAnswers: number;
  correctAnswers: number;
  averageScore: number;
  questionBanks: QuestionBankSummaryStats[];
}