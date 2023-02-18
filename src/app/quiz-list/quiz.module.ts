import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {QuizListComponent} from "./quiz-list/quiz-list.component";
import {RouterModule} from "@angular/router";
import {QuizComponent} from "./quiz-practice/quiz.component";
import {MatTableModule} from "@angular/material/table";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";


@NgModule({
    declarations: [QuizListComponent],
    imports: [
        CommonModule,
        RouterModule.forChild([
            {
                path: "",
                component: QuizListComponent
            },
            {
                path: "practice",
                component: QuizComponent
            },
            {
                path: "practice/:quizId",
                component: QuizComponent
            }
        ]),
        MatTableModule,
        MatPaginatorModule,
        MatIconModule,
        MatButtonModule
    ],
    exports: [RouterModule]
})
export class QuizModule {
}
