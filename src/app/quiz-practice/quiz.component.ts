import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, OnDestroy} from '@angular/core';
import {map, startWith, Subscription} from "rxjs";
import {QuestionBankService} from "../services/question-bank.service";
import {ActivatedRoute, Router, RouterModule} from "@angular/router";
import {entries, keyBy, mapValues, values} from 'lodash';
import {IAnswer, IQuestionBank} from "../services/question-bank.models";
import {CommonModule} from "@angular/common";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTableModule} from "@angular/material/table";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {FormControl, FormGroup, NgControl, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatTooltipModule} from "@angular/material/tooltip";
import {IAnsweredQuestion, IQuiz, QuizService} from "../services/quiz.service";

@Component({
    selector: 'app-questionBank-practice',
    templateUrl: './quiz.component.html',
    styleUrls: ['./quiz.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatCardModule,
        MatRadioModule,
        MatSnackBarModule,
        RouterModule,
        ReactiveFormsModule,
        MatTooltipModule,
    ]
})
export class QuizComponent implements OnDestroy {
    public questionBank: IQuestionBank;
    public quiz: QuizModel;
    public formGroup: FormGroup;
    public created = new Date();
    public stats: { total: number, correct: number, incorrect: number } = {total: 0, correct: 0, incorrect: 0};
    public statsSubs: Subscription;

    public get hasFinished() {
        return values(this.formGroup.controls).every(c => c.value);
    }

    constructor(private activatedRoute: ActivatedRoute, private questionBankService: QuestionBankService, private router: Router, private quizService: QuizService, private cdr: ChangeDetectorRef) {
        this.questionBank = questionBankService.questionBanks[this.activatedRoute.snapshot.paramMap.get("id")!];

        const quizId = this.activatedRoute.snapshot.paramMap.get("quizId");
        const questionsCount = parseInt(this.activatedRoute.snapshot.queryParamMap.get("size") ?? "") ?? 25;

        if (quizId) this.quiz = new QuizModel(this.quizService.getQuiz(quizId));
        else this.quiz = new QuizModel(this.quizService.startQuiz({ questionBankId: this.questionBank.id, questionsCount: questionsCount}));


        this.formGroup = new FormGroup<{[questionId: string]: FormControl<string>}>(
            mapValues(keyBy(this.quiz.questions, 'id'),
                (q: QuestionViewModel) =>
                    new FormControl(q.answer?.id ?? "", {validators: q.rightAnswer ? [Validators.pattern(q.rightAnswer.id)] : [], nonNullable: true})
            )
        )

        this.formGroup.updateValueAndValidity();

        this.statsSubs = this.formGroup.valueChanges
            .pipe(startWith(this.formGroup.value))
            .subscribe((value) => {

                this.stats.total = this.quiz.questions.length;

                const answeredQuestions = entries(value).map(([questionId, answerId]) => ({
                    questionId,
                    answerId: answerId as string
                }));

                this.quizService.setQuizAnswers(this.quiz.id, answeredQuestions);

                this.stats = {total: this.quiz.questions.length, correct: 0, incorrect: 0};

                answeredQuestions.filter(q => q.answerId).forEach(aq => {
                    const question = this.quiz.questionMap[aq.questionId];
                    if (question.rightAnswer) {
                        if (question.rightAnswer.id === aq.answerId) this.stats.correct++;
                        else this.stats.incorrect++;
                    }
                })

                if (this.hasFinished) this.quizService.markQuizAsFinished(this.quiz.id);
            });
    }

    ngOnDestroy(): void {
        this.statsSubs.unsubscribe();
    }

    retry() {
        this.router.navigate(['']).then(() => {
            this.router.navigate([this.questionBank.id, 'practice', {size: this.quiz.questions.length}]).then();
            window.scrollTo(0, 0);
        });
    }
}

export class QuizModel {
    questions: QuestionViewModel[];
    questionMap: { [id: string]: QuestionViewModel } = {};
    finishedAt?: Date;
    id: string;
    questionBankId: string;
    startedAt: Date;

    constructor(public quiz: IQuiz) {
        this.id = quiz.id;
        this.questionBankId = quiz.questionBankId;
        this.startedAt = quiz.startedAt;
        this.finishedAt = quiz.finishedAt;
        this.questions = quiz.questions.map(q => new QuestionViewModel(q));
        this.questionMap = keyBy(this.questions, 'id');
    }
}

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
