import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {QuizListItemViewModel} from "./quiz-list-item-view.model";
import {QuizService} from "../quiz.service";
import {ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute, Router} from "@angular/router";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {toSignal} from "@angular/core/rxjs-interop";
import {map} from "rxjs/operators";


@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent {
  private quiz = inject(QuizService);
  public loadingQuizId: string | null = null;
  private router = inject(Router);

  public quizList = toSignal(this.quiz.quizzes$.pipe(map(quizzes => quizzes.map(q => new QuizListItemViewModel(q)))), {
    initialValue: []
  });
  public quizLoading = toSignal(this.quiz.loading$, {initialValue: false});
  private activatedRoute = inject(ActivatedRoute);

  constructor() {
    this.quiz.reload();
  }

  clearHistory() {
    this.quiz.clear();
  }

  async navigateToQuiz(quizId: string, event: Event) {
    event.preventDefault();
    this.loadingQuizId = quizId;

    try {
      await this.router.navigate(['practice', quizId], {relativeTo: this.activatedRoute});
    } catch (error) {
      console.error('Navigation failed:', error);
    } finally {
      // Reset loading state after a short delay to show the spinner
      setTimeout(() => {
        this.loadingQuizId = null;
      }, 500);
    }
  }
}
