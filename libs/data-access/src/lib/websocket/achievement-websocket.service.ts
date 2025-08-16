import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {WebSocketService} from './websocket.service';
import {Achievement, ConfettiLevel, WebSocketConnectionState} from './types';

@Injectable({
    providedIn: 'root'
})
export class AchievementWebSocketService implements OnDestroy {
    private destroy$ = new Subject<void>();
    private readonly DEBUG_MODE = false; // Set to true for debugging
    
    // Connection tracking to prevent duplicates
    private isConnecting = false;
    private currentUserId: string | null = null;
    
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
    connect(userId: string, token?: string): Observable<WebSocketConnectionState> {
        // Prevent duplicate connections for the same user
        if (this.isConnecting && this.currentUserId === userId) {
            if (this.DEBUG_MODE) {
                console.log('Connection already in progress for user:', userId);
            }
            return this.webSocketService.connectionState$;
        }

        if (this.webSocketService.isReadyForEvents() && this.currentUserId === userId) {
            if (this.DEBUG_MODE) {
                console.log('Already connected for user:', userId);
            }
            return this.webSocketService.connectionState$;
        }

        this.isConnecting = true;
        this.currentUserId = userId;

        // Connect to WebSocket with token
        this.webSocketService.connect(userId, token);

        // Use a single subscription with proper state management to prevent duplicates
        this.webSocketService.connectionState$.pipe(
            takeUntil(this.destroy$),
            // Add distinctUntilChanged to prevent duplicate state processing
            distinctUntilChanged((prev, curr) => 
                prev.isConnected === curr.isConnected &&
                prev.isAuthenticated === curr.isAuthenticated &&
                prev.isSubscribed === curr.isSubscribed
            )
        ).subscribe(state => {
            // State machine approach - handle each state transition once
            if (state.isConnected && !state.isAuthenticated && this.currentUserId === userId) {
                this.webSocketService.authenticate(userId, token);
            } else if (state.isAuthenticated && !state.isSubscribed && this.currentUserId === userId) {
                this.webSocketService.subscribeToAchievements();
            } else if (state.isAuthenticated && state.isSubscribed) {
                this.isConnecting = false; // Connection process complete
            }
            
            // Reset connection state on disconnect
            if (!state.isConnected) {
                this.isConnecting = false;
            }
        });

        return this.webSocketService.connectionState$;
    }

    /**
     * Disconnect from achievement WebSocket
     */
    disconnect(): void {
        this.webSocketService.disconnect();
        this.isConnecting = false;
        this.currentUserId = null;
        // Reset all subjects to clean state
        this.currentStreakSubject.next(0);
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
        // Remove take(1) to handle reconnection scenarios properly
        this.webSocketService.on('authentication-success').pipe(
            takeUntil(this.destroy$)
        ).subscribe((data) => {
            if (this.DEBUG_MODE) {
                console.log('Achievement WebSocket authenticated:', data);
            }
            // Update current streak on each successful authentication
            this.currentStreakSubject.next(data.currentStreak || 0);
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