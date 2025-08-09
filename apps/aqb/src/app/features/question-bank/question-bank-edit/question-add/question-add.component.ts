import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {QuestionBankService} from "../../question-bank.service";
import {ActivatedRoute} from "@angular/router";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-question-add',
    templateUrl: './question-add.component.html',
    styleUrls: ['./question-add.component.scss'],
    imports: [
        CommonModule,
        MatInputModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatRadioModule
    ],
    standalone: true
})
export class QuestionAddComponent {
    public id: string;
    newQuestionForm = new FormGroup({
        question: new FormControl('', {nonNullable: true}),
        answer: new FormControl('', {nonNullable: true}),
        wrongAnswer: new FormControl('', {nonNullable: true}),
        wrongAnswer2: new FormControl(''),
        wrongAnswer3: new FormControl(''),
    });

    constructor(public quiz: QuestionBankService, private activatedRoute: ActivatedRoute) {
        this.id = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
    }

    addQuestion() {
        const formValue = this.newQuestionForm.value;
        this.quiz.addQuestion(this.id, [{
            question: formValue.question!,
            answers: [formValue.answer!, formValue.wrongAnswer!, formValue.wrongAnswer2!, formValue.wrongAnswer3!]
                .filter(r => !!r)
                .map((answer, index) => ({text: answer!, correct: index === 0}))
        }]);
        this.newQuestionForm.reset();
    }
}
