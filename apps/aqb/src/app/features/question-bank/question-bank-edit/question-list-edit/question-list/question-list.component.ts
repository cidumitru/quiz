import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Question } from '@aqb/data-access';
import { QuestionDataSource } from './question-data-source';
import { QuestionBankStore } from '../../question-bank-store.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ScrollingModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionListComponent implements OnInit, OnDestroy {
  // Data source for virtual scrolling
  public dataSource = new QuestionDataSource();

  // Outputs for parent communication
  editQuestion = output<Question>();
  deleteQuestion = output<Question>();
  createQuestion = output<void>();

  // Track total items as a computed signal from data source
  public totalItems = computed(() => this.dataSource.totalItems());
  public searchText = signal('');
  public showOnlyWithoutAnswers = signal(false);
  // Check if a question should be visible based on current filters (only client-side filters now)
  public shouldShowQuestion = computed(() => {
    const onlyWithoutAnswers = this.showOnlyWithoutAnswers();

    // Return a function that can be called with a question
    return (question: Question | undefined): boolean => {
      if (!question) return true; // Always show skeleton for unloaded items

      if (
        onlyWithoutAnswers &&
        question.answers.find((a) => a.correct) !== undefined
      ) {
        return false; // Hide questions with correct answers
      }

      return true;
    };
  });
  private cdr = inject(ChangeDetectorRef);
  private store = inject(QuestionBankStore);
  private searchSubject = new BehaviorSubject<string>('');

  ngOnDestroy(): void {
    if (this.dataSource) {
      this.dataSource.disconnect();
    }
  }

  onEditQuestion(question: Question): void {
    this.editQuestion.emit(question);
  }

  onDeleteQuestion(question: Question): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.deleteQuestion.emit(question);
    }
  }

  onCreateQuestion(): void {
    this.createQuestion.emit();
  }

  getCorrectAnswer(question: Question): string {
    const correctAnswer = question.answers.find((a) => a.correct);
    return correctAnswer ? correctAnswer.text : 'No correct answer set';
  }

  hasCorrectAnswer(question: Question): boolean {
    return question.answers.some((a) => a.correct);
  }

  getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  ngOnInit(): void {
    // Force initial change detection after data source is set up
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);

    // Setup search with debouncing
    this.searchSubject
      .pipe(
        debounceTime(300), // Wait 300ms after the user stops typing
        distinctUntilChanged() // Only emit if the value is different from the previous one
      )
      .subscribe((searchQuery) => {
        this.store.setSearchQuery(searchQuery);
      });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchValue = target.value;
    this.searchText.set(searchValue);

    // Debounce search to avoid too many API calls
    this.performSearch(searchValue);
  }

  trackByFn(index: number, item: Question | undefined): string | number {
    return item ? item.id : index;
  }

  isQuestionLoading(index: number): boolean {
    return this.dataSource?.isQuestionLoading(index) ?? false;
  }

  private performSearch(searchQuery: string): void {
    this.searchSubject.next(searchQuery);
  }
}
