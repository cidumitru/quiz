import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {User} from './user.entity';
import {QuestionBank} from './question-bank.entity';
import {QuizQuestion} from './quiz-question.entity';

export enum QuizMode {
  All = 'all',
  Mistakes = 'mistakes',
  Discovery = 'discovery',
}

@Entity('quizzes')
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
