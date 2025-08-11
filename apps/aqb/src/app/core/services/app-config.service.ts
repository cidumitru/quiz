import {inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {firstValueFrom} from "rxjs";

export interface IAppConfig {
    build_date: string;
}

@Injectable({
    providedIn: 'root'
})
export class AppConfig {
    private httpClient = inject(HttpClient);

    private _config!: IAppConfig;

  get build_date() {
    return this._config.build_date ?? 'unknown';
    }

  async init(): Promise<void> {
    try {
      this._config = await firstValueFrom(this.httpClient.get<IAppConfig>('./public/app-config.json'));
    } catch (error) {
      console.error('App config load failed:', error);
      throw error;
    }
    }
}
