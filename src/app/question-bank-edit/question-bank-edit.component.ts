import { Component } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { QuestionBankService } from "../services/question-bank.service";
import { Observable } from "rxjs";
import { IQuestionBank } from "../services/question-bank.models";

@Component({
  selector: 'app-quiz-edit',
  templateUrl: './question-bank-edit.component.html',
  styleUrls: ['./question-bank-edit.component.scss'],
})
export class QuestionBankEditComponent {
  public id: string;
  public quiz$: Observable<IQuestionBank>;

  constructor(private activatedRoute: ActivatedRoute, private quiz: QuestionBankService) {
    this.id = this.activatedRoute.snapshot.paramMap.get("id")!;
    this.quiz$ = this.quiz.watchQuestionBank(this.id);
  }

  updateName(value: string): void {
    this.quiz.updateQuestionBank(this.id, value);
  }
}
