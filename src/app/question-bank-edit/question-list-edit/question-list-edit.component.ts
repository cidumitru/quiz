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
import { IQuestionBank } from "../../services/question-bank.models";

@Component({
  selector: 'app-question-edit',
  templateUrl: './question-list-edit.component.html',
  styleUrls: ['./question-list-edit.component.scss'],
  imports: [
    CommonModule,
    MatRadioModule,
    MatCardModule,
    MatTooltipModule,
    ScrollingModule
  ],
  standalone: true
})
export class QuestionListEditComponent {
  public id: string;
  public quiz$: Observable<IQuestionBank>;
  public control = new FormControl("");

  constructor(private activatedRoute: ActivatedRoute, private quiz: QuestionBankService) {
    this.id = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
    this.quiz$ = this.quiz.watchQuestionBank(this.id);
  }

  setCorrectAnswer(id: string, $event: MatRadioChange) {
    this.quiz.setCorrectAnswer(this.id, id, $event.value);
  }
}
