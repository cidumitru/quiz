import {Component} from '@angular/core';
import {AppConfig} from "./services/app-config.service";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'quizz';

    constructor(public appConfig: AppConfig) {
    }
}
