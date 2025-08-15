import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuestionBankImportService } from '../../../../../core/services/question-bank-import.service';
import { ParsedQuestion } from '@aqb/data-access';

export interface QuestionImportDialogData {
  questionBankId: string;
  questionBankName: string;
}

export interface QuestionImportResult {
  success: boolean;
  questions: ParsedQuestion[];
  importSummary: string;
}

interface ImportState {
  isImporting: boolean;
  dragOver: boolean;
  selectedFile: File | null;
  previewData: {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    questions: ParsedQuestion[];
  } | null;
  error: string | null;
}

@Component({
  selector: 'app-question-import-dialog',
  templateUrl: './question-import-dialog.component.html',
  styleUrl: './question-import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
})
export class QuestionImportDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuestionImportDialogComponent, QuestionImportResult>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly importService = inject(QuestionBankImportService);
  protected readonly data = inject<QuestionImportDialogData>(MAT_DIALOG_DATA);

  protected readonly state = signal<ImportState>({
    isImporting: false,
    dragOver: false,
    selectedFile: null,
    previewData: null,
    error: null,
  });

  protected readonly canImport = computed(() => {
    const currentState = this.state();
    return currentState.previewData && 
           currentState.previewData.validQuestions > 0 && 
           !currentState.isImporting;
  });

  protected readonly hasValidData = computed(() => {
    const currentState = this.state();
    return currentState.previewData && currentState.previewData.validQuestions > 0;
  });

  protected readonly exampleJson = `{
  "questions": [
    {
      "question": "What is the capital of France?",
      "answers": [
        { "text": "Paris", "correct": true },
        { "text": "London", "correct": false },
        { "text": "Madrid", "correct": false }
      ]
    }
  ]
}`;

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.state.update(state => ({ ...state, dragOver: true }));
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.state.update(state => ({ ...state, dragOver: false }));
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.state.update(state => ({ ...state, dragOver: false }));

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.processFile(files[0]);
    }
  }

  protected async processFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.state.update(state => ({
        ...state,
        error: 'Please select a valid JSON file',
        selectedFile: null,
        previewData: null,
      }));
      return;
    }

    this.state.update(state => ({
      ...state,
      selectedFile: file,
      error: null,
      isImporting: true,
    }));

    try {
      const fileContent = await this.readFile(file);
      const result = await this.importService.importFromFile(fileContent);

      if (result.success && result.questionBank) {
        this.state.update(state => ({
          ...state,
          previewData: {
            totalQuestions: result.statistics.totalQuestions,
            validQuestions: result.statistics.validQuestions,
            invalidQuestions: result.statistics.invalidQuestions,
            questions: result.questionBank?.questions ?? [],
          },
          error: null,
          isImporting: false,
        }));

        if (result.warnings.length > 0) {
          this.snackBar.open(result.warnings.join('; '), 'Close', {
            duration: 5000,
            panelClass: 'warning-snackbar',
          });
        }
      } else {
        this.state.update(state => ({
          ...state,
          error: result.errors.join('; ') || 'Failed to parse the file',
          previewData: null,
          isImporting: false,
        }));
      }
    } catch (error) {
      this.state.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'An error occurred while processing the file',
        previewData: null,
        isImporting: false,
      }));
    }
  }

  protected async confirmImport(): Promise<void> {
    const currentState = this.state();
    if (!currentState.previewData || currentState.previewData.validQuestions === 0) {
      return;
    }

    this.state.update(state => ({ ...state, isImporting: true }));

    try {
      const result: QuestionImportResult = {
        success: true,
        questions: currentState.previewData.questions,
        importSummary: `Successfully prepared ${currentState.previewData.validQuestions} questions for import`,
      };

      this.dialogRef.close(result);
    } catch (error) {
      this.state.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Import failed',
        isImporting: false,
      }));
    }
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected clearFile(): void {
    this.state.update(state => ({
      ...state,
      selectedFile: null,
      previewData: null,
      error: null,
    }));
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}