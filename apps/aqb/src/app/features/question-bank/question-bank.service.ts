import {computed, effect, Injectable, signal} from "@angular/core";
import {BehaviorSubject, map, Observable, skip} from "rxjs";
import {v4 as uuidv4} from 'uuid';
import {omit, values} from "lodash";
import * as localForage from "localforage";
import {IAnswer, IQuestionBank, QuestionType} from "./question-bank.models";

export interface IQuestionCreate {
    question: string;
    answers: Pick<IAnswer, 'text' | 'correct'>[];
}

@Injectable()
export class QuestionBankService {
    // Signals for modern state management
    private _questionBanks = signal<Record<string, IQuestionBank>>({});
    
    // Computed values
    public questionBanks = computed(() => this._questionBanks());
    public questionBankArr = computed(() => values(this._questionBanks()));
    
    // Getter for backward compatibility
    public get questionBanksValue() {
        return this._questionBanks();
    }
    
    // Keep RxJS compatibility for now
    private _questionBanksSubject = new BehaviorSubject<Record<string, IQuestionBank>>({});
    public questionBankArr$ = this._questionBanksSubject.asObservable().pipe(
        map(quizzes => values(quizzes)),
    );

    constructor() {
        // Sync signals with RxJS subjects for backward compatibility
        effect(() => {
            this._questionBanksSubject.next(this._questionBanks());
        });
    }

    async init() {
        const quizzes = await localForage.getItem("questionBanks");
        this._questionBanks.set(JSON.parse(quizzes as string) || {});
        
        // Auto-save to localStorage whenever state changes
        effect(() => {
            const currentState = this._questionBanks();
            if (Object.keys(currentState).length > 0) {
                localForage.setItem("questionBanks", JSON.stringify(currentState));
            }
        });
    }

    create(): string {
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const name = `NEW QUESTION BANK: ${createdAt.toLocaleString()}`;

        this._questionBanks.update(current => ({...current, [id]: {id, name, createdAt, questions: []}}));
        return id;
    }

    updateQuestionBank(id: string, name: string): void {
        this._questionBanks.update(current => ({
            ...current, 
            [id]: {...current[id], name}
        }));
    }

    insertQuestionBank(questionBank: IQuestionBank): void {
        let questionBankId = questionBank.id;
        if (this.questionBanks()[questionBank.id]) {
            questionBankId = uuidv4();
        }

        this._questionBanks.update(current => ({
            ...current,
            [questionBankId]: {
                ...questionBank,
                id: questionBankId,
                name: questionBank.id === questionBankId ? questionBank.name : `${questionBank.name} (copy)`,
            }
        }));
    }

    addQuestion(questionBankId: string, question: IQuestionCreate | IQuestionCreate[]): void {
        const questions = (Array.isArray(question) ? question : [question]).map((question) => ({
            id: uuidv4(),
            type: QuestionType.MultipleChoice,
            question: question.question,
            answers: question.answers.map((answer) => ({id: uuidv4(), text: answer.text}))
        }));

        this._questionBanks.update(current => ({
            ...current,
            [questionBankId]: {
                ...current[questionBankId],
                editedAt: new Date().toISOString(),
                questions: [...current[questionBankId].questions, ...questions]
            }
        }));
    }

    watchQuestionBank(id: string): Observable<IQuestionBank> {
        return this._questionBanksSubject.pipe(map(quizzes => quizzes[id]));
    }

    delete(id: string): void {
        this._questionBanks.update(current => omit(current, id));
    }

    setCorrectAnswer(questionBankId: string, questionId: string, correctAnswerId: string) {
        this._questionBanks.update(current => ({
            ...current,
            [questionBankId]: {
                ...current[questionBankId],
                editedAt: new Date().toISOString(),
                questions: current[questionBankId].questions.map((question) => {
                    if (question.id === questionId) {
                        return {
                            ...question,
                            answers: question.answers.map((answer) => ({
                                ...answer,
                                correct: answer.id === correctAnswerId
                            }))
                        }
                    }
                    return question;
                })
            }
        }));
    }

    deleteQuestion(questionBankId: string, questionId: string): void {
        this._questionBanks.update(current => ({
            ...current,
            [questionBankId]: {
                ...current[questionBankId],
                editedAt: new Date().toISOString(),
                questions: current[questionBankId].questions.filter((question) => question.id !== questionId)
            }
        }));
    }
}
