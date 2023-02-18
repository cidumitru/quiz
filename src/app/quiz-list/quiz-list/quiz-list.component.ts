import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {QuizViewModel} from "./quiz-view.model";
import {QuizService} from "../quiz.service";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {startWith, tap} from "rxjs";
import {QuestionBankService} from "../../services/question-bank.service";

@Component({
    selector: 'app-quiz-list',
    templateUrl: './quiz-list.component.html',
    styleUrls: ['./quiz-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent{
    @ViewChild(MatPaginator, {static: true}) paginator!: MatPaginator;

    public quizHistoryDisplayColumns = ['id', 'questionBankName', 'startedAt', 'finishedAt', 'duration', 'questions', 'correctAnswers', 'correctRatio'];
    public quizHistoryDataSource: MatTableDataSource<QuizViewModel> = new MatTableDataSource<QuizViewModel>();

    constructor(private quiz: QuizService, private qb: QuestionBankService, private cdr: ChangeDetectorRef) {}


    ngAfterViewInit(): void {
        this.paginator.page.pipe(
            startWith({pageSize: this.paginator.pageSize, length: 0, pageIndex: this.paginator.pageIndex} satisfies PageEvent),
            tap((page) => {
                const range = this.quiz.getQuizzes(page.pageIndex * page.pageSize, page.pageSize);

                this.paginator.length = range.total;
                this.quizHistoryDataSource.data = range.items.map(q => new QuizViewModel(q, this.qb.questionBanks[q.questionBankId]?.name));

                this.cdr.detectChanges();
            })
        ).subscribe()
    }
}
