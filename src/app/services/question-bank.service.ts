import { Injectable } from "@angular/core";
import { BehaviorSubject, map, Observable, skip } from "rxjs";
import { v4 as uuidv4 } from 'uuid';
import { omit, values } from "lodash";
import * as localForage from "localforage";
import {IAnswer, IQuestionBank, QuestionType} from "./question-bank.models";

export interface IQuestionCreate {
  question: string;
  answers: Pick<IAnswer, 'text' | 'correct'>[];
}

@Injectable()
export class QuestionBankService {
  private _questionBanks = new BehaviorSubject<Record<string, IQuestionBank>>({});
  public questionBankArr$ = this._questionBanks.asObservable().pipe(
    map(quizzes => values(quizzes)),
  );

  public get questionBanks() {
    return this._questionBanks.getValue();
  }

  public get questionBankArr() {
    return Object.values(this.questionBanks);
  }

  async init() {
    const quizzes = await localForage.getItem("questionBanks");
    this._questionBanks.next(JSON.parse(quizzes as string) || {});
    this._questionBanks.pipe(skip(1)).subscribe(() => localForage.setItem("questionBanks", JSON.stringify(this.questionBanks)));
  }

  create(): string {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const name = `NEW QUESTION BANK: ${createdAt.toLocaleString()}`;

    this._questionBanks.next({ ...this.questionBanks, [id]: { id, name, createdAt, questions: [] } });
    return id;
  }

  updateQuestionBank(id: string, name: string): void {
    this._questionBanks.next({ ...this.questionBanks, [id]: { ...this.questionBanks[id], name } })
  }


  insertQuestionBank(questionBank: IQuestionBank): void {
    let questionBankId = questionBank.id;
    if (this.questionBanks[questionBank.id]) {
      questionBankId = uuidv4();
    }

    this._questionBanks.next({
        ...this.questionBanks,
        [questionBankId]: {
          ...questionBank,
          id: questionBankId,
          name: questionBank.id === questionBankId ? questionBank.name : `${questionBank.name} (copy)`,
        }
      }
    )
  }

  addQuestion(questionBankId: string, question: IQuestionCreate | IQuestionCreate[]): void {
    const questions = (Array.isArray(question) ? question : [question]).map((question) => ({
      id: uuidv4(),
      type: QuestionType.MultipleChoice,
      question: question.question,
      answers: question.answers.map((answer) => ({ id: uuidv4(), text: answer.text }))
    }));

    this._questionBanks.next({
        ...this.questionBanks,
        [questionBankId]: {
          ...this.questionBanks[questionBankId],
          editedAt: new Date().toISOString(),
          questions: [...this.questionBanks[questionBankId].questions, ...questions]
        }
      }
    )
  }

  watchQuestionBank(id: string): Observable<IQuestionBank> {
    return this._questionBanks.pipe(map(quizzes => quizzes[id]));
  }

  delete(id: string): void {
    const result = omit(this.questionBanks, id);
    this._questionBanks.next(result);
  }

  setCorrectAnswer(questionBankId: string, questionId: string, correctAnswerId: string) {
    this._questionBanks.next({
      ...this.questionBanks,
      [questionBankId]: {
        ...this.questionBanks[questionBankId],
        editedAt: new Date().toISOString(),
        questions: this.questionBanks[questionBankId].questions.map((question) => {
          if (question.id === questionId) {
            return {
              ...question,
              answers: question.answers.map((answer) => ({ ...answer, correct: answer.id === correctAnswerId }))
            }
          }
          return question;
        })
      }
    });
  }

    deleteQuestion(questionBankId: string, questionId: string): void {
      this._questionBanks.next({
        ...this.questionBanks,
        [questionBankId]: {
          ...this.questionBanks[questionBankId],
          editedAt: new Date().toISOString(),
          questions: this.questionBanks[questionBankId].questions.filter((question) => question.id !== questionId)
        }
      });
    }
}
