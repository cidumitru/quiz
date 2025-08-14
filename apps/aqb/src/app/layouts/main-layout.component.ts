import {ChangeDetectorRef, Component, inject, OnDestroy, signal} from '@angular/core';
import {AppConfig} from "../core/services/app-config.service";
import {MediaMatcher} from "@angular/cdk/layout";
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatDividerModule} from "@angular/material/divider";
import {ThemeService} from "../core/services/theme.service";
import {AuthService} from "../core/services/auth.service";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatSidenavModule,
        MatListModule,
        MatDividerModule
    ],
    template: `
<div class="app-layout">
    <!-- Material 3 Navigation Rail (Desktop) -->
    @if (!mobileQuery.matches) {
        <nav class="navigation-rail">
            <!-- App Logo -->
            <div class="nav-header">
                <a routerLink="/" class="app-logo-link" matTooltip="AQB Home" matTooltipPosition="right">
                    <img src="logo-light.svg" alt="AQB Logo" class="app-logo logo-light">
                    <img src="logo-dark.svg" alt="AQB Logo" class="app-logo logo-dark">
                </a>
            </div>

            <!-- Navigation Items -->
            <div class="nav-items">
              <button class="nav-item"
                      routerLink="/"
                      routerLinkActive="active"
                        [routerLinkActiveOptions]="{exact: true}">
                    <mat-icon>quiz</mat-icon>
                    <span class="nav-label">Banks</span>
                </button>

              <button class="nav-item"
                      routerLink="/quizzes"
                        routerLinkActive="active">
                    <mat-icon>assignment</mat-icon>
                    <span class="nav-label">Quizzes</span>
                </button>

              <button class="nav-item"
                      routerLink="/statistics"
                        routerLinkActive="active">
                    <mat-icon>analytics</mat-icon>
                    <span class="nav-label">Stats</span>
                </button>
            </div>

            <!-- Bottom Actions -->
            <div class="nav-bottom">
                @if (authService.isLoggedIn$ | async) {
                  <button class="nav-item secondary-action"
                            (click)="onLogout()"
                            matTooltip="Logout"
                            matTooltipPosition="right">
                        <mat-icon>logout</mat-icon>
                    </button>
                }

              <button class="nav-item theme-toggle secondary-action"
                        (click)="themeService.toggleTheme()"
                        [matTooltip]="themeService.getThemeLabel()"
                        matTooltipPosition="right">
                    <mat-icon>{{themeService.getThemeIcon()}}</mat-icon>
                </button>

              <button class="nav-item secondary-action"
                        (click)="openGitHub()"
                        matTooltip="GitHub"
                        matTooltipPosition="right">
                    <mat-icon>code</mat-icon>
                </button>
            </div>
        </nav>

      <!-- Desktop Main Content -->
        <main class="main-content">
            <div class="content-container">
                <router-outlet></router-outlet>
            </div>
            <footer class="build-info">
              <small>Build: {{ appConfig.build_date }}</small>
            </footer>
        </main>
    }

    <!-- Mobile Layout -->
    @if (mobileQuery.matches) {
        <div class="mobile-layout">
            <!-- Mobile Top Bar -->
            <mat-toolbar class="mobile-toolbar">
                <button mat-icon-button (click)="mobileDrawer.toggle()">
                    <mat-icon>menu</mat-icon>
                </button>
                <span class="mobile-title">AQB</span>
                <div class="toolbar-spacer"></div>
                <button mat-icon-button (click)="themeService.toggleTheme()">
                    <mat-icon>{{themeService.getThemeIcon()}}</mat-icon>
                </button>
            </mat-toolbar>

          <!-- Mobile Navigation Drawer -->
            <mat-sidenav-container class="mobile-container">
                <mat-sidenav #mobileDrawer mode="over" class="mobile-drawer">
                    <div class="mobile-nav-header">
                        <div class="mobile-app-logo">
                            <img src="logo-light.svg" alt="AQB Logo" class="mobile-logo logo-light">
                            <img src="logo-dark.svg" alt="AQB Logo" class="mobile-logo logo-dark">
                        </div>
                        <h2>AQB</h2>
                        <p>Aly's Question Bank</p>
                    </div>

                  <mat-divider></mat-divider>

                  <mat-nav-list class="mobile-nav-list">
                        <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="mobileDrawer.close()">
                            <mat-icon matListItemIcon>quiz</mat-icon>
                            <span matListItemTitle>Question Banks</span>
                        </a>
                        <a mat-list-item routerLink="/quizzes" routerLinkActive="active" (click)="mobileDrawer.close()">
                            <mat-icon matListItemIcon>assignment</mat-icon>
                            <span matListItemTitle>Quizzes</span>
                        </a>
                        <a mat-list-item routerLink="/statistics" routerLinkActive="active" (click)="mobileDrawer.close()">
                            <mat-icon matListItemIcon>analytics</mat-icon>
                            <span matListItemTitle>Statistics</span>
                        </a>
                        <mat-divider></mat-divider>
                        @if (authService.isLoggedIn$ | async) {
                          <a mat-list-item (click)="onLogout(); mobileDrawer.close()"
                             (keydown.enter)="onLogout(); mobileDrawer.close()" tabindex="0">
                                <mat-icon matListItemIcon>logout</mat-icon>
                                <span matListItemTitle>Logout</span>
                            </a>
                        }
                    <a mat-list-item (click)="themeService.toggleTheme(); mobileDrawer.close()"
                       (keydown.enter)="themeService.toggleTheme(); mobileDrawer.close()" tabindex="0">
                            <mat-icon matListItemIcon>{{themeService.getThemeIcon()}}</mat-icon>
                            <span matListItemTitle>{{themeService.getThemeLabel()}}</span>
                        </a>
                    <a mat-list-item (click)="openGitHub(); mobileDrawer.close()"
                       (keydown.enter)="openGitHub(); mobileDrawer.close()" tabindex="0">
                            <mat-icon matListItemIcon>code</mat-icon>
                            <span matListItemTitle>GitHub</span>
                        </a>
                    </mat-nav-list>
                </mat-sidenav>

              <mat-sidenav-content>
                    <!-- Mobile Content -->
                    <main class="mobile-content">
                        <div class="content-container">
                            <router-outlet></router-outlet>
                        </div>
                        <footer class="build-info">
                          <small>Build: {{ appConfig.build_date }}</small>
                        </footer>
                    </main>
                </mat-sidenav-content>
            </mat-sidenav-container>
        </div>
    }
</div>
    `,
    styleUrls: ['../app.component.scss']
})
export class MainLayoutComponent implements OnDestroy {
    private changeDetectorRef = inject(ChangeDetectorRef);
    private media = inject(MediaMatcher);
    private router = inject(Router);
    protected appConfig = inject(AppConfig);
    protected themeService = inject(ThemeService);
    protected authService = inject(AuthService);

    title = signal('AQB - Aly\'s Question Bank');
    mobileQuery: MediaQueryList;
    private _mobileQueryListener: () => void;

    constructor() {
        this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
        this._mobileQueryListener = () => this.changeDetectorRef.detectChanges();
        this.mobileQuery.addListener(this._mobileQueryListener);
    }

    ngOnDestroy(): void {
        this.mobileQuery.removeListener(this._mobileQueryListener);
    }

  openGitHub() {
        window.open('https://github.com/cidumitru/quiz', '_blank');
    }

    onLogout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
