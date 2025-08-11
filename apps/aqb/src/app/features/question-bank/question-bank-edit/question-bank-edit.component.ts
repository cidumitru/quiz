import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";
import {QuestionBankService} from "../question-bank.service";
import {Observable} from "rxjs";
import {CommonModule} from "@angular/common";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {FormsModule} from "@angular/forms";
import {QuestionBankDetail} from "@aqb/data-access";

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
  public id: string = this.activatedRoute.snapshot.paramMap.get("id")!;
  private questionBank = inject(QuestionBankService);
  public questionBank$: Observable<QuestionBankDetail> = this.questionBank.getQuestionBank(this.id);

  updateName(value: string): void {
    this.questionBank.updateQuestionBank(this.id, value);
  }
}
