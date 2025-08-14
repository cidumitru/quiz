import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Question } from '@aqb/data-access';
import { QuestionBankStore } from '../../question-bank-store.service';

export class QuestionDataSource extends DataSource<Question | undefined> {
  private readonly store = inject(QuestionBankStore);
  private readonly _pageSize = 50;
  private readonly _fetchedPages = new Set<number>();
  private readonly _dataStream = new BehaviorSubject<(Question | undefined)[]>(
    []
  );
  private readonly _subscription = new Subscription();

  private _cachedData: (Question | undefined)[] = [];
  private _totalLength = 0;

  // Expose totalItems as a computed signal from store
  public readonly totalItems = this.store.totalItems;

  constructor() {
    super();

    // Initialize with empty array to trigger initial render
    this._dataStream.next([]);

    // Subscribe to store changes
    this._subscription.add(
      toObservable(this.store.questions).subscribe(
        (questions: (Question | null)[]) => {
          this._cachedData = [...questions] as (Question | undefined)[];
          this._dataStream.next(this._cachedData);
        }
      )
    );

    this._subscription.add(
      toObservable(this.store.totalItems).subscribe((total: number) => {
        this._totalLength = total;
        // Resize cached data array if needed
        if (this._cachedData.length !== total && total > 0) {
          const newData = new Array(total).fill(undefined);
          // Copy existing data
          for (let i = 0; i < Math.min(this._cachedData.length, total); i++) {
            newData[i] = this._cachedData[i];
          }
          this._cachedData = newData;
          this._dataStream.next(this._cachedData);
        }
      })
    );
  }

  connect(
    collectionViewer: CollectionViewer
  ): Observable<(Question | undefined)[]> {
    this._subscription.add(
      collectionViewer.viewChange.subscribe((range) => {
        // Don't wait for totalLength to be set, attempt to fetch if we have a range
        if (range.start === 0 && range.end === 0) {
          return; // No range to display
        }

        // If totalLength is not set yet, use the range.end as an estimate
        const effectiveTotal =
          this._totalLength > 0 ? this._totalLength : range.end;

        const startPage = this._getPageForIndex(range.start);
        const endPage = this._getPageForIndex(
          Math.min(range.end - 1, effectiveTotal - 1)
        );

        for (let i = startPage; i <= endPage; i++) {
          this._fetchPage(i);
        }
      })
    );

    return this._dataStream;
  }

  disconnect(): void {
    this._subscription.unsubscribe();
  }

  // Helper methods for the component
  isQuestionLoading(index: number): boolean {
    return this.store.isQuestionLoading(index);
  }

  getTotalLength(): number {
    return this._totalLength;
  }

  // Method to check if filtering should be applied
  shouldShowQuestion(question: Question | undefined): boolean {
    // This will be used by the component for filtering logic
    return question !== undefined;
  }

  private _getPageForIndex(index: number): number {
    return Math.floor(index / this._pageSize);
  }

  private _fetchPage(page: number): void {
    if (this._fetchedPages.has(page)) {
      return;
    }

    this._fetchedPages.add(page);
    const offset = page * this._pageSize;
    // If totalLength is not yet known, use pageSize as the limit
    const limit =
      this._totalLength > 0
        ? Math.min(this._pageSize, this._totalLength - offset)
        : this._pageSize;

    // Use the store to fetch the page
    this.store.loadQuestionsRange(offset, limit).catch((error) => {
      console.error('Failed to load questions page:', error);
      // Remove from fetched pages so we can retry
      this._fetchedPages.delete(page);
    });
  }
}
