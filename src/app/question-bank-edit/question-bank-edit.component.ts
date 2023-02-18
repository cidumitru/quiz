import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {QuestionBankService} from "../services/question-bank.service";
import {Observable} from "rxjs";
import {IQuestionBank} from "../services/question-bank.models";

@Component({
    selector: 'app-questionBank-edit',
    templateUrl: './question-bank-edit.component.html',
    styleUrls: ['./question-bank-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBankEditComponent {
    public id: string;
    public questionBank$: Observable<IQuestionBank>;

    constructor(private activatedRoute: ActivatedRoute, private questionBank: QuestionBankService) {
        this.id = this.activatedRoute.snapshot.paramMap.get("id")!;
        this.questionBank$ = this.questionBank.watchQuestionBank(this.id);
    }

    updateName(value: string): void {
        this.questionBank.updateQuestionBank(this.id, value);
    }
}
