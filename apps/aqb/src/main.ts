import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { QuestionBankListComponent } from './app/features/question-bank/question-bank-list.component';
import { StatisticsComponent } from './app/features/statistics/statistics.component';
import { QuestionBankService } from './app/features/question-bank/question-bank.service';
import { QuizService } from './app/features/quiz/quiz.service';
import { AppConfig } from './app/core/services/app-config.service';
import { ColumnsPersistenceService } from './app/core/services/columns-persistence.service';
import { MockDataLoader } from './app/core/mock/mock-data.loader';
import { ThemeService } from './app/core/services/theme.service';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { AuthGuard } from './app/core/guards/auth.guard';
import { AuthService } from './app/core/services/auth.service';
import { APP_INITIALIZER } from '@angular/core';

export const bootstrapFactory = (appConfig: AppConfig, questionBank: QuestionBankService, quiz: QuizService, columns: ColumnsPersistenceService, mockDataLoader: MockDataLoader, authService: AuthService) => async () => {
    await appConfig.init();
    await questionBank.init();
    await quiz.init();
    await columns.init();

    if (questionBank.questionBankArr.length || localStorage.getItem("firstVisit")) return;

    localStorage.setItem("firstVisit", new Date().getTime().toString());
    await mockDataLoader.load();
}

const routes = [
    {
        path: "auth/login",
        loadComponent: () => import("./app/features/auth/login/login.component").then(m => m.LoginComponent)
    },
    {
        path: "",
        loadComponent: () => import("./app/layouts/main-layout.component").then(m => m.MainLayoutComponent),
        canActivate: [AuthGuard],
        children: [
            {
                path: "",
                component: QuestionBankListComponent
            },
            {
                path: "quizzes",
                loadComponent: () => import("./app/features/quiz/quiz-list/quiz-list.component").then(m => m.QuizListComponent)
            },
            {
                path: "quizzes/practice/:quizId",
                loadComponent: () => import("./app/features/quiz/quiz-practice/quiz.component").then(m => m.QuizComponent)
            },
            {
                path: "quizzes/practice",
                loadComponent: () => import("./app/features/quiz/quiz-practice/quiz.component").then(m => m.QuizComponent)
            },
            {
                path: "statistics",
                component: StatisticsComponent
            },
            {
                path: "banks/:id",
                loadComponent: () => import("./app/features/question-bank/question-bank-edit/question-bank-edit.component").then(m => m.QuestionBankEditComponent),
                children: [
                    {
                        path: "questions",
                        loadComponent: () => import("./app/features/question-bank/question-bank-edit/question-list-edit/question-list-edit.component").then(m => m.QuestionListEditComponent)
                    },
                    {
                        path: "add",
                        loadComponent: () => import("./app/features/question-bank/question-bank-edit/question-add/question-add.component").then(m => m.QuestionAddComponent)
                    },
                    {
                        path: "import",
                        loadComponent: () => import("./app/features/question-bank/question-bank-edit/question-import/question-import.component").then(m => m.QuestionImportComponent)
                    },
                    {
                        path: "",
                        redirectTo: "questions",
                        pathMatch: "full" as const
                    }
                ]
            }
        ]
    }
];

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(routes),
        importProvidersFrom(
            BrowserAnimationsModule,
            HttpClientModule,
            MatDialogModule
        ),
        QuestionBankService,
        QuizService,
        AppConfig,
        ColumnsPersistenceService,
        MockDataLoader,
        ThemeService,
        AuthService,
        {
            provide: APP_INITIALIZER,
            useFactory: bootstrapFactory,
            deps: [AppConfig, QuestionBankService, QuizService, ColumnsPersistenceService, MockDataLoader, AuthService],
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
}).catch((err) => console.error(err));
