import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {Question} from '@aqb/data-access';

export interface QuestionEditDialogData {
  question?: Question; // Optional for create mode
  questionBankId: string;
  mode: 'create' | 'edit';
}

interface AnswerFormValue {
  id: string;
  text: string;
  correct: boolean;
}

interface QuestionFormValue {
  question: string;
  correctAnswerId: string;
  answers: AnswerFormValue[];
}

type AnswerFormGroup = FormGroup<{
  id: FormControl<string>;
  text: FormControl<string>;
  correct: FormControl<boolean>;
}>;

type QuestionFormGroup = FormGroup<{
  question: FormControl<string>;
  correctAnswerId: FormControl<string>;
  answers: FormArray<AnswerFormGroup>;
}>;

@Component({
  selector: 'app-question-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './question-edit-dialog.component.html',
  styleUrls: ['./question-edit-dialog.component.scss']
})
export class QuestionEditDialogComponent implements OnInit {
  public data = inject<QuestionEditDialogData>(MAT_DIALOG_DATA);
  public form!: QuestionFormGroup;
  public isLoading = false;
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<QuestionEditDialogComponent>);

  get answers(): FormArray<AnswerFormGroup> {
    return this.form.controls.answers;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  addAnswer(): void {
    if (this.answers.length >= 6) {
      return;
    }

    this.answers.push(this.createAnswerFormGroup());
  }

  removeAnswer(index: number): void {
    if (this.answers.length <= 2) {
      return;
    }

    const removedAnswer = this.answers.at(index);
    const wasCorrect = removedAnswer.controls.correct.value;

    this.answers.removeAt(index);

    if (wasCorrect && this.answers.length > 0) {
      if (this.data.mode === 'edit') {
        const firstAnswerId = this.answers.at(0).controls.id.value;
        this.form.controls.correctAnswerId.setValue(firstAnswerId);
      } else {
        this.form.controls.correctAnswerId.setValue('0');
      }
    } else if (this.data.mode === 'create' && parseInt(this.form.controls.correctAnswerId.value) > index) {
      // If we removed an answer before the correct one, adjust the correct answer index
      const newCorrectIndex = parseInt(this.form.controls.correctAnswerId.value) - 1;
      this.form.controls.correctAnswerId.setValue(newCorrectIndex.toString());
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    if (this.data.mode === 'create') {
      const newQuestion = {
        question: formValue.question,
        answers: formValue.answers.map(answer => ({
          text: answer.text,
          correct: answer.correct
        }))
      };
      this.dialogRef.close({newQuestion});
    } else {
      const updatedQuestion: Question = {
        ...this.data.question!,
        question: formValue.question,
        answers: formValue.answers.map(answer => ({
          id: answer.id,
          text: answer.text,
          correct: answer.correct
        }))
      };
      this.dialogRef.close({
        question: updatedQuestion,
        correctAnswerId: formValue.correctAnswerId
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private initializeForm(): void {
    if (this.data.mode === 'edit' && this.data.question) {
      this.initializeEditForm();
    } else {
      this.initializeCreateForm();
    }

    this.form.controls.correctAnswerId.valueChanges.subscribe(correctId => {
      this.updateCorrectAnswer(correctId);
    });
  }

  private initializeEditForm(): void {
    const correctAnswerId = this.data.question!.answers.find(a => a.correct)?.id || '';

    this.form = this.fb.group({
      question: this.fb.control(this.data.question!.question, {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true
      }),
      correctAnswerId: this.fb.control(correctAnswerId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      answers: this.fb.array(
        this.data.question!.answers.map(answer =>
          this.fb.group({
            id: this.fb.control(answer.id, {nonNullable: true}),
            text: this.fb.control(answer.text, {
              validators: [Validators.required, Validators.minLength(1)],
              nonNullable: true
            }),
            correct: this.fb.control(answer.correct || false, {nonNullable: true})
          })
        )
      )
    });
  }

  private initializeCreateForm(): void {
    this.form = this.fb.group({
      question: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true
      }),
      correctAnswerId: this.fb.control('0', {
        validators: [Validators.required],
        nonNullable: true
      }),
      answers: this.fb.array([
        this.createAnswerFormGroup('', true),  // First answer is correct by default
        this.createAnswerFormGroup('', false)
      ])
    });
  }

  private createAnswerFormGroup(text: string = '', correct: boolean = false): AnswerFormGroup {
    return this.fb.group({
      id: this.fb.control(`temp_${Date.now()}`, {nonNullable: true}),
      text: this.fb.control(text, {
        validators: [Validators.required, Validators.minLength(1)],
        nonNullable: true
      }),
      correct: this.fb.control(correct, {nonNullable: true})
    });
  }

  private updateCorrectAnswer(correctId: string): void {
    if (this.data.mode === 'edit') {
      this.answers.controls.forEach(control => {
        const answerId = control.controls.id.value;
        control.controls.correct.setValue(answerId === correctId, {emitEvent: false});
      });
    } else {
      // For create mode, correctId is an index
      const correctIndex = parseInt(correctId);
      this.answers.controls.forEach((control, index) => {
        control.controls.correct.setValue(index === correctIndex, {emitEvent: false});
      });
    }
  }
}
