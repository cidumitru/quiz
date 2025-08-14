import {Injectable} from '@angular/core';
import confetti from 'canvas-confetti';

@Injectable({
  providedIn: 'root'
})
export class ConfettiService {

  /**
   * Trigger confetti celebration based on quiz performance
   */
  celebrateQuizCompletion(accuracyPercentage: number): void {
    if (accuracyPercentage >= 95) {
      this.perfectScoreCelebration();
    } else if (accuracyPercentage >= 90) {
      this.excellentScoreCelebration();
    } else if (accuracyPercentage >= 80) {
      this.goodScoreCelebration();
    }
    // No confetti for scores below 80%
  }

  /**
   * Custom confetti burst with specific parameters
   */
  customBurst(options: {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    colors?: string[];
    origin?: { x: number; y: number };
  }): void {
    confetti({
      particleCount: options.particleCount || 50,
      spread: options.spread || 70,
      startVelocity: options.startVelocity || 25,
      origin: options.origin || {y: 0.6},
      colors: options.colors || ['#4ECDC4', '#45B7D1', '#96CEB4'],
      gravity: 1,
      scalar: 1
    });
  }

  /**
   * Perfect score (95%+) - Maximum celebration with multiple effects
   */
  private perfectScoreCelebration(): void {
    // Fire multiple bursts
    this.fireworksBurst();

    setTimeout(() => {
      this.starBurst();
    }, 300);

    setTimeout(() => {
      this.goldRain();
    }, 600);

    setTimeout(() => {
      this.finalBurst();
    }, 1000);
  }

  /**
   * Excellent score (90-94%) - Strong celebration
   */
  private excellentScoreCelebration(): void {
    this.fireworksBurst();

    setTimeout(() => {
      this.starBurst();
    }, 400);
  }

  /**
   * Good score (80-89%) - Moderate celebration
   */
  private goodScoreCelebration(): void {
    this.basicConfettiBurst();
  }

  /**
   * Fireworks-style burst from multiple points
   */
  private fireworksBurst(): void {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number): number => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount: Math.floor(particleCount),
        startVelocity: randomInRange(50, 80),
        spread: randomInRange(50, 100),
        origin: {
          x: randomInRange(0.1, 0.9),
          y: randomInRange(0.2, 0.4)
        },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
        shapes: ['circle', 'square'],
        gravity: 1.2,
        scalar: 1.2
      });
    }, 150);
  }

  /**
   * Star-shaped confetti burst
   */
  private starBurst(): void {
    confetti({
      particleCount: 100,
      spread: 160,
      origin: {y: 0.3},
      startVelocity: 35,
      shapes: ['star'],
      colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFE135'],
      scalar: 1.5,
      gravity: 0.8
    });
  }

  /**
   * Golden rain effect from the top
   */
  private goldRain(): void {
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        startVelocity: 0,
        gravity: 0.4,
        spread: 180,
        origin: {
          x: Math.random(),
          y: -0.1
        },
        colors: ['#FFD700', '#FFED4E', '#FFF59D'],
        shapes: ['circle'],
        scalar: 0.8
      });
    }, 50);
  }

  /**
   * Final celebration burst
   */
  private finalBurst(): void {
    confetti({
      particleCount: 150,
      spread: 180,
      origin: {y: 0.4},
      startVelocity: 45,
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
      shapes: ['circle', 'square'],
      scalar: 1.3,
      gravity: 1
    });
  }

  /**
   * Basic confetti burst for good scores
   */
  private basicConfettiBurst(): void {
    confetti({
      particleCount: 80,
      spread: 120,
      origin: {y: 0.4},
      startVelocity: 30,
      colors: ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      gravity: 1,
      scalar: 1
    });
  }

  /**
   * Achievement-specific celebrations based on confetti level
   */
  celebrateAchievement(confettiLevel: string): void {
    switch (confettiLevel) {
      case 'basic':
        this.basicAchievementCelebration();
        break;
      case 'excellent':
        this.excellentAchievementCelebration();
        break;
      case 'perfect':
        this.perfectAchievementCelebration();
        break;
      case 'milestone':
        this.milestoneAchievementCelebration();
        break;
      default:
        this.basicAchievementCelebration();
    }
  }

  /**
   * Streak milestone celebration with flame colors
   */
  celebrateStreak(streakCount: number): void {
    if (streakCount >= 25) {
      this.legendaryStreakCelebration();
    } else if (streakCount >= 10) {
      this.impressiveStreakCelebration();
    } else if (streakCount >= 5) {
      this.goodStreakCelebration();
    } else {
      this.basicStreakCelebration();
    }
  }

  /**
   * Daily achievement celebration
   */
  celebrateDailyAchievement(): void {
    this.sunburstCelebration();
  }

  // Achievement-specific celebration methods

  private basicAchievementCelebration(): void {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: {y: 0.5},
      startVelocity: 25,
      colors: ['#4ECDC4', '#45B7D1', '#96CEB4'],
      gravity: 1,
      scalar: 0.8
    });
  }

  private excellentAchievementCelebration(): void {
    // Multi-burst celebration
    this.customBurst({
      particleCount: 100,
      spread: 120,
      startVelocity: 30,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
      origin: {x: 0.3, y: 0.5}
    });

    setTimeout(() => {
      this.customBurst({
        particleCount: 100,
        spread: 120,
        startVelocity: 30,
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
        origin: {x: 0.7, y: 0.5}
      });
    }, 200);
  }

  private perfectAchievementCelebration(): void {
    // Epic multi-stage celebration
    this.fireworksBurst();

    setTimeout(() => {
      this.starBurst();
    }, 300);

    setTimeout(() => {
      this.goldRain();
    }, 600);
  }

  private milestoneAchievementCelebration(): void {
    // Ultimate celebration with all effects
    this.perfectScoreCelebration();

    setTimeout(() => {
      this.customBurst({
        particleCount: 200,
        spread: 180,
        startVelocity: 40,
        colors: ['#FF6B6B', '#FFD700', '#4ECDC4', '#DDA0DD', '#96CEB4'],
        origin: {x: 0.5, y: 0.3}
      });
    }, 1200);
  }

  // Streak-specific celebrations

  private basicStreakCelebration(): void {
    confetti({
      particleCount: 40,
      spread: 80,
      origin: {y: 0.4},
      startVelocity: 20,
      colors: ['#FF4757', '#FF6B6B', '#FF8E8E'],
      shapes: ['circle'],
      gravity: 1,
      scalar: 0.7
    });
  }

  private goodStreakCelebration(): void {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: {y: 0.4},
      startVelocity: 25,
      colors: ['#FF4757', '#FF6B6B', '#FFA500', '#FFD700'],
      shapes: ['circle', 'square'],
      gravity: 1,
      scalar: 0.9
    });
  }

  private impressiveStreakCelebration(): void {
    // Flame-like effect
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 30,
        startVelocity: 30,
        spread: 60,
        origin: {
          x: 0.5,
          y: 0.6
        },
        colors: ['#FF4757', '#FF6B6B', '#FFA500', '#FFD700', '#FF8C00'],
        shapes: ['circle'],
        gravity: 0.6,
        scalar: 1.2
      });
    }, 100);
  }

  private legendaryStreakCelebration(): void {
    // Epic flame celebration
    this.perfectScoreCelebration();

    setTimeout(() => {
      this.customBurst({
        particleCount: 150,
        spread: 160,
        startVelocity: 50,
        colors: ['#FF4757', '#FF6B6B', '#FFA500', '#FFD700', '#FF8C00', '#FFFFFF'],
        origin: {x: 0.5, y: 0.2}
      });
    }, 1000);
  }

  private sunburstCelebration(): void {
    // Radial sunburst pattern
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const x = 0.5 + Math.cos(angle) * 0.3;
      const y = 0.5 + Math.sin(angle) * 0.3;

      setTimeout(() => {
        confetti({
          particleCount: 20,
          spread: 45,
          origin: {x, y},
          startVelocity: 15,
          colors: ['#FFD700', '#FFA500', '#FFEAA7', '#FFED4E'],
          gravity: 0.8,
          scalar: 0.8
        });
      }, i * 50);
    }
  }
}
