import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Observable} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {QuestionBankService} from '../../question-bank.service';
import {Question, QuestionBankDetail} from '@aqb/data-access';
import {QuestionListComponent} from './question-list/question-list.component';
import {
  QuestionEditDialogComponent,
  QuestionEditDialogData
} from './dialogs/question-edit-dialog/question-edit-dialog.component';

@Component({
  selector: 'app-question-bank-details',
  templateUrl: './question-bank-details.component.html',
  styleUrls: ['./question-bank-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    QuestionListComponent
  ],
  standalone: true
})
export class QuestionBankDetailsComponent {
  private activatedRoute = inject(ActivatedRoute);
  public id: string = this.activatedRoute.parent?.snapshot.paramMap.get('id')!;
  private questionBankService = inject(QuestionBankService);
  public questionBank$: Observable<QuestionBankDetail> = this.questionBankService.getQuestionBank(this.id);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  onEditQuestion(question: Question): void {
    const dialogData: QuestionEditDialogData = {
      question,
      questionBankId: this.id,
      mode: 'edit'
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.question) {
        this.updateQuestion(result.question, result.correctAnswerId);
      }
    });
  }

  onCreateQuestion(): void {
    const dialogData: QuestionEditDialogData = {
      questionBankId: this.id,
      mode: 'create'
    };

    const dialogRef = this.dialog.open(QuestionEditDialogComponent, {
      data: dialogData,
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.newQuestion) {
        this.createQuestion(result.newQuestion);
      }
    });
  }

  onDeleteQuestion(question: Question): void {
    this.deleteQuestion(question);
  }

  private async updateQuestion(question: Question, correctAnswerId: string): Promise<void> {
    try {
      // TODO: Backend doesn't support full question update yet
      // For now, we can only update the correct answer
      // Full question text and answers update would need backend API support
      await this.questionBankService.setCorrectAnswer(this.id, question.id, correctAnswerId);
      this.snackBar.open('Correct answer updated successfully', 'Close', {duration: 3000});
    } catch (error) {
      console.error('Failed to update question:', error);
      this.snackBar.open('Failed to update question', 'Close', {duration: 5000});
    }
  }

  private async createQuestion(question: any): Promise<void> {
    try {
      await this.questionBankService.addQuestion(this.id, question);
      this.snackBar.open('Question created successfully', 'Close', {duration: 3000});
    } catch (error) {
      console.error('Failed to create question:', error);
      this.snackBar.open('Failed to create question', 'Close', {duration: 5000});
    }
  }

  private async deleteQuestion(question: Question): Promise<void> {
    try {
      await this.questionBankService.deleteQuestion(this.id, question.id);
      this.snackBar.open('Question deleted successfully', 'Close', {duration: 3000});
    } catch (error) {
      console.error('Failed to delete question:', error);
      this.snackBar.open('Failed to delete question', 'Close', {duration: 5000});
    }
  }
}
