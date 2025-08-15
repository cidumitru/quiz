import { Injectable } from '@angular/core';

export interface PositiveMetric {
  icon: string;
  title: string;
  description: string;
  value: string;
  type: 'achievement' | 'improvement' | 'effort' | 'streak' | 'milestone';
  celebrationLevel: 'good' | 'great' | 'amazing';
}

export interface QuizResult {
  correctCount: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  previousBestScore?: number;
  currentStreak: number;
  totalQuizzesCompleted: number;
  questionsAnsweredToday: number;
  accuracyPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class PositiveMetricsService {

  /**
   * Finds the best positive metric to highlight from a quiz result
   * ALWAYS returns something positive, even for 0% scores
   */
  findBestPositiveMetric(result: QuizResult): PositiveMetric {
    const metrics = this.generateAllPositiveMetrics(result);
    
    // Sort by celebration level (amazing > great > good) and return the best one
    return metrics.sort((a, b) => {
      const levelOrder = { amazing: 3, great: 2, good: 1 };
      return levelOrder[b.celebrationLevel] - levelOrder[a.celebrationLevel];
    })[0];
  }

  /**
   * Generates all possible positive metrics for a quiz result
   */
  private generateAllPositiveMetrics(result: QuizResult): PositiveMetric[] {
    const metrics: PositiveMetric[] = [];

    // Performance-based celebrations (for good scores)
    if (result.accuracyPercentage >= 90) {
      metrics.push({
        icon: 'star',
        title: 'Outstanding Performance!',
        description: 'You absolutely crushed this quiz',
        value: `${result.accuracyPercentage}%`,
        type: 'achievement',
        celebrationLevel: 'amazing'
      });
    } else if (result.accuracyPercentage >= 80) {
      metrics.push({
        icon: 'trending_up',
        title: 'Strong Performance!',
        description: 'Great job on this quiz',
        value: `${result.accuracyPercentage}%`,
        type: 'achievement',
        celebrationLevel: 'great'
      });
    } else if (result.accuracyPercentage >= 60) {
      metrics.push({
        icon: 'thumb_up',
        title: 'Good Progress!',
        description: 'You\'re getting better',
        value: `${result.accuracyPercentage}%`,
        type: 'improvement',
        celebrationLevel: 'good'
      });
    }

    // Improvement celebrations (always positive)
    if (result.previousBestScore && result.accuracyPercentage > result.previousBestScore) {
      const improvement = result.accuracyPercentage - result.previousBestScore;
      metrics.push({
        icon: 'trending_up',
        title: 'New Personal Best!',
        description: `You improved by ${improvement.toFixed(1)} points`,
        value: `+${improvement.toFixed(1)}%`,
        type: 'improvement',
        celebrationLevel: improvement >= 10 ? 'amazing' : 'great'
      });
    }

    // Streak celebrations
    if (result.currentStreak >= 5) {
      metrics.push({
        icon: 'whatshot',
        title: 'Hot Streak!',
        description: 'You\'re on fire with consecutive quizzes',
        value: `${result.currentStreak} in a row`,
        type: 'streak',
        celebrationLevel: result.currentStreak >= 10 ? 'amazing' : 'great'
      });
    } else if (result.currentStreak >= 2) {
      metrics.push({
        icon: 'whatshot',
        title: 'Building Momentum!',
        description: 'Keep the streak going',
        value: `${result.currentStreak} quizzes`,
        type: 'streak',
        celebrationLevel: 'good'
      });
    }

    // Effort and participation (for when performance is low)
    if (result.correctCount > 0) {
      metrics.push({
        icon: 'lightbulb',
        title: 'Knowledge Gained!',
        description: `You got ${result.correctCount} right`,
        value: `${result.correctCount} correct`,
        type: 'effort',
        celebrationLevel: 'good'
      });
    }

    // Time-based celebrations
    if (result.timeTaken < 60 * result.totalQuestions) { // Less than 1 minute per question
      metrics.push({
        icon: 'speed',
        title: 'Quick Thinker!',
        description: 'You completed this quiz efficiently',
        value: `${Math.round(result.timeTaken / 60)} minutes`,
        type: 'effort',
        celebrationLevel: 'good'
      });
    }

    // Milestone celebrations
    if (result.totalQuizzesCompleted % 10 === 0) {
      metrics.push({
        icon: 'emoji_events',
        title: 'Milestone Reached!',
        description: 'Another 10 quizzes completed',
        value: `${result.totalQuizzesCompleted} total`,
        type: 'milestone',
        celebrationLevel: 'great'
      });
    } else if (result.totalQuizzesCompleted % 5 === 0) {
      metrics.push({
        icon: 'flag',
        title: 'Progress Made!',
        description: 'You\'re building good study habits',
        value: `${result.totalQuizzesCompleted} quizzes`,
        type: 'milestone',
        celebrationLevel: 'good'
      });
    }

    // Daily activity celebrations
    if (result.questionsAnsweredToday >= 50) {
      metrics.push({
        icon: 'local_fire_department',
        title: 'Study Machine!',
        description: 'Incredible dedication today',
        value: `${result.questionsAnsweredToday} questions today`,
        type: 'effort',
        celebrationLevel: 'amazing'
      });
    } else if (result.questionsAnsweredToday >= 20) {
      metrics.push({
        icon: 'psychology',
        title: 'Focused Learner!',
        description: 'Great study session today',
        value: `${result.questionsAnsweredToday} questions today`,
        type: 'effort',
        celebrationLevel: 'great'
      });
    } else if (result.questionsAnsweredToday >= 10) {
      metrics.push({
        icon: 'school',
        title: 'Good Study Day!',
        description: 'You\'re making progress',
        value: `${result.questionsAnsweredToday} questions today`,
        type: 'effort',
        celebrationLevel: 'good'
      });
    }

    // Fallback celebrations (for the worst-case scenarios)
    if (metrics.length === 0) {
      // If someone got 0% but still completed the quiz
      if (result.correctCount === 0) {
        metrics.push({
          icon: 'psychology',
          title: 'Learning Experience!',
          description: 'Every attempt teaches you something new',
          value: 'Knowledge gained',
          type: 'effort',
          celebrationLevel: 'good'
        });
      }

      // If it's their first quiz
      if (result.totalQuizzesCompleted === 1) {
        metrics.push({
          icon: 'rocket_launch',
          title: 'Journey Started!',
          description: 'Welcome to your learning adventure',
          value: 'First quiz completed',
          type: 'milestone',
          celebrationLevel: 'great'
        });
      }

      // Ultimate fallback - always show this if nothing else applies
      if (metrics.length === 0) {
        metrics.push({
          icon: 'volunteer_activism',
          title: 'Commitment Shown!',
          description: 'You completed the quiz - that\'s what matters',
          value: 'Quiz completed',
          type: 'effort',
          celebrationLevel: 'good'
        });
      }
    }

    return metrics;
  }

  /**
   * Get encouraging message based on performance
   */
  getEncouragingMessage(accuracyPercentage: number): string {
    if (accuracyPercentage >= 95) {
      return "You're absolutely brilliant! 🌟";
    } else if (accuracyPercentage >= 90) {
      return "Outstanding work! Keep it up! 🚀";
    } else if (accuracyPercentage >= 80) {
      return "Great job! You're really getting it! 💪";
    } else if (accuracyPercentage >= 70) {
      return "Good progress! You're on the right track! 📈";
    } else if (accuracyPercentage >= 50) {
      return "You're learning! Every quiz makes you stronger! 🌱";
    } else if (accuracyPercentage >= 25) {
      return "Keep going! Learning takes practice! 🎯";
    } else if (accuracyPercentage > 0) {
      return "You got some right! That's progress! 🎊";
    } else {
      return "Every expert was once a beginner! 🌟";
    }
  }

  /**
   * Generate motivational next steps
   */
  getNextSteps(result: QuizResult): string[] {
    const steps: string[] = [];

    if (result.accuracyPercentage < 50) {
      steps.push("📚 Review the questions you missed");
      steps.push("🎯 Try another quiz to practice");
      steps.push("💡 Focus on one topic at a time");
    } else if (result.accuracyPercentage < 80) {
      steps.push("🎯 Aim for 80% on your next attempt");
      steps.push("📈 You're showing great improvement");
      steps.push("🌟 Keep up this momentum");
    } else {
      steps.push("🚀 Try a more challenging quiz");
      steps.push("🏆 Share your success with others");
      steps.push("🎯 Aim for a perfect score next time");
    }

    return steps;
  }
}