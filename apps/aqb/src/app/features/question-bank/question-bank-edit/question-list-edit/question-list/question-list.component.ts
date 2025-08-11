import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
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
import {ListRange} from '@angular/cdk/collections';

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
export class QuestionListComponent {
  questions = input<(Question | null)[]>([]); // Sparse array support
  totalItems = input<number>(0);
  isLoading = input<boolean>(false);

  editQuestion = output<Question>();
  deleteQuestion = output<Question>();
  createQuestion = output<void>();
  rangeChanged = output<ListRange>();

  public searchText = signal('');
  public showOnlyWithoutAnswers = signal(false);

  // For virtual scrolling, we work with indices rather than filtering
  public filteredQuestions = computed(() => {
    const questions = this.questions();
    const search = this.searchText().toLowerCase();
    const onlyWithoutAnswers = this.showOnlyWithoutAnswers();

    // If no search or filter, return the sparse array as-is
    if (!search && !onlyWithoutAnswers) {
      return questions;
    }

    // For search/filter, we need to process only loaded questions
    return questions.map((question, index) => {
      if (!question) return null; // Keep null for unloaded items

      if (onlyWithoutAnswers && question.answers.find(a => a.correct) !== undefined) {
        return null; // Hide questions with correct answers
      }

      if (search && !question.question.toLowerCase().includes(search)) {
        return null; // Hide questions that don't match search
      }

      return question;
    });
  });

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

  onRangeChanged(range: any): void {
    this.rangeChanged.emit(range as ListRange);
  }

  isQuestionLoaded(index: number): boolean {
    const questions = this.questions();
    return questions[index] !== null && questions[index] !== undefined;
  }

  getQuestionAtIndex(index: number): Question | null {
    const questions = this.filteredQuestions();
    return questions[index] || null;
  }
}
