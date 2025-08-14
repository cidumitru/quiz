import {computed, signal} from '@angular/core';
import {QuizAnswer, QuizQuestion} from "@aqb/data-access";

export class QuestionViewModel {
  readonly id: string;
  readonly question: string;
  readonly answers: AnswerViewModel[];
  readonly correctAnswer?: AnswerViewModel;
  readonly hasCorrectAnswer: boolean;
  // Reactive state for this question
  private _selectedAnswerId = signal<string | null>(null);
  // Computed properties based on selection state
  readonly isAnswered = computed(() => !!this._selectedAnswerId());
  readonly isCorrect = computed(() => {
    const selectedId = this._selectedAnswerId();
    if (!selectedId || !this.hasCorrectAnswer) return false;
    const selectedAnswer = this.answers.find(a => a.id === selectedId);
    return !!selectedAnswer?.isCorrect;
  });
  readonly isIncorrect = computed(() => {
    if (!this.isAnswered() || !this.hasCorrectAnswer) return false;
    return !this.isCorrect();
  });
  readonly selectedAnswerId = computed(() => this._selectedAnswerId());

  constructor(question: QuizQuestion) {
    this.id = question.questionId;
    this.question = question.question;

    // Create answer view models
    this.answers = question.answers.map((answer, index) =>
      new AnswerViewModel(answer, answer.id === question.correctAnswerId, index)
    );

    this.correctAnswer = this.answers.find(a => a.isCorrect);
    this.hasCorrectAnswer = !!this.correctAnswer;

    // Initialize selection state
    if (question.userAnswerId) {
      this._selectedAnswerId.set(question.userAnswerId);
    }
  }

  // Methods to update selection state
  selectAnswer(answerId: string): void {
    if (this.isAnswered()) return; // Prevent changing answer once answered
    this._selectedAnswerId.set(answerId);
  }

  // Get CSS classes for this question
  getCssClasses(): Record<string, boolean> {
    return {
      'answered': this.isAnswered(),
      'correct': this.isCorrect(),
      'incorrect': this.isIncorrect(),
      'unanswered': !this.isAnswered()
    };
  }

  // Get CSS classes for an answer
  getAnswerCssClasses(answerId: string): Record<string, boolean> {
    const isSelected = this.selectedAnswerId() === answerId;
    const isAnswered = this.isAnswered();
    const answer = this.answers.find(a => a.id === answerId);

    return {
      'selected': isSelected,
      'correct-answer': !!(isAnswered && answer?.isCorrect),
      'user-incorrect': isSelected && !answer?.isCorrect && isAnswered,
      'disabled': isAnswered
    };
  }
}

export class AnswerViewModel {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly label: string;
  readonly index: number;

  constructor(answer: QuizAnswer, isCorrect: boolean, index: number) {
    this.id = answer.id;
    this.text = answer.text;
    this.isCorrect = isCorrect;
    this.index = index;
    this.label = String.fromCharCode(65 + index); // A, B, C, D...
    }
}
