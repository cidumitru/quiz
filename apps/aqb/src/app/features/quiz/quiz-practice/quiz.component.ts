import {
  Component,
  effect,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuizService } from '../quiz.service';
import { QuizViewModel } from './quiz.view-model';
import { FloatingNavigationComponent } from './floating-navigation/floating-navigation.component';
import { ConfettiService } from '../../../core/services/confetti.service';

@Component({
  selector: 'app-quiz-practice',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    MatTooltipModule,
    FloatingNavigationComponent,
  ],
})
export class QuizComponent implements OnInit, OnDestroy {
  loading = signal(false);
  error = signal<string | null>(null);
  currentQuestionIndex = signal(0);

  private intersectionObserver?: IntersectionObserver;

  // The reactive view model - contains all state and computations
  quizViewModel = input.required<QuizViewModel>();

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);
  private confettiService = inject(ConfettiService);

  constructor() {
    // Auto-save answers when they change
    effect(() => {
      const viewModel = this.quizViewModel();
      if (viewModel) {
        // Track answeredCount to react to any question state changes
        viewModel.answeredCount();
        const answers = viewModel.getAllAnswers();
        if (answers.length > 0) {
          this.quizService.setQuizAnswers(viewModel.id, answers);
        }
      }
    });

    // Auto-finish quiz when all questions are answered
    effect(() => {
      const viewModel = this.quizViewModel();
      if (!viewModel.finishedAt && viewModel?.isComplete()) {
        this.quizService.markQuizAsFinished(viewModel.id);

        // Trigger confetti celebration after a short delay
        setTimeout(() => {
          this.celebrateQuizCompletion(viewModel);
        }, 500);
      }
    });
  }
  // Touch gesture support for mobile
  private touchStartY = 0;
  private touchStartTime = 0;

  ngOnInit(): void {
    // Setup intersection observer after view initialization
    setTimeout(() => {
      this.setupIntersectionObserver();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only handle keyboard navigation when quiz is active and not typing in inputs
    if (
      event.target &&
      ['input', 'textarea', 'select'].includes(
        (event.target as HTMLElement).tagName.toLowerCase()
      )
    ) {
      return;
    }

    const viewModel = this.quizViewModel();
    if (!viewModel || !viewModel.hasAnyQuestions()) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        this.navigateUp();
        break;
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault();
        this.navigateDown();
        break;
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (
      event.target &&
      this.isInteractiveElement(event.target as HTMLElement)
    ) {
      return; // Don't handle swipes on interactive elements
    }

    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = Date.now();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (
      event.target &&
      this.isInteractiveElement(event.target as HTMLElement)
    ) {
      return;
    }

    const touchEndY = event.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;
    const touchDistance = Math.abs(touchEndY - this.touchStartY);
    const touchVelocity = touchDistance / touchDuration;

    // Only process quick swipes (avoid interfering with scrolling)
    if (touchDuration < 300 && touchDistance > 50 && touchVelocity > 0.5) {
      if (touchEndY < this.touchStartY) {
        // Swipe up - go to next question
        this.navigateDown();
      } else {
        // Swipe down - go to previous question
        this.navigateUp();
      }
    }
  }

  navigateUp(): void {
    const currentIndex = this.currentQuestionIndex();
    if (currentIndex > 0) {
      this.scrollToQuestion(currentIndex - 1);
    }
  }

  navigateDown(): void {
    const viewModel = this.quizViewModel();
    const currentIndex = this.currentQuestionIndex();

    if (viewModel && currentIndex < viewModel.totalQuestions - 1) {
      this.scrollToQuestion(currentIndex + 1);
    }
  }

  retry(): void {
    const viewModel = this.quizViewModel();
    if (!viewModel) return;

    this.router.navigate(['quizzes', 'practice'], {
      queryParams: {
        size: viewModel.totalQuestions,
        questionBankId: viewModel.questionBankId,
      },
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'input', 'textarea', 'select', 'a'];
    const interactiveClasses = ['answer-card', 'mat-button', 'mat-fab'];

    return (
      interactiveTags.includes(element.tagName.toLowerCase()) ||
      interactiveClasses.some((className) =>
        element.classList.contains(className)
      ) ||
      element.closest('.answer-card') !== null ||
      element.closest('button') !== null
    );
  }

  // Simple helper methods
  selectAnswer(questionId: string, answerId: string): void {
    const viewModel = this.quizViewModel();
    if (!viewModel) return;

    // Prevent changing answer if already answered
    if (viewModel.isQuestionAnswered(questionId)) {
      return;
    }

    // Update answer in view model (which triggers reactive updates)
    viewModel.selectAnswer(questionId, answerId);

    // Auto-scroll to next question if answer is correct using new navigation
    setTimeout(() => {
      if (viewModel.isQuestionCorrect(questionId)) {
        this.navigateDown();
      }
    }, 500);
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const questionIndex = parseInt(
              entry.target.getAttribute('data-question-index') || '0'
            );
            this.currentQuestionIndex.set(questionIndex);
          }
        });
      },
      {
        rootMargin: '-20% 0px -20% 0px', // Only consider questions in the center area
        threshold: [0.6],
      }
    );

    // Observe all question cards
    const questionCards = document.querySelectorAll('[data-question-index]');
    questionCards.forEach((card) => {
      this.intersectionObserver?.observe(card);
    });
  }

  private scrollToQuestion(questionIndex: number): void {
    const questionElement = document.querySelector(
      `[data-question-index="${questionIndex}"]`
    ) as HTMLElement;

    if (questionElement) {
      // Update current index immediately for responsive UI
      this.currentQuestionIndex.set(questionIndex);

      // Simple scroll into view with center positioning
      questionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  /**
   * Celebrate quiz completion with confetti if score is 80% or higher
   */
  private celebrateQuizCompletion(viewModel: QuizViewModel): void {
    const accuracyPercentage = viewModel.accuracyPercentage();

    if (accuracyPercentage >= 80) {
      this.confettiService.celebrateQuizCompletion(accuracyPercentage);
    }
  }
}
