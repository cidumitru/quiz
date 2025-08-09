import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, ViewChild} from '@angular/core';
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {QuizViewModel} from "./quiz-view.model";
import {QuizService} from "../quiz.service";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {combineLatest, startWith, tap} from "rxjs";
import {QuestionBankService} from "../../question-bank/question-bank.service";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {MatListModule, MatSelectionListChange} from "@angular/material/list";
import {isBoolean} from "lodash";
import {ColumnsPersistenceService, IColumn} from "../../../core/services/columns-persistence.service";
import {CommonModule} from "@angular/common";
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatMenuModule} from "@angular/material/menu";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatToolbarModule} from "@angular/material/toolbar";

interface QuestionBankSelectOption {
    id: string;
    name: string;
}

const TABLE_NAME = "QuizHistoryTable";
const DEFAULT_COLUMNS = [
    {name: 'id', visible: true},
    {name: 'questionBankName', visible: true},
    {name: 'startedAt', visible: true},
    {name: 'duration', visible: true},
    {name: 'questions', visible: true},
    {name: 'correctAnswers', visible: true},
    {name: 'correctRatio', visible: true},
]

@Component({
    selector: 'app-quiz-list',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        ReactiveFormsModule,
        MatListModule,
        MatSelectModule,
        MatCheckboxModule,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
        MatToolbarModule
    ],
    templateUrl: './quiz-list.component.html',
    styleUrls: ['./quiz-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements AfterViewInit {

    questionBankFilter = new FormControl<QuestionBankSelectOption | undefined>(undefined);
    questionBanks: QuestionBankSelectOption[] = this.qb.questionBankArr.map(qb => ({id: qb.id, name: qb.name}));
    @ViewChild(MatPaginator, {static: true}) paginator!: MatPaginator;
    public quizHistoryDataSource: MatTableDataSource<QuizViewModel> = new MatTableDataSource<QuizViewModel>();

    public tableColumnOptions: IColumn[] = DEFAULT_COLUMNS.map(c => ({...c, visible: this.columns.getStoredColumnsForTable(TABLE_NAME)?.find(sc => sc.name === c.name)?.visible ?? c.visible}))
    // TODO: Update on change
    public get displayedColumns() {
        return this.tableColumnOptions.filter(o => o.visible).map(o => o.name);
    }


    private quiz = inject(QuizService);
    private qb = inject(QuestionBankService);
    private columns = inject(ColumnsPersistenceService);
    private cdr = inject(ChangeDetectorRef);


    ngAfterViewInit(): void {
        combineLatest([this.questionBankFilter.valueChanges.pipe(startWith(undefined)), this.paginator.page.pipe(startWith({pageSize: this.paginator.pageSize, length: 0, pageIndex: this.paginator.pageIndex} satisfies PageEvent))]).pipe(
            tap(([selectedQuestionBank, page]) => {
                const range = this.quiz.getQuizzes({ questionBankId: selectedQuestionBank?.id, skip: page.pageIndex * page.pageSize, take: page.pageSize });

                this.paginator.length = range.total;
                this.quizHistoryDataSource.data = range.items.map(q => new QuizViewModel(q, this.qb.questionBanks[q.questionBankId]?.name));

                this.cdr.detectChanges();
            })
        ).subscribe()
    }

    async onColumnToggle(selection: MatSelectionListChange): Promise<void> {
        const updated = this.tableColumnOptions.map(o => {
            const updated = selection.options.find(s => s.value.name === o.name);

            return {
                ...o,
                visible: isBoolean(updated?.selected) ? updated?.selected!! : o.visible
            }
        });

        this.tableColumnOptions = updated;
        await this.columns.updateColumnsForTable(TABLE_NAME, updated);
    }
}
