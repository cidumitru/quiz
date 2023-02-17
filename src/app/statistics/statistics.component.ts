import {AfterViewInit, Component, OnInit} from '@angular/core';
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
export class StatisticsComponent implements OnInit, AfterViewInit {

  constructor(private stats: QuestionBankStatistics) {
  }

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    this.plotWeeklyStats();
    this.plotStatsByQuestionBank();
  }

  plotWeeklyStats(): void {
    const today = new Date();
    const startFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const questionsByDay = this.stats.getQuestionsByDay(startFrom, new Date());


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
          ['answers', ...answeredQuestions],
          ['correct', ...correctQuestions],
        ],
        labels: true,
        empty: {label: {text: "No data"}},
        type: bar(),
      },
      bar: {
        // @ts-ignore: billboard.js types are wrong
        overlap: true,
        width: {
            answers: 60,
            correct: 50,
        },
      },
      axis: {
        x: {
          type: "timeseries",
          localtime: false,
          tick: {
            format: "%Y-%m-%d"
          },
        },
      },
      grid: {
        y: {
          show: true
        }
      },
      bindto: '#barChart_1',
    });
  }

  plotStatsByQuestionBank(): void {
const today = new Date();
    const startFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const answeredQuestionsByQuestionBank = this.stats.getAnsweredQuestionsByQuestionBanks(startFrom, new Date());


    const questionBanksNames = entries(answeredQuestionsByQuestionBank).map(([_, answeredQuestions]) => answeredQuestions.questionBankName);
    const questionBanks = Object.keys(answeredQuestionsByQuestionBank);
    const answeredQuestions = questionBanks.map(qb => answeredQuestionsByQuestionBank[qb].answeredQuestions.length);
    const correctQuestions = questionBanks.map(qb => answeredQuestionsByQuestionBank[qb].answeredQuestions.filter(q => q.answer?.correct).length);
    const totalQuestions = questionBanks.map(qb => answeredQuestionsByQuestionBank[qb].totalQuestions);


    bb.generate({
      data: {
        x: "x",
        columns: [
          ["x", ...questionBanksNames],
          ["answered", ...answeredQuestions],
          ["correct", ...correctQuestions],
        ],
        // groups: [
        //   ["answered", "correct", "total"]
        // ],
        type: bar(),
        labels: true,
      },
      axis: {
        x: {
          type: "category",
        },
      },
      bindto: "#questionBanks"
    });
  }

}
