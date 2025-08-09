import {ChangeDetectorRef, Component, inject, OnDestroy} from '@angular/core';
import {startWith, Subscription} from "rxjs";
import {QuestionBankService} from "../../question-bank/question-bank.service";
import {ActivatedRoute, Router, RouterModule} from "@angular/router";
import {entries, keyBy, mapValues, values} from 'lodash';
import {IQuestionBank} from "../../question-bank/question-bank.models";
import {CommonModule} from "@angular/common";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTableModule} from "@angular/material/table";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatTooltipModule} from "@angular/material/tooltip";
import {QuizMode, QuizService} from "../quiz.service";
import {QuizModel} from "./quiz.model";
import {QuestionViewModel} from "./question.view-model";

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

    private activatedRoute = inject(ActivatedRoute);
    private questionBankService = inject(QuestionBankService);
    private router = inject(Router);
    private quizService = inject(QuizService);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        const isNewQuiz = !this.activatedRoute.snapshot.paramMap.get("quizId");
        const queryParamMap = this.activatedRoute.snapshot.queryParamMap;

        if (isNewQuiz) {
            const questionBankId = queryParamMap.get("questionBankId");
            if (!questionBankId) throw new Error("questionBankId is required for starting a new quiz");

            this.questionBank = this.questionBankService.questionBanksValue[questionBankId!];
            this.quiz = new QuizModel(this.quizService.startQuiz({
                questionBankId: this.questionBank.id,
                questionsCount: parseInt(queryParamMap.get("size") ?? "") ?? 25,
                mode: queryParamMap.get("mode") as QuizMode,
            }))
        } else {
            const quizId = this.activatedRoute.snapshot.paramMap.get("quizId")!;
            if (!quizId) throw new Error("quizId is required for resuming quiz");

            this.quiz = new QuizModel(this.quizService.getQuiz(quizId));
            if (!this.quiz) throw new Error("Quiz not found");

            this.questionBank = this.questionBankService.questionBanksValue[this.quiz.questionBankId];
        }


        this.formGroup = new FormGroup<{ [questionId: string]: FormControl<string> }>(
            mapValues(keyBy(this.quiz.questions, 'id'),
                (q: QuestionViewModel) =>
                    new FormControl(q.answer?.id ?? "", {
                        validators: q.rightAnswer ? [Validators.pattern(q.rightAnswer.id)] : [],
                        nonNullable: true
                    })
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

    public get hasFinished() {
        return values(this.formGroup.controls).every(c => c.value);
    }

    // Progress tracking getters
    public get answeredCount(): number {
        return values(this.formGroup.controls).filter(c => c.value).length;
    }

    public get progressPercentage(): number {
        return (this.answeredCount / this.quiz.questions.length) * 100;
    }

    public get accuracyPercentage(): number {
        return this.answeredCount > 0 ? Math.round((this.stats.correct / this.answeredCount) * 100) : 0;
    }

    // Question state helper methods
    public isQuestionAnswered(questionId: string): boolean {
        return !!this.formGroup.controls[questionId].value;
    }

    public isQuestionCorrect(questionId: string): boolean {
        const control = this.formGroup.controls[questionId];
        return control.valid && !!control.value;
    }

    public isQuestionIncorrect(questionId: string): boolean {
        const control = this.formGroup.controls[questionId];
        return control.invalid && !!control.value;
    }

    public getSelectedAnswerId(questionId: string): string {
        return this.formGroup.controls[questionId].value || '';
    }

    public getAnswerLabel(index: number): string {
        return String.fromCharCode(65 + index); // A, B, C, D...
    }

    // Answer selection method with auto-scroll
    public selectAnswer(questionId: string, answerId: string, questionIndex: number): void {
        // Prevent changing answer if already answered
        if (this.isQuestionAnswered(questionId)) {
            return;
        }
        
        this.formGroup.controls[questionId].setValue(answerId);
        
        // Check if the selected answer is correct and auto-scroll to next question
        setTimeout(() => {
            if (this.isQuestionCorrect(questionId)) {
                this.scrollToNextQuestion(questionIndex);
            }
        }, 300); // Small delay to allow UI state update
    }

    // Auto-scroll to next question on correct answer
    private scrollToNextQuestion(currentIndex: number): void {
        const nextIndex = currentIndex + 1;
        
        // Don't scroll if this is the last question
        if (nextIndex >= this.quiz.questions.length) {
            return;
        }
        
        // Find the next question card element
        const nextQuestionElement = document.querySelector(`[data-question-index="${nextIndex}"]`);
        
        if (nextQuestionElement) {
            // Smooth scroll to the next question with some offset for better positioning
            const yOffset = -100; // Offset to account for header
            const elementPosition = nextQuestionElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset + yOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    ngOnDestroy(): void {
        this.statsSubs.unsubscribe();
    }

    retry() {
        this.router.navigate(['quizzes']).then(() => {
            this.router.navigate(['quizzes', 'practice'], {
                queryParams: {
                    size: this.quiz.questions.length,
                    questionBankId: this.questionBank.id
                }
            }).then();
            window.scrollTo(0, 0);
        });
    }
}

