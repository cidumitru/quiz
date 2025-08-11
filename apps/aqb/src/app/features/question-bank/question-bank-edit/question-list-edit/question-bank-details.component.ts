import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {combineLatestWith, map, Observable, startWith, switchMap} from "rxjs";
import {QuestionBankService} from "../../question-bank.service";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {MatRadioChange, MatRadioModule} from "@angular/material/radio";
import {MatCardModule} from "@angular/material/card";
import {CommonModule} from "@angular/common";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ScrollingModule} from "@angular/cdk/scrolling";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {Question, QuestionBankDetail} from "@aqb/data-access";

@Component({
    selector: 'app-question-edit',
  templateUrl: './question-bank-details.component.html',
  styleUrls: ['./question-bank-details.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatRadioModule,
        MatCardModule,
        MatTooltipModule,
        ScrollingModule,
        MatButtonModule,
        MatIconModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSlideToggleModule
    ],
    standalone: true
})
export class QuestionBankDetailsComponent {
    private activatedRoute = inject(ActivatedRoute);
    private questionBank = inject(QuestionBankService);

    public id: string = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
  public questionBank$: Observable<QuestionBankDetail> = this.questionBank.getQuestionBank(this.id);

    public control = new FormControl("");
    public searchControl = new FormControl("", {nonNullable: true});
    public questionsWithoutAnswerControl = new FormControl(false, {nonNullable: true});

    public questions$ = this.searchControl.valueChanges.pipe(
        startWith(""),
        combineLatestWith(this.questionsWithoutAnswerControl.valueChanges.pipe(startWith(false))),
      switchMap(([searchText, onlyQuestionWithoutAnswer]) => this.questionBank$.pipe(
            map(quiz => quiz.questions.filter(question => {
                if (onlyQuestionWithoutAnswer && question.answers.find(a => a.correct) !== undefined) return false;
                return question.question.toLowerCase().includes(searchText.toLowerCase());
            }))
        )));

    setCorrectAnswer(id: string, $event: MatRadioChange) {
        this.questionBank.setCorrectAnswer(this.id, id, $event.value);
    }

  deleteQuestion(question: Question): void {
        if (!confirm("Are you sure you want to delete this question?")) return;

        this.questionBank.deleteQuestion(this.id, question.id);
    }
}
