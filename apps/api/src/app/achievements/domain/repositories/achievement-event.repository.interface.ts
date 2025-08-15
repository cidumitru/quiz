import { AchievementEvent } from '../../../entities/achievement-event.entity';

export interface IAchievementEventRepository {
  save(event: AchievementEvent): Promise<AchievementEvent>;
  saveBatch(events: AchievementEvent[]): Promise<AchievementEvent[]>;
  findById(id: string): Promise<AchievementEvent | null>;
  findUnprocessed(limit?: number): Promise<AchievementEvent[]>;
  findByUserId(userId: string, limit?: number): Promise<AchievementEvent[]>;
  findByUserIdAndEventType(userId: string, eventType: string, limit?: number): Promise<AchievementEvent[]>;
  findRecentByUserId(userId: string, since: Date, limit?: number): Promise<AchievementEvent[]>;
  markAsProcessed(eventIds: string[]): Promise<void>;
  deleteOldEvents(before: Date): Promise<number>;
  getEventCountByUser(userId: string, eventType?: string): Promise<number>;
  getEventCountInPeriod(userId: string, startDate: Date, endDate: Date, eventType?: string): Promise<number>;
}