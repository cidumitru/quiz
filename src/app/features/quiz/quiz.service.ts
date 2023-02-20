import {Injectable} from "@angular/core";
import {IAnswer, IQuestion} from "../question-bank/question-bank.models";

import * as localForage from "localforage";
import {BehaviorSubject, map, skip} from "rxjs";
import {sampleSize, uniqBy, values} from "lodash";
import {v4 as uuidv4} from 'uuid';
import {QuestionBankService} from "../question-bank/question-bank.service";

export interface IAnsweredQuestion extends IQuestion {
    answer?: IAnswer;
}

export interface IQuiz {
    id: string;
    questionBankId: string;
    startedAt: string;
    finishedAt?: string;
    mode?: QuizMode;
    questions: IAnsweredQuestion[];
}

export enum QuizMode {
    All = "all",
    Mistakes = "mistakes",
    Discovery = "discovery",
}

export interface ICreateQuiz {
    questionBankId: string;
    questionsCount: number;
    mode?: QuizMode;
}

@Injectable({
    providedIn: "root"
})
export class QuizService {

    constructor(private questionBanks: QuestionBankService) {
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

    async init() {
        const storageKey = "quizzes";
        const quizzes = await localForage.getItem(storageKey);
        this._quizzes.next(JSON.parse(quizzes as string) || {});
        this._quizzes.pipe(skip(1)).subscribe(() => localForage.setItem(storageKey, JSON.stringify(this.quizzes)));
    }

    startQuiz(options: ICreateQuiz): IQuiz {
        let questions;
        switch (options.mode) {
            case QuizMode.Mistakes:
                const questionAnswerMap = this.quizzesArr.filter(q => q.questionBankId === options.questionBankId).reduce((acc, quiz) => {
                    quiz.questions.forEach(question => {
                        if (question.answer) acc[question.id] = [...(acc[question.id] ?? []), !!question.answer?.correct];
                    });
                    return acc;
                }, {} as Record<string, boolean[]>);

                questions = this.questionBanks.questionBanks[options.questionBankId].questions.filter(question => {
                    const answers = questionAnswerMap[question.id];
                    return answers?.length && answers.filter(answer => answer).length / answers.length < 0.7;
                });
                break;
            case QuizMode.Discovery:
                const answeredQuestionsSet = new Set(this.quizzesArr.filter(q => q.questionBankId === options.questionBankId).map(quiz => quiz.questions).flat().filter(q => q.answer).map(question => question.id));

                questions = this.questionBanks.questionBanks[options.questionBankId].questions.filter(question => !answeredQuestionsSet.has(question.id));
                break;
            default:
                questions = this.questionBanks.questionBanks[options.questionBankId].questions;
        }
        const newQuiz: IQuiz = {
            id: uuidv4(),
            mode: options.mode,
            questionBankId: options.questionBankId,
            startedAt: new Date().toString(),
            questions: sampleSize(questions, options.questionsCount),
        }

        this._quizzes.next({...this.quizzes, [newQuiz.id]: newQuiz});

        return newQuiz;
    }

    markQuizAsFinished(quizId: string) {
        const quiz = this.quizzes[quizId];
        this._quizzes.next({...this.quizzes, [quizId]: {...quiz, finishedAt: new Date().toString()}});
    }

    setQuizAnswers(quizId: string, answers: { questionId: string, answerId: string }[]): void {
        const quiz = this.quizzes[quizId];
        const questions = quiz.questions.map(question => {
            const userAnswer = answers.find(answer => answer.questionId === question.id);
            return {
                ...question,
                answer: question.answers.find(answer => answer.id === userAnswer?.answerId)
            }
        });
        this._quizzes.next({...this.quizzes, [quizId]: {...quiz, questions}});
    }

    getQuiz(id: string) {
        return this.quizzes[id];
    }

    getQuizzes({skip, take, questionBankId}: IGetQuizzesParams): { items: IQuiz[], total: number } {
        if (questionBankId) {
            const filteredQuizzes = this.quizzesArr.filter(quiz => quiz.questionBankId === questionBankId);
            return { items: filteredQuizzes.slice(skip, skip + take), total: filteredQuizzes.length}
        }
        return { items: this.quizzesArr.slice(skip, skip + take), total: this.quizzesArr.length}
    }

    clear() {
        this._quizzes.next({});
    }
}

export interface IGetQuizzesParams {
    take: number;
    skip: number;
    questionBankId?: string;
}