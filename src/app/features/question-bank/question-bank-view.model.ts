import {IQuestionBankStats, StatisticsService} from "../statistics/statistics.service";
import {IQuestionBank} from "./question-bank.models";

export class QuestionBankViewModel {
    id: string;
    name: string;
    updatedAt?: Date;
    questions: number;
    stats: IQuestionBankStats;

    constructor(questionBank: IQuestionBank, statistics: StatisticsService) {
        this.id = questionBank.id;
        this.name = questionBank.name;
        this.updatedAt = questionBank.editedAt ? new Date(questionBank.editedAt) : undefined;
        this.questions = questionBank.questions.length;
        this.stats = statistics.getStatisticsForQuestionBank(questionBank.id);
    }

    get coverage() {
        return this.stats.coverage;
    }

    get averageRatio() {
        return this.stats.averageRatio;
    }
}