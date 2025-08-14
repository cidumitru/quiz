import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { AchievementEvent } from '../../../entities/achievement-event.entity';
import { IAchievementEventRepository } from '../../domain/repositories/achievement-event.repository.interface';

@Injectable()
export class AchievementEventRepository implements IAchievementEventRepository {
  constructor(
    @InjectRepository(AchievementEvent)
    private readonly repository: Repository<AchievementEvent>
  ) {}

  async save(event: AchievementEvent): Promise<AchievementEvent> {
    return this.repository.save(event);
  }

  async saveBatch(events: AchievementEvent[]): Promise<AchievementEvent[]> {
    return this.repository.save(events);
  }

  async findUnprocessed(limit: number = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { isProcessed: false },
      order: { occurredAt: 'ASC' },
      take: limit
    });
  }

  async findByUserId(userId: string, limit: number = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { userId },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async findByUserIdAndEventType(userId: string, eventType: string, limit: number = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { userId, eventType },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async findRecentByUserId(userId: string, since: Date, limit: number = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { 
        userId, 
        occurredAt: MoreThan(since)
      },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async markAsProcessed(eventId: string, processedBy: string[]): Promise<void> {
    await this.repository.update(eventId, {
      isProcessed: true,
      processedAt: new Date(),
      processedBy
    });
  }

  async markBatchAsProcessed(eventIds: string[], processedBy: string[]): Promise<void> {
    await this.repository.update(eventIds, {
      isProcessed: true,
      processedAt: new Date(),
      processedBy
    });
  }

  async deleteOldEvents(olderThan: Date): Promise<number> {
    const result = await this.repository.delete({
      occurredAt: LessThan(olderThan)
    });
    
    return result.affected || 0;
  }
}