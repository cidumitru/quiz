import {Injectable} from "@angular/core";
import {QuestionBankService} from "./question-bank.service";
import {QuizService} from "./quiz.service";
import {isNil, uniq, uniqBy} from "lodash";

export interface IQuestionBankStats {
    totalAnswers: number;
    answeredQuestions: number;
    correctAnswers: number;
    coverage: number;
}
@Injectable({
    providedIn: "root"
})
export class QuestionBankStatistics {
    constructor(private questionBanks: QuestionBankService, private quizzes: QuizService) {
    }

    getStatisticsForQuestionBank(questionBankId: string): IQuestionBankStats {
        const allQuestions = this.quizzes.quizzesArr.filter(quiz => quiz.questionBankId === questionBankId).map(quiz => quiz.questions).flat();

        const correctlyAnsweredQuestions = uniqBy(allQuestions.filter(q => q.answer?.correct), q => q.id);

        const coverage = ((correctlyAnsweredQuestions.length / this.questionBanks.questionBanks[questionBankId]?.questions.length) * 100) || 0;

        return allQuestions.reduce((acc, question) => {
            if(question.answer) {
                acc.totalAnswers++;
                const providedAnswer = question.answers.find(a => !isNil(a.correct));

                if(providedAnswer) acc.answeredQuestions++;
                if (question.answer.correct) acc.correctAnswers++;
            }
            return acc;
        }, {totalAnswers: 0, answeredQuestions: 0, correctAnswers: 0, coverage});
    }
}