import {computed} from '@angular/core';
import {QuestionViewModel} from "./question.view-model";
import {Quiz} from "@aqb/data-access";

export class QuizViewModel {
  readonly id: string;
  readonly questionBankId: string;
  readonly questionBankName: string;
  readonly startedAt: Date;
  readonly finishedAt?: Date;
  readonly questions: QuestionViewModel[];
  readonly questionMap: Record<string, QuestionViewModel>;
  readonly totalQuestions: number;

  // Computed global state from individual question states
  readonly answeredCount = computed(() => {
    return this.questions.filter(q => q.isAnswered()).length;
  });

  readonly correctCount = computed(() => {
    return this.questions.filter(q => q.isCorrect()).length;
  });

  readonly incorrectCount = computed(() => {
    return this.questions.filter(q => q.isIncorrect()).length;
  });

  readonly progressPercentage = computed(() => {
    const answered = this.answeredCount();
    return this.totalQuestions > 0 ? (answered / this.totalQuestions) * 100 : 0;
  });

  readonly accuracyPercentage = computed(() => {
    const answered = this.answeredCount();
    const correct = this.correctCount();
    return answered > 0 ? Math.round((correct / answered) * 100) : 0;
  });

  readonly isComplete = computed(() => {
    return this.answeredCount() === this.totalQuestions;
  });

  readonly hasAnyQuestions = computed(() => {
    return this.totalQuestions > 0;
  });

  constructor(quiz: Quiz, initialAnswers: Record<string, string> = {}) {
    this.id = quiz.id;
    this.questionBankId = quiz.questionBankId;
    this.startedAt = typeof quiz.startedAt === 'string' ? new Date(quiz.startedAt) : quiz.startedAt;
    this.finishedAt = quiz.finishedAt ? (typeof quiz.finishedAt === 'string' ? new Date(quiz.finishedAt) : quiz.finishedAt) : undefined;

    // Create question view models with initial answers
    this.questions = quiz.questions.map(q =>
      new QuestionViewModel(q, initialAnswers[q.questionId || ''])
    );

    this.questionBankName = quiz.questionBankName;

    // Create question map for quick lookup
    this.questionMap = this.questions.reduce((map, q) => {
      map[q.id] = q;
      return map;
    }, {} as Record<string, QuestionViewModel>);

    this.totalQuestions = this.questions.length;
  }

  // Delegate to question view model
  selectAnswer(questionId: string, answerId: string): void {
    const question = this.questionMap[questionId];
    if (question) {
      question.selectAnswer(answerId);
    }
  }

  // Convenience methods that delegate to question view models
  isQuestionAnswered(questionId: string): boolean {
    return this.questionMap[questionId]?.isAnswered() || false;
  }

  isQuestionCorrect(questionId: string): boolean {
    return this.questionMap[questionId]?.isCorrect() || false;
  }

  isQuestionIncorrect(questionId: string): boolean {
    return this.questionMap[questionId]?.isIncorrect() || false;
  }

  getSelectedAnswerId(questionId: string): string | undefined {
    return this.questionMap[questionId]?.selectedAnswerId() || undefined;
  }

  // Get all current answers for saving to backend
  getAllAnswers(): Array<{ questionId: string, answerId: string }> {
    return this.questions
      .filter(q => q.isAnswered())
      .map(q => ({
        questionId: q.id,
        answerId: q.selectedAnswerId() || ''
      }));
  }

  // Delegate CSS class generation to question view models
  getQuestionCssClasses(questionId: string): Record<string, boolean> {
    return this.questionMap[questionId]?.getCssClasses() || {};
  }

  getAnswerCssClasses(questionId: string, answerId: string): Record<string, boolean> {
    return this.questionMap[questionId]?.getAnswerCssClasses(answerId) || {};
  }
}
