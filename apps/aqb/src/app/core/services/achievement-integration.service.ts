import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {distinctUntilChanged, map, takeUntil, tap} from 'rxjs/operators';
import {Achievement, AchievementWebSocketService, CONFETTI_LEVELS, WebSocketConnectionState} from '@aqb/data-access';
import {ConfettiService} from './confetti.service';

interface AchievementNotificationData {
    id: string;
    achievement: Achievement;
    timestamp: Date;
}

interface StreakUpdateData {
    currentStreak: number;
    longestStreak: number;
    isNewRecord: boolean;
    timestamp: Date;
}

interface EncouragementData {
    message: string;
    type: string;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class AchievementIntegrationService implements OnDestroy {
    // Proxy observables from WebSocket service
    public currentStreak$: Observable<number>;
    public streakUpdates$: Observable<StreakUpdateData>;
    public connectionState$: Observable<WebSocketConnectionState>;
    private destroy$ = new Subject<void>();
    private readonly DEBUG_MODE = false; // Set to true for debugging
    // Achievement notification queue
    private achievementNotificationsSubject = new BehaviorSubject<AchievementNotificationData[]>([]);
    // Public observables
    public achievementNotifications$ = this.achievementNotificationsSubject.asObservable();
    private encouragementNotificationsSubject = new Subject<EncouragementData>();
    public encouragementNotifications$ = this.encouragementNotificationsSubject.asObservable();
    // State management
    private isConnected = false;
    private currentUserId: string | null = null;

    constructor(
        // eslint-disable-next-line @angular-eslint/prefer-inject
        private achievementWebSocket: AchievementWebSocketService,
        // eslint-disable-next-line @angular-eslint/prefer-inject
        private confettiService: ConfettiService
    ) {
        // Set up proxy observables
        this.currentStreak$ = this.achievementWebSocket.currentStreak$.pipe(
            distinctUntilChanged(),
            tap((streak) => {
                if (this.DEBUG_MODE) {
                    console.log('Current streak updated:', streak);
                }
            })
        );

        this.streakUpdates$ = this.achievementWebSocket.streakUpdates$.pipe(
            map((update) => ({
                ...update,
                timestamp: new Date()
            })),
            tap((update) => this.handleStreakUpdate(update))
        );

        this.connectionState$ = this.achievementWebSocket.connectionState$;

        this.setupAchievementHandlers();
    }

    /**
     * Connect to achievement WebSocket with user authentication
     */
    connect(userId: string, token?: string): Observable<unknown> {
        if (this.DEBUG_MODE) {
            console.log('Connecting to achievement system for user:', userId);
        }
        this.currentUserId = userId;

        return this.achievementWebSocket.connect(userId, token).pipe(
            tap(() => {
                this.isConnected = true;
                if (this.DEBUG_MODE) {
                    console.log('Achievement system connected');
                }
            }),
            takeUntil(this.destroy$)
        );
    }

    /**
     * Disconnect from achievement system
     */
    disconnect(): void {
        if (this.DEBUG_MODE) {
            console.log('Disconnecting from achievement system');
        }
        this.achievementWebSocket.disconnect();
        this.isConnected = false;
        this.currentUserId = null;
        this.clearNotifications();
    }

    /**
     * Get current connection status
     */
    isConnectionReady(): boolean {
        return this.achievementWebSocket.isReady();
    }

    /**
     * Request current streak from server
     */
    refreshCurrentStreak(): void {
        if (this.isConnectionReady()) {
            this.achievementWebSocket.getCurrentStreak();
        }
    }

    /**
     * Remove achievement notification from queue
     */
    dismissAchievementNotification(achievementId: string): void {
        const currentNotifications = this.achievementNotificationsSubject.value;
        const updatedNotifications = currentNotifications.filter(n => n.id !== achievementId);
        this.achievementNotificationsSubject.next(updatedNotifications);
    }

    /**
     * Clear all notifications
     */
    clearNotifications(): void {
        this.achievementNotificationsSubject.next([]);
    }

    /**
     * Get current notification count
     */
    getNotificationCount(): number {
        return this.achievementNotificationsSubject.value.length;
    }

    /**
     * Manual confetti trigger (for testing or manual celebrations)
     * Note: WebSocket auto-confetti has been disabled for better UX
     */
    triggerCelebration(type: 'achievement' | 'streak' | 'daily', level?: string, streakCount?: number): void {
        switch (type) {
            case 'achievement':
                this.confettiService.celebrateAchievement(level || 'basic');
                break;
            case 'streak':
                this.confettiService.celebrateStreak(streakCount || 1);
                break;
            case 'daily':
                this.confettiService.celebrateDailyAchievement();
                break;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.disconnect();
    }

    private setupAchievementHandlers(): void {
        // Handle new achievements
        this.achievementWebSocket.achievements$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((achievement) => {
            this.handleNewAchievement(achievement);
        });

        // Handle encouragement messages
        this.achievementWebSocket.encouragement$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((encouragement) => {
            this.handleEncouragementMessage(encouragement);
        });
    }

    private handleNewAchievement(achievement: Achievement): void {
        console.log('New achievement earned:', achievement);

        // Add to notification queue
        const notification: AchievementNotificationData = {
            id: achievement.id + '_' + Date.now(),
            achievement,
            timestamp: new Date()
        };

        const currentNotifications = this.achievementNotificationsSubject.value;
        this.achievementNotificationsSubject.next([...currentNotifications, notification]);

        // Note: Automatic confetti disabled for better UX - celebrations now happen in quiz completion dialog
        // this.confettiService.celebrateAchievement(achievement.confettiLevel);

        // Auto-dismiss after delay (unless it's a milestone achievement)
        if (achievement.confettiLevel !== CONFETTI_LEVELS.MILESTONE) {
            setTimeout(() => {
                this.dismissAchievementNotification(notification.id);
            }, 5000);
        } else {
            // Milestone achievements stay longer
            setTimeout(() => {
                this.dismissAchievementNotification(notification.id);
            }, 8000);
        }
    }

    private handleStreakUpdate(update: StreakUpdateData): void {
        console.log('Streak update received:', update);

        // Note: Automatic streak confetti disabled for better UX
        // if (update.currentStreak > 0 && (update.currentStreak % 5 === 0 || update.isNewRecord)) {
        //     this.confettiService.celebrateStreak(update.currentStreak);
        // }

        // Show encouragement for new records
        if (update.isNewRecord && update.currentStreak >= 5) {
            this.encouragementNotificationsSubject.next({
                message: `🔥 NEW RECORD! ${update.currentStreak} correct answers in a row!`,
                type: 'streak',
                timestamp: new Date()
            });
        }
    }

    private handleEncouragementMessage(encouragement: { message: string; type: string }): void {
        console.log('Encouragement received:', encouragement);

        this.encouragementNotificationsSubject.next({
            message: encouragement.message,
            type: encouragement.type,
            timestamp: new Date()
        });

        // Note: Automatic encouragement confetti disabled for better UX
        // switch (encouragement.type) {
        //     case 'milestone':
        //         this.confettiService.celebrateAchievement('milestone');
        //         break;
        //     case 'streak':
        //         this.confettiService.celebrateAchievement('excellent');
        //         break;
        //     case 'accuracy':
        //         this.confettiService.celebrateAchievement('perfect');
        //         break;
        // }
    }
}