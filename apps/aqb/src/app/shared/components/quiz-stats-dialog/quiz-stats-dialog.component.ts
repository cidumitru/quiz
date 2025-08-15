import { Component, computed, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PositiveMetricsService, QuizResult } from '../../../core/services/positive-metrics.service';
import { ConfettiService } from '../../../core/services/confetti.service';
import {QuizMode, QuizService} from '../../../features/quiz/quiz.service';

@Component({
  selector: 'app-quiz-stats-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="p-8 text-center max-w-sm mx-auto">
      <!-- Big Celebration Emoji -->
      <div class="text-8xl mb-6 celebration-icon">{{ getEmoji() }}</div>
      
      <!-- Main Achievement -->
      <h2 class="text-2xl font-bold mb-4" [ngStyle]="getTextStyle()">
        {{ primaryMetric().title }}
      </h2>
      
      <!-- Single Score Display -->
      <div class="text-4xl font-black mb-6" [ngStyle]="getScoreStyle()">
        {{ data.quizResult.correctCount }} / {{ data.quizResult.totalQuestions }}
        <span class="text-2xl opacity-75 ml-2">({{ data.quizResult.accuracyPercentage }}%)</span>
      </div>
      
      <!-- Encouraging Message -->
      <p class="text-base mb-8 opacity-90 font-medium">{{ encouragingMessage() }}</p>
      
      <!-- Actions -->
      <div class="flex gap-3 justify-center">
        <button mat-button (click)="onClose()">
          Done
        </button>
        <button mat-raised-button color="primary" (click)="onTryAgain()">
          Try Again
        </button>
      </div>
    </div>
  `,
  styleUrl: './quiz-stats-dialog.component.scss'
})
export class QuizStatsDialogComponent implements OnInit {
  // Services
  private positiveMetrics = inject(PositiveMetricsService);
  private confettiService = inject(ConfettiService);
  private dialogRef = inject(MatDialogRef<QuizStatsDialogComponent>);
  private router = inject(Router);
  private quizService = inject(QuizService);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { quizResult: QuizResult; questionBankId?: string }) {}

  // Computed properties
  protected readonly primaryMetric = computed(() => 
    this.positiveMetrics.findBestPositiveMetric(this.data.quizResult)
  );

  protected readonly encouragingMessage = computed(() =>
    this.positiveMetrics.getEncouragingMessage(this.data.quizResult.accuracyPercentage)
  );

  ngOnInit() {
    // Trigger celebration when dialog opens
    setTimeout(() => {
      this.celebrate();
    }, 100);
  }

  protected getEmoji(): string {
    const accuracy = this.data.quizResult.accuracyPercentage;
    
    if (accuracy >= 95) return '🏆';      // Trophy for perfect/near perfect
    if (accuracy >= 90) return '🌟';      // Star for excellent
    if (accuracy >= 80) return '🎉';      // Party for great
    if (accuracy >= 70) return '💪';      // Strong for good
    if (accuracy >= 50) return '📈';      // Chart for improving
    if (accuracy > 0) return '💡';       // Lightbulb for learning
    return '🌱';                          // Seedling for growth
  }

  protected getScoreStyle() {
    const accuracy = this.data.quizResult.accuracyPercentage;
    let color = '#66bb6a'; // Green default
    
    if (accuracy >= 95) color = '#ff6f00';      // Deep orange for perfect
    else if (accuracy >= 90) color = '#ffa726'; // Orange for excellent  
    else if (accuracy >= 80) color = '#42a5f5'; // Blue for great
    else if (accuracy >= 70) color = '#66bb6a'; // Green for good
    else if (accuracy >= 50) color = '#9e9e9e'; // Gray for okay
    
    return { color: color };
  }

  protected getTextStyle() {
    const accuracy = this.data.quizResult.accuracyPercentage;
    let color = '#333';
    
    if (accuracy >= 90) color = '#ff6f00';      // Orange for excellent+
    else if (accuracy >= 80) color = '#42a5f5'; // Blue for great
    else if (accuracy >= 70) color = '#66bb6a'; // Green for good
    
    return { color: color };
  }

  private celebrate(): void {
    const result = this.data.quizResult;
    const metric = this.primaryMetric();
    
    // Create spectacular celebrations for outstanding scores
    if (result.accuracyPercentage >= 95 || metric.celebrationLevel === 'amazing') {
      this.createSpectacularCelebration();
    } else if (result.accuracyPercentage >= 90) {
      this.createExcellentCelebration();
    } else if (result.accuracyPercentage >= 80) {
      this.createGoodCelebration();
    }
  }

  private createSpectacularCelebration(): void {
    // Perfect or near-perfect scores get the full treatment
    const goldColors = ['#FFD700', '#FFA500', '#FF8C00', '#FFFF00'];
    
    // Initial burst from center
    this.confettiService.customBurst({
      particleCount: 100,
      spread: 160,
      startVelocity: 45,
      colors: goldColors,
      origin: { x: 0.5, y: 0.6 }
    });

    // Left side burst
    setTimeout(() => {
      this.confettiService.customBurst({
        particleCount: 80,
        spread: 100,
        startVelocity: 35,
        colors: goldColors,
        origin: { x: 0.1, y: 0.8 }
      });
    }, 200);

    // Right side burst  
    setTimeout(() => {
      this.confettiService.customBurst({
        particleCount: 80,
        spread: 100,
        startVelocity: 35,
        colors: goldColors,
        origin: { x: 0.9, y: 0.8 }
      });
    }, 400);

    // Final shower from top
    setTimeout(() => {
      this.confettiService.customBurst({
        particleCount: 60,
        spread: 120,
        startVelocity: 30,
        colors: [...goldColors, '#FF69B4', '#00CED1'],
        origin: { x: 0.5, y: 0.1 }
      });
    }, 600);
  }

  private createExcellentCelebration(): void {
    // Great scores get a double burst
    const colors = ['#4ECDC4', '#45B7D1', '#96CEB4', '#00CED1', '#20B2AA'];
    
    this.confettiService.customBurst({
      particleCount: 75,
      spread: 120,
      startVelocity: 35,
      colors: colors,
      origin: { x: 0.5, y: 0.6 }
    });

    setTimeout(() => {
      this.confettiService.customBurst({
        particleCount: 50,
        spread: 80,
        startVelocity: 25,
        colors: colors,
        origin: { x: 0.5, y: 0.4 }
      });
    }, 300);
  }

  private createGoodCelebration(): void {
    // Good scores get a single impressive burst
    this.confettiService.customBurst({
      particleCount: 60,
      spread: 90,
      startVelocity: 30,
      colors: ['#66bb6a', '#4caf50', '#81c784', '#a5d6a7'],
      origin: { x: 0.5, y: 0.5 }
    });
  }

  protected async onTryAgain(): Promise<void> {
    if (this.data.questionBankId) {
      try {
        // Create a new quiz with the same question bank
        const newQuiz = await this.quizService.startQuiz({
          questionsCount: this.data.quizResult.totalQuestions,
          questionBankId: this.data.questionBankId,
          mode: QuizMode.All,
        });
        
        this.dialogRef.close();
        await this.router.navigate(['quizzes', 'practice', newQuiz.id]).then(() => {
          window.scrollTo({ top: 0 } );
        });
      } catch (error) {
        console.error('Failed to start new quiz:', error);
        this.dialogRef.close('retry');
      }
    } else {
      this.dialogRef.close('retry');
    }
  }

  protected onClose(): void {
    this.dialogRef.close('home');
  }
}