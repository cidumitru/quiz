import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";

export interface IAppConfig {
    build_date: string;
}

@Injectable({
    providedIn: 'root'
})
export class AppConfig {
    constructor(private httpClient: HttpClient) {
    }

    private _config!: IAppConfig;

    get config() {
        return this._config;
    }

    init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.httpClient.get<IAppConfig>('./assets/app-config.json').subscribe(config => {
                this._config = config;
                resolve();
            }, error => {
                reject(error);
            });
        });
    }
}