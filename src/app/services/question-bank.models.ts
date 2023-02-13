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