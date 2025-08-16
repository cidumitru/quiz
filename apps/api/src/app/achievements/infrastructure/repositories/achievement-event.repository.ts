import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
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

  async findUnprocessed(limit = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { isProcessed: false },
      order: { occurredAt: 'ASC' },
      take: limit
    });
  }

  async findById(id: string): Promise<AchievementEvent | null> {
    return this.repository.findOne({
      where: { id }
    });
  }

  async findByUserId(userId: string, limit = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { userId },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async findByUserIdAndEventType(userId: string, eventType: string, limit = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { userId, eventType },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async findRecentByUserId(userId: string, since: Date, limit = 100): Promise<AchievementEvent[]> {
    return this.repository.find({
      where: { 
        userId, 
        occurredAt: MoreThan(since)
      },
      order: { occurredAt: 'DESC' },
      take: limit
    });
  }

  async markAsProcessed(eventIds: string[]): Promise<void> {
    await this.repository.update(eventIds, {
      isProcessed: true,
      processedAt: new Date()
    });
  }

  async markBatchAsProcessed(eventIds: string[], processedBy: string[]): Promise<void> {
    await this.repository.update(eventIds, {
      isProcessed: true,
      processedAt: new Date(),
      processedBy
    });
  }

  async deleteOldEvents(before: Date): Promise<number> {
    const result = await this.repository.delete({
      occurredAt: LessThan(before)
    });
    
    return result.affected || 0;
  }

  async getEventCountByUser(userId: string, eventType?: string): Promise<number> {
    const whereConditions: any = { userId };
    if (eventType) {
      whereConditions.eventType = eventType;
    }

    return this.repository.count({
      where: whereConditions
    });
  }

  async getEventCountInPeriod(userId: string, startDate: Date, endDate: Date, eventType?: string): Promise<number> {
    const whereConditions: any = {
      userId,
      occurredAt: Between(startDate, endDate)
    };
    
    if (eventType) {
      whereConditions.eventType = eventType;
    }

    return this.repository.count({
      where: whereConditions
    });
  }
}