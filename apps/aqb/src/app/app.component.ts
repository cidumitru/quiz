import {ChangeDetectorRef, Component, inject, OnDestroy, signal} from '@angular/core';
import {AppConfig} from "./core/services/app-config.service";
import {MediaMatcher} from "@angular/cdk/layout";
import {RouterOutlet, RouterLink, RouterLinkActive} from "@angular/router";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatSidenavModule,
        MatListModule
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
    private changeDetectorRef = inject(ChangeDetectorRef);
    private media = inject(MediaMatcher);
    protected appConfig = inject(AppConfig);

    title = signal('quizz');
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
}