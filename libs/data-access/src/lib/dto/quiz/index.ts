// Request DTOs (classes with validation)
export {
  CreateQuizDto,
  SubmitAnswerDto,
  SubmitAnswersDto,
  QuizListQueryDto,
  QuizMode,
} from './quiz-request.dto';

// Type exports for frontend
export type {
  CreateQuizRequest,
  SubmitAnswerRequest,
  SubmitAnswersRequest,
  QuizListQueryRequest
} from './quiz-request.dto';

// Response interfaces
export type {
  // Unified response interfaces
  QuizAnswer,
  QuizQuestion,
  Quiz,
  QuizListItem,
  CreateQuizResponse,
  QuizDetailResponse,
  QuizListResponse,
  QuizFinishResponse,
  SubmitAnswersResponse,
  ClearHistoryResponse
} from './quiz-response.dto';
