import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('achievement_events')
@Index(['userId', 'eventType', 'occurredAt'])
@Index(['userId', 'occurredAt']) // For user activity queries
@Index(['occurredAt'])
@Index(['processedAt'])
@Index(['isProcessed']) // For finding unprocessed events
@Index(['userId', 'isProcessed']) // Combined index for user + processing status
export class AchievementEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: false })
  userId: string;

  @Column({ nullable: false })
  eventType: string;

  @Column({ type: 'jsonb', nullable: false })
  eventData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: false })
  occurredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  processedBy: string[] | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ default: false })
  isProcessed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}