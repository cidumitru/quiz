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
    questionsCount?: number;
}

@Injectable({
    providedIn: "root"
})
export class QuizService {

    private _defaultQuizSize = 25;
    get defaultQuizSize(): number {
        return this._defaultQuizSize;
    }

    set defaultQuizSize(value: number) {
        this._defaultQuizSize = value;
    }

    private _quizzes = new BehaviorSubject<Record<string, IQuiz>>({});
    public quizzesArr$ = this._quizzes.asObservable().pipe(
        map(quizzes => values(quizzes).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())),
    );
    public get quizzes() {
        return this._quizzes.getValue();
    }
    public get quizzesArr() {
        return Object.values(this.quizzes).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
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
            questions: sampleSize(this.questionBanks.questionBanks[options.questionBankId].questions, options.questionsCount ?? this.defaultQuizSize),
        }

        this._quizzes.next({ ...this.quizzes, [newQuiz.id]: newQuiz });

        return newQuiz;
    }

    markQuizAsFinished(quizId: string) {
        const quiz = this.quizzes[quizId];
        this._quizzes.next({ ...this.quizzes, [quizId]: { ...quiz, finishedAt: new Date() } });
    }

    setQuizAnswers(quizId: string, answers: {questionId: string, answerId: string}[]): void {
        const quiz = this.quizzes[quizId];
        const questions = quiz.questions.map(question => {
            const userAnswer = answers.find(answer => answer.questionId === question.id);
            return {
                ...question,
                answer: question.answers.find(answer => answer.id === userAnswer?.answerId)
            }
        });
        this._quizzes.next({ ...this.quizzes, [quizId]: { ...quiz, questions } });
    }

    getQuiz(id: string) {
        return this.quizzes[id];
    }

    clear() {
        this._quizzes.next({});
    }
}