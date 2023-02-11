import { Component } from '@angular/core';
import { QuestionBankService } from "../services/question-bank.service";
import { Router, RouterModule } from "@angular/router";
import exportFromJSON from "export-from-json";
import { first } from "lodash";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatCardModule } from "@angular/material/card";
import { MatRadioModule } from "@angular/material/radio";
import { CommonModule } from "@angular/common";
import { questionBankScheme } from "../services/question-bank.models";
import {MatTooltipModule} from "@angular/material/tooltip";
import {IAnsweredQuestion, IQuiz, QuizService} from "../services/quiz.service";
import {map} from "rxjs";

@Component({
  selector: 'app-quiz-list',
  templateUrl: './question-bank-list.component.html',
  styleUrls: ['./question-bank-list.component.scss'],
  standalone: true,
    imports: [
        CommonModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatCardModule,
        MatRadioModule,
        MatSnackBarModule,
        RouterModule,
        MatTooltipModule
    ]
})
export class QuestionBankListComponent {

    public quizzes$ = this.quiz.quizzesArr$.pipe(map(quizzes => quizzes.map(quiz => new QuizViewModel(quiz))));

  constructor(public questionBank: QuestionBankService, private router: Router, private snackbar: MatSnackBar, public quiz: QuizService) {
  }

  newQuestionBank(): void {
    const newQuizId = this.questionBank.create();
    this.router.navigate([newQuizId]).then()
  }

  deleteQuiz(id: string): void {
    const result = confirm(`Are you sure?`);
    if (result.valueOf()) this.questionBank.delete(id);
  }

  downloadQuestionBank(id: string): void {
    const targetQuestionBank = this.questionBank.questionBanks[id];
    return exportFromJSON({ data: targetQuestionBank, fileName: `${targetQuestionBank.name} - ${targetQuestionBank.questions.length} Questions`, exportType: "json" });
  }

  async uploadQuestionBank(): Promise<void> {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = ".json";
    input.multiple = false;

    input.onchange = async () => {
      const files: File[] = Array.from(input.files ?? []);
      const file = first(files);

      const content = await file?.text();
      const obj = JSON.parse(content ?? "");
      const parsed = await questionBankScheme.safeParseAsync(obj);

      if (parsed.success) this.questionBank.insertQuestionBank(parsed.data);
      else this.snackbar.open("Invalid file", "Close", { duration: 5000 });

      input.remove();
    };

    input.click();
  }
}

export class QuizViewModel {
    id: string;
    questionBankId: string;
    questions: IAnsweredQuestion[];
    correctAnswers: number;
    startedAt: Date;
    finishedAt?: Date;

    duration: string;

    constructor(quiz: IQuiz) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.questions = quiz.questions;
        this.startedAt = new Date(quiz.startedAt);
        this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;
        this.duration = this.finishedAt
            ? `${Math.round((this.finishedAt.getTime() - this.startedAt.getTime()) / 1000)}s`
            : Math.round((Date.now() - this.startedAt.getTime()) / 1000) > 600 ? 'Abandoned' : 'In progress';

        this.correctAnswers = this.questions.filter(q => q.answers.find(a => a.correct)?.id === q.answer?.id).length;
    }
}
