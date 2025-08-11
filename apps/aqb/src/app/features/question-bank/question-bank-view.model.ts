import {QuestionBankStatistics, QuestionBankSummary} from "@aqb/data-access";

export class QuestionBankViewModel {
  id: string;
  name: string;
  updatedAt?: Date;
  questions: number;
  stats: QuestionBankStatistics;

  constructor(private questionBank: QuestionBankSummary) {
    this.id = questionBank.id;
    this.name = questionBank.name;
    this.stats = questionBank.statistics;
    this.questions = this.questionBank.questionsCount;
    this.updatedAt = this.questionBank.updatedAt;
  }

  get coverage() {
    return this.questionBank.statistics.coverage;
  }

  get averageScore() {
    return this.questionBank.statistics.averageScore;
  }

  get averageScoreToday() {
    return this.questionBank.statistics.averageScoreToday;
  }
}
