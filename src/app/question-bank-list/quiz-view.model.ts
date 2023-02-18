import {IAnsweredQuestion, IQuiz} from "../services/quiz.service";
import {IAnswer} from "../services/question-bank.models";
import {inject} from "@angular/core";
import {QuestionBankService} from "../services/question-bank.service";
import {isNil} from "lodash";
import {formatDuration, intervalToDuration} from "date-fns";

export class QuizViewModel {
    id: string;
    questionBankId: string;

    questionBankName: string;
    questions: IAnsweredQuestion[];
    correctAnswers: number;
    answersCount: number;

    answers: IAnswer[];
    startedAt: Date;
    finishedAt?: Date;

    duration: string;
    correctRatio: number;

    constructor(quiz: IQuiz) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.questionBankName = inject(QuestionBankService).questionBanks[quiz.questionBankId]?.name ?? 'Unknown';

        this.answers = quiz.questions.map(q => q.answer).filter(a => !isNil(a)) as IAnswer[];
        this.answersCount = this.answers.length;
        this.correctAnswers = this.answers.filter(a => a.correct).length;
        this.correctRatio = this.answersCount > 0 ? this.correctAnswers / this.answersCount * 100 : 0;

        this.questions = quiz.questions;
        this.startedAt = new Date(quiz.startedAt);
        this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;
        this.duration = this.finishedAt
            ? formatDuration(intervalToDuration({start: this.startedAt, end: this.finishedAt}))
            : 'In progress';

    }
}