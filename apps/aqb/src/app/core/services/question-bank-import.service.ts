import { Injectable, inject } from '@angular/core';
import {
  answerScheme,
  type ParsedAnswer,
  type ParsedQuestion,
  type ParsedQuestionBank,
  questionBankScheme,
  questionScheme,
  type CreateQuestionRequest,
  type QuestionsAddedResponse,
} from '@aqb/data-access';
import { QuestionBankApiService } from '@aqb/data-access/angular';
import { z } from 'zod';
import { Observable } from 'rxjs';

// Internal interfaces for import results - not exposed outside service
interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

interface QuestionValidationResult {
  question: ParsedQuestion | null;
  errors: ValidationError[];
  skipped: boolean;
}

interface ImportValidationResult {
  isValid: boolean;
  questionBank: ParsedQuestionBank | null;
  validQuestions: number;
  invalidQuestions: number;
  totalQuestions: number;
  errors: ValidationError[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  questionBank: ParsedQuestionBank | null;
  statistics: {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    skippedQuestions: number;
    validAnswers: number;
    invalidAnswers: number;
  };
  errors: string[];
  warnings: string[];
}


@Injectable({
  providedIn: 'root',
})
export class QuestionBankImportService {
  private readonly questionBankApiService = inject(QuestionBankApiService);
  /**
   * Imports and validates a question bank from a JSON file
   * @param fileContent The raw file content
   * @returns ImportResult with validated data and statistics
   */
  async importFromFile(fileContent: string): Promise<ImportResult> {
    try {
      // Parse JSON
      const rawData = this.parseJson(fileContent);
      if (!rawData) {
        return this.createErrorResult('Invalid JSON format');
      }

      // Validate and clean the data
      const validationResult = await this.validateQuestionBank(rawData);

      if (!validationResult.isValid || !validationResult.questionBank) {
        return {
          success: false,
          questionBank: null,
          statistics: {
            totalQuestions: validationResult.totalQuestions,
            validQuestions: validationResult.validQuestions,
            invalidQuestions: validationResult.invalidQuestions,
            skippedQuestions: validationResult.invalidQuestions,
            validAnswers: 0,
            invalidAnswers: 0,
          },
          errors: validationResult.errors.map(
            (e) => `${e.field}: ${e.message}`
          ),
          warnings: validationResult.warnings,
        };
      }

      // Calculate answer statistics
      const answerStats = this.calculateAnswerStatistics(
        validationResult.questionBank.questions
      );

      return {
        success: true,
        questionBank: validationResult.questionBank,
        statistics: {
          totalQuestions: validationResult.totalQuestions,
          validQuestions: validationResult.validQuestions,
          invalidQuestions: validationResult.invalidQuestions,
          skippedQuestions: validationResult.invalidQuestions,
          validAnswers: answerStats.valid,
          invalidAnswers: answerStats.invalid,
        },
        errors: [],
        warnings: validationResult.warnings,
      };
    } catch (error) {
      console.error('Import error:', error);
      return this.createErrorResult(
        'Failed to import file: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Gets a formatted import summary message
   */
  getImportSummary(result: ImportResult): string {
    if (!result.success) {
      return `Import failed: ${result.errors.join(', ')}`;
    }

    const stats = result.statistics;
    const baseMessage = `Imported "${result.questionBank?.name}" with ${stats.validQuestions} questions`;

    if (stats.invalidQuestions > 0) {
      return `${baseMessage} (${stats.invalidQuestions} invalid questions skipped)`;
    }

    return `Successfully ${baseMessage}`;
  }

  /**
   * Validates and imports questions to an existing question bank
   * @param fileContent The raw file content  
   * @param questionBankId The ID of the existing question bank
   * @returns Observable<QuestionsAddedResponse> if valid, null otherwise
   */
  async importQuestionsToBank(
    fileContent: string,
    questionBankId: string
  ): Promise<{ questions: CreateQuestionRequest[]; apiCall?: Observable<QuestionsAddedResponse> }> {
    const rawData = this.parseJson(fileContent);
    if (!rawData || !Array.isArray(rawData['questions'])) {
      throw new Error('Invalid JSON format: expected "questions" array');
    }

    const questions = this.parseQuestionsOnly(rawData['questions']);
    if (questions.length === 0) {
      throw new Error('No valid questions found');
    }

    const apiCall = this.questionBankApiService.addQuestion(questionBankId, { questions });
    return { questions, apiCall };
  }

  /**
   * Parses questions-only format into CreateQuestionRequest[]
   */
  private parseQuestionsOnly(questionsData: unknown[]): CreateQuestionRequest[] {
    const validQuestions: CreateQuestionRequest[] = [];

    for (const questionData of questionsData) {
      const question = questionData as Record<string, unknown>;

      // Validate question text
      if (!question['question'] || typeof question['question'] !== 'string' || 
          (question['question'] as string).trim() === '') {
        continue;
      }

      // Validate answers
      if (!Array.isArray(question['answers'])) {
        continue;
      }

      const answers: { text: string; correct?: boolean }[] = [];
      for (const answerData of question['answers'] as unknown[]) {
        const answer = answerData as Record<string, unknown>;
        
        if (answer['text'] && typeof answer['text'] === 'string' && 
            (answer['text'] as string).trim() !== '') {
          answers.push({
            text: (answer['text'] as string).trim(),
            correct: Boolean(answer['correct']),
          });
        }
      }

      if (answers.length > 0) {
        const questionRequest: CreateQuestionRequest = {
          question: (question['question'] as string).trim(),
          answers,
        };

        // Parse tags if present
        if (question['tags'] && Array.isArray(question['tags'])) {
          const tags: string[] = [];
          for (const tag of question['tags']) {
            if (typeof tag === 'string' && tag.trim() !== '') {
              tags.push(tag.trim());
            }
          }
          if (tags.length > 0) {
            questionRequest.tags = tags;
          }
        }

        validQuestions.push(questionRequest);
      }
    }

    return validQuestions;
  }

  /**
   * Validates a question bank structure and its contents
   * Supports both full question bank format and simple questions-only format
   */
  private async validateQuestionBank(
    data: Record<string, unknown>
  ): Promise<ImportValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if this is a simple questions-only format (just has "questions" array)
    const isQuestionsOnlyFormat = this.isQuestionsOnlyFormat(data);

    let basicStructure: any;

    if (isQuestionsOnlyFormat) {
      // Create a minimal question bank structure for questions-only format
      basicStructure = {
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        name: 'Imported Questions',
        isDeleted: false,
        questions: [],
      };
      warnings.push('Detected questions-only format. Creating temporary question bank structure.');
    } else {
      // Use the existing full question bank validation
      basicStructure = {
        id: data['id'],
        createdAt: data['createdAt'],
        editedAt: data['editedAt'],
        name: data['name'],
        isDeleted: data['isDeleted'] ?? false,
        questions: [],
      };

      // Validate bank structure without questions
      const bankValidation = await questionBankScheme.safeParseAsync(
        basicStructure
      );
      if (!bankValidation.success) {
        const zodErrors = this.parseZodErrors(bankValidation.error);
        errors.push(...zodErrors);

        return {
          isValid: false,
          questionBank: null,
          validQuestions: 0,
          invalidQuestions: 0,
          totalQuestions: Array.isArray(data['questions'])
            ? (data['questions'] as unknown[]).length
            : 0,
          errors,
          warnings,
        };
      }
    }

    // Validate questions
    const questionsData = Array.isArray(data['questions'])
      ? (data['questions'] as unknown[])
      : [];
    const validatedQuestions = await this.validateQuestions(questionsData);

    // Filter valid questions
    const validQuestions = validatedQuestions
      .filter((result) => result.question !== null)
      .map((result) => result.question as ParsedQuestion);

    // Collect errors from invalid questions
    const invalidQuestionErrors = validatedQuestions
      .filter((result) => result.errors.length > 0)
      .flatMap((result) => result.errors);

    if (invalidQuestionErrors.length > 0) {
      warnings.push(
        `Skipped ${invalidQuestionErrors.length} invalid questions during import`
      );
    }

    // Check if we have at least one valid question
    if (validQuestions.length === 0) {
      errors.push({
        field: 'questions',
        message: 'No valid questions found in the import file',
      });

      return {
        isValid: false,
        questionBank: null,
        validQuestions: 0,
        invalidQuestions: questionsData.length,
        totalQuestions: questionsData.length,
        errors,
        warnings,
      };
    }

    // Create the validated question bank
    const validatedBank: ParsedQuestionBank = {
      ...basicStructure,
      questions: validQuestions,
    };

    return {
      isValid: true,
      questionBank: validatedBank,
      validQuestions: validQuestions.length,
      invalidQuestions: questionsData.length - validQuestions.length,
      totalQuestions: questionsData.length,
      errors,
      warnings,
    };
  }

  /**
   * Validates an array of questions
   */
  private async validateQuestions(
    questions: unknown[]
  ): Promise<QuestionValidationResult[]> {
    const results: QuestionValidationResult[] = [];

    for (const questionData of questions) {
      const result = await this.validateSingleQuestion(
        questionData as Record<string, unknown>
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Validates a single question with its answers
   */
  private async validateSingleQuestion(
    questionData: Record<string, unknown>
  ): Promise<QuestionValidationResult> {
    const errors: ValidationError[] = [];

    // Check for required question text
    if (
      !questionData['question'] ||
      typeof questionData['question'] !== 'string' ||
      (questionData['question'] as string).trim() === ''
    ) {
      errors.push({
        field: 'question',
        message: 'Question text is required and cannot be empty',
        value: questionData['question'],
      });

      return {
        question: null,
        errors,
        skipped: true,
      };
    }

    // Validate answers
    const answersData = Array.isArray(questionData['answers'])
      ? (questionData['answers'] as unknown[])
      : [];
    const validAnswers = await this.validateAnswers(answersData);

    // Check if we have at least one valid answer
    if (validAnswers.length === 0) {
      errors.push({
        field: 'answers',
        message: 'Question must have at least one valid answer',
        value: answersData,
      });

      return {
        question: null,
        errors,
        skipped: true,
      };
    }

    // Validate the complete question
    const questionToValidate = {
      id: (questionData['id'] as string) || this.generateId(),
      question: (questionData['question'] as string).trim(),
      answers: validAnswers,
    };

    const validation = await questionScheme.safeParseAsync(questionToValidate);

    if (!validation.success) {
      const zodErrors = this.parseZodErrors(validation.error);
      errors.push(...zodErrors);

      return {
        question: null,
        errors,
        skipped: true,
      };
    }

    return {
      question: validation.data,
      errors: [],
      skipped: false,
    };
  }

  /**
   * Validates an array of answers
   */
  private async validateAnswers(answers: unknown[]): Promise<ParsedAnswer[]> {
    const validAnswers: ParsedAnswer[] = [];

    for (const answerData of answers) {
      const answer = answerData as Record<string, unknown>;
      // Skip answers with empty text
      if (
        !answer['text'] ||
        typeof answer['text'] !== 'string' ||
        (answer['text'] as string).trim() === ''
      ) {
        continue;
      }

      const answerToValidate = {
        id: (answer['id'] as string) || this.generateId(),
        text: (answer['text'] as string).trim(),
        correct: (answer['correct'] as boolean) ?? false,
      };

      const validation = await answerScheme.safeParseAsync(answerToValidate);

      if (validation.success) {
        validAnswers.push(validation.data);
      }
    }

    return validAnswers;
  }

  /**
   * Parses Zod validation errors into our ValidationError format
   */
  private parseZodErrors(error: z.ZodError): ValidationError[] {
    return error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      value: undefined,
    }));
  }

  /**
   * Calculates answer statistics for validated questions
   */
  private calculateAnswerStatistics(questions: ParsedQuestion[]): {
    valid: number;
    invalid: number;
  } {
    let valid = 0;
    const invalid = 0;

    for (const question of questions) {
      valid += question.answers.length;
      // Since we only include valid answers, invalid count is 0 for validated questions
    }

    return { valid, invalid };
  }

  /**
   * Safely parses JSON content
   */
  private parseJson(content: string): Record<string, unknown> | null {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  /**
   * Creates an error result
   */
  private createErrorResult(message: string): ImportResult {
    return {
      success: false,
      questionBank: null,
      statistics: {
        totalQuestions: 0,
        validQuestions: 0,
        invalidQuestions: 0,
        skippedQuestions: 0,
        validAnswers: 0,
        invalidAnswers: 0,
      },
      errors: [message],
      warnings: [],
    };
  }


  /**
   * Detects if the input data is in questions-only format (simple format from example)
   */
  private isQuestionsOnlyFormat(data: Record<string, unknown>): boolean {
    // Check if it only has "questions" property and lacks question bank metadata
    const hasQuestions = Array.isArray(data['questions']);
    const lacksId = !data['id'];
    const lacksName = !data['name'];
    const lacksCreatedAt = !data['createdAt'];
    
    // It's questions-only format if it has questions but lacks the basic question bank fields
    return hasQuestions && (lacksId || lacksName || lacksCreatedAt);
  }

  /**
   * Generates a UUID v4
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
