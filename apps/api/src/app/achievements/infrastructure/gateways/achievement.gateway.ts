import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {Injectable, Logger} from '@nestjs/common';
import {Server, Socket} from 'socket.io';
import {OnEvent} from '@nestjs/event-emitter';
import {AchievementService} from '../../application/services/achievement.service';
import {WEBSOCKET_EVENTS} from '../../shared/websocket-constants';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: { id: string; email: string };
}

interface LiveStreakUpdate {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
}

interface AchievementEarnedEvent {
  userId: string;
  achievementId: string;
  achievement: {
    title: string;
    description: string;
    badgeIcon: string;
    confettiLevel: string;
    points: number;
  };
  earnedAt: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/achievements',
})
export class AchievementGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AchievementGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId mapping

  constructor(private readonly achievementService: AchievementService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user information from token or session
      // For now, we'll expect the client to send authentication after connection
      this.logger.log(`Client connected: ${client.id}`);
      
      // Send welcome message
      client.emit(WEBSOCKET_EVENTS.CONNECTED, { 
        message: 'Connected to Achievement Gateway',
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error instanceof Error ? error.message : error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.AUTHENTICATE)
  async handleAuthentication(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string; token?: string }
  ) {
    try {
      // TODO: Validate JWT token here if needed
      client.userId = data.userId;
      this.connectedUsers.set(data.userId, client.id);
      
      this.logger.log(`User authenticated: ${data.userId}`);
      
      // Send current streak data
      const currentStreak = await this.achievementService.getCurrentStreak(data.userId);

      client.emit(WEBSOCKET_EVENTS.AUTHENTICATION_SUCCESS, {
        currentStreak,
        message: 'Successfully authenticated for real-time achievements'
      });
      
    } catch (error) {
      this.logger.error(`Authentication error: ${error instanceof Error ? error.message : error}`);
      client.emit(WEBSOCKET_EVENTS.AUTHENTICATION_ERROR, { 
        message: 'Authentication failed' 
      });
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.SUBSCRIBE_TO_ACHIEVEMENTS)
  handleSubscribeToAchievements(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      client.emit(WEBSOCKET_EVENTS.ERROR, {message: 'Please authenticate first'});
      return;
    }

    client.join(`user:${client.userId}:achievements`);
    this.logger.log(`User ${client.userId} subscribed to achievements`);

    client.emit(WEBSOCKET_EVENTS.SUBSCRIPTION_SUCCESS, {
      message: 'Subscribed to real-time achievements'
    });
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_CURRENT_STREAK)
  async handleGetCurrentStreak(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      client.emit(WEBSOCKET_EVENTS.ERROR, {message: 'Please authenticate first'});
      return;
    }

    try {
      const currentStreak = await this.achievementService.getCurrentStreak(client.userId);
      client.emit(WEBSOCKET_EVENTS.CURRENT_STREAK, {currentStreak});
    } catch (error) {
      this.logger.error(`Error getting current streak: ${error instanceof Error ? error.message : error}`);
      client.emit(WEBSOCKET_EVENTS.ERROR, {message: 'Failed to get current streak'});
    }
  }

  // Event listeners for achievement events

  @OnEvent('achievement.earned')
  handleAchievementEarned(event: AchievementEarnedEvent) {
    const socketId = this.connectedUsers.get(event.userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.ACHIEVEMENT_EARNED, {
        achievementId: event.achievementId,
        title: event.achievement.title,
        description: event.achievement.description,
        badgeIcon: event.achievement.badgeIcon,
        confettiLevel: event.achievement.confettiLevel,
        points: event.achievement.points,
        earnedAt: event.earnedAt,
        timestamp: new Date()
      });

      this.logger.log(`Achievement earned notification sent to user ${event.userId}: ${event.achievement.title}`);
    }
  }

  @OnEvent('streak.updated')
  handleStreakUpdated(event: LiveStreakUpdate) {
    const socketId = this.connectedUsers.get(event.userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_UPDATED, {
        currentStreak: event.currentStreak,
        longestStreak: event.longestStreak,
        isNewRecord: event.isNewRecord,
        timestamp: new Date()
      });

      this.logger.debug(`Streak update sent to user ${event.userId}: ${event.currentStreak}`);
    }
  }

  @OnEvent('streak.milestone')
  handleStreakMilestone(event: { userId: string; streak: number; message: string }) {
    const socketId = this.connectedUsers.get(event.userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_MILESTONE, {
        streak: event.streak,
        message: event.message,
        timestamp: new Date()
      });

      this.logger.log(`Streak milestone notification sent to user ${event.userId}: ${event.streak}`);
    }
  }

  @OnEvent('streak.broken')
  handleStreakBroken(event: { userId: string; previousStreak: number; message: string }) {
    const socketId = this.connectedUsers.get(event.userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_BROKEN, {
        previousStreak: event.previousStreak,
        message: event.message || 'Streak broken, but keep going!',
        timestamp: new Date()
      });

      this.logger.log(`Streak broken notification sent to user ${event.userId}`);
    }
  }

  @OnEvent('daily.champion')
  handleDailyChampion(event: { userId: string; accuracy: number }) {
    const socketId = this.connectedUsers.get(event.userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.DAILY_MILESTONE, {
        type: 'daily-champion',
        accuracy: event.accuracy,
        message: `Amazing! You're today's champion with ${event.accuracy}% accuracy!`,
        timestamp: new Date()
      });

      this.logger.log(`Daily champion notification sent to user ${event.userId}`);
    }
  }

  // Admin/Broadcasting methods

  /**
   * Send real-time streak update to specific user
   */
  async sendStreakUpdate(userId: string, currentStreak: number, longestStreak?: number) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const isNewRecord = longestStreak ? currentStreak > longestStreak : false;
      
      this.server.to(socketId).emit('streak-updated', {
        currentStreak,
        longestStreak: longestStreak || currentStreak,
        isNewRecord,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send achievement notification to specific user
   */
  async sendAchievementNotification(userId: string, achievement: {
    id: string;
    title: string;
    description: string;
    badgeIcon: string;
    confettiLevel: string;
    points: number;
  }) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('achievement-earned', {
        ...achievement,
        earnedAt: new Date(),
        timestamp: new Date()
      });
    }
  }

  /**
   * Send live encouragement messages
   */
  async sendEncouragement(userId: string, message: string, type: 'streak' | 'accuracy' | 'progress' | 'milestone') {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(WEBSOCKET_EVENTS.ENCOURAGEMENT, {
        message,
        type,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast global achievements (leaderboard updates, etc.)
   */
  async broadcastGlobalUpdate(data: any) {
    this.server.emit(WEBSOCKET_EVENTS.GLOBAL_UPDATE, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get specific user connection status
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}