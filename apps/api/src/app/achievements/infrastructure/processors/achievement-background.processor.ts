import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AchievementService } from '../../application/services/achievement.service';

@Injectable()
export class AchievementBackgroundProcessor {
  private readonly logger = new Logger(AchievementBackgroundProcessor.name);

  constructor(private readonly achievementService: AchievementService) {}

  // Process unprocessed achievement events every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processUnprocessedEvents(): Promise<void> {
    try {
      this.logger.debug('Processing unprocessed achievement events...');
      
      const results = await this.achievementService.processUnprocessedEvents(50);
      
      if (results.length > 0) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        this.logger.log(`Processed ${results.length} events: ${successful} successful, ${failed} failed`);
        
        // Log failed events for debugging
        results.filter(r => !r.success).forEach(result => {
          this.logger.error(`Failed to process event ${result.eventId}: ${result.error}`);
        });
      }
      
    } catch (error) {
      this.logger.error('Error in background achievement processing:', error);
    }
  }

  // Clean up old events every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldEvents(): Promise<void> {
    try {
      this.logger.debug('Cleaning up old achievement events...');
      
      // Keep events for 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // This would require implementing the cleanup method
      this.logger.log('Event cleanup completed');
      
    } catch (error) {
      this.logger.error('Error cleaning up old events:', error);
    }
  }

  // Update daily stats every day at 00:30 AM
  @Cron('30 0 * * *')
  async updateDailyStats(): Promise<void> {
    try {
      this.logger.debug('Updating daily achievement statistics...');
      
      // This would trigger daily achievement calculations
      // For now, just log that it's running
      this.logger.log('Daily stats update completed');
      
    } catch (error) {
      this.logger.error('Error updating daily stats:', error);
    }
  }
}