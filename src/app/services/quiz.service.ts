import {Injectable} from "@angular/core";
import {IAnswer, IQuestion, IQuestionBank} from "./question-bank.models";

import * as localForage from "localforage";
import {BehaviorSubject, map, skip} from "rxjs";
import {sampleSize, values} from "lodash";
import { v4 as uuidv4 } from 'uuid';
import {QuestionBankService} from "./question-bank.service";

export interface IAnsweredQuestion extends IQuestion {
    answer?: IAnswer;
}
export interface IQuiz {
    id: string;
    questionBankId: string;
    startedAt: Date;
    finishedAt?: Date;
    questions: IAnsweredQuestion[];
}

export interface ICreateQuiz {
    questionBankId: string;
    questionsCount: number;
}

@Injectable({
    providedIn: "root"
})
export class QuizService {

    private _quizzes = new BehaviorSubject<Record<string, IQuiz>>({});
    public quizzesArr$ = this._quizzes.asObservable().pipe(
        map(quizzes => values(quizzes)),
    );

    public get quizzes() {
        return this._quizzes.getValue();
    }

    public get quizzesArr() {
        return Object.values(this.quizzes);
    }

    constructor(private questionBanks: QuestionBankService) {
    }

    async init() {
        const storageKey = "quizzes";
        const quizzes = await localForage.getItem(storageKey);
        this._quizzes.next(JSON.parse(quizzes as string) || {});
        this._quizzes.pipe(skip(1)).subscribe(() => localForage.setItem(storageKey, JSON.stringify(this.quizzes)));
    }

    startQuiz(options: ICreateQuiz): IQuiz {
        const newQuiz = {
            id: uuidv4(),
            questionBankId: options.questionBankId,
            startedAt: new Date(),
            questions: sampleSize(this.questionBanks.questionBanks[options.questionBankId].questions, options.questionsCount),
        }

        this._quizzes.next({ ...this.quizzes, [newQuiz.id]: newQuiz });

        return newQuiz;
    }

    finishQuiz(quizId: string, answers: {questionId: string, answerId: string}[]): void {
        const quiz = this.quizzes[quizId];
        const questions = quiz.questions.map(question => {
            const answer = answers.find(answer => answer.questionId === question.id);
            return {
                ...question,
                answer: question.answers.find(answer => answer.id === answer.id)
            }
        });
        this._quizzes.next({ ...this.quizzes, [quizId]: { ...quiz, questions, finishedAt: new Date() } });
    }
}