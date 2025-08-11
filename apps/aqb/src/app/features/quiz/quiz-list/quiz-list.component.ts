import {AfterViewInit, ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {QuizListItemViewModel} from "./quiz-list-item-view.model";
import {QuizService} from "../quiz.service";
import {startWith, tap} from "rxjs";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {RouterLink} from "@angular/router";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";

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
export class QuizListComponent implements AfterViewInit {
  questionBankFilter = new FormControl<QuestionBankSelectOption | undefined>(undefined);
  public quizList = signal<QuizListItemViewModel[]>([]);
  private quiz = inject(QuizService);

  constructor() {
    this.loadQuizzes();
  }

  ngAfterViewInit(): void {
    this.questionBankFilter.valueChanges.pipe(
      startWith(undefined),
      tap(() => this.loadQuizzes())
    ).subscribe();
  }

  clearHistory() {
    this.quiz.clear();
  }

  private async loadQuizzes(): Promise<void> {
    const selectedQuestionBank = this.questionBankFilter.value;
    const allQuizzes = await this.quiz.getQuizzes({
      questionBankId: selectedQuestionBank?.id,
      skip: 0,
      take: 100 // Get all quizzes since we're not paginating
    });

    this.quizList.set(allQuizzes.items.map((q) =>
      new QuizListItemViewModel(q)
    ));
  }
}
