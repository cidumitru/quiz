// Request DTOs (classes with validation)
export {
  CreateAnswerDto,
  CreateQuestionDto,
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  AddQuestionsDto,
  SetCorrectAnswerDto,
  ImportQuestionBankDto,
} from './question-bank-request.dto';

// Type exports for frontend
export type {
  CreateAnswerRequest,
  CreateQuestionRequest,
  CreateQuestionBankRequest,
  UpdateQuestionBankRequest,
  AddQuestionsRequest,
  SetCorrectAnswerRequest,
  ImportQuestionBankRequest
} from './question-bank-request.dto';

// Response interfaces and schemas
export {
  // Zod schemas and enums
  answerScheme,
  questionScheme,
  questionBankScheme,
  QuestionType,
} from './question-bank-response.dto';

export type {
  ParsedAnswer,
  ParsedQuestion,
  ParsedQuestionBank,
  IQuestionCreate,
  // API Response interfaces
  QuestionCountResult,
  QuestionBankStatistics,
  QuestionBankSummary,
  QuestionBankListResponse,
  Answer,
  Question,
  QuestionBankDetail,
  QuestionBankDetailResponse,
  CreateQuestionBankResponse,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse
} from './question-bank-response.dto';
