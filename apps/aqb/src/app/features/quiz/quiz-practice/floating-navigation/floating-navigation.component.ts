import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-floating-navigation',
  templateUrl: './floating-navigation.component.html',
  styleUrls: ['./floating-navigation.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class FloatingNavigationComponent {
  currentQuestionIndex = input.required<number>();
  totalQuestions = input.required<number>();

  navigateUp = output<void>();
  navigateDown = output<void>();

  get canNavigateUp(): boolean {
    return this.currentQuestionIndex() > 0;
  }

  get canNavigateDown(): boolean {
    return this.currentQuestionIndex() < this.totalQuestions() - 1;
  }

  get currentProgress(): number {
    if (this.totalQuestions() === 0) return 0;
    return ((this.currentQuestionIndex() + 1) / this.totalQuestions()) * 100;
  }

  onNavigateUp(): void {
    if (this.canNavigateUp) {
      this.navigateUp.emit();
    }
  }

  onNavigateDown(): void {
    if (this.canNavigateDown) {
      this.navigateDown.emit();
    }
  }
}
