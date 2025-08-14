// Re-export shared types from data-access library
export type {
  QuestionType,
  Answer,
  Question,
  QuestionBankDetail,
  QuestionBankSummary,
  IQuestionCreate,
  QuestionsPaginatedResponse,
} from '@aqb/data-access';

// Keep schemas only for validation during import
export {
  answerScheme,
  questionScheme,
  questionBankScheme,
} from '@aqb/data-access';
