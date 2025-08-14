import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {OutgoingEventMap, WebSocketConfig, WebSocketConnectionState, WebSocketEventMap} from './types';
import {WEBSOCKET_CHANNELS, WEBSOCKET_CONFIG} from './constants';
import {io, Socket} from 'socket.io-client';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private socket: Socket | null = null;
    private config: WebSocketConfig;

    // Socket.IO internal events to filter out
    private readonly INTERNAL_EVENTS = [
        'connect', 'disconnect', 'connect_error', 'connect_timeout',
        'reconnect', 'reconnect_attempt', 'reconnecting', 'reconnect_error',
        'reconnect_failed', 'ping', 'pong'
    ];

    // Debug mode flag (set to false in production)
    private readonly DEBUG_MODE = false;

    // Connection state management
    private connectionStateSubject = new BehaviorSubject<WebSocketConnectionState>({
        isConnected: false,
        isAuthenticated: false,
        isSubscribed: false,
        connectionError: null,
        reconnectAttempts: 0,
        userId: null
    });

    public connectionState$ = this.connectionStateSubject.asObservable();

    // Event streams
    private eventSubject = new Subject<{ event: string; data: any }>();
    public events$ = this.eventSubject.asObservable();

    constructor() {
        this.config = this.getDefaultConfig();
    }

    /**
     * Connect to WebSocket with automatic reconnection
     */
    connect(userId?: string): Observable<any> {
        if (this.socket && this.socket.connected) {
            return this.events$;
        }

        this.updateConnectionState({
            reconnectAttempts: 0,
            userId: userId || null,
            connectionError: null
        });

        const socketUrl = this.getApiUrl();
        const namespaceUrl = socketUrl + WEBSOCKET_CHANNELS.ACHIEVEMENTS;
        if (this.DEBUG_MODE) {
            console.log('Connecting to Socket.IO server:', namespaceUrl);
        }

        this.socket = io(namespaceUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            autoConnect: false,
            reconnection: this.config.autoReconnect,
            reconnectionAttempts: this.config.maxReconnectAttempts,
            reconnectionDelay: this.config.reconnectInterval,
            timeout: this.config.timeout
        });

        this.setupSocketEventListeners();

        // Connect the socket
        this.socket.connect();

        return this.events$;
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.updateConnectionState({
            isConnected: false,
            isAuthenticated: false,
            isSubscribed: false,
            userId: null
        });
    }

    /**
     * Send a message to the server
     */
    send<T extends keyof OutgoingEventMap>(event: T, data: OutgoingEventMap[T]): void {
        if (!this.socket || !this.socket.connected) {
            console.error('Socket.IO not connected');
            return;
        }

        this.socket.emit(event as string, data);
    }

    /**
     * Listen for specific event types
     */
    on<T extends keyof WebSocketEventMap>(eventType: T): Observable<WebSocketEventMap[T]> {
        return this.events$.pipe(
            filter(({event}) => event === eventType),
            map(({data}) => data as WebSocketEventMap[T])
        );
    }

    /**
     * Authenticate user
     */
    authenticate(userId: string, token?: string): void {
        this.send('authenticate', {userId, token});
        this.updateConnectionState({userId});

        // Listen for authentication response (with take(1) to prevent duplicates)
        this.on('authentication-success').pipe(take(1)).subscribe(() => {
            this.updateConnectionState({isAuthenticated: true});
        });

        this.on('authentication-error').pipe(take(1)).subscribe((error) => {
            this.updateConnectionState({
                isAuthenticated: false,
                connectionError: error.message
            });
        });
    }

    /**
     * Subscribe to achievement notifications
     */
    subscribeToAchievements(): void {
        if (!this.connectionStateSubject.value.isAuthenticated) {
            console.error('Must be authenticated before subscribing');
            return;
        }

        this.send('subscribe-to-achievements', {});

        // Use take(1) to ensure single subscription
        this.on('subscription-success').pipe(take(1)).subscribe(() => {
            this.updateConnectionState({isSubscribed: true});
        });
    }

    /**
     * Get current connection state
     */
    getConnectionState(): WebSocketConnectionState {
        return this.connectionStateSubject.value;
    }

    /**
     * Check if connected and authenticated
     */
    isReadyForEvents(): boolean {
        const state = this.connectionStateSubject.value;
        return state.isConnected && state.isAuthenticated && state.isSubscribed;
    }

    private getDefaultConfig(): WebSocketConfig {
        const apiUrl = this.getApiUrl();
        return {
            url: `${apiUrl}${WEBSOCKET_CHANNELS.ACHIEVEMENTS}`,
            namespace: WEBSOCKET_CHANNELS.ACHIEVEMENTS,
            autoReconnect: true,
            maxReconnectAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectInterval: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
            timeout: WEBSOCKET_CONFIG.DEFAULT_TIMEOUT
        };
    }

    private getApiUrl(): string {
        // In production, this would come from environment config
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const host = window.location.hostname;
            const port = window.location.hostname === 'localhost' ? '3000' : window.location.port;
            return `${protocol}//${host}:${port}`;
        }
        return 'http://localhost:3000';
    }

    private setupSocketEventListeners(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            if (this.DEBUG_MODE) {
                console.log('Socket.IO connected');
            }
            this.updateConnectionState({
                isConnected: true,
                connectionError: null,
                reconnectAttempts: 0
            });
        });

        this.socket.on('disconnect', (reason) => {
            if (this.DEBUG_MODE) {
                console.log('Socket.IO disconnected:', reason);
            }
            this.updateConnectionState({
                isConnected: false,
                isAuthenticated: false,
                isSubscribed: false
            });
        });

        this.socket.on('connect_error', (error) => {
            if (this.DEBUG_MODE) {
                console.error('Socket.IO connection error:', error);
            }
            const state = this.connectionStateSubject.value;
            this.updateConnectionState({
                connectionError: error.message || 'Connection failed',
                reconnectAttempts: state.reconnectAttempts + 1
            });
        });

        this.socket.on('reconnect', (attemptNumber) => {
            if (this.DEBUG_MODE) {
                console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
            }
            this.updateConnectionState({
                isConnected: true,
                connectionError: null,
                reconnectAttempts: 0
            });
        });

        this.socket.on('reconnect_error', (error) => {
            if (this.DEBUG_MODE) {
                console.error('Socket.IO reconnection error:', error);
            }
            const state = this.connectionStateSubject.value;
            this.updateConnectionState({
                connectionError: error.message || 'Reconnection failed',
                reconnectAttempts: state.reconnectAttempts + 1
            });
        });

        // Listen for all events and forward them (excluding internal Socket.IO events)
        this.socket.onAny((eventName: string, data: any) => {
            // Filter out internal Socket.IO events to prevent flooding
            if (!this.INTERNAL_EVENTS.includes(eventName)) {
                if (this.DEBUG_MODE) {
                    console.log('Socket.IO event received:', eventName, data);
                }
                this.eventSubject.next({event: eventName, data});
            }
        });
    }

    private updateConnectionState(updates: Partial<WebSocketConnectionState>): void {
        const currentState = this.connectionStateSubject.value;
        const newState = {...currentState, ...updates};
        this.connectionStateSubject.next(newState);
    }
}