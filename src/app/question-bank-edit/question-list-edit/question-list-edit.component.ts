import { Component } from '@angular/core';
import { Observable } from "rxjs";
import { QuestionBankService } from "../../services/question-bank.service";
import { FormControl } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { MatRadioChange, MatRadioModule } from "@angular/material/radio";
import { MatCardModule } from "@angular/material/card";
import { CommonModule } from "@angular/common";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ScrollingModule } from "@angular/cdk/scrolling";
import {IQuestion, IQuestionBank} from "../../services/question-bank.models";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-question-edit',
  templateUrl: './question-list-edit.component.html',
  styleUrls: ['./question-list-edit.component.scss'],
  imports: [
    CommonModule,
    MatRadioModule,
    MatCardModule,
    MatTooltipModule,
    ScrollingModule,
    MatButtonModule,
    MatIconModule
  ],
  standalone: true
})
export class QuestionListEditComponent {
  public id: string;
  public quiz$: Observable<IQuestionBank>;
  public control = new FormControl("");

  constructor(private activatedRoute: ActivatedRoute, private questionBank: QuestionBankService) {
    this.id = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
    this.quiz$ = this.questionBank.watchQuestionBank(this.id);
  }

  setCorrectAnswer(id: string, $event: MatRadioChange) {
    this.questionBank.setCorrectAnswer(this.id, id, $event.value);
  }

  deleteQuestion(question: IQuestion): void {
    if (!confirm("Are you sure you want to delete this question?")) return;

    this.questionBank.deleteQuestion(this.id, question.id);
  }
}
