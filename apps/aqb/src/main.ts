import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Route,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
} from '@angular/router';
import {APP_INITIALIZER, importProvidersFrom, inject} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {QuestionBankListComponent} from './app/features/question-bank/question-bank-list.component';
import {QuestionBankService} from './app/features/question-bank/question-bank.service';
import {QuizService} from './app/features/quiz/quiz.service';
import {AppConfig} from './app/core/services/app-config.service';
import {MockDataLoader} from './app/core/mock/mock-data.loader';
import {ThemeService} from './app/core/services/theme.service';
import {AuthInterceptor} from './app/core/interceptors/auth.interceptor';
import {ApiBaseInterceptor} from './app/core/interceptors/api-base.interceptor';
import {AuthGuard} from './app/core/guards/auth.guard';
import {AuthService} from './app/core/services/auth.service';
import {firstValueFrom, from} from 'rxjs';
import {map} from 'rxjs/operators';
import {QuizViewModel} from './app/features/quiz/quiz-practice/quiz.view-model';
import {AchievementIntegrationService} from "./app/core/services/achievement-integration.service";

export const bootstrapFactory = (appConfig: AppConfig) => async () => {
  await appConfig.init();
};

const routes: Route[] = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./app/features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./app/layouts/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [AuthGuard],
    resolve: {
      achivements: async () => {
        try {
          const achievementsIntegration = inject(AchievementIntegrationService);
          const user = await firstValueFrom(inject(AuthService).currentUser$);
          if (!user) {
            return undefined;
          }
          
          // Connect with error handling - don't block app loading if achievements fail
          await firstValueFrom(achievementsIntegration.connect(user.id)).catch(error => {
            console.warn('Achievement system connection failed, continuing without achievements:', error);
            return null; // Continue without achievements
          });
        } catch (error) {
          console.warn('Achievement system initialization failed, continuing without achievements:', error);
          return undefined;
        }
      }
    },
    children: [
      {
        path: '',
        component: QuestionBankListComponent,
      },
      {
        path: 'quizzes',
        loadComponent: () =>
          import('./app/features/quiz/quiz-list/quiz-list.component').then(
            (m) => m.QuizListComponent
          ),
      },
      {
        path: 'quizzes/practice/:quizId',
        loadComponent: () =>
          import('./app/features/quiz/quiz-practice/quiz.component').then(
            (m) => m.QuizComponent
          ),
        resolve: {
          quizViewModel: (route: ActivatedRouteSnapshot) =>
            from(inject(QuizService).getQuiz(route.params['quizId'])).pipe(
              map((quiz) => new QuizViewModel(quiz))
            ),
        },
      },
      {
        path: 'banks/:id',
        loadComponent: () =>
          import(
            './app/features/question-bank/question-bank-edit/question-bank-edit.component'
          ).then((m) => m.QuestionBankEditComponent),
      },
    ],
  },
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withHashLocation(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
      }),
      withComponentInputBinding()
    ),
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      MatDialogModule,
      MatSnackBarModule
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
      deps: [
        AppConfig,
        QuestionBankService,
        QuizService,
        MockDataLoader,
        AuthService,
      ],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiBaseInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
