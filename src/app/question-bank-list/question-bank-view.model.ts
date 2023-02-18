import {IQuestionBankStats, QuestionBankStatistics} from "../services/question-bank.statistics";
import {IQuestionBank} from "../services/question-bank.models";

export class QuestionBankViewModel {
    id: string;
    name: string;
    updatedAt?: Date;
    questions: number;
    stats: IQuestionBankStats;

    constructor(questionBank: IQuestionBank, statistics: QuestionBankStatistics) {
        this.id = questionBank.id;
        this.name = questionBank.name;
        this.updatedAt = questionBank.editedAt ? new Date(questionBank.editedAt) : undefined;
        this.questions = questionBank.questions.length;
        this.stats = statistics.getStatisticsForQuestionBank(questionBank.id);
    }

    get coverage() {
        return this.stats.coverage;
    }
}