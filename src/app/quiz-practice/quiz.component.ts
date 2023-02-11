import { Component } from '@angular/core';
import { Observable, startWith } from "rxjs";
import { QuestionBankService } from "../services/question-bank.service";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { sampleSize } from 'lodash';
import { IAnswer, IQuestion, IQuestionBank } from "../services/question-bank.models";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatCardModule } from "@angular/material/card";
import { MatRadioModule } from "@angular/material/radio";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { FormArray, FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
  selector: 'app-quiz-practice',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
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
    ReactiveFormsModule,
    MatTooltipModule
  ]
})
export class QuizComponent {
  id: string;
  public quiz$: Observable<IQuestionBank>;
  public questions: QuestionViewModel[];
  public formArr: FormArray;
  public stats: { total: number, correct: number, incorrect: number } = { total: 0, correct: 0, incorrect: 0 };

  constructor(private activatedRoute: ActivatedRoute, private quiz: QuestionBankService, private router: Router) {
    this.id = this.activatedRoute.snapshot.paramMap.get("id")!;
    this.questions = sampleSize(this.quiz.questionBanks[this.id].questions, 20).map(q => new QuestionViewModel(q));

    this.quiz$ = this.quiz.watchQuestionBank(this.id);

    this.formArr = new FormArray(this.questions.map(q => new FormControl('', q.rightAnswer ? [Validators.pattern(q.rightAnswer.id)] : [])));

    this.formArr.valueChanges
        .pipe(startWith(this.formArr.value))
        .subscribe((value) => {
          this.stats.total = this.formArr.controls.length;
          this.stats.correct = this.formArr.controls.filter(c => c.valid && c.dirty).length;
          this.stats.incorrect = this.formArr.controls.filter(c => !c.valid && c.dirty).length;
        })
  }

  retry() {
    this.router.navigate(['']).then(() => {
      this.router.navigate(['list', this.id, 'practice']);
      window.scrollTo(0, 0);
    });
  }
}

export class QuestionViewModel implements IQuestion {
  public id: string;
  public question: string;
  public answers: IAnswer[];
  public rightAnswer?: IAnswer;

  constructor(dto: IQuestion) {
    this.id = dto.id;
    this.question = dto.question;
    this.answers = dto.answers;
    this.rightAnswer = dto.answers?.find(a => a.correct) ?? undefined;
  }
}
