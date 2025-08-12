import {ChangeDetectionStrategy, Component, computed, OnDestroy, OnInit, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatInputModule} from '@angular/material/input';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {Question} from '@aqb/data-access';
import {QuestionDataSource} from './question-data-source';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionListComponent implements OnInit, OnDestroy {
  // Data source for virtual scrolling
  public dataSource = new QuestionDataSource();

  // Outputs for parent communication
  editQuestion = output<Question>();
  deleteQuestion = output<Question>();
  createQuestion = output<void>();

  public searchText = signal('');
  public showOnlyWithoutAnswers = signal(false);

  // Check if a question should be visible based on current filters
  public shouldShowQuestion = computed(() => {
    const search = this.searchText().toLowerCase();
    const onlyWithoutAnswers = this.showOnlyWithoutAnswers();

    // Return a function that can be called with a question
    return (question: Question | undefined): boolean => {
      if (!question) return true; // Always show skeleton for unloaded items

      if (onlyWithoutAnswers && question.answers.find(a => a.correct) !== undefined) {
        return false; // Hide questions with correct answers
      }

      if (search && !question.question.toLowerCase().includes(search)) {
        return false; // Hide questions that don't match search
      }

      return true;
    };
  });

  ngOnInit(): void {
  }

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
    const correctAnswer = question.answers.find(a => a.correct);
    return correctAnswer ? correctAnswer.text : 'No correct answer set';
  }

  hasCorrectAnswer(question: Question): boolean {
    return question.answers.some(a => a.correct);
  }

  getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchText.set(target.value);
  }

  isQuestionLoading(index: number): boolean {
    return this.dataSource?.isQuestionLoading(index) ?? false;
  }

  getTotalItems(): number {
    return this.dataSource?.getTotalLength() ?? 0;
  }

  trackByFn(index: number, item: Question | undefined): any {
    return item ? item.id : index;
  }
}
