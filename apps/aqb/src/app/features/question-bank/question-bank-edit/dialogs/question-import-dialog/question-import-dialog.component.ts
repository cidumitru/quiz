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
import { ParsedQuestion, CreateQuestionRequest } from '@aqb/data-access';
import { firstValueFrom } from 'rxjs';
import {QuestionBankApiService} from "@aqb/data-access/angular";

export interface QuestionImportDialogData {
  questionBankId: string;
  questionBankName: string;
}

export interface QuestionImportResult {
  success: boolean;
  questionsAdded: number;
  importSummary: string;
}

interface FileProcessResult {
  file: File;
  questions: CreateQuestionRequest[];
  error?: string;
}

interface ImportState {
  isImporting: boolean;
  dragOver: boolean;
  selectedFiles: File[];
  processedFiles: FileProcessResult[];
  combinedPreviewData: {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
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
  private readonly questionBankApiService = inject(QuestionBankApiService);
  private readonly dialogRef = inject(MatDialogRef<QuestionImportDialogComponent, QuestionImportResult>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly importService = inject(QuestionBankImportService);
  protected readonly data = inject<QuestionImportDialogData>(MAT_DIALOG_DATA);

  protected readonly state = signal<ImportState>({
    isImporting: false,
    dragOver: false,
    selectedFiles: [],
    processedFiles: [],
    combinedPreviewData: null,
    error: null,
  });

  protected readonly canImport = computed(() => {
    const currentState = this.state();
    return currentState.combinedPreviewData && 
           currentState.combinedPreviewData.validQuestions > 0 && 
           !currentState.isImporting;
  });

  protected readonly hasValidData = computed(() => {
    const currentState = this.state();
    return currentState.combinedPreviewData && currentState.combinedPreviewData.validQuestions > 0;
  });

  protected readonly hasSelectedFiles = computed(() => {
    const currentState = this.state();
    return currentState.selectedFiles.length > 0;
  });

  protected getAllValidQuestions(): CreateQuestionRequest[] {
    return this.state().processedFiles
      .filter(f => !f.error && f.questions.length > 0)
      .flatMap(f => f.questions);
  }

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
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
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
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
  }

  protected async processFiles(files: File[]): Promise<void> {
    // Filter only JSON files
    const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      this.state.update(state => ({
        ...state,
        error: 'Please select only JSON files',
        selectedFiles: [],
        processedFiles: [],
        combinedPreviewData: null,
      }));
      return;
    }

    if (jsonFiles.length !== files.length) {
      this.snackBar.open(`${files.length - jsonFiles.length} non-JSON files were ignored`, 'Close', {
        duration: 3000,
        panelClass: 'warning-snackbar',
      });
    }

    this.state.update(state => ({
      ...state,
      selectedFiles: jsonFiles,
      error: null,
      isImporting: true,
      processedFiles: [],
      combinedPreviewData: null,
    }));

    try {
      const processedFiles: FileProcessResult[] = [];
      
      for (const file of jsonFiles) {
        try {
          const fileContent = await this.readFile(file);
          const { questions } = await this.importService.importQuestionsToBank(
            fileContent,
            this.data.questionBankId
          );
          
          processedFiles.push({
            file,
            questions,
          });
        } catch (error) {
          processedFiles.push({
            file,
            questions: [],
            error: error instanceof Error ? error.message : 'Processing failed',
          });
        }
      }

      // Calculate combined statistics
      const validFiles = processedFiles.filter(f => !f.error).length;
      const invalidFiles = processedFiles.filter(f => f.error).length;
      const totalQuestions = processedFiles.reduce((sum, f) => sum + f.questions.length, 0);

      this.state.update(state => ({
        ...state,
        processedFiles,
        combinedPreviewData: {
          totalQuestions,
          validQuestions: totalQuestions,
          invalidQuestions: 0,
          totalFiles: jsonFiles.length,
          validFiles,
          invalidFiles,
        },
        error: null,
        isImporting: false,
      }));

      if (invalidFiles > 0) {
        const errorMessages = processedFiles
          .filter(f => f.error)
          .map(f => `${f.file.name}: ${f.error}`)
          .join('; ');
        
        this.snackBar.open(`${invalidFiles} files had errors: ${errorMessages}`, 'Close', {
          duration: 8000,
          panelClass: 'warning-snackbar',
        });
      }

    } catch (error) {
      this.state.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'An error occurred while processing files',
        processedFiles: [],
        combinedPreviewData: null,
        isImporting: false,
      }));
    }
  }

  protected async confirmImport(): Promise<void> {
    const currentState = this.state();
    if (!currentState.combinedPreviewData || currentState.combinedPreviewData.validQuestions === 0) {
      return;
    }

    this.state.update(state => ({ ...state, isImporting: true }));

    try {
      // Combine all questions from valid files
      const allQuestions = currentState.processedFiles
        .filter(f => !f.error && f.questions.length > 0)
        .flatMap(f => f.questions);

      if (allQuestions.length === 0) {
        throw new Error('No valid questions found in any file');
      }

      // Create the API call with all questions
      // TODO: move the api call
      const apiCall = this.questionBankApiService.addQuestion(this.data.questionBankId, {
        questions: allQuestions,
      });

      const response = await firstValueFrom(apiCall);
      
      let importMessage = `Successfully imported ${response.questionsAdded} questions from ${currentState.combinedPreviewData.validFiles} files to ${this.data.questionBankName}`;
      if (response.duplicatesSkipped) {
        importMessage += ` (${response.duplicatesSkipped} duplicates skipped)`;
      }
      
      const result: QuestionImportResult = {
        success: response.success,
        questionsAdded: response.questionsAdded,
        importSummary: importMessage,
      };

      this.snackBar.open(result.importSummary, 'Close', {
        duration: 4000,
        panelClass: 'success-snackbar',
      });

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

  protected clearFiles(): void {
    this.state.update(state => ({
      ...state,
      selectedFiles: [],
      processedFiles: [],
      combinedPreviewData: null,
      error: null,
    }));
  }

  protected removeFile(fileToRemove: File): void {
    this.state.update(state => {
      const updatedFiles = state.selectedFiles.filter(f => f !== fileToRemove);
      const updatedProcessed = state.processedFiles.filter(f => f.file !== fileToRemove);
      
      if (updatedFiles.length === 0) {
        return {
          ...state,
          selectedFiles: [],
          processedFiles: [],
          combinedPreviewData: null,
          error: null,
        };
      }

      // Recalculate combined statistics
      const validFiles = updatedProcessed.filter(f => !f.error).length;
      const invalidFiles = updatedProcessed.filter(f => f.error).length;
      const totalQuestions = updatedProcessed.reduce((sum, f) => sum + f.questions.length, 0);

      return {
        ...state,
        selectedFiles: updatedFiles,
        processedFiles: updatedProcessed,
        combinedPreviewData: {
          totalQuestions,
          validQuestions: totalQuestions,
          invalidQuestions: 0,
          totalFiles: updatedFiles.length,
          validFiles,
          invalidFiles,
        },
      };
    });
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