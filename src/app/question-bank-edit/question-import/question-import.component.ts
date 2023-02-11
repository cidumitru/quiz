import {ChangeDetectionStrategy, Component} from '@angular/core';
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { QuestionBankService } from "../../services/question-bank.service";
import { ActivatedRoute } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import {debounceTime, map, shareReplay} from "rxjs";
import {IQuestion} from "../../services/question-bank.models";
import {isEmpty} from "lodash";

@Component({
  selector: 'app-question-import',
  templateUrl: './question-import.component.html',
  styleUrls: ['./question-import.component.scss'],
  imports: [
    MatCardModule,
    MatInputModule,
    ReactiveFormsModule,
    MatRadioModule,
    CommonModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class QuestionImportComponent {
  public id: string;
  public control = new FormControl("");

  public questions$ = this.control.valueChanges.pipe(
      debounceTime(500),
      map(() => {
        if (isEmpty(this.control.value)) return [];

        const questions = this.control.value?.replace(/\n/g, " ").split(/(?=\b\d{1,2}\b\.)/);
        this.parsedQuestions = questions?.map(question => new QuestionModel(question));
        return this.parsedQuestions;
      }),
      shareReplay(1)
  )
  constructor(private quiz: QuestionBankService, private activatedRoute: ActivatedRoute) {
    this.id = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
  }

  private parsedQuestions: QuestionModel[] | undefined = [];

  import() {
    const dto = this.parsedQuestions?.map(question => ({
      question: question.question,
      answers: question.options.map(option => ({ text: option }))
    }));

    if (!dto) return;
    this.quiz.addQuestion(this.id, dto);
    this.control.reset("");
  }
}

export class QuestionModel {
  question: string;
  options!: string[];

  constructor(rawQuestion: string) {
    const parsed = rawQuestion.split(/(?=[A-Z]\.)/);
    this.question = parsed[0];
    this.options = parsed.slice(1, parsed.length);
  }
}
