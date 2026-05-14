import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type {
  IBanknoteMovementsCT,
  ICashRegisterDetails,
  IGiftCheckMovementsCT,
  ISummariesCT,
  ISummariesDetailsCT
} from '@interfaces';

export interface IcmalSummaryPrintModel {
  summary: ISummariesCT;
  banknoteMovements: readonly IBanknoteMovementsCT[];
  giftCheckMovements: readonly IGiftCheckMovementsCT[];
  creditCards: readonly ISummariesDetailsCT[];
  foodChecks: readonly ISummariesDetailsCT[];
  expenseCompass: readonly ISummariesDetailsCT[];
  storeExpenses: readonly ISummariesDetailsCT[];
  onlineSales: readonly ISummariesDetailsCT[];
  banknoteTotal: number;
  banknoteQuantity: number;
  giftCheckTotal: number;
  giftCheckQuantity: number;
  creditCardsTotal: number;
  creditCardsQuantity: number;
  foodChecksTotal: number;
  foodChecksQuantity: number;
  onlineSalesTotal: number;
  onlineSalesQuantity: number;
  expenseCompassTotal: number;
  expenseCompassQuantity: number;
  storeExpensesTotal: number;
  generalTotal: number;
  differenceTotal: number;
  cashierName: string;
  managerName: string;
  zTotalValue: number | null;
  warehouseNo: number;
  warehouseName: string;
  cashRegisterDetail: ICashRegisterDetails | null;
}

@Component({
  selector: 'app-summary-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-print.component.html',
  styleUrl: './summary-print.component.scss'
})
export class SummaryPrintComponent {
  readonly model = input.required<IcmalSummaryPrintModel>();

  protected readonly formattedSummaryDate = computed(() =>
    this.formatDate(this.model().summary.summaryDate)
  );

  protected banknoteLabel(value: number): string {
    if (value === 200) {
      return 'Iki Yuz Lira';
    }

    if (value === 100) {
      return 'Yuz Lira';
    }

    if (value === 50) {
      return 'Elli Lira';
    }

    if (value === 20) {
      return 'Yirmi Lira';
    }

    if (value === 10) {
      return 'On Lira';
    }

    if (value === 5) {
      return 'Bes Lira';
    }

    if (value === 1) {
      return 'Bir Lira';
    }

    if (value === 0.5) {
      return 'Elli Kurus';
    }

    if (value === 0.25) {
      return 'Yirmi Bes Kurus';
    }

    if (value === 0.1) {
      return 'On Kurus';
    }

    return '-';
  }

  protected formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return typeof value === 'string' ? value : '-';
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedDate);
  }
}
