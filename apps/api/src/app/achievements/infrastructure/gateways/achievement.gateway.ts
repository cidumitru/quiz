import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {Injectable, Logger, UseGuards} from '@nestjs/common';
import {Server, Socket} from 'socket.io';
import {OnEvent} from '@nestjs/event-emitter';
import {JwtService} from '@nestjs/jwt';
import {AchievementService} from '../../application/services/achievement.service';
import {WEBSOCKET_EVENTS} from '../../shared/websocket-constants';
import {WsJwtGuard} from '../guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    user?: { id: string; email: string; roles?: string[] };
    authenticated?: boolean;
    connectionTime?: number;
    lastActivity?: number;
  };
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
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId> for multi-device support
  private readonly socketMetrics = new Map<string, { events: number; lastReset: number }>(); // Rate limiting per socket
  private readonly MAX_EVENTS_PER_MINUTE = 60;
  private readonly ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(',');

  constructor(
    private readonly achievementService: AchievementService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Validate origin
      const origin = client.handshake.headers.origin;
      if (origin && !this.ALLOWED_ORIGINS.includes(origin)) {
        throw new WsException('Forbidden: Invalid origin');
      }

      // Authenticate the client
      const authenticated = await this.authenticateClient(client);
      if (!authenticated) {
        throw new WsException('Unauthorized: Authentication failed');
      }

      const userId = client.data.userId!;
      client.data.connectionTime = Date.now();
      client.data.lastActivity = Date.now();

      // Track connected users (support multiple devices)
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Initialize rate limiting for this socket
      this.socketMetrics.set(client.id, { events: 0, lastReset: Date.now() });

      // Join user-specific room for targeted messaging
      client.join(`user:${userId}`);
      
      this.logger.log(`User ${userId} connected via socket ${client.id}`);
      
      // Send authenticated welcome message
      client.emit(WEBSOCKET_EVENTS.CONNECTED, { 
        message: 'Successfully authenticated to Achievement Gateway',
        userId,
        timestamp: new Date(),
        features: ['real-time-achievements', 'live-streaks', 'leaderboards']
      });

      // Send current achievement status
      const achievements = await this.achievementService.getUserAchievements(userId);
      client.emit(WEBSOCKET_EVENTS.INITIAL_STATE, achievements);

    } catch (error) {
      this.logger.error(`Connection error for ${client.id}: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('error', { 
        message: error instanceof WsException ? error.message : 'Connection failed',
        code: 'CONNECTION_ERROR'
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    try {
      const userId = client.data?.userId;
      
      if (userId) {
        // Remove this specific socket from user's connections
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
            this.logger.log(`User ${userId} fully disconnected (no remaining connections)`);
          } else {
            this.logger.log(`User ${userId} disconnected socket ${client.id} (${userSockets.size} connections remaining)`);
          }
        }
      }

      // Clean up rate limiting data
      this.socketMetrics.delete(client.id);
      
      // Leave all rooms
      client.rooms.clear();
      
    } catch (error) {
      this.logger.error(`Error during disconnect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async authenticateClient(client: AuthenticatedSocket): Promise<boolean> {
    try {
      const token = this.extractTokenFromHandshake(client);
      
      if (!token) {
        this.logger.warn(`No token provided for socket ${client.id}`);
        return false;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      client.data.user = payload;
      client.data.userId = payload.sub || payload.userId || payload.id;
      client.data.authenticated = true;

      return true;
    } catch (error) {
      this.logger.error(`Authentication failed for socket ${client.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private extractTokenFromHandshake(client: AuthenticatedSocket): string | null {
    // Try auth object
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    // Try Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    // Try query params (less secure)
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    return null;
  }

  private checkRateLimit(client: AuthenticatedSocket): boolean {
    const metrics = this.socketMetrics.get(client.id);
    if (!metrics) return true;

    const now = Date.now();
    const timeSinceReset = now - metrics.lastReset;

    // Reset counter every minute
    if (timeSinceReset > 60000) {
      metrics.events = 0;
      metrics.lastReset = now;
    }

    metrics.events++;
    client.data.lastActivity = now;

    if (metrics.events > this.MAX_EVENTS_PER_MINUTE) {
      this.logger.warn(`Rate limit exceeded for socket ${client.id} (user: ${client.data.userId})`);
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      });
      return false;
    }

    return true;
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.AUTHENTICATE)
  async handleAuthentication(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string }
  ) {
    try {
      // Re-authenticate with new token if needed
      const payload = await this.jwtService.verifyAsync(data.token, {
        secret: process.env.JWT_SECRET
      });

      const userId = payload.sub || payload.userId || payload.id;
      client.data.user = payload;
      client.data.userId = userId;
      client.data.authenticated = true;
      
      // Update user tracking
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);
      
      this.logger.log(`User re-authenticated: ${userId}`);
      
      // Send current achievement data
      const achievements = await this.achievementService.getUserAchievements(userId);
      
      client.emit(WEBSOCKET_EVENTS.AUTHENTICATION_SUCCESS, {
        achievements,
        message: 'Successfully authenticated for real-time achievements'
      });
      
    } catch (error) {
      this.logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
      client.emit(WEBSOCKET_EVENTS.AUTHENTICATION_ERROR, { 
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
      client.disconnect();
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.SUBSCRIBE_TO_ACHIEVEMENTS)
  handleSubscribeToAchievements(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!this.checkRateLimit(client)) return;
    
    if (!client.data.authenticated || !client.data.userId) {
      client.emit(WEBSOCKET_EVENTS.ERROR, {
        message: 'Please authenticate first',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    client.join(`user:${client.data.userId}:achievements`);
    this.logger.log(`User ${client.data.userId} subscribed to achievements`);

    client.emit(WEBSOCKET_EVENTS.SUBSCRIPTION_SUCCESS, {
      message: 'Subscribed to real-time achievements'
    });
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_CURRENT_STREAK)
  async handleGetCurrentStreak(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!this.checkRateLimit(client)) return;
    
    if (!client.data.authenticated || !client.data.userId) {
      client.emit(WEBSOCKET_EVENTS.ERROR, {
        message: 'Please authenticate first',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    try {
      const currentStreak = await this.achievementService.getCurrentStreak(client.data.userId);
      client.emit(WEBSOCKET_EVENTS.CURRENT_STREAK, {currentStreak});
    } catch (error) {
      this.logger.error(`Error getting current streak: ${error instanceof Error ? error.message : String(error)}`);
      client.emit(WEBSOCKET_EVENTS.ERROR, {
        message: 'Failed to get current streak',
        code: 'STREAK_FETCH_FAILED'
      });
    }
  }

  // Event listeners for achievement events

  @OnEvent('achievement.earned')
  handleAchievementEarned(event: AchievementEarnedEvent) {
    const userSockets = this.connectedUsers.get(event.userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        achievementId: event.achievementId,
        title: event.achievement.title,
        description: event.achievement.description,
        badgeIcon: event.achievement.badgeIcon,
        confettiLevel: event.achievement.confettiLevel,
        points: event.achievement.points,
        earnedAt: event.earnedAt,
        timestamp: new Date()
      };

      // Send to all user's connected sockets
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.ACHIEVEMENT_EARNED, eventData);
      });

      this.logger.log(`Achievement earned notification sent to user ${event.userId}: ${event.achievement.title}`);
    }
  }

  @OnEvent('streak.updated')
  handleStreakUpdated(event: LiveStreakUpdate) {
    const userSockets = this.connectedUsers.get(event.userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        currentStreak: event.currentStreak,
        longestStreak: event.longestStreak,
        isNewRecord: event.isNewRecord,
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_UPDATED, eventData);
      });

      this.logger.debug(`Streak update sent to user ${event.userId}: ${event.currentStreak}`);
    }
  }

  @OnEvent('streak.milestone')
  handleStreakMilestone(event: { userId: string; streak: number; message: string }) {
    const userSockets = this.connectedUsers.get(event.userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        streak: event.streak,
        message: event.message,
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_MILESTONE, eventData);
      });

      this.logger.log(`Streak milestone notification sent to user ${event.userId}: ${event.streak}`);
    }
  }

  @OnEvent('streak.broken')
  handleStreakBroken(event: { userId: string; previousStreak: number; message: string }) {
    const userSockets = this.connectedUsers.get(event.userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        previousStreak: event.previousStreak,
        message: event.message || 'Streak broken, but keep going!',
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.STREAK_BROKEN, eventData);
      });

      this.logger.log(`Streak broken notification sent to user ${event.userId}`);
    }
  }

  @OnEvent('daily.champion')
  handleDailyChampion(event: { userId: string; accuracy: number }) {
    const userSockets = this.connectedUsers.get(event.userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        type: 'daily-champion',
        accuracy: event.accuracy,
        message: `Amazing! You're today's champion with ${event.accuracy}% accuracy!`,
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.DAILY_MILESTONE, eventData);
      });

      this.logger.log(`Daily champion notification sent to user ${event.userId}`);
    }
  }

  // Admin/Broadcasting methods

  /**
   * Send real-time streak update to specific user
   */
  async sendStreakUpdate(userId: string, currentStreak: number, longestStreak?: number) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      const isNewRecord = longestStreak ? currentStreak > longestStreak : false;
      const eventData = {
        currentStreak,
        longestStreak: longestStreak || currentStreak,
        isNewRecord,
        timestamp: new Date()
      };
      
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit('streak-updated', eventData);
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
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        ...achievement,
        earnedAt: new Date(),
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit('achievement-earned', eventData);
      });
    }
  }

  /**
   * Send live encouragement messages
   */
  async sendEncouragement(userId: string, message: string, type: 'streak' | 'accuracy' | 'progress' | 'milestone') {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      const eventData = {
        message,
        type,
        timestamp: new Date()
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(WEBSOCKET_EVENTS.ENCOURAGEMENT, eventData);
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