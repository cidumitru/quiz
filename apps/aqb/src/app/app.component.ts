import {ChangeDetectorRef, Component, inject, OnDestroy, signal} from '@angular/core';
import {AppConfig} from "./core/services/app-config.service";
import {MediaMatcher} from "@angular/cdk/layout";
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from "@angular/router";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatDividerModule} from "@angular/material/divider";
import {ThemeService} from "./core/services/theme.service";
import {AuthService} from "./core/services/auth.service";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-root',
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
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
    private changeDetectorRef = inject(ChangeDetectorRef);
    private media = inject(MediaMatcher);
    private router = inject(Router);
    protected appConfig = inject(AppConfig);
    protected themeService = inject(ThemeService);
    protected authService = inject(AuthService);

    title = signal('quizz');
    mobileQuery: MediaQueryList;
    private _mobileQueryListener: () => void;
    isNavExpanded = false;

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