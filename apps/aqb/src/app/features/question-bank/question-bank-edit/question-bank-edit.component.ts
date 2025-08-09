import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {QuestionBankService} from "../question-bank.service";
import {Observable} from "rxjs";
import {IQuestionBank} from "../question-bank.models";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-questionBank-edit',
    templateUrl: './question-bank-edit.component.html',
    styleUrls: ['./question-bank-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule
    ]
})
export class QuestionBankEditComponent {
    private activatedRoute = inject(ActivatedRoute);
    private questionBank = inject(QuestionBankService);
    
    public id: string = this.activatedRoute.snapshot.paramMap.get("id")!;
    public questionBank$: Observable<IQuestionBank> = this.questionBank.watchQuestionBank(this.id);

    updateName(value: string): void {
        this.questionBank.updateQuestionBank(this.id, value);
    }
}
