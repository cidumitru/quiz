import {IQuestionBankStats, StatisticsService} from "../statistics/statistics.service";
import {IQuestionBank} from "./question-bank.models";
import {endOfToday, startOfToday} from "date-fns";

export class QuestionBankViewModel {
    id: string;
    name: string;
    updatedAt?: Date;
    questions: number;
    stats: IQuestionBankStats;
    averageScoreToday: number;

    constructor(questionBank: IQuestionBank, statistics: StatisticsService) {
        this.id = questionBank.id;
        this.name = questionBank.name;
        this.updatedAt = questionBank.editedAt ? new Date(questionBank.editedAt) : undefined;
        this.questions = questionBank.questions.length;
        this.stats = statistics.getStatisticsForQuestionBank(questionBank.id);
        this.averageScoreToday = statistics.getStatisticsForQuestionBank(questionBank.id, startOfToday(), endOfToday()).averageRatio;
    }

    get coverage() {
        return this.stats.coverage;
    }

    get averageScore() {
        return this.stats.averageRatio;
    }
}