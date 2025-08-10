import * as z from 'zod';

export const answerScheme = z.object({
    id: z.string(),
    text: z.string(),
    correct: z.optional(z.boolean())
});

export const questionScheme = z.object({
    id: z.string(),
    question: z.string(),
    answers: z.array(answerScheme)
});

export const questionBankScheme = z.object({
    id: z.string().uuid(),
    createdAt: z.string(),
    editedAt: z.optional(z.string()),
    name: z.string(),
    isDeleted: z.optional(z.boolean()),
    questions: z.array(questionScheme)
})

export type IAnswer = z.infer<typeof answerScheme>;
export type IQuestion = z.infer<typeof questionScheme>;
export type IQuestionBank = z.infer<typeof questionBankScheme>;

export enum QuestionType {
    MultipleChoice = "MultipleChoice"
}

// Request/Response DTOs for API endpoints
export interface IQuestionCreate {
    question: string;
    answers: Pick<IAnswer, 'text' | 'correct'>[];
}

export interface IQuestionBankCreateRequest {
    name?: string;
}

export interface IQuestionBankCreateResponse {
    questionBank: IQuestionBank;
}

export interface IQuestionBankUpdateRequest {
    id: string;
    name: string;
}

export interface IQuestionBankUpdateResponse {
    success: boolean;
}

export interface IQuestionBankListResponse {
    questionBanks: IQuestionBank[];
}

export interface IQuestionBankGetResponse {
    questionBank: IQuestionBank;
}

export interface IQuestionBankDeleteRequest {
    id: string;
}

export interface IQuestionBankDeleteResponse {
    success: boolean;
}

export interface IQuestionAddRequest {
    questionBankId: string;
    questions: IQuestionCreate | IQuestionCreate[];
}

export interface IQuestionAddResponse {
    success: boolean;
    questionsAdded: number;
}

export interface IQuestionDeleteRequest {
    questionBankId: string;
    questionId: string;
}

export interface IQuestionDeleteResponse {
    success: boolean;
}

export interface IAnswerSetCorrectRequest {
    questionBankId: string;
    questionId: string;
    correctAnswerId: string;
}

export interface IAnswerSetCorrectResponse {
    success: boolean;
}