import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {QuizListItemViewModel} from "./quiz-list-item-view.model";
import {QuizService} from "../quiz.service";
import {ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {RouterLink} from "@angular/router";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {toSignal} from "@angular/core/rxjs-interop";
import {map} from "rxjs/operators";

interface QuestionBankSelectOption {
  id: string;
  name: string;
}


@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule
  ],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent {
  private quiz = inject(QuizService);
  public quizList = toSignal(this.quiz.quizzes$.pipe(map(quizzes => quizzes.map(q => new QuizListItemViewModel(q)))))

  constructor() {
    this.quiz.reload();
  }

  clearHistory() {
    this.quiz.clear();
  }
}
