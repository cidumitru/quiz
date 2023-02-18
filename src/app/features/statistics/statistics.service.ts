import {Injectable} from "@angular/core";
import {QuestionBankService} from "../question-bank/question-bank.service";
import {IAnsweredQuestion, QuizService} from "../quiz/quiz.service";
import {groupBy, isNil, mapValues, reduce, uniq, uniqBy} from "lodash";
import {eachDayOfInterval, format, isAfter, isBefore} from "date-fns";

export interface IQuestionBankStats {
    totalAnswers: number;
    answeredQuestions: number;
    correctAnswers: number;
    coverage: number;
}

@Injectable({
    providedIn: "root"
})
export class StatisticsService {
    constructor(private questionBanks: QuestionBankService, private quizzes: QuizService) {
    }

    getStatisticsForQuestionBank(questionBankId: string): IQuestionBankStats {
        const allQuestions = this.quizzes.quizzesArr.filter(quiz => quiz.questionBankId === questionBankId).map(quiz => quiz.questions).flat();

        const correctlyAnsweredQuestions = uniqBy(allQuestions.filter(q => q.answer?.correct), q => q.id);

        const coverage = ((correctlyAnsweredQuestions.length / this.questionBanks.questionBanks[questionBankId]?.questions.length) * 100) || 0;

        return allQuestions.reduce((acc, question) => {
            if (question.answer) {
                acc.totalAnswers++;
                const providedAnswer = question.answers.find(a => !isNil(a.correct));

                if (providedAnswer) acc.answeredQuestions++;
                if (question.answer.correct) acc.correctAnswers++;
            }
            return acc;
        }, {totalAnswers: 0, answeredQuestions: 0, correctAnswers: 0, coverage});
    }

    getQuestionsByDay(start: Date, end: Date): { [key: string]: IAnsweredQuestion[] } {
        const daysOfWeek = eachDayOfInterval({
            start,
            end
        }).map(day => format(day, "dd-MM-yyyy")).reduce((acc: Record<string, IAnsweredQuestion[]>, date) => ({
            ...acc,
            [date]: []
        }), {});
        const quizzes = this.quizzes.quizzesArr.filter(quiz => quiz.finishedAt && isAfter(new Date(quiz.finishedAt), start) && isBefore(new Date(quiz.finishedAt), end));

        return {
            ...daysOfWeek,
            ...mapValues(groupBy(quizzes, quizz => format(new Date(quizz.finishedAt!), "dd-MM-yyyy")), quizzes => quizzes.map(quiz => quiz.questions).flat())
        };
    }

    getAnsweredQuestionsByQuestionBanks(startDate: Date, endDate: Date): { [key: string]: IQuestionBankSummaryStats } {
        const quizzes = this.quizzes.quizzesArr.filter(quiz => {
            return quiz.finishedAt && isAfter(new Date(quiz.finishedAt), startDate) && isBefore(new Date(quiz.finishedAt), endDate);
        });

        const unfilteredResult = mapValues(groupBy(quizzes, quizz => quizz.questionBankId), quizzes => {
            const questions = quizzes.map(quiz => quiz.questions).flat();
            const answeredQuestions = uniq(questions.filter(q => q.answer));
            const questionBank = this.questionBanks.questionBanks[quizzes[0].questionBankId];
            return {
                questionBankName: questionBank?.name || "Unknown",
                answeredQuestions,
                totalQuestions: questionBank?.questions.length || 0
            };
        });

        return reduce(unfilteredResult, (acc: { [key: string]: IQuestionBankSummaryStats }, value, key) => {
            if (value.questionBankName === "Unknown") {
                acc["unknown"] = {
                    ...(acc["unknown"], {}), ...value,
                    totalQuestions: value.answeredQuestions.length + (acc["unknown"]?.totalQuestions || 0),
                    answeredQuestions: [...(acc["unknown"]?.answeredQuestions || []), ...value.answeredQuestions]
                };
                return acc;
            }
            if (value.answeredQuestions.length > 0) {
                acc[key] = value;
            }
            return acc;
        }, {});
    }
}

export interface IQuestionBankSummaryStats {
    questionBankName: string;
    answeredQuestions: IAnsweredQuestion[];
    totalQuestions: number;
}