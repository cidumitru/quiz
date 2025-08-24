import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { QuestionBank } from './question-bank.entity';
import { Answer } from './answer.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  question: string;

  @ManyToOne(() => QuestionBank, (questionBank) => questionBank.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionBankId' })
  questionBank: QuestionBank;

  @Column('uuid')
  questionBankId: string;

  @Column('simple-array', { default: '' })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Answer, (answer) => answer.question, {
    cascade: true,
    eager: true,
  })
  answers: Answer[];
}