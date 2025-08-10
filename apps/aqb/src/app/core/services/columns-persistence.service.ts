import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import * as localforage from "localforage";


export interface IColumn {
    id?: string;
    name: string;
    visible: boolean;
}
@Injectable({
    providedIn: "root"
})
export class ColumnsPersistenceService {
        private _columns = new BehaviorSubject<Record<string, IColumn[]>>({});

        public async updateColumnsForTable(tableId: string, columns: IColumn[]): Promise<void> {
            this._columns.next({...this._columns.value, [tableId]: columns.map(c => ({...c, id: c.id || c.name}))});
            await localforage.setItem("columns", this._columns.value);
        }

        public getStoredColumnsForTable(tableId: string): IColumn[] | undefined {
            return this._columns.value[tableId];
        }

        public hasColumnsForTable(tableId: string): boolean {
            return !!this._columns.value[tableId];
        }

        async init(): Promise<void> {
            try {
                const columns = await localforage.getItem<Record<string, IColumn[]>>("columns");
                if (columns) this._columns.next(columns);
            } finally {}
        }
}