import {IAnswer} from "../../question-bank/question-bank.models";
import {IAnsweredQuestion} from "../quiz.service";

export class QuestionViewModel {
    public id: string;
    public question: string;
    public answers: IAnswer[];
    public rightAnswer?: IAnswer;
    public answer?: IAnswer;

    constructor(public model: IAnsweredQuestion) {
        this.id = model.id;
        this.question = model.question;
        this.answers = model.answers;
        this.answer = model.answer;
        this.rightAnswer = model.answers?.find(a => a.correct) ?? undefined;
    }
}