import {computed, effect, inject, Injectable, signal} from "@angular/core";
import {BehaviorSubject, firstValueFrom, map, Observable, tap} from "rxjs";
import {omit, values} from "lodash";
import {IQuestionBank, IQuestionCreate} from "./question-bank.models";
import {QuestionBankApiService} from "@aqb/data-access";

@Injectable()
export class QuestionBankService {
    private readonly api = inject(QuestionBankApiService);

  // Signals for modern state management
    private _questionBanks = signal<Record<string, IQuestionBank>>({});
    private _loading = signal<boolean>(false);
    private _error = signal<string | null>(null);

  // Computed values
    public questionBanks = computed(() => this._questionBanks());
    public questionBankArr = computed(() => values(this._questionBanks()));
    public loading = computed(() => this._loading());
    public error = computed(() => this._error());
  // Keep RxJS compatibility for now
    private _questionBanksSubject = new BehaviorSubject<Record<string, IQuestionBank>>({});

  // Getter for backward compatibility
    public get questionBanksValue() {
        return this._questionBanks();
    }
    public questionBankArr$ = this._questionBanksSubject.asObservable().pipe(
        map(quizzes => values(quizzes)),
    );

    constructor() {
        // Sync signals with RxJS subjects for backward compatibility
        effect(() => {
            this._questionBanksSubject.next(this._questionBanks());
        });
    }

    async init() {
      // TODO: Reconsider
      if (this.questionBankArr().length > 0 && !this.loading()) {
        return;
      }
        this._loading.set(true);
        this._error.set(null);

      try {
            // First, try to load from API
            const response = await firstValueFrom(this.api.list());
            const banks: Record<string, IQuestionBank> = {};

        response.questionBanks.forEach(bank => {
                banks[bank.id] = bank;
            });

        this._questionBanks.set(banks);

        // Check if there's local data to migrate
        //     const localData = await localForage.getItem("questionBanks");
        //     if (localData) {
        //         const localBanks = JSON.parse(localData as string) as Record<string, IQuestionBank>;
        //
        //       // Migrate each local question bank to the database
        //         for (const bank of Object.values(localBanks)) {
        //             if (!banks[bank.id]) {
        //                 try {
        //                     await firstValueFrom(this.api.insert(bank));
        //                 } catch (error) {
        //                     console.error('Failed to migrate question bank:', bank.id, error);
        //                 }
        //             }
        //         }
        //
        //       // Clear local storage after successful migration
        //         await localForage.removeItem("questionBanks");
        //
        //       // Reload from API to get migrated data
        //         const updatedResponse = await firstValueFrom(this.api.list());
        //         const updatedBanks: Record<string, IQuestionBank> = {};
        //
        //       updatedResponse.questionBanks.forEach(bank => {
        //             updatedBanks[bank.id] = bank;
        //         });
        //
        //       this._questionBanks.set(updatedBanks);
        //     }
        } catch (error) {
            this._error.set('Failed to load question banks');
            console.error('Failed to load question banks:', error);

        // Fallback to local storage if API fails
        //     const localData = await localForage.getItem("questionBanks");
        //     this._questionBanks.set(JSON.parse(localData as string) || {});
        } finally {
            this._loading.set(false);
        }
    }

    async create(): Promise<string> {
        this._loading.set(true);
        this._error.set(null);

      try {
            const response = await firstValueFrom(this.api.create());
            const questionBank = response.questionBank;

        this._questionBanks.update(current => ({
                ...current,
                [questionBank.id]: questionBank
            }));

        return questionBank.id;
        } catch (error) {
            this._error.set('Failed to create question bank');
            console.error('Failed to create question bank:', error);
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async updateQuestionBank(id: string, name: string): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

      try {
            await firstValueFrom(this.api.update({ id, name }));

        this._questionBanks.update(current => ({
                ...current,
                [id]: { ...current[id], name }
            }));
        } catch (error) {
            this._error.set('Failed to update question bank');
            console.error('Failed to update question bank:', error);
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async insertQuestionBank(questionBank: IQuestionBank): Promise<void> {
        this._error.set(null);

      try {
            const response = await firstValueFrom(this.api.insert(questionBank));
            const insertedBank = response.questionBank;

        this._questionBanks.update(current => ({
                ...current,
                [insertedBank.id]: insertedBank
            }));
        } catch (error) {
            this._error.set('Failed to insert question bank');
            console.error('Failed to insert question bank:', error);
            throw error;
        }
    }

    async addQuestion(questionBankId: string, question: IQuestionCreate | IQuestionCreate[]): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

      try {
            await firstValueFrom(this.api.addQuestion({
                questionBankId,
                questions: question
            }));

        // Reload the question bank to get updated data
            const response = await firstValueFrom(this.api.get(questionBankId));
            const updatedBank = response.questionBank;

        this._questionBanks.update(current => ({
                ...current,
                [questionBankId]: updatedBank
            }));
        } catch (error) {
            this._error.set('Failed to add question');
            console.error('Failed to add question:', error);
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    watchQuestionBank(id: string): Observable<IQuestionBank> {
        // First, fetch latest from API
        this.api.get(id).pipe(
            tap(response => {
                const bank = response.questionBank;
                this._questionBanks.update(current => ({
                    ...current,
                    [id]: bank
                }));
            })
        ).subscribe({
            error: (error) => {
                console.error('Failed to fetch question bank:', error);
            }
        });

      return this._questionBanksSubject.pipe(map(banks => banks[id]));
    }

    async delete(id: string): Promise<void> {
        this._error.set(null);

      try {
            await firstValueFrom(this.api.delete({ id }));

        this._questionBanks.update(current => omit(current, id));
        } catch (error) {
            this._error.set('Failed to delete question bank');
            console.error('Failed to delete question bank:', error);
            throw error;
        }
    }

    async setCorrectAnswer(questionBankId: string, questionId: string, correctAnswerId: string): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

      try {
            await firstValueFrom(this.api.setCorrectAnswer({
                questionBankId,
                questionId,
                correctAnswerId
            }));

        // Update local state optimistically
            this._questionBanks.update(current => ({
                ...current,
                [questionBankId]: {
                    ...current[questionBankId],
                    editedAt: new Date().toISOString(),
                    questions: current[questionBankId].questions.map((question) => {
                        if (question.id === questionId) {
                            return {
                                ...question,
                                answers: question.answers.map((answer) => ({
                                    ...answer,
                                    correct: answer.id === correctAnswerId
                                }))
                            }
                        }
                        return question;
                    })
                }
            }));
        } catch (error) {
            this._error.set('Failed to set correct answer');
            console.error('Failed to set correct answer:', error);
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async deleteQuestion(questionBankId: string, questionId: string): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

      try {
            await firstValueFrom(this.api.deleteQuestion({
                questionBankId,
                questionId
            }));

        // Update local state optimistically
            this._questionBanks.update(current => ({
                ...current,
                [questionBankId]: {
                    ...current[questionBankId],
                    editedAt: new Date().toISOString(),
                    questions: current[questionBankId].questions.filter((question) => question.id !== questionId)
                }
            }));
        } catch (error) {
            this._error.set('Failed to delete question');
            console.error('Failed to delete question:', error);
            throw error;
        } finally {
            this._loading.set(false);
        }
    }
}
