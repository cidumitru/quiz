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
import {answerScheme, questionBankScheme, questionScheme} from "./question-bank.models";
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
  public questionBank = inject(QuestionBankService);
  public questionBanks: Signal<QuestionBankViewModel[]> = computed(() => this.questionBank.questionBankArr().map(qb => new QuestionBankViewModel(qb)))
  public quiz = inject(QuizService);
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.questionBank.init();
  }

  newQuestionBank(): void {
    const newQuizId = this.questionBank.create();
    this.router.navigate([newQuizId]).then()
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
        const obj = JSON.parse(content ?? "");

        // Validate and clean the question bank data
        const cleanedData = await this.validateAndCleanQuestionBank(obj);

        if (cleanedData) {
          await this.questionBank.insertQuestionBank(cleanedData.questionBank);

          // Show detailed import results
          const message = cleanedData.invalidCount > 0
            ? `Imported "${cleanedData.questionBank.name}" with ${cleanedData.validCount} questions (${cleanedData.invalidCount} invalid questions skipped)`
            : `Successfully imported "${cleanedData.questionBank.name}" with ${cleanedData.validCount} questions`;

          this.snackbar.open(message, "Close", {duration: 5000});
          this.cdr.detectChanges();
        } else {
          this.snackbar.open("Invalid file format - unable to import", "Close", {duration: 5000});
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

  async practiceQuiz(questionBankId: string, quizSize: number = 25, questionPrioritySelection?: MatListOption[]): Promise<void> {
    if (isNaN(quizSize)) return;

    const newQuiz = await this.quiz.startQuiz({
      questionsCount: quizSize,
      questionBankId: questionBankId,
      mode: first(questionPrioritySelection)?.value?.value ?? QuizMode.All
    });

    await this.router.navigate(['quizzes', 'practice', newQuiz.id]);
  }

  private async validateAndCleanQuestionBank(obj: any): Promise<{
    questionBank: any;
    validCount: number;
    invalidCount: number;
  } | null> {
    try {
      // First validate the basic question bank structure without questions
      const basicBankStructure = {
        id: obj.id,
        createdAt: obj.createdAt,
        editedAt: obj.editedAt,
        name: obj.name,
        isDeleted: obj.isDeleted,
        questions: [] // We'll validate questions separately
      };

      // Validate basic structure
      const basicValidation = await questionBankScheme.safeParseAsync(basicBankStructure);
      if (!basicValidation.success) {
        console.error('Invalid question bank structure:', basicValidation.error);
        return null;
      }

      // Now validate each question individually and filter out invalid ones
      const validQuestions: any[] = [];
      const originalQuestions = Array.isArray(obj.questions) ? obj.questions : [];

      for (const question of originalQuestions) {
        try {
          // Skip questions with empty or whitespace-only text
          if (!question.question || typeof question.question !== 'string' || question.question.trim() === '') {
            continue;
          }

          // Validate each answer in the question
          const validAnswers: any[] = [];
          const originalAnswers = Array.isArray(question.answers) ? question.answers : [];

          for (const answer of originalAnswers) {
            // Skip answers with empty or whitespace-only text
            if (!answer.text || typeof answer.text !== 'string' || answer.text.trim() === '') {
              continue;
            }

            const answerValidation = await answerScheme.safeParseAsync(answer);
            if (answerValidation.success) {
              validAnswers.push(answerValidation.data);
            }
          }

          // Only include question if it has at least one valid answer
          if (validAnswers.length > 0) {
            const questionToValidate = {
              ...question,
              answers: validAnswers
            };

            const questionValidation = await questionScheme.safeParseAsync(questionToValidate);
            if (questionValidation.success) {
              validQuestions.push(questionValidation.data);
            }
          }
        } catch (error) {
          // Skip invalid questions
          console.warn('Skipping invalid question:', question, error);
        }
      }

      // Create the cleaned question bank
      const cleanedQuestionBank = {
        ...basicValidation.data,
        questions: validQuestions
      };

      return {
        questionBank: cleanedQuestionBank,
        validCount: validQuestions.length,
        invalidCount: originalQuestions.length - validQuestions.length
      };

    } catch (error) {
      console.error('Error validating question bank:', error);
      return null;
    }
  }
}

