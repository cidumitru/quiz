import {Component, effect, inject, input, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from "@angular/router";
import {CommonModule} from "@angular/common";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatTooltipModule} from "@angular/material/tooltip";
import {QuizService} from "../quiz.service";
import {QuizViewModel} from "./quiz.view-model";

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
  ]
})
export class QuizComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  currentQuestionIndex = signal(0);

  // The reactive view model - contains all state and computations
  quizViewModel = input.required<QuizViewModel>()

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);

  constructor() {
    // Auto-save answers when they change
    effect(() => {
      const viewModel = this.quizViewModel();
      if (viewModel) {
        // Track answeredCount to react to any question state changes
        const answeredCount = viewModel.answeredCount();
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
      }
    });
  }

  // Simple helper methods
  selectAnswer(questionId: string, answerId: string, questionIndex: number): void {
    const viewModel = this.quizViewModel();
    if (!viewModel) return;

    // Prevent changing answer if already answered
    if (viewModel.isQuestionAnswered(questionId)) {
      return;
    }

    // Update answer in view model (which triggers reactive updates)
    viewModel.selectAnswer(questionId, answerId);

    // Auto-scroll to next question if answer is correct
    setTimeout(() => {
      if (viewModel.isQuestionCorrect(questionId)) {
        this.scrollToNextQuestion(questionIndex);
      }
    }, 300);
  }

  retry(): void {
    const viewModel = this.quizViewModel();
    if (!viewModel) return;

    this.router.navigate(['quizzes', 'practice'], {
      queryParams: {
        size: viewModel.totalQuestions,
        questionBankId: viewModel.questionBankId
      }
    });
  }


  private scrollToNextQuestion(currentIndex: number): void {
    const viewModel = this.quizViewModel();
    const nextIndex = currentIndex + 1;

    if (!viewModel || nextIndex >= viewModel.totalQuestions) {
      return;
    }

    this.currentQuestionIndex.set(nextIndex);
    this.scrollToQuestion(nextIndex);
  }

  private scrollToQuestion(questionIndex: number): void {
    const questionElement = document.querySelector(`[data-question-index="${questionIndex}"]`) as HTMLElement;

    if (questionElement) {
      questionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }
}
