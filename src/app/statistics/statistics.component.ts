import {Component, OnInit} from '@angular/core';
import bb, {bar} from "billboard.js";
import {QuestionBankStatistics} from "../services/question-bank.statistics";
import {entries} from "lodash";
import {parse} from "date-fns";
import {IAnsweredQuestion} from "../services/quiz.service";
@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  constructor(private stats: QuestionBankStatistics) {
  }

  ngOnInit(): void {
    const today = new Date();
    const startFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const questionsByDay = this.stats.getStatisticsByDay(startFrom, new Date());


    const plotData: [string, IAnsweredQuestion[]][] = entries(questionsByDay).map(([date, questions]) => {
        return [date, questions];
    });

    const dates = plotData.map(([date, questions]) => parse(date, "dd-MM-yyyy", new Date()));
    const answeredQuestions = plotData.map(([date, questions]) => questions.length);
    const correctQuestions = plotData.map(([date, questions]) => questions.filter(q => q.answer?.correct).length);
    bb.generate({
      data: {
        x: "x",
        columns: [
          ['x', ...dates],
          ['questions', ...answeredQuestions],
          ['correct', ...correctQuestions],
        ],
        type: bar(),
        groups: [['questions', 'answers']]
      },
      axis: {
        x: {
          type: "timeseries",
          localtime: false,
          tick: {
            format: "%Y-%m-%d"
          }
        }
      },
      bindto: '#barChart_1',
    });

  }

}
