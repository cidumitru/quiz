import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionBankService } from '../question-bank.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  QuestionEditDialogComponent,
  QuestionEditDialogData,
} from './question-list-edit/dialogs/question-edit-dialog/question-edit-dialog.component';
import { QuestionBankComponentState } from './question-bank-store.service';
import { Question } from '@aqb/data-access';
import { QuestionListComponent } from './question-list-edit/question-list/question-list.component';

@Component({
  selector: 'app-question-bank-edit',
  templateUrl: './question-bank-edit.component.html',
  styleUrls: ['./question-bank-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    QuestionListComponent,
  ],
  providers: [QuestionBankComponentState],
})
export class QuestionBankEditComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  public id: string = this.activatedRoute.snapshot.paramMap.get('id') ?? '';
  private questionBank = inject(QuestionBankService);
  public store = inject(QuestionBankComponentState);
  public questionBankName = computed(() => this.store.questionBank()?.name);
  private dialog = inject(MatDialog);

  async ngOnInit(): Promise<void> {
    // Initialize the store with the question bank ID
    try {
      await this.store.initialize(this.id);
      // Load initial questions after store is initialized
      await this.store.loadQuestionsRange(0, 20);
    } catch (error) {
      console.error('Failed to initialize question bank:', error);
    }
  }

  openEditDialog(): void {
    const dialogRef = this.dialog.open(EditBankNameDialogComponent, {
      data: { name: this.store.questionBank()?.name },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        // Use the store to update the name so it's reflected everywhere
        try {
          await this.store.updateQuestionBankName(result);
        } catch (error) {
          console.error('Failed to update question bank name:', error);
        }
      }
    });
  }

  createQuestion(): void {
    const dialogData: QuestionEditDialogData = {
      questionBankId: this.id,
      mode: 'create',
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.newQuestion) {
        // Add the question to the store
        try {
          await this.store.createQuestion(result.newQuestion);
        } catch (error) {
          console.error('Failed to create question:', error);
        }
      }
    });
  }
  
  onEditQuestion(question: Question): void {
    const dialogData: QuestionEditDialogData = {
      question,
      questionBankId: this.id,
      mode: 'edit',
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.question) {
        // Update the question with the full question data
        try {
          await this.store.updateQuestion(result.question.id, result.question);
        } catch (error) {
          console.error('Failed to update question:', error);
        }
      }
    });
  }

  async onDeleteQuestion(question: Question): Promise<void> {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await this.store.deleteQuestion(question.id);
      } catch (error) {
        console.error('Failed to delete question:', error);
      }
    }
  }
}

@Component({
  selector: 'app-edit-bank-name-dialog',
  template: `
    <h2 mat-dialog-title>Edit Question Bank Name</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Question Bank Name</mat-label>
        <input matInput [(ngModel)]="data.name" required />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [mat-dialog-close]="data.name"
        [disabled]="!data.name"
      >
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `,
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class EditBankNameDialogComponent {
  public data = inject<{ name: string }>(MAT_DIALOG_DATA);
}
