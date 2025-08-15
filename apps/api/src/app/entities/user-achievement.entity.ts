import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
@Index(['userId', 'isEarned'])
@Index(['earnedAt'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: false })
  userId: string;

  @Column({ nullable: false })
  achievementId: string;

  @Column('int', { default: 0 })
  currentProgress: number;

  @Column('int', { nullable: false })
  targetProgress: number;

  @Column({ default: false })
  isEarned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  earnedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}