// Shared WebSocket Constants (sync with frontend)
export const WEBSOCKET_CHANNELS = {
    ACHIEVEMENTS: '/achievements',
} as const;

export const WEBSOCKET_EVENTS = {
    // Connection Events
    CONNECTED: 'connected',
    AUTHENTICATE: 'authenticate',
    AUTHENTICATION_SUCCESS: 'authentication-success',
    AUTHENTICATION_ERROR: 'authentication-error',
    SUBSCRIBE_TO_ACHIEVEMENTS: 'subscribe-to-achievements',
    SUBSCRIPTION_SUCCESS: 'subscription-success',
    ERROR: 'error',

    // Achievement Events
    ACHIEVEMENT_EARNED: 'achievement-earned',

    // Streak Events
    STREAK_UPDATED: 'streak-updated',
    STREAK_MILESTONE: 'streak-milestone',
    STREAK_BROKEN: 'streak-broken',
    GET_CURRENT_STREAK: 'get-current-streak',
    CURRENT_STREAK: 'current-streak',

    // Daily Events
    DAILY_MILESTONE: 'daily-milestone',

    // Encouragement
    ENCOURAGEMENT: 'encouragement',

    // Global Updates
    GLOBAL_UPDATE: 'global-update',
} as const;

export const CONFETTI_LEVELS = {
    BASIC: 'basic',
    EXCELLENT: 'excellent',
    PERFECT: 'perfect',
    MILESTONE: 'milestone',
} as const;

export const ACHIEVEMENT_CATEGORIES = {
    STREAK: 'streak',
    ACCURACY: 'accuracy',
    CONSISTENCY: 'consistency',
    MILESTONE: 'milestone',
} as const;

export const ENCOURAGEMENT_TYPES = {
    STREAK: 'streak',
    ACCURACY: 'accuracy',
    PROGRESS: 'progress',
    MILESTONE: 'milestone',
} as const;