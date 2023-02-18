import {AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, ViewChild} from '@angular/core';
import {QuestionBankService} from "./question-bank.service";
import {Router, RouterModule} from "@angular/router";
import exportFromJSON from "export-from-json";
import {first} from "lodash";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {CommonModule} from "@angular/common";
import {questionBankScheme} from "./question-bank.models";
import {MatTooltipModule} from "@angular/material/tooltip";
import {QuizQuestionsPriority, QuizService} from "../quiz/quiz.service";
import {debounceTime, map, startWith, Subscription, switchMap, tap} from "rxjs";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {StatisticsService} from "../statistics/statistics.service";
import {MatInputModule} from "@angular/material/input";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatMenuModule} from "@angular/material/menu";
import {QuestionBankViewModel} from "./question-bank-view.model";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatListModule, MatListOption} from "@angular/material/list";
import {MatSelectModule} from "@angular/material/select";
import {MatLegacyListOption} from "@angular/material/legacy-list";


@Component({
    selector: 'app-quiz-list',
    templateUrl: './question-bank-list.component.html',
    styleUrls: ['./question-bank-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        ReactiveFormsModule,
        MatMenuModule,
        MatCheckboxModule,
        FormsModule,
        MatListModule,
        MatSelectModule
    ]
})
export class QuestionBankListComponent implements AfterViewInit, OnDestroy {

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild("questionBankPaginator") questionBankPaginator!: MatPaginator;
    public questionBankFilter = new FormControl("");
    public questionBanksDs = new MatTableDataSource();

    public tableColumnOptions: {name: string, display: boolean}[] = [
        {name: 'name', display: true},
        {name: 'questions', display: true},
        {name: 'stats', display: false},
        {name: 'coverage', display: true},
        {name: 'avgRatio', display: true},
        {name: 'updatedAt', display: true},
        {name: 'actions', display: false}
    ]
    public questionPriorityOptions = [
        {name: 'All', value: QuizQuestionsPriority.All },
        {name: 'Mistakes', value: QuizQuestionsPriority.Mistakes },
        {name: 'Unanswered', value: QuizQuestionsPriority.Unanswered },
    ]
    public questionPriorityControl = this.questionPriorityOptions[0];

    public get displayedColumns() {
        return this.tableColumnOptions.filter(o => o.display).map(o => o.name);
    }
    public _qbSubscription: Subscription;

    constructor(public questionBank: QuestionBankService, private router: Router, private snackbar: MatSnackBar, public quiz: QuizService, private stats: StatisticsService) {
        this._qbSubscription = this.questionBank.questionBankArr$.pipe(
            switchMap(questionBanks => this.questionBankFilter.valueChanges.pipe(
                    debounceTime(300),
                    startWith(""),
                    map(searchText => questionBanks.filter(qb => qb.name.toLowerCase().includes(searchText?.toLowerCase() ?? "")).map(qb => new QuestionBankViewModel(qb, stats))),
                    tap(qbs => this.questionBanksDs.data = qbs)
                )
            )).subscribe()
    }

    ngAfterViewInit(): void {
        this.questionBanksDs.sort = this.sort;
        this.questionBanksDs.paginator = this.questionBankPaginator;
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


    practiceQuiz(questionBankId: string, quizSize: number, questionPrioritySelection: MatListOption[]): void {
        if (isNaN(quizSize)) return;

        this.router.navigate(['quizzes', 'practice'], {
            queryParams: {
                size: quizSize,
                questionBankId: questionBankId,
                priority: first(questionPrioritySelection)?.value?.value ?? QuizQuestionsPriority.All
            }
        }).then();
    }

    ngOnDestroy(): void {
        this._qbSubscription.unsubscribe();
    }
}
