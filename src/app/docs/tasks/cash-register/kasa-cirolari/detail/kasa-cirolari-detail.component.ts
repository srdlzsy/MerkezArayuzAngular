import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  CashTurnoverDetailDto,
  CashTurnoverListItemDto,
  CashTurnoverRouteSource
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import { CashTurnoverDetailDialogData } from '../kasa-cirolari.models';

interface DetailFeedback {
  tone: 'info' | 'error';
  title: string;
  message: string;
}

function toDateOnly(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.includes('T')
    ? normalizedValue.split('T')[0] ?? normalizedValue
    : normalizedValue;
}

function isCashTurnoverDetailDialogData(
  value: CashTurnoverListItemDto | CashTurnoverDetailDialogData | null
): value is CashTurnoverDetailDialogData {
  return !!value && 'summary' in value && !!value.summary;
}

@Component({
  selector: 'app-kasa-cirolari-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kasa-cirolari-detail.component.html',
  styleUrl: './kasa-cirolari-detail.component.scss'
})
export class KasaCirolariDetailComponent
  extends DocsTaskDialogBase<CashTurnoverListItemDto | CashTurnoverDetailDialogData>
  implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-cirolari'];

  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly dialogData = this.data;
  protected readonly summary = isCashTurnoverDetailDialogData(this.dialogData)
    ? this.dialogData.summary
    : this.dialogData;
  protected readonly routeSource: CashTurnoverRouteSource =
    isCashTurnoverDetailDialogData(this.dialogData)
      ? this.dialogData.routeSource
      : this.dialogData?.source ?? 'new';

  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<DetailFeedback | null>(null);
  protected readonly detail = signal<CashTurnoverDetailDto | null>(null);

  protected readonly header = computed(() => this.detail()?.header ?? this.summary ?? null);
  protected readonly cashierDisplayLabel = computed(() => {
    const header = this.header();

    if (!header) {
      return '-';
    }

    return header.cashierName?.trim() || header.cashierCode || '-';
  });
  protected readonly payments = computed(() => this.detail()?.payments ?? []);
  protected readonly paymentCount = computed(() => this.payments().length);
  protected readonly paymentAmountTotal = computed(() =>
    this.sumBy(this.payments(), (item) => item.amount)
  );
  protected readonly paymentCommissionTotal = computed(() =>
    this.sumBy(this.payments(), (item) => item.customerCommission)
  );
  protected readonly paymentNetTotal = computed(() =>
    this.sumBy(this.payments(), (item) => item.netAmount)
  );
  protected readonly commissionRate = computed(() => {
    const header = this.header();

    if (!header) {
      return 0;
    }

    const totalCollectionAmount = this.toSafeNumber(header.totalCollectionAmount);

    if (!totalCollectionAmount) {
      return 0;
    }

    return (this.toSafeNumber(header.totalCustomerCommission) / totalCollectionAmount) * 100;
  });

  ngOnInit(): void {
    if (!this.summary) {
      this.feedback.set({
        tone: 'error',
        title: 'Kayit bilgisi bulunamadi',
        message: 'Detay ekrani acilirken secili kasa ciro kaydi okunamadi.'
      });
      return;
    }

    this.loadDetail();
  }

  protected formatBusinessDate(value: string | null | undefined): string {
    const dateText = toDateOnly(value);

    if (!dateText) {
      return '-';
    }

    const [year, month, day] = dateText.split('-');

    if (!year || !month || !day) {
      return dateText;
    }

    return `${day}.${month}.${year}`;
  }

  protected formatWarehouse(header: CashTurnoverListItemDto | null): string {
    if (!header) {
      return '-';
    }

    const warehouseName = header.warehouseName?.trim() ?? '';

    if (warehouseName && Number.isFinite(header.warehouseNo)) {
      return `${warehouseName} (${header.warehouseNo})`;
    }

    if (warehouseName) {
      return warehouseName;
    }

    return Number.isFinite(header.warehouseNo) ? String(header.warehouseNo) : '-';
  }

  private loadDetail(): void {
    const summary = this.summary;

    if (!summary) {
      return;
    }

    this.isLoading.set(true);
    this.feedback.set(null);

    this.kasaIslemleriService
      .getKasaCiroDetay(
        toDateOnly(summary.businessDate),
        summary.shiftNo,
        summary.cashierCode,
        summary.warehouseNo,
        this.routeSource
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail: CashTurnoverDetailDto) => {
          this.detail.set(detail);
          this.isLoading.set(false);

          if (!detail.payments?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Odeme kirilimi bos',
              message: 'Kaydin ust toplam bilgisi geldi fakat odeme kirilimi bulunamadi.'
            });
          }
        },
        error: (error: unknown) => {
          this.detail.set(null);
          this.isLoading.set(false);
          this.feedback.set({
            tone: 'error',
            title: 'Detay yuklenemedi',
            message: this.resolveErrorMessage(error)
          });
        }
      });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Secilen tarih, vardiya ve kasiyer icin kasa ciro detayi bulunamadi.';
      }

      if (
        typeof error.error === 'object' &&
        error.error !== null &&
        'detail' in error.error &&
        typeof error.error.detail === 'string' &&
        error.error.detail.trim()
      ) {
        return error.error.detail;
      }

      if (
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        typeof error.error.message === 'string' &&
        error.error.message.trim()
      ) {
        return error.error.message;
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
    }

    return 'Kasa ciro detayi getirilirken beklenmeyen bir hata olustu.';
  }

  private sumBy<T>(items: readonly T[], selector: (item: T) => unknown): number {
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
}
