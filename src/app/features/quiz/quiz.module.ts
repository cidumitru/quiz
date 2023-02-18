import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {QuizListComponent} from "./quiz-list/quiz-list.component";
import {RouterModule} from "@angular/router";
import {QuizComponent} from "./quiz-practice/quiz.component";
import {MatTableModule} from "@angular/material/table";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatOptionModule} from "@angular/material/core";
import {MatSelectModule} from "@angular/material/select";
import {ReactiveFormsModule} from "@angular/forms";
import {MatMenuModule} from "@angular/material/menu";
import {MatListModule} from "@angular/material/list";


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
        MatButtonModule,
        MatOptionModule,
        MatSelectModule,
        ReactiveFormsModule,
        MatMenuModule,
        MatListModule
    ],
    exports: [RouterModule]
})
export class QuizModule {
}
