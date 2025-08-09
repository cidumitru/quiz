import { IAnswer, IQuestion } from './question-bank.interfaces';

export interface IAnsweredQuestion extends IQuestion {
    answer?: IAnswer;
}

export interface IQuiz {
    id: string;
    questionBankId: string;
    startedAt: string;
    finishedAt?: string;
    mode?: QuizMode;
    questions: IAnsweredQuestion[];
}

export enum QuizMode {
    All = "all",
    Mistakes = "mistakes",
    Discovery = "discovery",
}

export interface ICreateQuiz {
    questionBankId: string;
    questionsCount: number;
    mode?: QuizMode;
}

export interface IGetQuizzesParams {
    take: number;
    skip: number;
    questionBankId?: string;
}

// Request/Response DTOs for API endpoints
export interface IQuizCreateRequest {
    questionBankId: string;
    questionsCount: number;
    mode?: QuizMode;
}

export interface IQuizCreateResponse {
    quiz: IQuiz;
}

export interface IQuizListRequest {
    take: number;
    skip: number;
    questionBankId?: string;
}

export interface IQuizListResponse {
    items: IQuiz[];
    total: number;
}

export interface IQuizGetRequest {
    id: string;
}

export interface IQuizGetResponse {
    quiz: IQuiz;
}

export interface IQuizFinishRequest {
    quizId: string;
}

export interface IQuizFinishResponse {
    success: boolean;
}

export interface IQuizAnswersSetRequest {
    quizId: string;
    answers: { questionId: string; answerId: string }[];
}

export interface IQuizAnswersSetResponse {
    success: boolean;
}

export interface IQuizClearRequest {
    // Empty - clears all quizzes
}

export interface IQuizClearResponse {
    success: boolean;
}