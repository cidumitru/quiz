import {QuizListItem} from "@aqb/data-access";
import {Duration, intervalToDuration} from "date-fns";

export class QuizListItemViewModel {
  id: string;

  questionBankName: string;
  questionsCount: number;
  correctAnswers: number;

  startedAt: Date;
  finishedAt?: Date;

  duration: string;
  correctRatio: number;

  constructor(quiz: QuizListItem) {
    this.id = quiz.id;
    this.questionBankName = quiz.questionBankName ?? 'Unknown';

    this.questionsCount = quiz.questionCount ?? 0;
    this.correctRatio = quiz.score;

    this.startedAt = new Date(quiz.startedAt);
    this.finishedAt = quiz.finishedAt ? new Date(quiz.finishedAt) : undefined;
    this.duration = this.finishedAt
      ? this.formatShortDuration(intervalToDuration({start: this.startedAt, end: this.finishedAt}))
      : '—';
  }

  private formatShortDuration(duration: Duration): string {
    const parts = [];

    if (duration.hours && duration.hours > 0) {
      parts.push(`${duration.hours}h`);
    }

    if (duration.minutes && duration.minutes > 0) {
      parts.push(`${duration.minutes}m`);
    }

    if (duration.seconds && duration.seconds > 0 && !duration.hours) {
      parts.push(`${duration.seconds}s`);
    }

    // If duration is very short (< 1 second)
    if (parts.length === 0) {
      return '< 1s';
    }

    // Return only first two parts for brevity
    return parts.slice(0, 2).join(' ');
  }
}
