// WebSocket Event Type Definitions for Real-Time Achievements

export interface WebSocketEventMap {
    // Connection Events
    connected: { message: string; timestamp: Date };
    'authentication-success': { currentStreak: number; message: string };
    'authentication-error': { message: string };
    'subscription-success': { message: string };
    error: { message: string };

    // Achievement Events
    'achievement-earned': {
        achievementId: string;
        title: string;
        description: string;
        badgeIcon: string;
        confettiLevel: string;
        points: number;
        earnedAt: Date;
        timestamp: Date;
    };

    // Streak Events
    'streak-updated': {
        currentStreak: number;
        longestStreak: number;
        isNewRecord: boolean;
        timestamp: Date;
    };

    'streak-milestone': {
        streak: number;
        message: string;
        timestamp: Date;
    };

    'streak-broken': {
        previousStreak: number;
        message: string;
        timestamp: Date;
    };

    'current-streak': {
        currentStreak: number;
    };

    // Daily Events
    'daily-milestone': {
        type: 'daily-champion';
        accuracy: number;
        message: string;
        timestamp: Date;
    };

    // Encouragement
    encouragement: {
        message: string;
        type: 'streak' | 'accuracy' | 'progress' | 'milestone';
        timestamp: Date;
    };

    // Global Updates
    'global-update': {
        timestamp: Date;
        [key: string]: unknown;
    };
}

// Outgoing Event Types (Client -> Server)
export interface OutgoingEventMap {
    authenticate: { userId: string; token?: string };
    'subscribe-to-achievements': Record<string, never>;
    'get-current-streak': Record<string, never>;
}

// Achievement Confetti Levels
export type ConfettiLevel = 'basic' | 'excellent' | 'perfect' | 'milestone';

// Achievement Types
export interface Achievement {
    id: string;
    title: string;
    description: string;
    badgeIcon: string;
    confettiLevel: ConfettiLevel;
    points: number;
    category: 'streak' | 'accuracy' | 'consistency' | 'milestone';
}

// Real-time Event Handlers
export type EventHandler<T extends keyof WebSocketEventMap> = (data: WebSocketEventMap[T]) => void;

// Connection State
export interface WebSocketConnectionState {
    isConnected: boolean;
    isAuthenticated: boolean;
    isSubscribed: boolean;
    connectionError: string | null;
    reconnectAttempts: number;
    userId: string | null;
}

// WebSocket Service Configuration
export interface WebSocketConfig {
    url: string;
    namespace: string;
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectInterval: number;
    timeout: number;
}