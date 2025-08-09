import {IAnsweredQuestion, IQuiz} from "../quiz.service";
import {IAnswer} from "../../question-bank/question-bank.models";
import {isNil} from "lodash";
import {Duration, intervalToDuration} from "date-fns";

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

    constructor(quiz: IQuiz, questionBankName: string) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.questionBankName = questionBankName ?? 'Unknown';

        this.answers = quiz.questions.map(q => q.answer).filter(a => !isNil(a)) as IAnswer[];
        this.answersCount = this.answers.length;
        this.correctAnswers = this.answers.filter(a => a.correct).length;
        this.correctRatio = this.answersCount > 0 ? this.correctAnswers / this.answersCount * 100 : 0;

        this.questions = quiz.questions;
        this.startedAt = new Date(quiz.startedAt);
        this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;
        this.duration = this.finishedAt
            ? this.formatShortDuration(intervalToDuration({start: this.startedAt, end: this.finishedAt}))
            : '—';
    }
    
    private formatShortDuration(duration: Duration): string {
        const parts = [];
        
        if (duration.hours && duration.hours > 0) {
            parts.push(`${duration.hours}h`);
        }
        
        if (duration.minutes && duration.minutes > 0) {
            parts.push(`${duration.minutes}m`);
        }
        
        if (duration.seconds && duration.seconds > 0 && !duration.hours) {
            parts.push(`${duration.seconds}s`);
        }
        
        // If duration is very short (< 1 second)
        if (parts.length === 0) {
            return '< 1s';
        }
        
        // Return only first two parts for brevity
        return parts.slice(0, 2).join(' ');
    }
}