import {NgModule} from "@angular/core";
import {MatInputModule} from "@angular/material/input";
import {RouterModule} from "@angular/router";
import {QuestionBankEditComponent} from "./question-bank-edit.component";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";

@NgModule({
    declarations: [QuestionBankEditComponent],
    imports: [
        CommonModule,
        RouterModule.forChild([
            {
                path: "",
                component: QuestionBankEditComponent,
                children: [
                    {
                        path: "",
                        redirectTo: "questions",
                        pathMatch: "full"
                    },
                    {
                        path: "questions",
                        loadComponent: () => import("./question-list-edit/question-list-edit.component").then(c => c.QuestionListEditComponent)
                    },
                    {
                        path: "add",
                        loadComponent: () => import("./question-add/question-add.component").then(c => c.QuestionAddComponent)
                    },
                    {
                        path: "import",
                        loadComponent: () => import("./question-import/question-import.component").then(c => c.QuestionImportComponent)
                    }
                ]
            }
        ]),
        FormsModule,
        MatButtonModule,
        MatInputModule,
        MatTabsModule,
    ],
    exports: [RouterModule]
})
export class QuestionBankEditModule {
}
