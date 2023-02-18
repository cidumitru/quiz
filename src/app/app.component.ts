import {Component, TemplateRef} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {FormControl} from "@angular/forms";
import {QuizService} from "./services/quiz.service";
import {AppConfig} from "./services/app-config.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'quizz';

  constructor(public appConfig: AppConfig) {
  }
}
