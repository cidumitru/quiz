import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { QuestionBankService } from "./services/question-bank.service";

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (quiz: QuestionBankService) => () => quiz.init(),
      deps: [QuestionBankService],
      multi: true
    },
    QuestionBankService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
