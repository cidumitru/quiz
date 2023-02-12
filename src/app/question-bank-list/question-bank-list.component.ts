import {AfterViewInit, Component, inject, ViewChild} from '@angular/core';
import {QuestionBankService} from "../services/question-bank.service";
import {Router, RouterModule} from "@angular/router";
import exportFromJSON from "export-from-json";
import {first, isNil} from "lodash";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {CommonModule} from "@angular/common";
import {IAnswer, IQuestionBank, questionBankScheme} from "../services/question-bank.models";
import {MatTooltipModule} from "@angular/material/tooltip";
import {IAnsweredQuestion, IQuiz, QuizService} from "../services/quiz.service";
import {map} from "rxjs";
import {MatSort} from "@angular/material/sort";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";

@Component({
    selector: 'app-quiz-list',
    templateUrl: './question-bank-list.component.html',
    styleUrls: ['./question-bank-list.component.scss'],
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
        MatTooltipModule,
        MatPaginatorModule
    ]
})
export class QuestionBankListComponent implements AfterViewInit {

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild("questionBankPaginator") questionBankPaginator!: MatPaginator;
    @ViewChild("quizHistoryPaginator") quizHistoryPaginator!: MatPaginator;
    public questionBanksDs = new MatTableDataSource(this.questionBank.questionBankArr);
    public quizHistoryDs = new MatTableDataSource(this.quiz.quizzesArr.map(quiz => new QuizViewModel(quiz)));

    public questionBankDisplayedColumns = ['name', 'challenges', 'updatedAt', 'actions'];
    public quizHistoryDisplayColumns =  ['id', 'questionBankName', 'startedAt', 'finishedAt', 'duration', 'questions', 'correctAnswers', 'correctRatio'];

    constructor(public questionBank: QuestionBankService, private router: Router, private snackbar: MatSnackBar, public quiz: QuizService) {
    }

    ngAfterViewInit(): void {
        this.questionBanksDs.sort = this.sort;
        this.questionBanksDs.paginator = this.questionBankPaginator;

        this.quizHistoryDs.paginator = this.quizHistoryPaginator;
    }

    newQuestionBank(): void {
        const newQuizId = this.questionBank.create();
        this.router.navigate([newQuizId]).then()
    }

    deleteQuiz(id: string): void {
        const result = confirm(`Are you sure?`);
        if (result.valueOf()) this.questionBank.delete(id);
    }

    downloadQuestionBank(id: string): void {
        const targetQuestionBank = this.questionBank.questionBanks[id];
        return exportFromJSON({
            data: targetQuestionBank,
            fileName: `${targetQuestionBank.name} - ${targetQuestionBank.questions.length} Questions`,
            exportType: "json"
        });
    }

    async uploadQuestionBank(): Promise<void> {
        const input = document.createElement('input');

        input.type = 'file';
        input.accept = ".json";
        input.multiple = false;

        input.onchange = async () => {
            const files: File[] = Array.from(input.files ?? []);
            const file = first(files);

            const content = await file?.text();
            const obj = JSON.parse(content ?? "");
            const parsed = await questionBankScheme.safeParseAsync(obj);

            if (parsed.success) this.questionBank.insertQuestionBank(parsed.data);
            else this.snackbar.open("Invalid file", "Close", {duration: 5000});

            input.remove();
        };

        input.click();
    }

    clearQuizHistory() {
        const result = confirm(`Are you sure?`);
        if (result.valueOf()) this.quiz.clear();
    }
}

export class QuizViewModel {
    id: string;
    questionBankId: string;

    questionBankName: string;
    questions: IAnsweredQuestion[];
    correctAnswers: number;
    answersCount: number;

    answers: IAnswer[];
    startedAt: Date;
    finishedAt?: Date;

    duration: string;
    correctRatio: string;

    constructor(quiz: IQuiz) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.questionBankName = inject(QuestionBankService).questionBanks[quiz.questionBankId]?.name ?? 'Unknown';

        this.answers = quiz.questions.map(q => q.answer).filter(a => !isNil(a)) as IAnswer[];
        this.answersCount = this.answers.length;
        this.correctAnswers = this.answers.filter(a => a.correct).length;
        this.correctRatio = this.answersCount > 0 ? `${(this.correctAnswers / this.answersCount) * 100}%` : "N/A";

        this.questions = quiz.questions;
        this.startedAt = new Date(quiz.startedAt);
        this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;

        this.duration = this.finishedAt
            ? `${Math.round((this.finishedAt.getTime() - this.startedAt.getTime()) / 1000)}s`
            : 'In progress';

    }
}
