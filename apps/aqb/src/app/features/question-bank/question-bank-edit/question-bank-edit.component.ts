import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute, RouterOutlet, RouterLink, RouterLinkActive} from "@angular/router";
import {QuestionBankService} from "../question-bank.service";
import {Observable} from "rxjs";
import {IQuestionBank} from "../question-bank.models";
import {CommonModule} from "@angular/common";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'app-questionBank-edit',
    templateUrl: './question-bank-edit.component.html',
    styleUrls: ['./question-bank-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatFormFieldModule,
        MatInputModule,
        MatTabsModule,
        FormsModule
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
