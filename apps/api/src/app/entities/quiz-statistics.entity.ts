import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {User} from './user.entity';
import {QuestionBank} from './question-bank.entity';

@Entity('quiz_statistics')
@Index(['userId', 'questionBankId'], {unique: true})
@Index(['userId']) // For user-wide statistics queries
@Index(['lastActivityDate']) // For activity-based queries
export class QuizStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {nullable: false})
  @JoinColumn({name: 'userId'})
  user: User;

  @Column('uuid', {nullable: false})
  userId: string;

  @ManyToOne(() => QuestionBank, {nullable: false})
  @JoinColumn({name: 'questionBankId'})
  questionBank: QuestionBank;

  @Column('uuid', {nullable: false})
  questionBankId: string;

  @Column({default: 0})
  totalQuizzes: number;

  @Column({default: 0})
  totalAnswers: number;

  @Column({default: 0})
  correctAnswers: number;

  @Column({default: 0})
  incorrectAnswers: number;

  @Column({default: 0})
  uniqueQuestionsAnswered: number;

  @Column({type: 'decimal', precision: 5, scale: 2, default: 0})
  coverage: number;

  @Column({type: 'decimal', precision: 5, scale: 2, default: 0})
  averageScore: number;

  @Column({type: 'decimal', precision: 5, scale: 2, default: 0})
  averageScoreToday: number;

  @Column({type: 'timestamp', nullable: true})
  lastQuizDate: Date;

  @Column({type: 'int', default: 0})
  currentStreak: number;

  @Column({type: 'int', default: 0})
  longestStreak: number;

  @Column({type: 'int', default: 0})
  consecutiveStudyDays: number;

  @Column({type: 'timestamp', nullable: true})
  lastActivityDate: Date;

  @Column({type: 'jsonb', default: () => "'{}'"})
  dailyStats: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
