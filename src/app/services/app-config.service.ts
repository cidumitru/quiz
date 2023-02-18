import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";

export interface IAppConfig {
    build_date: string;
}
@Injectable({
    providedIn: 'root'
})
export class AppConfig {
    private _config!: IAppConfig;

    constructor(private httpClient: HttpClient) {}

    init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.httpClient.get<IAppConfig>('/assets/app-config.json').subscribe(config => {
                this._config = config;
                resolve();
            }, error => {
                reject(error);
            });
        });
    }
    get config() {
        return this._config;
    }
}