import {Component, ViewChild} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {QuizViewModel} from "./quiz-view.model";
import {QuizService} from "../../services/quiz.service";
import {MatPaginator} from "@angular/material/paginator";

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss']
})
export class QuizListComponent {
  @ViewChild("quizHistoryPaginator") quizHistoryPaginator!: MatPaginator;

  public quizHistoryDisplayColumns = ['id', 'questionBankName', 'startedAt', 'finishedAt', 'duration', 'questions', 'correctAnswers', 'correctRatio'];
  public quizHistoryDs = new MatTableDataSource(this.quiz.quizzesArr.map(quiz => new QuizViewModel(quiz)));

  constructor(private quiz: QuizService) {
  }

    ngAfterViewInit(): void {
      this.quizHistoryDs.paginator = this.quizHistoryPaginator;
    }
}
