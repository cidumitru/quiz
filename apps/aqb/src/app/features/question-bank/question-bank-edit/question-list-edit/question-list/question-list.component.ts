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
import {Question} from '@aqb/data-access';

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
    ScrollingModule
  ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionListComponent {
  questions = input<Question[]>([]);

  editQuestion = output<Question>();
  deleteQuestion = output<Question>();
  createQuestion = output<void>();

  public searchText = signal('');
  public showOnlyWithoutAnswers = signal(false);

  public filteredQuestions = computed(() => {
    const questions = this.questions();
    const search = this.searchText().toLowerCase();
    const onlyWithoutAnswers = this.showOnlyWithoutAnswers();

    return questions.filter(question => {
      if (onlyWithoutAnswers && question.answers.find(a => a.correct) !== undefined) {
        return false;
      }
      return question.question.toLowerCase().includes(search);
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
}
