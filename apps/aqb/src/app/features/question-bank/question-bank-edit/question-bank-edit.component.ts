import {ChangeDetectionStrategy, Component, computed, inject, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink, RouterOutlet} from "@angular/router";
import {QuestionBankService} from "../question-bank.service";
import {CommonModule} from "@angular/common";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {FormsModule} from "@angular/forms";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from "@angular/material/dialog";
import {
  QuestionEditDialogComponent,
  QuestionEditDialogData
} from "./question-list-edit/dialogs/question-edit-dialog/question-edit-dialog.component";
import {QuestionBankStore} from "./question-bank-store.service";

@Component({
  selector: 'app-question-bank-edit',
  templateUrl: './question-bank-edit.component.html',
  styleUrls: ['./question-bank-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  providers: [QuestionBankStore]
})
export class QuestionBankEditComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  public id: string = this.activatedRoute.snapshot.paramMap.get("id") ?? '';
  private questionBank = inject(QuestionBankService);
  public store = inject(QuestionBankStore);
  public questionBankName = computed(() => this.store.questionBank()?.name)
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    // Initialize the store with the question bank ID
    this.store.initialize(this.id);
  }

  openEditDialog(): void {
    const dialogRef = this.dialog.open(EditBankNameDialogComponent, {
      data: {name: this.store.questionBank()?.name},
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Use the store to update the name so it's reflected everywhere
        this.store.updateQuestionBankName(result);
      }
    });
  }

  createQuestion(): void {
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
        // Add the question to the store
        this.store.createQuestion(result.newQuestion);
      }
    });
  }

}

@Component({
  selector: 'app-edit-bank-name-dialog',
  template: `
    <h2 mat-dialog-title>Edit Question Bank Name</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Question Bank Name</mat-label>
        <input matInput [(ngModel)]="data.name" required>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="data.name" [disabled]="!data.name">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class EditBankNameDialogComponent {
  public data = inject<{ name: string }>(MAT_DIALOG_DATA);
}
