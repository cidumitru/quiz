import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {QuestionBankListComponent} from "./question-bank-list/question-bank-list.component";
import {QuestionBankEditModule} from "./question-bank-edit/question-bank-edit.module";
import {StatisticsComponent} from "./statistics/statistics.component";
import {QuizModule} from "./quiz-list/quiz.module";

const routes: Routes = [
    {
        path: "",
        component: QuestionBankListComponent
    },
    {
        path: "quizzes",
        loadChildren: () => import("./quiz-list/quiz.module").then(m => QuizModule)
    },
    {
        path: "statistics",
        component: StatisticsComponent
    },
    {
        path: ":id",
        loadChildren: () => import("./question-bank-edit/question-bank-edit.module").then(m => QuestionBankEditModule)
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
