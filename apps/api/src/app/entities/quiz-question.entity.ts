import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {Quiz} from './quiz.entity';
import {Question} from './question.entity';
import {Answer} from './answer.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, {nullable: false, onDelete: 'CASCADE'})
  @JoinColumn({name: 'quizId'})
  quiz: Quiz;

  @Column('uuid', {nullable: false})
  quizId: string;

  @ManyToOne(() => Question, {nullable: false, eager: true})
  @JoinColumn({name: 'questionId'})
  question: Question;

  @Column('uuid', {nullable: false})
  questionId: string;

  @ManyToOne(() => Answer, {nullable: true, eager: true})
  @JoinColumn({name: 'answerId'})
  userAnswer: Answer;

  @Column('uuid', {nullable: true})
  answerId: string;

  @Column({default: 0})
  orderIndex: number;

  @CreateDateColumn()
  answeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
