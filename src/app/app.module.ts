import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {QuestionBankService} from "./features/question-bank/question-bank.service";
import {MatTooltipModule} from "@angular/material/tooltip";
import {QuizService} from "./features/quiz/quiz.service";
import {MatSelectModule} from "@angular/material/select";
import {MatDialogModule} from "@angular/material/dialog";
import {ReactiveFormsModule} from "@angular/forms";
import {StatisticsComponent} from './features/statistics/statistics.component';
import {HttpClientModule} from "@angular/common/http";
import {AppConfig} from "./core/services/app-config.service";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {ColumnsPersistenceService} from "./core/services/columns-persistence.service";

@NgModule({
    declarations: [
        AppComponent,
        StatisticsComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatTooltipModule,
        MatSelectModule,
        MatDialogModule,
        ReactiveFormsModule,
        HttpClientModule,
        MatSidenavModule,
        MatListModule
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            // TODO: Create a bootstrapper service
            useFactory: (appConfig: AppConfig, questionBank: QuestionBankService, quiz: QuizService, columns: ColumnsPersistenceService) => () => Promise.all([appConfig.init(), questionBank.init(), quiz.init(), columns.init()]),
            deps: [AppConfig, QuestionBankService, QuizService, ColumnsPersistenceService],
            multi: true
        },
        QuestionBankService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
