import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {QuestionBankListComponent} from "./features/question-bank/question-bank-list.component";
import {QuestionBankEditModule} from "./features/question-bank/question-bank-edit/question-bank-edit.module";
import {StatisticsComponent} from "./features/statistics/statistics.component";
import {QuizModule} from "./features/quiz/quiz.module";

const routes: Routes = [
    {
        path: "",
        component: QuestionBankListComponent
    },
    {
        path: "quizzes",
        loadChildren: () => import("./features/quiz/quiz.module").then(m => QuizModule)
    },
    {
        path: "statistics",
        component: StatisticsComponent
    },
    {
        path: ":id",
        loadChildren: () => import("./features/question-bank/question-bank-edit/question-bank-edit.module").then(m => QuestionBankEditModule)
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
