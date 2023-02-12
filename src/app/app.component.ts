import {Component, TemplateRef} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {FormControl} from "@angular/forms";
import {QuizService} from "./services/quiz.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'quizz';
  quizSizeControl = new FormControl(25, {nonNullable: true});

  constructor(private dialog: MatDialog, public quiz: QuizService) {
  }

  openSettings(settingsDialog: TemplateRef<any>) {
    this.dialog.open(settingsDialog);
  }

  updateQuizSize(value: number): void {
    this.quiz.defaultQuizSize = value;
  }
}
