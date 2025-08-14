import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {User} from './user.entity';
import {QuestionBank} from './question-bank.entity';
import {QuizQuestion} from './quiz-question.entity';
import {QuizMode} from "@aqb/data-access";


@Entity('quizzes')
@Index(['userId', 'finishedAt']) // For completed quizzes by user
@Index(['userId', 'createdAt']) // For user activity over time
@Index(['finishedAt']) // For general completion queries
export class Quiz {
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

  @Column({
    type: 'enum',
    enum: QuizMode,
    default: QuizMode.All,
  })
  mode: QuizMode;

  @CreateDateColumn()
  startedAt: Date;

  @Column({type: 'timestamp', nullable: true})
  finishedAt: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  score: number;

  @OneToMany(() => QuizQuestion, (quizQuestion) => quizQuestion.quiz, {
    cascade: true,
    eager: true,
  })
  quizQuestions: QuizQuestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
