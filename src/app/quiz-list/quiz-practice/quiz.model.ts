import {IQuiz} from "../../services/quiz.service";
import {keyBy} from "lodash";
import {QuestionViewModel} from "./question.view-model";

export class QuizModel {
    questions: QuestionViewModel[];
    questionMap: { [id: string]: QuestionViewModel } = {};
    finishedAt?: Date;
    id: string;
    questionBankId: string;
    startedAt: Date;

    constructor(public quiz: IQuiz) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.startedAt = new Date(quiz.startedAt);
        this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;
        this.questions = quiz.questions.map(q => new QuestionViewModel(q));
        this.questionMap = keyBy(this.questions, 'id');
    }
}