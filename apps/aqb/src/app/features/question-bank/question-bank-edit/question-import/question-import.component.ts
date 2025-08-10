import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {QuestionBankService} from "../../question-bank.service";
import {ActivatedRoute} from "@angular/router";
import {MatCardModule} from "@angular/material/card";
import {MatInputModule} from "@angular/material/input";
import {MatRadioModule} from "@angular/material/radio";
import {CommonModule} from "@angular/common";
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatSnackBar} from "@angular/material/snack-bar";
import {debounceTime, map, shareReplay} from "rxjs";
import {isEmpty} from "lodash";

@Component({
    selector: 'app-question-import',
    templateUrl: './question-import.component.html',
    styleUrls: ['./question-import.component.scss'],
    imports: [
        MatCardModule,
        MatInputModule,
        ReactiveFormsModule,
        MatRadioModule,
        CommonModule,
        MatButtonModule,
        MatProgressSpinnerModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true
})
export class QuestionImportComponent {
    private quiz = inject(QuestionBankService);
    private activatedRoute = inject(ActivatedRoute);
    private snackbar = inject(MatSnackBar);

    public id: string = this.activatedRoute.parent?.snapshot.paramMap.get("id")!;
    public control = new FormControl("");
    public isImporting = signal<boolean>(false);
    private parsedQuestions: QuestionModel[] | undefined = [];
    public questions$ = this.control.valueChanges.pipe(
        debounceTime(500),
        map(() => {
            if (isEmpty(this.control.value)) return [];

            const questions = this.control.value?.replace(/\n/g, " ").split(/(?=\b\d{1,2}\b\.)/);
            this.parsedQuestions = questions?.map(question => new QuestionModel(question));
            return this.parsedQuestions;
        }),
        shareReplay(1)
    )

    async import() {
      const dto = this.parsedQuestions
        ?.filter(question => question.question && question.question.trim() !== '')
        ?.map(question => ({
          question: question.question.trim(),
          answers: question.options
            .filter(option => option && option.trim() !== '')
            .map(option => ({text: option.trim()}))
        }))
        ?.filter(question => question.answers.length > 0);

        if (!dto || dto.length === 0) {
          this.snackbar.open('No valid questions to import', 'Close', {duration: 3000});
            return;
        }

        this.isImporting.set(true);
        try {
            await this.quiz.addQuestion(this.id, dto);
            this.control.reset("");
            this.snackbar.open(`Successfully imported ${dto.length} questions`, 'Close', { duration: 3000 });
        } catch (error) {
            console.error('Failed to import questions:', error);
            this.snackbar.open('Failed to import questions. Please try again.', 'Close', { duration: 5000 });
        } finally {
            this.isImporting.set(false);
        }
    }
}

export class QuestionModel {
    question: string;
    options!: string[];

    constructor(rawQuestion: string) {
        const parsed = rawQuestion.split(/(?=[A-Z]\.)/);
        this.question = parsed[0];
        this.options = parsed.slice(1, parsed.length);
    }
}
