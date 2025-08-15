import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { QuizStatsDialogComponent } from './quiz-stats-dialog.component';
import { QuizResult } from '../../../core/services/positive-metrics.service';

@Component({
  selector: 'app-quiz-stats-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="p-6 space-y-4">
      <h2 class="text-2xl font-bold mb-4">Quiz Stats Dialog Test</h2>
      <p class="text-gray-600 mb-6">Test the positive metrics system with various performance scenarios:</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (scenario of testScenarios; track scenario.name) {
          <button 
            mat-raised-button 
            color="primary"
            class="p-4 text-left h-auto"
            (click)="testScenario(scenario.result)">
            <div class="font-semibold">{{ scenario.name }}</div>
            <div class="text-sm opacity-80 mt-1">{{ scenario.description }}</div>
          </button>
        }
      </div>
    </div>
  `
})
export class QuizStatsTestComponent {
  private dialog = inject(MatDialog);

  protected testScenarios = [
    {
      name: 'Perfect Score',
      description: '100% accuracy, first quiz',
      result: {
        correctCount: 10,
        totalQuestions: 10,
        timeTaken: 300,
        accuracyPercentage: 100,
        currentStreak: 1,
        totalQuizzesCompleted: 1,
        questionsAnsweredToday: 10,
        previousBestScore: undefined
      } as QuizResult
    },
    {
      name: 'Complete Failure',
      description: '0% accuracy, first quiz',
      result: {
        correctCount: 0,
        totalQuestions: 10,
        timeTaken: 600,
        accuracyPercentage: 0,
        currentStreak: 0,
        totalQuizzesCompleted: 1,
        questionsAnsweredToday: 10,
        previousBestScore: undefined
      } as QuizResult
    },
    {
      name: 'Slight Improvement',
      description: '45% accuracy, improved from 40%',
      result: {
        correctCount: 9,
        totalQuestions: 20,
        timeTaken: 900,
        accuracyPercentage: 45,
        currentStreak: 2,
        totalQuizzesCompleted: 5,
        questionsAnsweredToday: 40,
        previousBestScore: 40
      } as QuizResult
    },
    {
      name: 'Hot Streak',
      description: '75% accuracy, 8th consecutive quiz',
      result: {
        correctCount: 15,
        totalQuestions: 20,
        timeTaken: 600,
        accuracyPercentage: 75,
        currentStreak: 8,
        totalQuizzesCompleted: 12,
        questionsAnsweredToday: 60,
        previousBestScore: 70
      } as QuizResult
    },
    {
      name: 'Milestone Achievement',
      description: '85% accuracy, 10th quiz completed',
      result: {
        correctCount: 17,
        totalQuestions: 20,
        timeTaken: 480,
        accuracyPercentage: 85,
        currentStreak: 3,
        totalQuizzesCompleted: 10,
        questionsAnsweredToday: 80,
        previousBestScore: 80
      } as QuizResult
    },
    {
      name: 'Study Machine',
      description: '60% accuracy, 100 questions today',
      result: {
        correctCount: 12,
        totalQuestions: 20,
        timeTaken: 720,
        accuracyPercentage: 60,
        currentStreak: 1,
        totalQuizzesCompleted: 7,
        questionsAnsweredToday: 100,
        previousBestScore: 55
      } as QuizResult
    },
    {
      name: 'Single Correct',
      description: '5% accuracy, but got one right',
      result: {
        correctCount: 1,
        totalQuestions: 20,
        timeTaken: 900,
        accuracyPercentage: 5,
        currentStreak: 0,
        totalQuizzesCompleted: 3,
        questionsAnsweredToday: 30,
        previousBestScore: 10
      } as QuizResult
    },
    {
      name: 'Speed Demon',
      description: '50% accuracy, very fast completion',
      result: {
        correctCount: 5,
        totalQuestions: 10,
        timeTaken: 120,
        accuracyPercentage: 50,
        currentStreak: 1,
        totalQuizzesCompleted: 4,
        questionsAnsweredToday: 25,
        previousBestScore: 45
      } as QuizResult
    }
  ];

  testScenario(result: QuizResult): void {
    this.dialog.open(QuizStatsDialogComponent, {
      data: { quizResult: result },
      width: '90vw',
      maxWidth: '500px',
      disableClose: false,
      panelClass: 'quiz-stats-dialog-panel'
    });
  }
}