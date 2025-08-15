import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {WebSocketConnectionState} from '@aqb/data-access';
import {AchievementWebSocketService, WebSocketService} from "@aqb/data-access/angular";

@Component({
    selector: 'app-test-websocket',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="test-websocket-container">
            <h2>WebSocket Connection Tester</h2>

            <!-- Connection Status -->
            <div class="status-section">
                <h3>Connection Status</h3>
                <div class="status-card" [class]="getStatusClass()">
                    <div class="status-indicator"></div>
                    <div class="status-details">
                        <div class="status-line">
                            <strong>Connected:</strong> {{ connectionState?.isConnected ? 'Yes' : 'No' }}
                        </div>
                        <div class="status-line">
                            <strong>Authenticated:</strong> {{ connectionState?.isAuthenticated ? 'Yes' : 'No' }}
                        </div>
                        <div class="status-line">
                            <strong>Subscribed:</strong> {{ connectionState?.isSubscribed ? 'Yes' : 'No' }}
                        </div>
                        <div class="status-line" *ngIf="connectionState?.connectionError">
                            <strong>Error:</strong> {{ connectionState?.connectionError }}
                        </div>
                        <div class="status-line">
                            <strong>Reconnect Attempts:</strong> {{ connectionState?.reconnectAttempts || 0 }}
                        </div>
                        <div class="status-line">
                            <strong>User ID:</strong> {{ connectionState?.userId || 'Not set' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Connection Controls -->
            <div class="controls-section">
                <h3>Connection Controls</h3>
                <div class="control-group">
                    <label for="userId">User ID:</label>
                    <input
                            type="text"
                            id="userId"
                            [(ngModel)]="testUserId"
                            placeholder="Enter user ID">
                </div>

                <div class="button-group">
                    <button
                            (click)="connect()"
                            [disabled]="connectionState?.isConnected"
                            class="connect-btn">
                        Connect
                    </button>

                    <button
                            (click)="disconnect()"
                            [disabled]="!connectionState?.isConnected"
                            class="disconnect-btn">
                        Disconnect
                    </button>

                    <button
                            (click)="authenticate()"
                            [disabled]="!connectionState?.isConnected || connectionState?.isAuthenticated"
                            class="auth-btn">
                        Authenticate
                    </button>

                    <button
                            (click)="subscribe()"
                            [disabled]="!connectionState?.isAuthenticated || connectionState?.isSubscribed"
                            class="subscribe-btn">
                        Subscribe to Achievements
                    </button>

                    <button
                            (click)="testStreakRequest()"
                            [disabled]="!connectionState?.isSubscribed"
                            class="test-btn">
                        Test Get Current Streak
                    </button>
                </div>
            </div>

            <!-- WebSocket URL Info -->
            <div class="info-section">
                <h3>Connection Info</h3>
                <div class="info-card">
                    <div class="info-line">
                        <strong>WebSocket URL:</strong> {{ getWebSocketUrl() }}
                    </div>
                    <div class="info-line">
                        <strong>Current Location:</strong> {{ getCurrentLocation() }}
                    </div>
                    <div class="info-line">
                        <strong>Protocol:</strong> {{ getProtocol() }}
                    </div>
                </div>
            </div>

            <!-- Event Log -->
            <div class="log-section">
                <div class="log-header">
                    <h3>Event Log</h3>
                    <button (click)="clearLog()" class="clear-btn">Clear Log</button>
                </div>
                <div class="log-container">
                    <div
                            *ngFor="let log of eventLog; trackBy: trackLog"
                            class="log-entry"
                            [class]="getLogClass(log.type)">
                        <span class="log-time">{{ log.timestamp | date:'HH:mm:ss.SSS' }}</span>
                        <span class="log-type">[{{ log.type }}]</span>
                        <span class="log-message">{{ log.message }}</span>
                        <div *ngIf="log.data" class="log-data">{{ log.data | json }}</div>
                    </div>
                </div>
            </div>

            <!-- Current Streak Display -->
            <div class="streak-section" *ngIf="currentStreak !== null">
                <h3>Current Streak</h3>
                <div class="streak-display">
                    <div class="streak-number">{{ currentStreak }}</div>
                    <div class="streak-label">correct answers in a row</div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .test-websocket-container {
            padding: 24px;
            max-width: 1000px;
            margin: 0 auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        h2 {
            color: #333;
            margin-bottom: 24px;
            text-align: center;
        }

        h3 {
            color: #555;
            margin: 0 0 16px 0;
            font-size: 18px;
        }

        .status-section,
        .controls-section,
        .info-section,
        .log-section,
        .streak-section {
            margin-bottom: 32px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .status-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #ccc;
        }

        .status-card.connected {
            border-left-color: #4CAF50;
            background: #f1f8e9;
        }

        .status-card.connecting {
            border-left-color: #FF9800;
            background: #fff8e1;
        }

        .status-card.disconnected {
            border-left-color: #f44336;
            background: #ffebee;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ccc;
        }

        .status-card.connected .status-indicator {
            background: #4CAF50;
        }

        .status-card.connecting .status-indicator {
            background: #FF9800;
        }

        .status-card.disconnected .status-indicator {
            background: #f44336;
        }

        .status-details {
            flex: 1;
        }

        .status-line {
            margin: 4px 0;
            font-size: 14px;
        }

        .control-group {
            margin-bottom: 16px;
        }

        .control-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #555;
        }

        .control-group input {
            width: 200px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .button-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        button {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        button:disabled {
            background: #ccc !important;
            cursor: not-allowed;
        }

        .connect-btn {
            background: #4CAF50;
            color: white;
        }

        .connect-btn:hover:not(:disabled) {
            background: #45a049;
        }

        .disconnect-btn {
            background: #f44336;
            color: white;
        }

        .disconnect-btn:hover:not(:disabled) {
            background: #da190b;
        }

        .auth-btn {
            background: #2196F3;
            color: white;
        }

        .auth-btn:hover:not(:disabled) {
            background: #0b7dda;
        }

        .subscribe-btn {
            background: #FF9800;
            color: white;
        }

        .subscribe-btn:hover:not(:disabled) {
            background: #e68900;
        }

        .test-btn {
            background: #9C27B0;
            color: white;
        }

        .test-btn:hover:not(:disabled) {
            background: #7b1fa2;
        }

        .clear-btn {
            background: #607D8B;
            color: white;
            font-size: 12px;
            padding: 6px 12px;
        }

        .clear-btn:hover {
            background: #455a64;
        }

        .info-card {
            padding: 16px;
            background: #f5f5f5;
            border-radius: 4px;
        }

        .info-line {
            margin: 8px 0;
            font-size: 14px;
        }

        .log-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .log-container {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            background: #f9f9f9;
        }

        .log-entry {
            margin: 4px 0;
            padding: 6px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
        }

        .log-entry.info {
            background: #e3f2fd;
            border-left: 3px solid #2196F3;
        }

        .log-entry.success {
            background: #e8f5e8;
            border-left: 3px solid #4CAF50;
        }

        .log-entry.error {
            background: #ffebee;
            border-left: 3px solid #f44336;
        }

        .log-entry.warning {
            background: #fff8e1;
            border-left: 3px solid #FF9800;
        }

        .log-time {
            color: #666;
            margin-right: 8px;
        }

        .log-type {
            font-weight: bold;
            margin-right: 8px;
        }

        .log-data {
            margin-top: 4px;
            padding: 4px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 2px;
            font-size: 11px;
            white-space: pre-wrap;
        }

        .streak-display {
            text-align: center;
            padding: 24px;
            background: linear-gradient(135deg, #4ECDC4, #45B7D1);
            border-radius: 8px;
            color: white;
        }

        .streak-number {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .streak-label {
            font-size: 16px;
            opacity: 0.9;
        }
    `]
})
export class TestWebSocketComponent implements OnInit, OnDestroy {
    testUserId = 'user123';
    connectionState: WebSocketConnectionState | null = null;
    currentStreak: number | null = null;
    eventLog: Array<{
        timestamp: Date;
        type: 'info' | 'success' | 'error' | 'warning';
        message: string;
        data?: any;
    }> = [];

    private destroy$ = new Subject<void>();

    constructor(
        private webSocketService: WebSocketService,
        private achievementWebSocketService: AchievementWebSocketService
    ) {
    }

    ngOnInit(): void {
        this.setupConnectionMonitoring();
        this.setupEventListeners();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.disconnect();
    }

    connect(): void {
        this.addLog('info', 'Attempting to connect...', {userId: this.testUserId});

        this.achievementWebSocketService.connect(this.testUserId).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (data) => {
                this.addLog('success', 'Connection data received', data);
            },
            error: (error) => {
                this.addLog('error', 'Connection failed', error);
            }
        });
    }

    disconnect(): void {
        this.addLog('info', 'Disconnecting...');
        this.achievementWebSocketService.disconnect();
        this.currentStreak = null;
    }

    authenticate(): void {
        this.addLog('info', 'Authenticating...', {userId: this.testUserId});
        this.webSocketService.authenticate(this.testUserId);
    }

    subscribe(): void {
        this.addLog('info', 'Subscribing to achievements...');
        this.webSocketService.subscribeToAchievements();
    }

    testStreakRequest(): void {
        this.addLog('info', 'Requesting current streak...');
        this.achievementWebSocketService.getCurrentStreak();
    }

    clearLog(): void {
        this.eventLog = [];
    }

    getStatusClass(): string {
        if (!this.connectionState) return 'disconnected';
        if (this.connectionState.isConnected && this.connectionState.isAuthenticated) {
            return 'connected';
        }
        if (this.connectionState.isConnected) {
            return 'connecting';
        }
        return 'disconnected';
    }

    getLogClass(type: string): string {
        return type;
    }

    getWebSocketUrl(): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.hostname === 'localhost' ? '3000' : window.location.port;
        return `${protocol}//${host}:${port}/achievements`;
    }

    getCurrentLocation(): string {
        return window.location.href;
    }

    getProtocol(): string {
        return window.location.protocol;
    }

    trackLog(index: number, log: any): string {
        return log.timestamp.getTime().toString();
    }

    private setupConnectionMonitoring(): void {
        this.achievementWebSocketService.connectionState$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((state) => {
            this.connectionState = state;
            this.addLog('info', 'Connection state changed', state);
        });

        this.achievementWebSocketService.currentStreak$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((streak) => {
            this.currentStreak = streak;
            this.addLog('success', 'Streak updated', {streak});
        });
    }

    private setupEventListeners(): void {
        // Listen for various achievement events
        this.achievementWebSocketService.achievements$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((achievement) => {
            this.addLog('success', 'Achievement earned!', achievement);
        });

        this.achievementWebSocketService.streakUpdates$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((update) => {
            this.addLog('info', 'Streak update received', update);
        });

        this.achievementWebSocketService.encouragement$.pipe(
            takeUntil(this.destroy$)
        ).subscribe((encouragement) => {
            this.addLog('info', 'Encouragement received', encouragement);
        });
    }

    private addLog(type: 'info' | 'success' | 'error' | 'warning', message: string, data?: any): void {
        this.eventLog.unshift({
            timestamp: new Date(),
            type,
            message,
            data
        });

        // Keep only last 50 entries
        if (this.eventLog.length > 50) {
            this.eventLog = this.eventLog.slice(0, 50);
        }
    }
}