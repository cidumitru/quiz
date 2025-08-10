import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideRouter, withHashLocation, withInMemoryScrolling} from '@angular/router';
import {APP_INITIALIZER, importProvidersFrom, inject} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {MatDialogModule} from '@angular/material/dialog';
import {QuestionBankListComponent} from './app/features/question-bank/question-bank-list.component';
import {StatisticsComponent} from './app/features/statistics/statistics.component';
import {QuestionBankService} from './app/features/question-bank/question-bank.service';
import {QuizService} from './app/features/quiz/quiz.service';
import {AppConfig} from './app/core/services/app-config.service';
import {MockDataLoader} from './app/core/mock/mock-data.loader';
import {ThemeService} from './app/core/services/theme.service';
import {AuthInterceptor} from './app/core/interceptors/auth.interceptor';
import {ApiBaseInterceptor} from './app/core/interceptors/api-base.interceptor';
import {AuthGuard} from './app/core/guards/auth.guard';
import {AuthService} from './app/core/services/auth.service';

export const bootstrapFactory = (appConfig: AppConfig, questionBank: QuestionBankService, quiz: QuizService, mockDataLoader: MockDataLoader, authService: AuthService) => async () => {
    await appConfig.init();

  // if (questionBank.questionBankArr.length || localStorage.getItem("firstVisit")) return;

  // localStorage.setItem("firstVisit", new Date().getTime().toString());
  // await mockDataLoader.load();
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
      resolve: {
        preload: () => {
          inject(QuestionBankService).init()
          inject(QuizService).init()
        }
      },
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
      provideRouter(routes, withHashLocation(), withInMemoryScrolling({
        scrollPositionRestoration: 'top'
      })),
        importProvidersFrom(
            BrowserAnimationsModule,
            HttpClientModule,
            MatDialogModule
        ),
        QuestionBankService,
        QuizService,
        AppConfig,
        MockDataLoader,
        ThemeService,
        AuthService,
        {
            provide: APP_INITIALIZER,
            useFactory: bootstrapFactory,
          deps: [AppConfig, QuestionBankService, QuizService, MockDataLoader, AuthService],
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ApiBaseInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
}).catch((err) => console.error(err));
