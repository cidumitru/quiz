import {inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";

export interface IAppConfig {
    build_date: string;
}

@Injectable({
    providedIn: 'root'
})
export class AppConfig {
    private httpClient = inject(HttpClient);

    private _config!: IAppConfig;

    get config() {
        return this._config;
    }

    init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
          this._config = {
            ...this._config,
            build_date: new Date().toISOString()
          }
          resolve()
        });
    }
}
