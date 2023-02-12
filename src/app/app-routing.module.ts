import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionBankListComponent } from "./question-bank-list/question-bank-list.component";
import { QuizComponent } from "./quiz-practice/quiz.component";
import { QuestionBankEditModule } from "./question-bank-edit/question-bank-edit.module";

const routes: Routes = [
  {
    path: "",
    component: QuestionBankListComponent
  },
  {
    path: ":id",
    loadChildren: () => import("./question-bank-edit/question-bank-edit.module").then(m => QuestionBankEditModule)
  },
  {
    path: ":id/practice",
    component: QuizComponent
  },
  {
    path: ":id/practice/:quizId",
    component: QuizComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
