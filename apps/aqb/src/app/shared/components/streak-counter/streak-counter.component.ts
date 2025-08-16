import {Component, computed, DestroyRef, inject, Input, OnChanges, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {interval} from 'rxjs';
import {take} from 'rxjs/operators';

@Component({
  selector: 'app-streak-counter',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatIconModule, MatCardModule],
  styleUrl: './streak-counter.component.scss',
  template: `
    <div
        class="relative inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
        [class.animate-pulse]="isPulsing()"
        [@streakAnimation]="animationState()">

      <!-- Flame Icon -->
      <mat-icon class="text-yellow-300 animate-bounce">whatshot</mat-icon>

      <!-- Streak Counter -->
      <div class="flex flex-col items-center min-w-[2.5rem]">
        <span class="text-xl font-bold leading-tight">{{ displayStreak() }}</span>
        @if (showLabel) {
          <span class="text-xs uppercase tracking-wider opacity-90">
            {{ streakLabel() }}
          </span>
        }
      </div>

      <!-- New Record Badge -->
      @if (isNewRecord) {
        <span
            class="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-bounce"
            [@newRecordAnimation]>
          NEW!
        </span>
      }
    </div>
  `,
  animations: [
    trigger('streakAnimation', [
      state('idle', style({transform: 'scale(1)'})),
      state('updated', style({transform: 'scale(1)'})),
      transition('idle => updated', [
        animate('0.6s ease-in-out', keyframes([
          style({transform: 'scale(1)', offset: 0}),
          style({transform: 'scale(1.2)', offset: 0.3}),
          style({transform: 'scale(1.1)', offset: 0.7}),
          style({transform: 'scale(1)', offset: 1})
        ]))
      ])
    ]),
    trigger('newRecordAnimation', [
      transition(':enter', [
        animate('0.5s ease-out', keyframes([
          style({transform: 'scale(0) rotate(0deg)', opacity: 0, offset: 0}),
          style({transform: 'scale(1.3) rotate(180deg)', opacity: 0.8, offset: 0.6}),
          style({transform: 'scale(1) rotate(360deg)', opacity: 1, offset: 1})
        ]))
      ])
    ])
  ]
})
export class StreakCounterComponent implements OnChanges {
  // Inputs with transforms
  @Input({transform: (value: number) => value || 0}) streak = 0;
  @Input({transform: (value: boolean) => value || false}) isNewRecord = false;
  @Input({transform: (value: boolean) => value !== false}) showLabel = true;

  // Signals for reactive state
  protected readonly displayStreak = signal(0);
  protected readonly animationState = signal<'idle' | 'updated'>('idle');
  protected readonly isPulsing = signal(false);

  // Computed properties
  protected readonly streakLabel = computed(() =>
      this.displayStreak() === 1 ? 'streak' : 'streak'
  );

  private readonly destroyRef = inject(DestroyRef);

  ngOnChanges(): void {
    if (this.displayStreak() !== this.streak) {
      this.animateStreakUpdate();
    }
  }

  private animateStreakUpdate(): void {
    this.animationState.set('updated');
    this.isPulsing.set(true);

    // Animate number change using RxJS
    const startStreak = this.displayStreak();
    const endStreak = this.streak;
    const steps = 20;

    interval(30)
        .pipe(
            take(steps),
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (i) => {
            const progress = (i + 1) / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);
            this.displayStreak.set(Math.round(startStreak + (endStreak - startStreak) * easeOut));
          },
          complete: () => {
            this.displayStreak.set(endStreak);
            this.isPulsing.set(false);

            // Reset animation state after a delay
            setTimeout(() => {
              this.animationState.set('idle');
            }, 100);
          }
        });
  }
}