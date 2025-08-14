import {QuestionBankService} from "../../features/question-bank/question-bank.service";
import {inject, Injectable} from "@angular/core";
import {questionBankScheme} from "../../features/question-bank/question-bank.models";
import {lastValueFrom, merge, mergeMap, tap} from "rxjs";

@Injectable({
    providedIn: "root"
})
export class MockDataLoader {
    private questionBank = inject(QuestionBankService);

    async load(): Promise<void> {
        await lastValueFrom(merge(import("./mock-question-banks/thermodynamics.json"), import("./mock-question-banks/solar-system.json")).pipe(
            mergeMap(qb => questionBankScheme.safeParseAsync(qb)),
          tap(qb => {
            if (qb.success) {
              // Transform to QuestionBankDetail format
              const questionBankDetail = {
                ...qb.data,
                createdAt: new Date(qb.data.createdAt).toString(),
                updatedAt: qb.data.editedAt ? new Date(qb.data.editedAt) : new Date(),
                userId: '',
                isDeleted: qb.data.isDeleted || false
              };
              this.questionBank.insertQuestionBank(questionBankDetail);
            }
          })
        ))
    }
}
