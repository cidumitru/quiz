import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { Question } from '@aqb/data-access';
import { QuestionBankComponentState } from '../../question-bank-store.service';
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatListModule,
    MatChipsModule,
  ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionListComponent implements OnInit {
  // Store injection
  private store = inject(QuestionBankComponentState);
  
  // Outputs for parent communication
  editQuestion = output<Question>();
  deleteQuestion = output<Question>();
  createQuestion = output<void>();

  // Filter state
  public searchText = signal('');
  public showOnlyWithoutAnswers = signal(false);
  
  // Store selectors - direct access to store data
  public questions = this.store.questions;
  public totalItems = this.store.totalItems;
  public isLoading = this.store.isLoading;
  
  // Computed filtered questions (no pagination here - that's handled by the store)
  public displayedQuestions = computed(() => {
    const allQuestions = this.questions();
    if (!allQuestions || allQuestions.length === 0) {
      return [];
    }
    
    const onlyWithoutAnswers = this.showOnlyWithoutAnswers();
    
    // Filter questions based on client-side filters only
    let filtered = allQuestions.filter((q): q is Question => q !== null && q !== undefined);
    
    if (onlyWithoutAnswers) {
      filtered = filtered.filter((q: Question) => !q.answers.some(a => a.correct));
    }
    
    return filtered;
  });
  
  private searchSubject = new BehaviorSubject<string>('');

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
  
  loadMore(): void {
    const questionBank = this.store.questionBank();
    if (questionBank) {
      const currentCount = this.questions().length;
      this.store.loadQuestionsRange(currentCount, 20).catch(error => {
        console.error('Failed to load more questions:', error);
      });
    }
  }

  hasCorrectAnswer(question: Question): boolean {
    return question.answers.some((a) => a.correct);
  }

  getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  ngOnInit(): void {
    // Setup search with debouncing
    this.searchSubject
      .pipe(
        debounceTime(300), // Wait 300ms after the user stops typing
        distinctUntilChanged() // Only emit if the value is different from the previous one
      )
      .subscribe((searchQuery) => {
        this.store.setSearchQuery(searchQuery).catch(error => {
          console.error('Failed to search:', error);
        });
      });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchValue = target.value;
    this.searchText.set(searchValue);
    this.searchSubject.next(searchValue);
  }

  trackByFn(_index: number, item: Question): string {
    return item.id;
  }
}
