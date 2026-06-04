import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  IFurpaGreenGrocerBranchReportItemApiDto,
  IFurpaGreenGrocerBranchReportResponseApiDto,
  IFurpaGreenGrocerDeleteOrderResponseApiDto,
  IFurpaGreenGrocerLazyBranchApiDto,
  IFurpaGreenGrocerProductReportApiResponse,
  IFurpaGreenGrocerProductReportItemApiDto,
  IFurpaGreenGrocerSummaryReportItemApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { GreenGrocerService } from '../../../../../core/api/module-services/green-grocer.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type ReportTab = 'summary' | 'byBranch' | 'byProduct' | 'greens';
type FeedbackTone = 'error' | 'info' | 'success';

interface PageFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface ReportTabOption {
  id: ReportTab;
  label: string;
  description: string;
}

interface ProductReportRow {
  key: string;
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  breakdownItems: IFurpaGreenGrocerBranchReportItemApiDto[];
}

interface GreenGrocerReportBundle {
  summary: IFurpaGreenGrocerSummaryReportItemApiDto[];
  branchReport: IFurpaGreenGrocerBranchReportResponseApiDto;
  productReport: IFurpaGreenGrocerProductReportApiResponse;
  greens: IFurpaGreenGrocerBranchReportItemApiDto[];
}

const TASK_ID = 'green-grocer-reports';
const LIST_PERMISSION = 'green-grocer.reports.list';
const UPDATE_PERMISSION = 'green-grocer.reports.update';

const REPORT_TABS: readonly ReportTabOption[] = [
  {
    id: 'summary',
    label: 'Genel',
    description: 'Urun ve tip bazinda toplam'
  },
  {
    id: 'byBranch',
    label: 'Sube / Evrak',
    description: 'Siparis evraki kirilimi'
  },
  {
    id: 'byProduct',
    label: 'Urun',
    description: 'Urun toplam ve evrak detayi'
  },
  {
    id: 'greens',
    label: 'Yesillik',
    description: 'Tip 12 satirlari'
  }
];

@Component({
  selector: 'app-green-grocer-reports-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './green-grocer-reports-list.component.html',
  styleUrl: './green-grocer-reports-list.component.scss'
})
export class GreenGrocerReportsListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly tabs = REPORT_TABS;
  protected readonly filtersForm = new FormGroup({
    targetDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    })
  });
  protected readonly maxTargetDate = this.getToday();

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private loadSequence = 0;
  private readonly quantityFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  protected readonly activeTab = signal<ReportTab>('summary');
  protected readonly summaryItems = signal<IFurpaGreenGrocerSummaryReportItemApiDto[]>([]);
  protected readonly branchItems = signal<IFurpaGreenGrocerBranchReportItemApiDto[]>([]);
  protected readonly lazyBranches = signal<IFurpaGreenGrocerLazyBranchApiDto[]>([]);
  protected readonly productItems = signal<IFurpaGreenGrocerProductReportItemApiDto[]>([]);
  protected readonly greenItems = signal<IFurpaGreenGrocerBranchReportItemApiDto[]>([]);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly deletingKey = signal<string | null>(null);
  protected readonly selectedProductKey = signal<string | null>(null);
  protected readonly lastLoadedDate = signal(this.getToday());

  protected readonly permissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(TASK_ID))
  );
  protected readonly canViewReports = computed(
    () =>
      this.authService.hasTaskAccess(TASK_ID) ||
      this.hasPermission(this.permissionCodes(), LIST_PERMISSION)
  );
  protected readonly canDeleteOrders = computed(() =>
    this.hasPermission(this.permissionCodes(), UPDATE_PERMISSION)
  );
  protected readonly requestPath = computed(() => {
    const targetDate = this.filtersForm.controls.targetDate.value.trim() || 'YYYY-MM-DD';
    return `/api/green-grocer/reports/summary?date=${targetDate}`;
  });
  protected readonly summaryTotalQuantity = computed(() =>
    this.summaryItems().reduce((total, item) => total + this.toSafeNumber(item.quantity), 0)
  );
  protected readonly branchDocumentCount = computed(() =>
    this.countUniqueDocuments(this.branchItems())
  );
  protected readonly branchCount = computed(() => this.countUniqueBranches(this.branchItems()));
  protected readonly greenTotalQuantity = computed(() =>
    this.greenItems().reduce((total, item) => total + this.toSafeNumber(item.quantity), 0)
  );
  protected readonly productRows = computed<ProductReportRow[]>(() =>
    this.productItems()
      .map((item) => this.mapProductRow(item))
      .sort((left, right) => {
        if (right.quantity !== left.quantity) {
          return right.quantity - left.quantity;
        }

        return left.productName.localeCompare(right.productName, 'tr-TR');
      })
  );
  protected readonly selectedProduct = computed<ProductReportRow | null>(() => {
    const rows = this.productRows();
    return rows.find((row) => row.key === this.selectedProductKey()) ?? rows[0] ?? null;
  });
  protected readonly hasAnyReportData = computed(
    () =>
      this.summaryItems().length > 0 ||
      this.branchItems().length > 0 ||
      this.productItems().length > 0 ||
      this.greenItems().length > 0 ||
      this.lazyBranches().length > 0
  );

  protected readonly trackBySummary = (
    _index: number,
    item: IFurpaGreenGrocerSummaryReportItemApiDto
  ): string => `${item.typeCode}|${item.productCode}`;
  protected readonly trackByBranchItem = (
    _index: number,
    item: IFurpaGreenGrocerBranchReportItemApiDto
  ): string => this.buildDocumentLineKey(item);
  protected readonly trackByLazyBranch = (
    _index: number,
    item: IFurpaGreenGrocerLazyBranchApiDto
  ): string => `${item.branchNo}|${item.regionCode}`;
  protected readonly trackByProduct = (_index: number, item: ProductReportRow): string =>
    item.key;
  protected readonly trackByTab = (_index: number, item: ReportTabOption): string => item.id;

  constructor() {
    this.loadReports();
  }

  protected loadReports(feedbackAfterLoad?: PageFeedback): void {
    const targetDate = this.filtersForm.controls.targetDate.value.trim();

    if (!targetDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: 'Manav raporlarini getirmek icin once bir gun secin.'
      });
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);
    this.loadReportsInParallel(targetDate, feedbackAfterLoad);
  }

  protected selectTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  protected selectProduct(row: ProductReportRow): void {
    this.selectedProductKey.set(row.key);
  }

  protected deleteOrder(item: IFurpaGreenGrocerBranchReportItemApiDto): void {
    if (!this.canDeleteOrders()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki gerekli',
        message: 'Manav siparisi silmek icin green-grocer.reports.update yetkisi gerekiyor.'
      });
      return;
    }

    const documentLabel = this.formatDocument(item);
    const confirmed = window.confirm(`${documentLabel} evraki silinsin mi?`);

    if (!confirmed) {
      return;
    }

    this.deletingKey.set(this.buildDocumentKey(item));

    this.greenGrocerService
      .deleteOrder(item.documentSerie, this.toSafeNumber(item.documentOrderNo), item.branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingKey.set(null))
      )
      .subscribe({
        next: (response: IFurpaGreenGrocerDeleteOrderResponseApiDto) => {
          this.loadReports({
            tone: 'success',
            title: 'Siparis silindi',
            message: `${response.documentSerie}-${response.documentOrderNo} icin ${response.deletedLineCount} satir silindi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: this.resolveDeleteErrorTitle(error),
            message: this.resolveErrorMessage(
              error,
              'Manav siparisi silinirken bir hata olustu.'
            )
          });
        }
      });
  }

  protected isDeleting(item: IFurpaGreenGrocerBranchReportItemApiDto): boolean {
    return this.deletingKey() === this.buildDocumentKey(item);
  }

  protected getTabCount(tab: ReportTab): number {
    switch (tab) {
      case 'summary':
        return this.summaryItems().length;
      case 'byBranch':
        return this.branchItems().length;
      case 'byProduct':
        return this.productRows().length;
      case 'greens':
        return this.greenItems().length;
      default:
        return 0;
    }
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedDate);
  }

  protected formatQuantity(value: number | null | undefined): string {
    return this.quantityFormatter.format(this.toSafeNumber(value));
  }

  protected formatDocument(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    const serie = item.documentSerie?.trim() || '-';
    const orderNo = this.toSafeNumber(item.documentOrderNo);

    return `${serie}-${orderNo || '-'}`;
  }

  protected formatBranch(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    const branchName = item.branchName?.trim() ?? '';

    if (branchName && Number.isFinite(item.branchNo)) {
      return `${branchName} (${item.branchNo})`;
    }

    if (branchName) {
      return branchName;
    }

    return Number.isFinite(item.branchNo) ? `Sube ${item.branchNo}` : '-';
  }

  protected getTypeLabel(typeCode: string | null | undefined): string {
    switch ((typeCode ?? '').trim()) {
      case '10':
        return 'Manav 10';
      case '11':
        return 'Manav 11';
      case '12':
        return 'Yesillik 12';
      default:
        return typeCode?.trim() ? `Tip ${typeCode}` : '-';
    }
  }

  private loadReportsInParallel(targetDate: string, feedbackAfterLoad?: PageFeedback): void {
    const requestId = (this.loadSequence += 1);
    const bundle: GreenGrocerReportBundle = {
      summary: [],
      branchReport: {
        items: [],
        lazyBranches: []
      },
      productReport: [],
      greens: []
    };
    let completedCount = 0;
    let failed = false;

    const completeOne = (): void => {
      if (failed || requestId !== this.loadSequence) {
        return;
      }

      completedCount += 1;

      if (completedCount < 4) {
        return;
      }

      this.applyReportBundle(targetDate, bundle, feedbackAfterLoad);
      this.isLoading.set(false);
    };

    const handleError = (error: HttpErrorResponse): void => {
      if (failed || requestId !== this.loadSequence) {
        return;
      }

      failed = true;
      this.clearReportData();
      this.isLoading.set(false);
      this.feedback.set({
        tone: 'error',
        title: 'Raporlar yuklenemedi',
        message: this.resolveErrorMessage(
          error,
          'GreenGrocer raporlari alinirken bir hata olustu.'
        )
      });
    };

    this.greenGrocerService
      .getSummary(targetDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary: IFurpaGreenGrocerSummaryReportItemApiDto[]) => {
          bundle.summary = summary ?? [];
        },
        error: handleError,
        complete: completeOne
      });

    this.greenGrocerService
      .getByBranch(targetDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branchReport: IFurpaGreenGrocerBranchReportResponseApiDto) => {
          bundle.branchReport = branchReport;
        },
        error: handleError,
        complete: completeOne
      });

    this.greenGrocerService
      .getByProduct(targetDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (productReport: IFurpaGreenGrocerProductReportApiResponse) => {
          bundle.productReport = productReport;
        },
        error: handleError,
        complete: completeOne
      });

    this.greenGrocerService
      .getGreens(targetDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (greens: IFurpaGreenGrocerBranchReportItemApiDto[]) => {
          bundle.greens = greens ?? [];
        },
        error: handleError,
        complete: completeOne
      });
  }

  private applyReportBundle(
    targetDate: string,
    bundle: GreenGrocerReportBundle,
    feedbackAfterLoad?: PageFeedback
  ): void {
    const branchReport = this.normalizeBranchReport(bundle.branchReport);

    this.summaryItems.set(this.sortSummaryItems(bundle.summary ?? []));
    this.branchItems.set(this.sortBranchItems(branchReport.items ?? []));
    this.lazyBranches.set(this.sortLazyBranches(branchReport.lazyBranches ?? []));
    this.productItems.set(this.normalizeProductResponse(bundle.productReport));
    this.greenItems.set(this.sortBranchItems(bundle.greens ?? []));
    this.lastLoadedDate.set(targetDate);
    this.ensureSelectedProduct();

    if (feedbackAfterLoad) {
      this.feedback.set(feedbackAfterLoad);
      return;
    }

    if (!this.hasAnyReportData()) {
      this.feedback.set({
        tone: 'info',
        title: 'Kayit bulunamadi',
        message: 'Secilen tarih icin manav veya yesillik raporu donmedi.'
      });
    }
  }

  private clearReportData(): void {
    this.summaryItems.set([]);
    this.branchItems.set([]);
    this.lazyBranches.set([]);
    this.productItems.set([]);
    this.greenItems.set([]);
    this.selectedProductKey.set(null);
  }

  private mapProductRow(item: IFurpaGreenGrocerProductReportItemApiDto): ProductReportRow {
    return {
      key: `${item.typeCode}|${item.productCode}`,
      typeCode: item.typeCode,
      productCode: item.productCode,
      productName: item.productName,
      quantity: this.toSafeNumber(item.totalQuantity ?? item.quantity),
      breakdownItems: this.getProductBreakdownItems(item)
    };
  }

  private getProductBreakdownItems(
    item: IFurpaGreenGrocerProductReportItemApiDto
  ): IFurpaGreenGrocerBranchReportItemApiDto[] {
    const candidates = [
      item.items,
      item.branchItems,
      item.branches,
      item.branchBreakdowns,
      item.documents,
      item.details,
      item.lines
    ];

    return candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0) ?? [];
  }

  private normalizeBranchReport(
    response: IFurpaGreenGrocerBranchReportResponseApiDto | null | undefined
  ): IFurpaGreenGrocerBranchReportResponseApiDto {
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      lazyBranches: Array.isArray(response?.lazyBranches) ? response.lazyBranches : []
    };
  }

  private normalizeProductResponse(
    response: IFurpaGreenGrocerProductReportApiResponse | null | undefined
  ): IFurpaGreenGrocerProductReportItemApiDto[] {
    if (Array.isArray(response)) {
      return this.sortProductItems(response);
    }

    return this.sortProductItems(Array.isArray(response?.items) ? response.items : []);
  }

  private sortSummaryItems(
    items: readonly IFurpaGreenGrocerSummaryReportItemApiDto[]
  ): IFurpaGreenGrocerSummaryReportItemApiDto[] {
    return [...items].sort((left, right) => {
      if (left.typeCode !== right.typeCode) {
        return left.typeCode.localeCompare(right.typeCode, 'tr-TR');
      }

      return left.productName.localeCompare(right.productName, 'tr-TR');
    });
  }

  private sortProductItems(
    items: readonly IFurpaGreenGrocerProductReportItemApiDto[]
  ): IFurpaGreenGrocerProductReportItemApiDto[] {
    return [...items].sort((left, right) => {
      const rightQuantity = this.toSafeNumber(right.totalQuantity ?? right.quantity);
      const leftQuantity = this.toSafeNumber(left.totalQuantity ?? left.quantity);

      if (rightQuantity !== leftQuantity) {
        return rightQuantity - leftQuantity;
      }

      return left.productName.localeCompare(right.productName, 'tr-TR');
    });
  }

  private sortBranchItems(
    items: readonly IFurpaGreenGrocerBranchReportItemApiDto[]
  ): IFurpaGreenGrocerBranchReportItemApiDto[] {
    return [...items].sort((left, right) => {
      const leftBranchNo = this.toSafeNumber(left.branchNo);
      const rightBranchNo = this.toSafeNumber(right.branchNo);

      if (leftBranchNo !== rightBranchNo) {
        return leftBranchNo - rightBranchNo;
      }

      const leftDocument = this.buildDocumentKey(left);
      const rightDocument = this.buildDocumentKey(right);

      if (leftDocument !== rightDocument) {
        return leftDocument.localeCompare(rightDocument, 'tr-TR');
      }

      return left.productName.localeCompare(right.productName, 'tr-TR');
    });
  }

  private sortLazyBranches(
    items: readonly IFurpaGreenGrocerLazyBranchApiDto[]
  ): IFurpaGreenGrocerLazyBranchApiDto[] {
    return [...items].sort((left, right) => {
      const leftBranchNo = this.toSafeNumber(left.branchNo);
      const rightBranchNo = this.toSafeNumber(right.branchNo);

      if (leftBranchNo !== rightBranchNo) {
        return leftBranchNo - rightBranchNo;
      }

      return left.branchName.localeCompare(right.branchName, 'tr-TR');
    });
  }

  private countUniqueDocuments(items: readonly IFurpaGreenGrocerBranchReportItemApiDto[]): number {
    return new Set(items.map((item) => this.buildDocumentKey(item))).size;
  }

  private countUniqueBranches(items: readonly IFurpaGreenGrocerBranchReportItemApiDto[]): number {
    return new Set(items.map((item) => this.toSafeNumber(item.branchNo))).size;
  }

  private ensureSelectedProduct(): void {
    const rows = this.productRows();

    if (!rows.length) {
      this.selectedProductKey.set(null);
      return;
    }

    const selectedKey = this.selectedProductKey();

    if (!selectedKey || !rows.some((row) => row.key === selectedKey)) {
      this.selectedProductKey.set(rows[0].key);
    }
  }

  private buildDocumentLineKey(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    return `${this.buildDocumentKey(item)}|${item.typeCode}|${item.productCode}`;
  }

  private buildDocumentKey(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    return `${item.documentSerie}|${item.documentOrderNo}|${item.branchNo}`;
  }

  private resolveDeleteErrorTitle(error: HttpErrorResponse): string {
    if (error.status === 404) {
      return 'Siparis bulunamadi';
    }

    if (error.status === 409) {
      return 'Silme suresi gecmis';
    }

    return 'Siparis silinemedi';
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }

    if (typeof error.error === 'object' && error.error !== null) {
      const possibleError = error.error as {
        message?: unknown;
        detail?: unknown;
        title?: unknown;
      };
      const apiMessage = possibleError.message ?? possibleError.detail ?? possibleError.title;

      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage.trim();
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }

    return fallback;
  }

  private hasPermission(permissionCodes: readonly string[], code: string): boolean {
    return permissionCodes.includes(this.normalizeText(code));
  }

  private uniquePermissionCodes(values: string[]): string[] {
    return values
      .map((value) => this.normalizeText(value))
      .filter((value, index, items) => !!value && items.indexOf(value) === index);
  }

  private normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim().toLocaleLowerCase('tr-TR');
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim().toLocaleLowerCase('tr-TR');
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

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
