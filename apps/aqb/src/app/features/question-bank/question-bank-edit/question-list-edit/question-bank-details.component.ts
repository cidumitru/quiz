import {ChangeDetectionStrategy, Component, computed, inject, OnInit, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {QuestionBankService} from '../../question-bank.service';
import {Question, QuestionBankDetail, QuestionsPaginatedResponse} from '@aqb/data-access';
import {QuestionListComponent} from './question-list/question-list.component';
import {
  QuestionEditDialogComponent,
  QuestionEditDialogData
} from './dialogs/question-edit-dialog/question-edit-dialog.component';
import {ListRange} from '@angular/cdk/collections';

@Component({
  selector: 'app-question-bank-details',
  templateUrl: './question-bank-details.component.html',
  styleUrls: ['./question-bank-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    QuestionListComponent
  ],
  standalone: true
})
export class QuestionBankDetailsComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private questionBankService = inject(QuestionBankService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public id: string = this.activatedRoute.parent?.snapshot.paramMap.get('id')!;

  // Component state with signals
  private questionBankDetail = signal<QuestionBankDetail | null>(null);
  // Computed values
  public questionBank = computed(() => this.questionBankDetail());
  private questions = signal<(Question | null)[]>([]); // Sparse array for loaded questions
  public questionsArray = computed(() => this.questions());
  private totalItems = signal<number>(0);
  public totalCount = computed(() => this.totalItems());
  private loading = signal<boolean>(false);
  public isLoading = computed(() => this.loading());
  private loadingRanges = signal<Set<number>>(new Set()); // Track which indices are being loaded
  private readonly BUFFER_SIZE = 10;
  private readonly PAGE_SIZE = 50;

  ngOnInit(): void {
    this.loadInitialData();
  }

  onRangeChanged(range: ListRange): void {
    const start = Math.max(0, range.start - this.BUFFER_SIZE);
    const end = Math.min(this.totalItems(), range.end + this.BUFFER_SIZE);

    // Find missing questions in range
    const toLoad: number[] = [];
    const currentQuestions = this.questions();
    const currentLoadingRanges = this.loadingRanges();

    for (let i = start; i < end; i++) {
      if (!currentQuestions[i] && !currentLoadingRanges.has(i)) {
        toLoad.push(i);
      }
    }

    if (toLoad.length > 0) {
      this.loadQuestionsInRange(toLoad);
    }
  }

  isQuestionLoading(index: number): boolean {
    return this.loadingRanges().has(index);
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    try {
      // First get the question bank metadata (without all questions)
      const questionBankResponse = await firstValueFrom(this.questionBankService.getQuestionBank(this.id));
      if (questionBankResponse) {
        // Store the bank details but clear questions - we'll load them on demand
        const bankWithoutQuestions = {...questionBankResponse, questions: []};
        this.questionBankDetail.set(bankWithoutQuestions);

        // Load first batch of questions with pagination to get total count
        await this.loadQuestions(0, this.PAGE_SIZE);
      }
    } catch (error) {
      console.error('Failed to load question bank:', error);
      this.snackBar.open('Failed to load question bank', 'Close', {duration: 5000});
    } finally {
      this.loading.set(false);
    }
  }

  private async loadQuestions(offset: number, limit: number): Promise<void> {
    try {
      const response: QuestionsPaginatedResponse = await firstValueFrom(
        this.questionBankService.getQuestions(this.id, offset, limit)
      );

      if (response) {
        // Initialize sparse array if needed
        if (this.questions().length === 0) {
          const emptyArray = new Array(response.totalItems).fill(null);
          this.questions.set(emptyArray);
          this.totalItems.set(response.totalItems);
        }

        // Insert questions at their correct positions
        this.questions.update(currentQuestions => {
          const updated = [...currentQuestions];
          response.questions.forEach((question, index) => {
            updated[offset + index] = question;
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      this.snackBar.open('Failed to load questions', 'Close', {duration: 3000});
    }
  }

  private async loadQuestionsInRange(indices: number[]): Promise<void> {
    // Mark indices as loading
    this.loadingRanges.update(current => {
      const newSet = new Set(current);
      indices.forEach(i => newSet.add(i));
      return newSet;
    });

    try {
      // Group consecutive indices into batches for efficient loading
      const batches = this.groupIntoBatches(indices);

      for (const batch of batches) {
        await this.loadQuestions(batch.start, batch.length);
      }
    } finally {
      // Remove indices from loading set
      this.loadingRanges.update(current => {
        const newSet = new Set(current);
        indices.forEach(i => newSet.delete(i));
        return newSet;
      });
    }
  }

  private groupIntoBatches(indices: number[]): { start: number; length: number }[] {
    if (indices.length === 0) return [];

    const sorted = [...indices].sort((a, b) => a - b);
    const batches: { start: number; length: number }[] = [];
    let currentStart = sorted[0];
    let currentEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === currentEnd + 1) {
        currentEnd = sorted[i];
      } else {
        batches.push({start: currentStart, length: currentEnd - currentStart + 1});
        currentStart = sorted[i];
        currentEnd = sorted[i];
      }
    }

    batches.push({start: currentStart, length: currentEnd - currentStart + 1});
    return batches;
  }

  private findQuestionIndex(questionId: string): number {
    const questions = this.questions();
    return questions.findIndex(q => q?.id === questionId);
  }

  onEditQuestion(question: Question): void {
    const dialogData: QuestionEditDialogData = {
      question,
      questionBankId: this.id,
      mode: 'edit'
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.question) {
        this.updateQuestion(result.question, result.correctAnswerId);
      }
    });
  }

  onCreateQuestion(): void {
    const dialogData: QuestionEditDialogData = {
      questionBankId: this.id,
      mode: 'create'
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.newQuestion) {
        this.createQuestion(result.newQuestion);
      }
    });
  }

  onDeleteQuestion(question: Question): void {
    this.deleteQuestion(question);
  }

  private async updateQuestion(question: Question, correctAnswerId: string): Promise<void> {
    // Find the index of the question in our sparse array
    const questionIndex = this.findQuestionIndex(question.id);

    if (questionIndex === -1) {
      this.snackBar.open('Question not found', 'Close', {duration: 3000});
      return;
    }

    // Optimistic update: immediately update the question in local state
    this.questions.update(currentQuestions => {
      const updated = [...currentQuestions];
      if (updated[questionIndex]) {
        // Update the question with new correct answer
        updated[questionIndex] = {
          ...question,
          answers: question.answers.map(answer => ({
            ...answer,
            correct: answer.id === correctAnswerId
          }))
        };
      }
      return updated;
    });

    try {
      // TODO: Backend doesn't support full question update yet
      // For now, we can only update the correct answer
      // Full question text and answers update would need backend API support
      await this.questionBankService.setCorrectAnswer(this.id, question.id, correctAnswerId);
      this.snackBar.open('Correct answer updated successfully', 'Close', {duration: 3000});
    } catch (error) {
      console.error('Failed to update question:', error);

      // Rollback optimistic update on error
      this.questions.update(currentQuestions => {
        const updated = [...currentQuestions];
        if (updated[questionIndex]) {
          updated[questionIndex] = question; // Restore original question
        }
        return updated;
      });

      this.snackBar.open('Failed to update question', 'Close', {duration: 5000});
    }
  }

  private async createQuestion(question: any): Promise<void> {
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempQuestion: Question = {
      id: tempId,
      question: question.question,
      answers: question.answers.map((answer: any, index: number) => ({
        id: `temp_answer_${index}`,
        text: answer.text,
        correct: answer.correct
      }))
    };

    // Optimistic update: add question to the end of the list
    this.questions.update(currentQuestions => {
      return [...currentQuestions, tempQuestion];
    });

    this.totalItems.update(count => count + 1);

    try {
      await this.questionBankService.addQuestion(this.id, question);
      this.snackBar.open('Question created successfully', 'Close', {duration: 3000});

      // Reload the last question to get the actual ID from server
      // For now, we keep the temp question since we don't have real-time updates
    } catch (error) {
      console.error('Failed to create question:', error);

      // Rollback optimistic update on error
      this.questions.update(currentQuestions => {
        return currentQuestions.filter(q => q?.id !== tempId);
      });

      this.totalItems.update(count => count - 1);

      this.snackBar.open('Failed to create question', 'Close', {duration: 5000});
    }
  }

  private async deleteQuestion(question: Question): Promise<void> {
    const questionIndex = this.findQuestionIndex(question.id);

    if (questionIndex === -1) {
      this.snackBar.open('Question not found', 'Close', {duration: 3000});
      return;
    }

    // Store the question for rollback
    const deletedQuestion = this.questions()[questionIndex];

    // Optimistic update: remove question from local state
    this.questions.update(currentQuestions => {
      const updated = [...currentQuestions];
      updated[questionIndex] = null; // Mark as deleted but keep index for sparse array
      return updated;
    });

    try {
      await this.questionBankService.deleteQuestion(this.id, question.id);
      this.snackBar.open('Question deleted successfully', 'Close', {duration: 3000});

      // Actually remove the question and update total count
      this.questions.update(currentQuestions => {
        return currentQuestions.filter((_, index) => index !== questionIndex);
      });

      this.totalItems.update(count => count - 1);
    } catch (error) {
      console.error('Failed to delete question:', error);

      // Rollback optimistic update on error
      this.questions.update(currentQuestions => {
        const updated = [...currentQuestions];
        updated[questionIndex] = deletedQuestion; // Restore the deleted question
        return updated;
      });

      this.snackBar.open('Failed to delete question', 'Close', {duration: 5000});
    }
  }
}
