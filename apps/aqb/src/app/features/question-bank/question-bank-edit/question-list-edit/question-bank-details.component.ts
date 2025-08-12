import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Question} from '@aqb/data-access';
import {QuestionListComponent} from './question-list/question-list.component';
import {
  QuestionEditDialogComponent,
  QuestionEditDialogData
} from './dialogs/question-edit-dialog/question-edit-dialog.component';
import {ListRange} from '@angular/cdk/collections';
import {QuestionBankStore} from './question-bank-store.service';

@Component({
  selector: 'app-question-bank-details',
  templateUrl: './question-bank-details.component.html',
  styleUrls: ['./question-bank-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    QuestionListComponent
  ],
  providers: [QuestionBankStore],
  standalone: true
})
export class QuestionBankDetailsComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  public readonly id: string = this.activatedRoute.parent?.snapshot.paramMap.get('id')!;
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(QuestionBankStore);
  // Expose store selectors
  public readonly questionBank = this.store.questionBank;
  public readonly questionsArray = this.store.questions;
  public readonly totalCount = this.store.totalItems;
  public readonly isLoading = this.store.isLoading;

  ngOnInit(): void {
    this.store.initialize(this.id);
  }

  onRangeChanged(range: ListRange): void {
    console.log('QuestionBankDetailsComponent: Range changed:', range);
    this.store.onRangeChanged(range.start, range.end);
  }

  isQuestionLoading(index: number): boolean {
    return this.store.isQuestionLoading(index);
  }


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
      if (result?.question && result?.correctAnswerId) {
        this.store.updateQuestion(result.question.id, result.correctAnswerId);
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
        this.store.createQuestion(result.newQuestion);
      }
    });
  }

  onDeleteQuestion(question: Question): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.store.deleteQuestion(question.id);
    }
  }

}
