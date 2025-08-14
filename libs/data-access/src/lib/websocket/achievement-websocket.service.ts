import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {filter, take, takeUntil} from 'rxjs/operators';
import {WebSocketService} from './websocket.service';
import {Achievement, ConfettiLevel, WebSocketConnectionState} from './types';

@Injectable({
    providedIn: 'root'
})
export class AchievementWebSocketService implements OnDestroy {
    private destroy$ = new Subject<void>();
    private readonly DEBUG_MODE = false; // Set to true for debugging
    // Real-time data streams
    private currentStreakSubject = new BehaviorSubject<number>(0);
    // Public observables
    public currentStreak$ = this.currentStreakSubject.asObservable();
    private achievementsSubject = new Subject<Achievement>();
    public achievements$ = this.achievementsSubject.asObservable();
    private encouragementSubject = new Subject<{ message: string; type: string }>();
    public encouragement$ = this.encouragementSubject.asObservable();
    private streakUpdatesSubject = new Subject<{
        currentStreak: number;
        longestStreak: number;
        isNewRecord: boolean;
    }>();
    public streakUpdates$ = this.streakUpdatesSubject.asObservable();
    public connectionState$: Observable<WebSocketConnectionState>;

    constructor(private webSocketService: WebSocketService) {
        this.connectionState$ = this.webSocketService.connectionState$;
        this.setupEventListeners();
    }

    /**
     * Connect and authenticate for achievement events
     */
    connect(userId: string, token?: string): Observable<any> {
        // Connect to WebSocket
        const connection$ = this.webSocketService.connect(userId);

        // Authenticate after connection (with take(1) to prevent duplicate auth)
        this.webSocketService.connectionState$.pipe(
            filter(state => state.isConnected && !state.isAuthenticated),
            take(1), // Prevent multiple authentication attempts
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.webSocketService.authenticate(userId, token);
        });

        // Subscribe to achievements after authentication (with take(1))
        this.webSocketService.connectionState$.pipe(
            filter(state => state.isAuthenticated && !state.isSubscribed),
            take(1), // Prevent multiple subscriptions
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.webSocketService.subscribeToAchievements();
        });

        return connection$;
    }

    /**
     * Disconnect from achievement WebSocket
     */
    disconnect(): void {
        this.webSocketService.disconnect();
    }

    /**
     * Request current streak
     */
    getCurrentStreak(): void {
        this.webSocketService.send('get-current-streak', {});
    }

    /**
     * Check if ready to receive events
     */
    isReady(): boolean {
        return this.webSocketService.isReadyForEvents();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.disconnect();
    }

    /**
     * Set up event listeners for achievement-specific events
     */
    private setupEventListeners(): void {
        // Authentication success - get current streak
        this.webSocketService.on('authentication-success').pipe(
            take(1), // Only handle once per connection
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Achievement WebSocket authenticated:', data);
            }
            this.currentStreakSubject.next(data.currentStreak);
        });

        // Current streak response
        this.webSocketService.on('current-streak').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            this.currentStreakSubject.next(data.currentStreak);
        });

        // Live streak updates
        this.webSocketService.on('streak-updated').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Streak updated:', data);
            }
            this.currentStreakSubject.next(data.currentStreak);
            this.streakUpdatesSubject.next(data);
        });

        // Achievement earned notifications
        this.webSocketService.on('achievement-earned').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Achievement earned:', data);
            }
            const achievement: Achievement = {
                id: data.achievementId,
                title: data.title,
                description: data.description,
                badgeIcon: data.badgeIcon,
                confettiLevel: data.confettiLevel as ConfettiLevel,
                points: data.points,
                category: this.mapAchievementCategory(data.title)
            };
            this.achievementsSubject.next(achievement);
        });

        // Encouragement messages
        this.webSocketService.on('encouragement').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Encouragement received:', data);
            }
            this.encouragementSubject.next({
                message: data.message,
                type: data.type
            });
        });

        // Streak milestones
        this.webSocketService.on('streak-milestone').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Streak milestone:', data);
            }
            this.encouragementSubject.next({
                message: data.message,
                type: 'milestone'
            });
        });

        // Streak broken notifications
        this.webSocketService.on('streak-broken').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Streak broken:', data);
            }
            this.currentStreakSubject.next(0);
            this.encouragementSubject.next({
                message: data.message,
                type: 'streak'
            });
        });

        // Daily milestones
        this.webSocketService.on('daily-milestone').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Daily milestone:', data);
            }
            this.encouragementSubject.next({
                message: data.message,
                type: 'milestone'
            });
        });
    }

    /**
     * Map achievement title to category (simple heuristic)
     */
    private mapAchievementCategory(title: string): Achievement['category'] {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('streak') || titleLower.includes('consistent')) {
            return 'streak';
        }
        if (titleLower.includes('accuracy') || titleLower.includes('perfect') || titleLower.includes('correct')) {
            return 'accuracy';
        }
        if (titleLower.includes('daily') || titleLower.includes('consecutive')) {
            return 'consistency';
        }
        if (titleLower.includes('questions') || titleLower.includes('quiz')) {
            return 'milestone';
        }

        return 'milestone'; // default
    }
}