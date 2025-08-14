import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
  ViewChild
} from '@angular/core';
import {QuestionBankService} from "./question-bank.service";
import {Router, RouterModule} from "@angular/router";
import exportFromJSON from "export-from-json";
import {first} from "lodash";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTableModule} from "@angular/material/table";
import {MatCardModule} from "@angular/material/card";
import {MatRadioModule} from "@angular/material/radio";
import {CommonModule} from "@angular/common";
import {MatTooltipModule} from "@angular/material/tooltip";
import {QuizMode, QuizService} from "../quiz/quiz.service";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatInputModule} from "@angular/material/input";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatMenuModule} from "@angular/material/menu";
import {QuestionBankViewModel} from "./question-bank-view.model";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatListModule, MatListOption} from "@angular/material/list";
import {MatSelectModule} from "@angular/material/select";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {firstValueFrom} from "rxjs";
import {QuestionBankImportService} from "../../core/services/question-bank-import.service";

@Component({
  selector: 'app-quiz-list',
  templateUrl: './question-bank-list.component.html',
  styleUrls: ['./question-bank-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
    FormsModule,
    MatListModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ]
})
export class QuestionBankListComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild("questionBankPaginator") questionBankPaginator!: MatPaginator;
  public questionBankFilter = new FormControl("");
  public questionPriorityOptions = [
    {name: 'All', value: QuizMode.All},
    {name: 'Mistakes', value: QuizMode.Mistakes},
    {name: 'Discovery', value: QuizMode.Discovery},
  ]

  public isImporting = signal<boolean>(false);
  public loadingQuizId: string | null = null;
  public questionBank = inject(QuestionBankService);
  public questionBanks: Signal<QuestionBankViewModel[]> = computed(() => this.questionBank.questionBankArr().map(qb => new QuestionBankViewModel(qb)))
  public quiz = inject(QuizService);
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private importService = inject(QuestionBankImportService);

  ngOnInit(): void {
    this.questionBank.reload();
  }

  async newQuestionBank(): Promise<void> {
    try {
      const newQuizId = await this.questionBank.create();
      await this.router.navigate(['banks', newQuizId]);
    } catch (error) {
      console.error('Failed to create question bank:', error);
    }
  }

  deleteQuiz(id: string): void {
    const result = confirm(`Are you sure?`);
    if (result.valueOf()) this.questionBank.delete(id);
  }

  async downloadQuestionBank(id: string): Promise<void> {
    const targetQuestionBank = await firstValueFrom(this.questionBank.getQuestionBank(id))

    return exportFromJSON({
      data: targetQuestionBank,
      fileName: `${targetQuestionBank.name} - ${targetQuestionBank.questions.length} Questions`,
      exportType: "json"
    });
  }

  async uploadQuestionBank(): Promise<void> {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = ".json";
    input.multiple = false;

    input.onchange = async () => {
      const files: File[] = Array.from(input.files ?? []);
      const file = first(files);

      if (!file) return;

      this.isImporting.set(true);

      try {
        const content = await file.text();

        // Use the import service to validate and process the file
        const importResult = await this.importService.importFromFile(content);

        if (importResult.success && importResult.questionBank) {
          // Insert the validated question bank
          await this.questionBank.insertQuestionBank(importResult.questionBank);

          // Show detailed import results using the service's summary
          const message = this.importService.getImportSummary(importResult);
          this.snackbar.open(message, "Close", {duration: 5000});

          // Show warnings if any
          if (importResult.warnings.length > 0) {
            console.warn('Import warnings:', importResult.warnings);
          }

          this.cdr.detectChanges();
        } else {
          // Show error messages
          const errorMessage = importResult.errors.length > 0
            ? importResult.errors[0]
            : "Invalid file format - unable to import";

          this.snackbar.open(errorMessage, "Close", {duration: 5000});

          // Log detailed errors for debugging
          if (importResult.errors.length > 0) {
            console.error('Import errors:', importResult.errors);
          }
        }
      } catch (error) {
        console.error('Failed to upload question bank:', error);
        this.snackbar.open("Failed to import file. Please check the file format.", "Close", {duration: 5000});
      } finally {
        this.isImporting.set(false);
      }

      input.remove();
    };

    input.click();
  }

  async practiceQuizDefault(questionBankId: string): Promise<void> {
    await this.practiceQuiz(questionBankId);
  }

  async practiceQuiz(questionBankId: string, quizSize = 25, questionPrioritySelection?: MatListOption[]): Promise<void> {
    if (isNaN(quizSize)) return;

    // Set loading state if not already set (for menu items)
    if (this.loadingQuizId !== questionBankId) {
      this.loadingQuizId = questionBankId;
      this.cdr.detectChanges();
    }

    try {
      const newQuiz = await this.quiz.startQuiz({
        questionsCount: quizSize,
        questionBankId: questionBankId,
        mode: first(questionPrioritySelection)?.value?.value ?? QuizMode.All
      });

      await this.router.navigate(['quizzes', 'practice', newQuiz.id]);
    } finally {
      // Reset loading state after a short delay for menu items
      setTimeout(() => {
        if (this.loadingQuizId === questionBankId) {
          this.loadingQuizId = null;
          this.cdr.detectChanges();
        }
      }, 500);
    }
  }
}

