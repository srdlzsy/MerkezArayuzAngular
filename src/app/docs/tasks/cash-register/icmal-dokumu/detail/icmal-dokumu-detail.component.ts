import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  IBanknoteMovementsCT,
  ICashier,
  ICashRegisterDetails,
  IGiftCheckMovementsCT,
  ISummariesCT,
  ISummariesDetailsCT
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import {
  IcmalSummaryPrintModel,
  SummaryPrintComponent
} from './summary-print/summary-print.component';

interface DetailFeedback {
  tone: 'info' | 'error';
  title: string;
  message: string;
}

@Component({
  selector: 'app-icmal-dokumu-detail',
  standalone: true,
  imports: [CommonModule, SummaryPrintComponent],
  templateUrl: './icmal-dokumu-detail.component.html',
  styleUrl: './icmal-dokumu-detail.component.scss'
})
export class IcmalDokumuDetailComponent
  extends DocsTaskDialogBase<ISummariesCT>
  implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-sayimlari'];
  protected readonly summary = this.data;

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);

  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<DetailFeedback | null>(null);
  protected readonly loadIssues = signal<string[]>([]);
  protected readonly summariesDetails = signal<ISummariesDetailsCT[]>([]);
  protected readonly banknoteMovements = signal<IBanknoteMovementsCT[]>([]);
  protected readonly giftCheckMovements = signal<IGiftCheckMovementsCT[]>([]);
  protected readonly cashierAndManagerList = signal<ICashier[]>([]);
  protected readonly zTotalValue = signal<number | null>(null);
  protected readonly cashRegisterDetail = signal<ICashRegisterDetails | null>(null);

  protected readonly warehouseNo = computed(() => {
    const summary = this.summary;
    const currentWarehouseNo = this.authService.currentUser()?.depoNo ?? null;

    if (typeof currentWarehouseNo === 'number' && currentWarehouseNo > 0) {
      return currentWarehouseNo;
    }

    const summaryWarehouseNo = this.extractFirstNumber(summary?.warehouse);
    return summaryWarehouseNo ?? 0;
  });
  protected readonly warehouseName = computed(
    () => this.authService.currentUser()?.depoIsmi?.trim() || this.summary?.warehouse || '-'
  );
  protected readonly cashierName = computed(() =>
    this.resolveCashierName(this.summary?.cashierNo ?? 0)
  );
  protected readonly managerName = computed(() =>
    this.resolveCashierName(this.summary?.managerNo ?? 0)
  );
  protected readonly creditCards = computed(() =>
    this.summariesDetails().filter((item) => item.paymentTypeID >= 0 && item.paymentTypeID < 50)
  );
  protected readonly foodChecks = computed(() =>
    this.summariesDetails().filter((item) => item.paymentTypeID >= 50 && item.paymentTypeID < 100)
  );
  protected readonly expenseCompass = computed(() =>
    this.summariesDetails().filter((item) => item.paymentTypeID === 100)
  );
  protected readonly storeExpenses = computed(() =>
    this.summariesDetails().filter((item) => item.paymentTypeID >= 110 && item.paymentTypeID < 600)
  );
  protected readonly onlineSales = computed(() =>
    this.summariesDetails().filter((item) => item.paymentTypeID >= 600)
  );
  protected readonly banknoteTotal = computed(() =>
    this.sumBy(this.banknoteMovements(), (item) => item.total)
  );
  protected readonly banknoteQuantity = computed(() =>
    this.sumBy(this.banknoteMovements(), (item) => item.quantity)
  );
  protected readonly giftCheckTotal = computed(() =>
    this.sumBy(this.giftCheckMovements(), (item) => item.total)
  );
  protected readonly giftCheckQuantity = computed(() =>
    this.sumBy(this.giftCheckMovements(), (item) => item.quantity)
  );
  protected readonly creditCardsTotal = computed(() =>
    this.sumBy(this.creditCards(), (item) => item.amount)
  );
  protected readonly creditCardsQuantity = computed(() =>
    this.sumBy(this.creditCards(), (item) => item.slipNumber)
  );
  protected readonly foodChecksTotal = computed(() =>
    this.sumBy(this.foodChecks(), (item) => item.amount)
  );
  protected readonly foodChecksQuantity = computed(() =>
    this.sumBy(this.foodChecks(), (item) => item.slipNumber)
  );
  protected readonly onlineSalesTotal = computed(() =>
    this.sumBy(this.onlineSales(), (item) => item.amount)
  );
  protected readonly onlineSalesQuantity = computed(() =>
    this.sumBy(this.onlineSales(), (item) => item.slipNumber)
  );
  protected readonly expenseCompassTotal = computed(() =>
    this.sumBy(this.expenseCompass(), (item) => item.amount)
  );
  protected readonly expenseCompassQuantity = computed(() =>
    this.sumBy(this.expenseCompass(), (item) => item.slipNumber)
  );
  protected readonly storeExpensesTotal = computed(() =>
    this.sumBy(this.storeExpenses(), (item) => item.amount)
  );
  protected readonly generalTotal = computed(
    () =>
      this.banknoteTotal() +
      this.creditCardsTotal() +
      this.foodChecksTotal() +
      this.storeExpensesTotal() +
      this.onlineSalesTotal()
  );
  protected readonly differenceTotal = computed(
    () => this.generalTotal() - (this.zTotalValue() ?? 0)
  );
  protected readonly printModel = computed<IcmalSummaryPrintModel | null>(() => {
    const summary = this.summary;

    if (!summary) {
      return null;
    }

    return {
      summary,
      banknoteMovements: this.banknoteMovements(),
      giftCheckMovements: this.giftCheckMovements(),
      creditCards: this.creditCards(),
      foodChecks: this.foodChecks(),
      expenseCompass: this.expenseCompass(),
      storeExpenses: this.storeExpenses(),
      onlineSales: this.onlineSales(),
      banknoteTotal: this.banknoteTotal(),
      banknoteQuantity: this.banknoteQuantity(),
      giftCheckTotal: this.giftCheckTotal(),
      giftCheckQuantity: this.giftCheckQuantity(),
      creditCardsTotal: this.creditCardsTotal(),
      creditCardsQuantity: this.creditCardsQuantity(),
      foodChecksTotal: this.foodChecksTotal(),
      foodChecksQuantity: this.foodChecksQuantity(),
      onlineSalesTotal: this.onlineSalesTotal(),
      onlineSalesQuantity: this.onlineSalesQuantity(),
      expenseCompassTotal: this.expenseCompassTotal(),
      expenseCompassQuantity: this.expenseCompassQuantity(),
      storeExpensesTotal: this.storeExpensesTotal(),
      generalTotal: this.generalTotal(),
      differenceTotal: this.differenceTotal(),
      cashierName: this.cashierName(),
      managerName: this.managerName(),
      zTotalValue: this.zTotalValue(),
      warehouseNo: this.warehouseNo(),
      warehouseName: this.warehouseName(),
      cashRegisterDetail: this.cashRegisterDetail()
    };
  });

  ngOnInit(): void {
    if (!this.summary) {
      this.feedback.set({
        tone: 'error',
        title: 'Icmal verisi bulunamadi',
        message: 'Detay ekrani acilirken gerekli kayit bilgisi tasinamadi.'
      });
      return;
    }

    this.loadDetailData();
  }

  protected printSummary(): void {
    if (!this.printModel()) {
      return;
    }

    this.printWithStylesheet('/assets/summaryPrint.css');
  }

  protected formatSummaryDate(value: Date | string | null | undefined): string {
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

  private loadDetailData(): void {
    const summary = this.summary;

    if (!summary) {
      return;
    }

    const warehouseNo = this.warehouseNo();
    const canRequestZTotal = warehouseNo > 0;

    this.feedback.set(null);
    this.loadIssues.set([]);
    this.isLoading.set(true);
    const issues: string[] = [];
    let pendingRequests = canRequestZTotal ? 6 : 5;

    const finalizeRequest = () => {
      pendingRequests -= 1;

      if (pendingRequests > 0) {
        return;
      }

      this.isLoading.set(false);
      this.loadIssues.set(issues);

      if (issues.length) {
        this.feedback.set({
          tone: 'info',
          title: 'Bazi alanlar eksik geldi',
          message: issues.join(' ')
        });
      }
    };

    this.kasaIslemleriService
      .getIcmalDetaylari(summary.documentSerie, summary.documentOrderNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: ISummariesDetailsCT[]) => {
          this.summariesDetails.set(items);
          finalizeRequest();
        },
        error: () => {
          this.summariesDetails.set([]);
          issues.push('Odeme detaylari getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getNakitHareketDetayi(summary.documentSerie, summary.documentOrderNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IBanknoteMovementsCT[]) => {
          this.banknoteMovements.set(
            items.filter((item) => this.toSafeNumber(item.quantity) !== 0)
          );
          finalizeRequest();
        },
        error: () => {
          this.banknoteMovements.set([]);
          issues.push('Nakit hareket detayi getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getHediyeCekiHareketDetaylari(summary.documentSerie, summary.documentOrderNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IGiftCheckMovementsCT[]) => {
          this.giftCheckMovements.set(
            items.filter((item) => this.toSafeNumber(item.quantity) !== 0)
          );
          finalizeRequest();
        },
        error: () => {
          this.giftCheckMovements.set([]);
          issues.push('Hediye ceki hareketleri getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getKasiyerVeMudur(String(summary.cashierNo), String(summary.managerNo))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: ICashier[]) => {
          this.cashierAndManagerList.set(items);
          finalizeRequest();
        },
        error: () => {
          this.cashierAndManagerList.set([]);
          issues.push('Kasiyer ve duzenleyen bilgileri getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getKasaKayitDetayi(summary.cashNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail: ICashRegisterDetails | null) => {
          this.cashRegisterDetail.set(detail);

          if (!detail) {
            issues.push('Kasa kayit detayi getirilemedi.');
          }

          finalizeRequest();
        },
        error: () => {
          this.cashRegisterDetail.set(null);
          issues.push('Kasa kayit detayi getirilemedi.');
          finalizeRequest();
        }
      });

    if (!canRequestZTotal) {
      this.zTotalValue.set(null);
      issues.push('Depo numarasi bulunamadigi icin Z raporu tutari alinmadi.');
      finalizeRequest();
      return;
    }

    this.kasaIslemleriService
      .getZRaporuToplamDeger(summary.documentSerie, warehouseNo, summary.zReportNo, summary.cashNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value: number | null) => {
          this.zTotalValue.set(value);

          if (value === null) {
            issues.push('Z raporu toplami getirilemedi.');
          }

          finalizeRequest();
        },
        error: () => {
          this.zTotalValue.set(null);
          issues.push('Z raporu toplami getirilemedi.');
          finalizeRequest();
        }
      });
  }

  private resolveCashierName(code: number): string {
    if (!code) {
      return '-';
    }

    const cashier = this.cashierAndManagerList().find(
      (item) => this.toSafeNumber(item.kasiyerKodu) === code
    );

    if (!cashier) {
      return `${code} - Bulunamadi`;
    }

    return [code, cashier.kasiyerAdi, cashier.kasiyerSoyadi]
      .map((value) => this.toSafeString(value))
      .filter((value) => !!value.trim())
      .join(' ')
      .trim();
  }

  private extractFirstNumber(value: string | null | undefined): number | null {
    if (!value?.trim()) {
      return null;
    }

    const match = value.match(/\d+/);

    if (!match) {
      return null;
    }

    const parsedValue = Number(match[0]);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private sumBy<T>(
    items: readonly T[],
    selector: (item: T) => unknown
  ): number {
    return items.reduce((total, item) => total + this.toSafeNumber(selector(item)), 0);
  }

  private toSafeNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return 0;
  }

  private toSafeString(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private printWithStylesheet(stylesheetHref: string): void {
    const existingLink = document.getElementById('icmal-dokumu-print-style');
    const existingStyle = document.getElementById('icmal-dokumu-print-shell');

    existingLink?.remove();
    existingStyle?.remove();

    const link = document.createElement('link');
    link.id = 'icmal-dokumu-print-style';
    link.rel = 'stylesheet';
    link.href = stylesheetHref;

    const shellStyle = document.createElement('style');
    shellStyle.id = 'icmal-dokumu-print-shell';
    shellStyle.textContent = `
      @media print {
        body * {
          visibility: hidden !important;
        }

        .cdk-overlay-container,
        .cdk-overlay-container * {
          visibility: visible !important;
        }

        .cdk-overlay-backdrop,
        .icmal-print-hidden {
          display: none !important;
        }

        .docs-task-dialog-panel,
        .cdk-dialog-container,
        .dialog-page,
        .dialog-body {
          width: 100% !important;
          max-width: none !important;
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .icmal-print-root,
        .icmal-print-root * {
          visibility: visible !important;
        }

        .icmal-print-root {
          display: block !important;
        }
      }
    `;

    const cleanup = () => {
      link.remove();
      shellStyle.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(link);
    document.head.appendChild(shellStyle);
    window.addEventListener('afterprint', cleanup);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }
}

