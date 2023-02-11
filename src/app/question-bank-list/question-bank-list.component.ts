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
    RouterModule
  ]
})
export class QuestionBankListComponent {
  constructor(public quiz: QuestionBankService, private router: Router, private snackbar: MatSnackBar) {
  }

  newQuestionBank(): void {
    const newQuizId = this.quiz.create();
    this.router.navigate([newQuizId]).then()
  }

  deleteQuiz(id: string): void {
    const result = confirm(`Are you sure?`);
    if (result.valueOf()) this.quiz.delete(id);
  }

  downloadQuestionBank(id: string): void {
    const targetQuestionBank = this.quiz.questionBanks[id];
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

      if (parsed.success) this.quiz.insertQuestionBank(parsed.data);
      else this.snackbar.open("Invalid file", "Close", { duration: 5000 });

      input.remove();
    };

    input.click();
  }

  preventDefault($event: MouseEvent) {
    $event.preventDefault();
  }
}
