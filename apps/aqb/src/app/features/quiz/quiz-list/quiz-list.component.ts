import {AfterViewInit, ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {QuizViewModel} from "./quiz-view.model";
import {QuizService} from "../quiz.service";
import {startWith, tap} from "rxjs";
import {QuestionBankService} from "../../question-bank/question-bank.service";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {RouterLink} from "@angular/router";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";

interface QuestionBankSelectOption {
    id: string;
    name: string;
}


@Component({
    selector: 'app-quiz-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule
    ],
    templateUrl: './quiz-list.component.html',
    styleUrls: ['./quiz-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements AfterViewInit {

    questionBankFilter = new FormControl<QuestionBankSelectOption | undefined>(undefined);
    questionBanks: QuestionBankSelectOption[] = [];
    public quizHistoryDataSource: MatTableDataSource<QuizViewModel> = new MatTableDataSource<QuizViewModel>();

    private quiz = inject(QuizService);
    private qb = inject(QuestionBankService);

    constructor() {
        this.questionBanks = this.qb.questionBankArr().map(qb => ({id: qb.id, name: qb.name}));
        this.loadQuizzes();
    }

    ngAfterViewInit(): void {
        this.questionBankFilter.valueChanges.pipe(
            startWith(undefined),
            tap(() => this.loadQuizzes())
        ).subscribe();
    }

    private loadQuizzes(): void {
        const selectedQuestionBank = this.questionBankFilter.value;
        const allQuizzes = this.quiz.getQuizzes({ 
            questionBankId: selectedQuestionBank?.id,
            skip: 0,
            take: 1000 // Get all quizzes since we're not paginating
        });

        this.quizHistoryDataSource.data = allQuizzes.items.map(q => 
            new QuizViewModel(q, this.qb.questionBanksValue[q.questionBankId]?.name)
        );
    }

}
