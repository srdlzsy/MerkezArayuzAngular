import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  GreenGrocerProductCaseInfoDto,
  GreenGrocerReportDateHttpRequest,
  GreenGrocerReportTypeOptionDto,
  IFurpaGreenGrocerBranchReportItemApiDto,
  IFurpaGreenGrocerBranchReportResponseApiDto,
  IFurpaGreenGrocerDeleteOrderResponseApiDto,
  IFurpaGreenGrocerLazyBranchApiDto,
  IFurpaGreenGrocerProductReportApiResponse,
  IFurpaGreenGrocerProductReportItemApiDto,
  IFurpaGreenGrocerSummaryReportItemApiDto,
} from '@interfaces';
import { finalize } from 'rxjs';

import { GreenGrocerService } from '../../../../../core/api/module-services/green-grocer.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ExcelExportButtonComponent } from '../../../core/excel-export/excel-export-button.component';
import {
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  toPositiveWarehouseNo,
} from '../../../core/admin-warehouse.helpers';
import {
  ExcelExportColumn,
  ExcelExportSheet,
  exportRowsToExcel,
} from '../../../core/excel-export/excel-export.utils';
import { DocumentPrintService } from '../../../core/document-print/document-print.service';

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
  typeLabel: string;
  productCode: string;
  productName: string;
  stockName: string;
  unitName: string;
  primaryBarcode: string;
  quantity: number;
  caseInfo: GreenGrocerProductCaseInfoDto | null;
  breakdownItems: IFurpaGreenGrocerBranchReportItemApiDto[];
}

interface GreenGrocerReportBundle {
  summary: IFurpaGreenGrocerSummaryReportItemApiDto[];
  branchReport: IFurpaGreenGrocerBranchReportResponseApiDto;
  productReport: IFurpaGreenGrocerProductReportApiResponse;
  greens: IFurpaGreenGrocerBranchReportItemApiDto[];
}

interface SummaryGroup {
  typeCode: string;
  typeLabel: string;
  totalQuantity: number;
  items: IFurpaGreenGrocerSummaryReportItemApiDto[];
}

interface DocumentGroup {
  key: string;
  branchLabel: string;
  branchNo: number;
  regionLabel: string;
  documentLabel: string;
  orderDate: string | null | undefined;
  totalQuantity: number;
  typeLabels: string[];
  items: IFurpaGreenGrocerBranchReportItemApiDto[];
  canDelete: boolean;
}

interface ProductBreakdownExportRow {
  typeLabel: string;
  typeCode: string;
  productCode: string;
  productName: string;
  stockName: string;
  unitName: string;
  primaryBarcode: string;
  orderDate: string | null | undefined;
  branchNo: number | null | undefined;
  branchName: string | null | undefined;
  documentLabel: string;
  quantity: number;
  caseText: string;
  caseAverageText: string;
}

const TASK_ID = 'green-grocer-reports';
const LIST_PERMISSION = 'green-grocer.reports.list';
const UPDATE_PERMISSION = 'green-grocer.reports.update';
const ALL_WAREHOUSES_PERMISSION = 'green-grocer.reports.all-warehouses';

const REPORT_TABS: readonly ReportTabOption[] = [
  {
    id: 'summary',
    label: 'Genel',
    description: 'Urun ve tip bazinda toplam',
  },
  {
    id: 'byBranch',
    label: 'Sube / Evrak',
    description: 'Siparis evraki kirilimi',
  },
  {
    id: 'byProduct',
    label: 'Urun',
    description: 'Urun toplam ve evrak detayi',
  },
  {
    id: 'greens',
    label: 'Yesillik',
    description: 'Tip 12 satirlari',
  },
];

@Component({
  selector: 'app-manav-raporlari-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ExcelExportButtonComponent],
  templateUrl: './manav-raporlari-list.component.html',
  styleUrl: './manav-raporlari-list.component.scss',
})
export class ManavRaporlariListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly tabs = REPORT_TABS;
  protected readonly filtersForm = new FormGroup({
    targetDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    warehouseNo: new FormControl<number | null>(null, {
      validators: [Validators.min(1)],
    }),
  });
  protected readonly maxTargetDate = this.getToday();

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly documentPrintService = inject(DocumentPrintService);
  private loadSequence = 0;
  private readonly quantityFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected readonly activeTab = signal<ReportTab>('summary');
  protected readonly typeOptions = signal<GreenGrocerReportTypeOptionDto[]>([]);
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
  protected readonly exportingReport = signal<ReportTab | null>(null);
  protected readonly exportErrorMessage = signal<string | null>(null);

  protected readonly permissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(TASK_ID)),
  );
  protected readonly currentUser = computed(() => this.authService.currentUser());
  protected readonly canUseAllWarehouses = computed(() =>
    currentUserHasPermission(this.currentUser(), ALL_WAREHOUSES_PERMISSION),
  );
  protected readonly warehouseScopeLabel = computed(() => {
    if (this.canUseAllWarehouses()) {
      const warehouseNo = toPositiveWarehouseNo(this.filtersForm.controls.warehouseNo.value);
      return warehouseNo ? `Depo ${warehouseNo}` : 'Tum Depolar';
    }

    return formatCurrentWarehouseLabel(this.currentUser());
  });
  protected readonly canViewReports = computed(
    () =>
      this.authService.hasTaskAccess(TASK_ID) ||
      this.hasPermission(this.permissionCodes(), LIST_PERMISSION),
  );
  protected readonly canDeleteOrders = computed(() =>
    this.hasPermission(this.permissionCodes(), UPDATE_PERMISSION),
  );
  protected readonly summaryTotalQuantity = computed(() =>
    this.summaryItems().reduce((total, item) => total + this.toSafeNumber(item.quantity), 0),
  );
  protected readonly branchDocumentCount = computed(() =>
    this.countUniqueDocuments(this.branchItems()),
  );
  protected readonly branchCount = computed(() => this.countUniqueBranches(this.branchItems()));
  protected readonly greenTotalQuantity = computed(() =>
    this.greenItems().reduce((total, item) => total + this.toSafeNumber(item.quantity), 0),
  );
  protected readonly summaryGroups = computed<SummaryGroup[]>(() =>
    this.groupSummaryItems(this.summaryItems()),
  );
  protected readonly branchDocumentGroups = computed<DocumentGroup[]>(() =>
    this.groupDocumentItems(this.branchItems(), true),
  );
  protected readonly greenDocumentGroups = computed<DocumentGroup[]>(() =>
    this.groupDocumentItems(this.greenItems(), false),
  );
  protected readonly productRows = computed<ProductReportRow[]>(() =>
    this.productItems()
      .map((item) => this.mapProductRow(item))
      .sort((left, right) => {
        const typeOrder = this.getTypeSortOrder(left.typeCode) - this.getTypeSortOrder(right.typeCode);
        if (typeOrder !== 0) {
          return typeOrder;
        }

        return left.productName.localeCompare(right.productName, 'tr-TR');
      }),
  );
  protected readonly selectedProduct = computed<ProductReportRow | null>(() => {
    const rows = this.productRows();
    return rows.find((row) => row.key === this.selectedProductKey()) ?? rows[0] ?? null;
  });
  protected readonly productBreakdownExportRows = computed<ProductBreakdownExportRow[]>(() =>
    this.productRows().flatMap((product) =>
      product.breakdownItems.map((item) => ({
        typeLabel: this.getReportTypeLabel(item, product.typeLabel),
        typeCode: product.typeCode,
        productCode: this.getProductCode(item) || product.productCode,
        productName: this.getProductName(item) || product.productName,
        stockName: item.stockName?.trim() || item.product?.stockName?.trim() || product.stockName,
        unitName: this.getUnitName(item) || product.unitName,
        primaryBarcode:
          item.primaryBarcode?.trim() ||
          item.product?.primaryBarcode?.trim() ||
          product.primaryBarcode,
        orderDate: item.orderDate,
        branchNo: item.branchNo,
        branchName: item.branchName,
        documentLabel: this.formatDocument(item),
        quantity: this.toSafeNumber(item.quantity),
        caseText: this.formatCaseInfo(item.caseInfo),
        caseAverageText: this.formatCaseAverage(item.caseInfo),
      })),
    ),
  );
  protected readonly hasAnyReportData = computed(
    () =>
      this.summaryItems().length > 0 ||
      this.branchItems().length > 0 ||
      this.productItems().length > 0 ||
      this.greenItems().length > 0 ||
      this.lazyBranches().length > 0,
  );

  protected readonly trackBySummaryGroup = (_index: number, item: SummaryGroup): string =>
    item.typeCode;
  protected readonly trackByDocumentGroup = (_index: number, item: DocumentGroup): string =>
    item.key;
  protected readonly trackBySummary = (
    _index: number,
    item: IFurpaGreenGrocerSummaryReportItemApiDto,
  ): string => `${item.typeCode}|${item.productCode}`;
  protected readonly trackByBranchItem = (
    _index: number,
    item: IFurpaGreenGrocerBranchReportItemApiDto,
  ): string => this.buildDocumentLineKey(item);
  protected readonly trackByLazyBranch = (
    _index: number,
    item: IFurpaGreenGrocerLazyBranchApiDto,
  ): string => `${item.branchNo}|${item.regionCode}`;
  protected readonly trackByProduct = (_index: number, item: ProductReportRow): string => item.key;
  protected readonly trackByTab = (_index: number, item: ReportTabOption): string => item.id;

  constructor() {
    if (!this.canUseAllWarehouses()) {
      this.filtersForm.controls.warehouseNo.disable({ emitEvent: false });
    }

    this.loadTypeOptions();
    this.loadReports();
  }

  protected loadReports(feedbackAfterLoad?: PageFeedback): void {
    const targetDate = this.filtersForm.controls.targetDate.value.trim();

    if (!targetDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: 'Manav raporlarini getirmek icin once bir gun secin.',
      });
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);
    this.loadReportsInParallel(targetDate, this.resolveWarehouseNo(), feedbackAfterLoad);
  }

  protected selectTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  protected selectProduct(row: ProductReportRow): void {
    this.selectedProductKey.set(row.key);
  }

  protected isExporting(tab: ReportTab): boolean {
    return this.exportingReport() === tab;
  }

  protected exportSummaryReport(): Promise<void> {
    return this.exportReport('summary', 'Genel Manav Raporu', [
      {
        sheetName: 'Genel',
        rows: this.summaryItems(),
        columns: this.getSummaryExportColumns(),
      },
    ]);
  }

  protected exportBranchReport(): Promise<void> {
    return this.exportReport('byBranch', 'Sube Evrak Manav Raporu', [
      {
        sheetName: 'Evrak Satirlari',
        rows: this.branchItems(),
        columns: this.getBranchExportColumns(true),
      },
      {
        sheetName: 'Eksik Subeler',
        rows: this.lazyBranches(),
        columns: this.getLazyBranchExportColumns(),
      },
    ]);
  }

  protected exportProductReport(): Promise<void> {
    return this.exportReport('byProduct', 'Urun Bazli Manav Raporu', [
      {
        sheetName: 'Urun Toplamlari',
        rows: this.productRows(),
        columns: this.getProductExportColumns(),
      },
      {
        sheetName: 'Urun Kirilimi',
        rows: this.productBreakdownExportRows(),
        columns: this.getProductBreakdownExportColumns(),
      },
    ]);
  }

  protected exportGreensReport(): Promise<void> {
    return this.exportReport('greens', 'Yesillik Raporu', [
      {
        sheetName: 'Yesillik',
        rows: this.greenItems(),
        columns: this.getBranchExportColumns(false),
      },
    ]);
  }

  protected canPrintReport(tab: ReportTab): boolean {
    switch (tab) {
      case 'summary':
        return this.summaryItems().length > 0;
      case 'byBranch':
        return this.branchItems().length > 0 || this.lazyBranches().length > 0;
      case 'byProduct':
        return this.productRows().length > 0;
      case 'greens':
        return this.greenItems().length > 0;
      default:
        return false;
    }
  }

  protected printReport(tab: ReportTab): void {
    if (!this.canPrintReport(tab)) {
      return;
    }

    const reportTitle = this.getPrintReportTitle(tab);

    const opened = this.documentPrintService.printHtml({
      markup: this.buildPrintMarkup(tab, reportTitle),
      windowFeatures: 'width=900,height=1100',
      printDelayMs: 400,
      closeAfterPrint: true,
    });

    if (!opened) {
      this.feedback.set({
        tone: 'error',
        title: 'Yazdirma acilamadi',
        message: 'Tarayici yeni pencereyi engelledi. Pop-up iznini kontrol edin.',
      });
    }
  }

  protected async deleteOrder(item: IFurpaGreenGrocerBranchReportItemApiDto): Promise<void> {
    if (!this.canDeleteOrders()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki gerekli',
        message: 'Manav siparisi silmek icin green-grocer.reports.update yetkisi gerekiyor.',
      });
      return;
    }

    const documentLabel = this.formatDocument(item);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Manav evraki silinsin mi?',
      message: `${documentLabel} evraki silinecek.`,
      confirmText: 'Sil',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.deletingKey.set(this.buildDocumentKey(item));

    this.greenGrocerService
      .deleteOrder(item.documentSerie, this.toSafeNumber(item.documentOrderNo), item.branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingKey.set(null)),
      )
      .subscribe({
        next: (response: IFurpaGreenGrocerDeleteOrderResponseApiDto) => {
          this.loadReports({
            tone: 'success',
            title: 'Siparis silindi',
            message: `${response.documentSerie}-${response.documentOrderNo} icin ${response.deletedLineCount} satir silindi.`,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: this.resolveDeleteErrorTitle(error),
            message: this.resolveErrorMessage(error, 'Manav siparisi silinirken bir hata olustu.'),
          });
        },
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
        return this.branchDocumentGroups().length;
      case 'byProduct':
        return this.productRows().length;
      case 'greens':
        return this.greenDocumentGroups().length;
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
      timeStyle: 'short',
    }).format(parsedDate);
  }

  protected formatQuantity(value: number | null | undefined): string {
    return this.quantityFormatter.format(this.toSafeNumber(value));
  }

  protected formatCaseInfo(caseInfo: GreenGrocerProductCaseInfoDto | null | undefined): string {
    if (!caseInfo) {
      return '';
    }

    const inputQuantity = this.toFiniteNumber(caseInfo.inputQuantity);
    const estimatedQuantity = this.toFiniteNumber(caseInfo.estimatedQuantity);
    const inputMode = this.getInputModeLabel(caseInfo.inputMode);
    const microUnit = caseInfo.microUnit?.trim() || '';

    if (inputQuantity !== null && estimatedQuantity !== null) {
      return `${this.quantityFormatter.format(inputQuantity)} ${inputMode} ~= ${this.quantityFormatter.format(estimatedQuantity)} ${microUnit}`.trim();
    }

    if (inputQuantity !== null) {
      return `${this.quantityFormatter.format(inputQuantity)} ${inputMode}`.trim();
    }

    return '';
  }

  protected formatCaseAverage(caseInfo: GreenGrocerProductCaseInfoDto | null | undefined): string {
    if (!caseInfo) {
      return '';
    }

    const averageKgPerCase = this.toFiniteNumber(caseInfo.averageKgPerCase);
    const unitsPerCase = this.toFiniteNumber(caseInfo.unitsPerCase);
    const microUnit = caseInfo.microUnit?.trim() || '';

    if (averageKgPerCase !== null) {
      return `Ort ${this.quantityFormatter.format(averageKgPerCase)} ${microUnit}/kasa`;
    }

    if (unitsPerCase !== null) {
      return `Ort ${this.quantityFormatter.format(unitsPerCase)} ${microUnit}/koli`;
    }

    return caseInfo.confidence?.trim() || '';
  }

  protected formatDocument(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    if (item.document?.documentNo?.trim()) {
      return item.document.documentNo.trim();
    }

    const serie = item.documentSerie?.trim() || '-';
    const orderNo = this.toSafeNumber(item.documentOrderNo);

    return `${serie}-${orderNo || '-'}`;
  }

  protected formatBranch(item: IFurpaGreenGrocerBranchReportItemApiDto): string {
    const branchName = item.branch?.warehouseName?.trim() || item.branchName?.trim() || '';
    const branchNo = this.toSafeNumber(item.branch?.warehouseNo ?? item.branchNo);

    if (branchName && branchNo > 0) {
      return `${branchName} (${branchNo})`;
    }

    if (branchName) {
      return branchName;
    }

    return branchNo > 0 ? `Sube ${branchNo}` : '-';
  }

  protected getReportTypeLabel(
    row: {
      typeCode?: string | null;
      typeName?: string | null;
      product?: { modelName?: string | null; modelCode?: string | null } | null;
    },
    fallback?: string | null,
  ): string {
    return (
      row.typeName?.trim() ||
      row.product?.modelName?.trim() ||
      fallback?.trim() ||
      this.getTypeLabel(row.typeCode ?? row.product?.modelCode)
    );
  }
  protected getTypeLabel(typeCode: string | null | undefined): string {
    const normalizedTypeCode = (typeCode ?? '').trim();
    const option = this.typeOptions().find((item) => item.typeCode === normalizedTypeCode);

    if (option?.typeName?.trim()) {
      return option.typeName.trim();
    }

    switch (normalizedTypeCode) {
      case '10':
        return 'Meyve';
      case '11':
        return 'Sebze';
      case '12':
        return 'Yesillik';
      case '23':
        return 'Manav Sarf';
      default:
        return typeCode?.trim() ? `Tip ${typeCode}` : '-';
    }
  }

  private loadTypeOptions(): void {
    this.greenGrocerService
      .getTypeOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options: GreenGrocerReportTypeOptionDto[]) => {
          this.typeOptions.set(Array.isArray(options) ? options : []);
        },
        error: () => {
          this.typeOptions.set([]);
        },
      });
  }

  private buildReportRequest(
    date: string,
    warehouseNo: number | null,
  ): GreenGrocerReportDateHttpRequest {
    return warehouseNo ? { date, warehouseNo } : { date };
  }

  private resolveWarehouseNo(): number | null {
    if (!this.canUseAllWarehouses()) {
      return null;
    }

    return toPositiveWarehouseNo(this.filtersForm.controls.warehouseNo.value);
  }
  private loadReportsInParallel(
    targetDate: string,
    warehouseNo: number | null,
    feedbackAfterLoad?: PageFeedback,
  ): void {
    const requestId = (this.loadSequence += 1);
    const request = this.buildReportRequest(targetDate, warehouseNo);
    const bundle: GreenGrocerReportBundle = {
      summary: [],
      branchReport: {
        items: [],
        lazyBranches: [],
      },
      productReport: [],
      greens: [],
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
          'GreenGrocer raporlari alinirken bir hata olustu.',
        ),
      });
    };

    this.greenGrocerService
      .getSummary(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary: IFurpaGreenGrocerSummaryReportItemApiDto[]) => {
          bundle.summary = summary ?? [];
        },
        error: handleError,
        complete: completeOne,
      });

    this.greenGrocerService
      .getByBranch(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branchReport: IFurpaGreenGrocerBranchReportResponseApiDto) => {
          bundle.branchReport = branchReport;
        },
        error: handleError,
        complete: completeOne,
      });

    this.greenGrocerService
      .getByProduct(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (productReport: IFurpaGreenGrocerProductReportApiResponse) => {
          bundle.productReport = productReport;
        },
        error: handleError,
        complete: completeOne,
      });

    this.greenGrocerService
      .getGreens(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (greens: IFurpaGreenGrocerBranchReportItemApiDto[]) => {
          bundle.greens = greens ?? [];
        },
        error: handleError,
        complete: completeOne,
      });
  }

  private applyReportBundle(
    targetDate: string,
    bundle: GreenGrocerReportBundle,
    feedbackAfterLoad?: PageFeedback,
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
        message: 'Secilen tarih icin manav veya yesillik raporu donmedi.',
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

  private groupSummaryItems(
    items: readonly IFurpaGreenGrocerSummaryReportItemApiDto[],
  ): SummaryGroup[] {
    const groups = new Map<string, SummaryGroup>();

    for (const item of items) {
      const typeCode = item.typeCode?.trim() || '-';
      const current = groups.get(typeCode) ?? {
        typeCode,
        typeLabel: this.getReportTypeLabel(item),
        totalQuantity: 0,
        items: [],
      };

      current.totalQuantity += this.toSafeNumber(item.quantity);
      current.items.push(item);
      groups.set(typeCode, current);
    }

    return Array.from(groups.values()).sort(
      (left, right) => this.getTypeSortOrder(left.typeCode) - this.getTypeSortOrder(right.typeCode),
    );
  }

  private groupDocumentItems(
    items: readonly IFurpaGreenGrocerBranchReportItemApiDto[],
    includeTypes: boolean,
  ): DocumentGroup[] {
    const groups = new Map<string, DocumentGroup>();

    for (const item of items) {
      const key = this.buildDocumentKey(item);
      const group = groups.get(key) ?? {
        key,
        branchLabel: this.formatBranch(item),
        branchNo: this.toSafeNumber(item.branchNo),
        regionLabel: item.branch?.regionCode?.trim() || '',
        documentLabel: this.formatDocument(item),
        orderDate: item.latestCreateDate || item.orderDate,
        totalQuantity: 0,
        typeLabels: [],
        items: [],
        canDelete: this.canDeleteOrders() && item.canDelete !== false,
      };
      const typeLabel = this.getReportTypeLabel(item);

      group.totalQuantity += this.toSafeNumber(item.quantity);
      group.items.push(item);

      if (includeTypes && typeLabel !== '-' && !group.typeLabels.includes(typeLabel)) {
        group.typeLabels.push(typeLabel);
      }

      group.canDelete = group.canDelete && item.canDelete !== false;
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      group.items.sort((left, right) => this.compareTypeAndProduct(left, right));
      group.typeLabels.sort((left, right) =>
        this.getTypeSortOrderByLabel(left) - this.getTypeSortOrderByLabel(right),
      );
    }

    return Array.from(groups.values()).sort((left, right) => {
      if (left.branchNo !== right.branchNo) {
        return left.branchNo - right.branchNo;
      }

      return left.documentLabel.localeCompare(right.documentLabel, 'tr-TR', { numeric: true });
    });
  }

  protected getProductCode(row: {
    productCode?: string | null;
    stockCode?: string | null;
    product?: { stockCode?: string | null; productCode?: string | null } | null;
  }): string {
    return (
      row.stockCode?.trim() || row.product?.stockCode?.trim() || row.productCode?.trim() || '-'
    );
  }

  protected getProductName(row: {
    productName?: string | null;
    stockName?: string | null;
    product?: {
      displayName?: string | null;
      productName?: string | null;
      stockName?: string | null;
    } | null;
  }): string {
    return (
      row.product?.displayName?.trim() ||
      row.productName?.trim() ||
      row.product?.productName?.trim() ||
      row.stockName?.trim() ||
      row.product?.stockName?.trim() ||
      '-'
    );
  }

  protected getUnitName(row: {
    unitName?: string | null;
    product?: { unitName?: string | null } | null;
  }): string {
    return row.unitName?.trim() || row.product?.unitName?.trim() || '';
  }
  private mapProductRow(item: IFurpaGreenGrocerProductReportItemApiDto): ProductReportRow {
    return {
      key: `${item.typeCode}|${this.getProductCode(item)}`,
      typeCode: item.typeCode,
      typeLabel: this.getReportTypeLabel(item),
      productCode: this.getProductCode(item),
      productName: this.getProductName(item),
      stockName: item.stockName?.trim() || item.product?.stockName?.trim() || '',
      unitName: this.getUnitName(item),
      primaryBarcode: item.primaryBarcode?.trim() || item.product?.primaryBarcode?.trim() || '',
      quantity: this.toSafeNumber(item.totalQuantity ?? item.quantity),
      caseInfo: item.caseInfo ?? null,
      breakdownItems: this.getProductBreakdownItems(item),
    };
  }

  private getProductBreakdownItems(
    item: IFurpaGreenGrocerProductReportItemApiDto,
  ): IFurpaGreenGrocerBranchReportItemApiDto[] {
    const candidates = [
      item.items,
      item.branchItems,
      item.branches,
      item.branchBreakdowns,
      item.documents,
      item.details,
      item.lines,
    ];

    return candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0) ?? [];
  }

  private normalizeBranchReport(
    response: IFurpaGreenGrocerBranchReportResponseApiDto | null | undefined,
  ): IFurpaGreenGrocerBranchReportResponseApiDto {
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      lazyBranches: Array.isArray(response?.lazyBranches) ? response.lazyBranches : [],
    };
  }

  private normalizeProductResponse(
    response: IFurpaGreenGrocerProductReportApiResponse | null | undefined,
  ): IFurpaGreenGrocerProductReportItemApiDto[] {
    if (Array.isArray(response)) {
      return this.sortProductItems(response);
    }

    return this.sortProductItems(Array.isArray(response?.items) ? response.items : []);
  }

  private sortSummaryItems(
    items: readonly IFurpaGreenGrocerSummaryReportItemApiDto[],
  ): IFurpaGreenGrocerSummaryReportItemApiDto[] {
    return [...items].sort((left, right) => {
      const typeOrder = this.getTypeSortOrder(left.typeCode) - this.getTypeSortOrder(right.typeCode);
      if (typeOrder !== 0) {
        return typeOrder;
      }

      return this.getProductName(left).localeCompare(this.getProductName(right), 'tr-TR');
    });
  }

  private sortProductItems(
    items: readonly IFurpaGreenGrocerProductReportItemApiDto[],
  ): IFurpaGreenGrocerProductReportItemApiDto[] {
    return [...items].sort((left, right) => {
      const typeOrder = this.getTypeSortOrder(left.typeCode) - this.getTypeSortOrder(right.typeCode);
      if (typeOrder !== 0) {
        return typeOrder;
      }

      return this.getProductName(left).localeCompare(this.getProductName(right), 'tr-TR');
    });
  }

  private sortBranchItems(
    items: readonly IFurpaGreenGrocerBranchReportItemApiDto[],
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

      return this.compareTypeAndProduct(left, right);
    });
  }

  private compareTypeAndProduct(
    left: IFurpaGreenGrocerBranchReportItemApiDto,
    right: IFurpaGreenGrocerBranchReportItemApiDto,
  ): number {
    const typeOrder = this.getTypeSortOrder(left.typeCode) - this.getTypeSortOrder(right.typeCode);
    if (typeOrder !== 0) {
      return typeOrder;
    }

    return this.getProductName(left).localeCompare(this.getProductName(right), 'tr-TR');
  }

  private getTypeSortOrder(typeCode: string | null | undefined): number {
    switch ((typeCode ?? '').trim()) {
      case '10':
        return 0;
      case '11':
        return 1;
      case '12':
        return 2;
      case '23':
        return 3;
      default:
        return 4;
    }
  }

  private getTypeSortOrderByLabel(label: string): number {
    const normalized = label.trim().toLocaleLowerCase('tr-TR');
    if (normalized === 'meyve') {
      return 0;
    }
    if (normalized === 'sebze') {
      return 1;
    }
    if (normalized === 'yesillik' || normalized === 'yeşillik') {
      return 2;
    }
    if (normalized === 'manav sarf') {
      return 3;
    }

    return 4;
  }

  private sortLazyBranches(
    items: readonly IFurpaGreenGrocerLazyBranchApiDto[],
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

  private toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return null;
  }

  private getInputModeLabel(value: string | null | undefined): string {
    switch (value) {
      case 'Case':
        return 'kasa';
      case 'Pack':
        return 'koli';
      case 'Piece':
        return 'adet';
      case 'KgDirect':
        return 'kg';
      case 'Sarf':
        return 'sarf';
      default:
        return value?.trim().toLocaleLowerCase('tr-TR') || 'miktar';
    }
  }

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildPrintMarkup(tab: ReportTab, reportTitle: string): string {
    const reportDate = this.formatPrintDate(this.lastLoadedDate());
    const scope = this.warehouseScopeLabel();
    const generatedAt = new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.escapeHtml(reportTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 9mm 12mm; }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5px;
      line-height: 1.25;
      background: #fff;
    }

    .report-sheet { width: 100%; }
    .print-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 3mm;
      align-items: end;
      margin-bottom: 3mm;
      padding: 0 0 2mm;
      border-bottom: 1.5px solid #0f766e;
    }
    .brand { margin-bottom: 0.8mm; color: #0f766e; font-size: 7px; font-weight: 900; letter-spacing: 0.16em; }
    h1 { margin: 0; color: #0f172a; font-size: 14px; line-height: 1.05; }
    .print-meta { display: grid; gap: 0.5mm; min-width: 42mm; color: #475569; text-align: right; font-size: 7px; }
    .print-meta strong { color: #0f172a; }
    .print-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1mm;
      margin-bottom: 3mm;
    }
    .stat {
      min-width: 0;
      padding: 1.4mm 1.7mm;
      border: 1px solid #cbd5e1;
      border-radius: 1mm;
      background: #f8fafc;
    }
    .stat span { display: block; color: #64748b; font-size: 7px; font-weight: 800; text-transform: uppercase; }
    .stat strong { display: block; margin-top: 0.4mm; color: #0f172a; font-size: 9px; }
    .print-section { margin: 0 0 3.5mm; }
    .section-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2mm;
      margin-bottom: 1mm;
      padding: 1.3mm 1.6mm;
      border-left: 2px solid #0f766e;
      background: #ecfdf5;
      break-after: avoid-page;
      page-break-after: avoid;
    }
    .section-heading h2 { margin: 0; color: #0f172a; font-size: 9.5px; line-height: 1.15; }
    .section-heading p { margin: 0.4mm 0 0; color: #475569; font-size: 7px; }
    .section-total { flex: 0 0 auto; color: #064e3b; font-size: 8.5px; font-weight: 900; text-align: right; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { padding: 1.1mm 1.3mm; border: 1px solid #cbd5e1; vertical-align: top; overflow-wrap: anywhere; }
    th { color: #334155; background: #eaf0f5; font-size: 6.5px; font-weight: 900; letter-spacing: 0.02em; text-transform: uppercase; }
    td { font-size: 8px; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .index-cell { width: 6mm; color: #64748b; text-align: center; }
    .code-cell { width: 20mm; }
    .type-cell { width: 19mm; }
    .unit-cell { width: 12mm; text-align: center; }
    .quantity-cell { width: 24mm; text-align: right; }
    .document-cell { width: 24mm; }
    .product-name { color: #0f172a; font-weight: 800; }
    .subline { display: block; margin-top: 0.35mm; color: #64748b; font-size: 6.5px; line-height: 1.15; }
    .case-line { color: #0f766e; font-weight: 700; }
    .empty-line { margin: 0; padding: 2.5mm; border: 1px solid #cbd5e1; color: #64748b; background: #f8fafc; }
    .lazy-section { margin-top: 4mm; break-before: auto; }
    .lazy-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.2mm; }
    .lazy-card { padding: 1.3mm; border: 1px solid #cbd5e1; background: #f8fafc; break-inside: avoid; }
    .lazy-card strong { display: block; color: #0f172a; }
    .lazy-card span { display: block; margin-top: 0.3mm; color: #64748b; font-size: 6.5px; }
    .print-note { margin-top: 4mm; padding-top: 1.5mm; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 6.5px; }
  </style>
</head>
<body>
  <main class="report-sheet">
    <header class="print-header">
      <div>
        <div class="brand">FURPA</div>
        <h1>${this.escapeHtml(reportTitle)}</h1>
      </div>
      <div class="print-meta">
        <span>Rapor tarihi <strong>${this.escapeHtml(reportDate)}</strong></span>
        <span>Kapsam <strong>${this.escapeHtml(scope)}</strong></span>
        <span>Hazırlanma <strong>${this.escapeHtml(generatedAt)}</strong></span>
      </div>
    </header>
    ${this.buildPrintStats(tab)}
    ${this.buildPrintBody(tab)}
    <footer class="print-note">Miktarlar rapor servisinden dönen birim ve kasa/koli bilgileriyle gösterilmiştir.</footer>
  </main>
</body>
</html>`;
  }

  private buildPrintStats(tab: ReportTab): string {
    let stats: readonly [string, string][];

    switch (tab) {
      case 'summary':
        stats = [
          ['Ürün', String(this.summaryItems().length)],
          ['Ürün grubu', String(this.summaryGroups().length)],
          ['Toplam miktar', this.formatQuantity(this.summaryTotalQuantity())],
        ];
        break;
      case 'byBranch':
        stats = [
          ['Evrak', String(this.branchDocumentCount())],
          ['Şube', String(this.branchCount())],
          ['Sipariş girmeyen şube', String(this.lazyBranches().length)],
        ];
        break;
      case 'byProduct':
        stats = [
          ['Ürün', String(this.productRows().length)],
          ['Şube / evrak kırılımı', String(this.productBreakdownExportRows().length)],
          [
            'Toplam miktar',
            this.formatQuantity(
              this.productRows().reduce((total, item) => total + item.quantity, 0),
            ),
          ],
        ];
        break;
      case 'greens':
        stats = [
          ['Evrak', String(this.greenDocumentGroups().length)],
          ['Satır', String(this.greenItems().length)],
          ['Toplam miktar', this.formatQuantity(this.greenTotalQuantity())],
        ];
        break;
    }

    return `<section class="print-stats">${stats
      .map(
        ([label, value]) =>
          `<div class="stat"><span>${this.escapeHtml(label)}</span><strong>${this.escapeHtml(value)}</strong></div>`,
      )
      .join('')}</section>`;
  }

  private buildPrintBody(tab: ReportTab): string {
    switch (tab) {
      case 'summary':
        return this.buildSummaryPrintBody();
      case 'byBranch':
        return `${this.buildDocumentPrintBody(this.branchDocumentGroups(), true)}${this.buildLazyBranchesPrintBody()}`;
      case 'byProduct':
        return this.buildProductPrintBody();
      case 'greens':
        return this.buildDocumentPrintBody(this.greenDocumentGroups(), false);
    }
  }

  private buildSummaryPrintBody(): string {
    return this.summaryGroups()
      .map(
        (group) => `<section class="print-section">
          ${this.buildPrintSectionHeading(
            group.typeLabel,
            `${group.items.length} ürün`,
            this.formatQuantity(group.totalQuantity),
          )}
          <table>
            <thead><tr><th class="index-cell">#</th><th>Ürün</th><th class="code-cell">Kod</th><th class="unit-cell">Birim</th><th class="quantity-cell">Miktar</th></tr></thead>
            <tbody>${group.items
              .map(
                (item, index) => `<tr>
                  <td class="index-cell">${index + 1}</td>
                  <td><span class="product-name">${this.escapeHtml(this.getProductName(item))}</span>${this.buildPrintSubline(item.stockName)}</td>
                  <td class="code-cell">${this.escapeHtml(this.getProductCode(item))}</td>
                  <td class="unit-cell">${this.escapeHtml(this.getUnitName(item) || '-')}</td>
                  <td class="quantity-cell"><strong>${this.escapeHtml(this.formatQuantity(item.quantity))}</strong>${this.buildCasePrintLines(item.caseInfo)}</td>
                </tr>`,
              )
              .join('')}</tbody>
          </table>
        </section>`,
      )
      .join('');
  }

  private buildDocumentPrintBody(groups: readonly DocumentGroup[], showType: boolean): string {
    return groups
      .map(
        (group) => `<section class="print-section">
          ${this.buildPrintSectionHeading(
            group.branchLabel,
            [this.formatDateTime(group.orderDate), group.documentLabel, ...group.typeLabels]
              .filter(Boolean)
              .join(' · '),
            this.formatQuantity(group.totalQuantity),
          )}
          <table>
            <thead><tr><th class="index-cell">#</th><th>Ürün</th><th class="code-cell">Kod</th>${showType ? '<th class="type-cell">Tip</th>' : ''}<th class="unit-cell">Birim</th><th class="quantity-cell">Miktar</th></tr></thead>
            <tbody>${group.items
              .map(
                (item, index) => `<tr>
                  <td class="index-cell">${index + 1}</td>
                  <td><span class="product-name">${this.escapeHtml(this.getProductName(item))}</span></td>
                  <td class="code-cell">${this.escapeHtml(this.getProductCode(item))}</td>
                  ${showType ? `<td class="type-cell">${this.escapeHtml(this.getReportTypeLabel(item))}</td>` : ''}
                  <td class="unit-cell">${this.escapeHtml(this.getUnitName(item) || '-')}</td>
                  <td class="quantity-cell"><strong>${this.escapeHtml(this.formatQuantity(item.quantity))}</strong>${this.buildCasePrintLines(item.caseInfo)}</td>
                </tr>`,
              )
              .join('')}</tbody>
          </table>
        </section>`,
      )
      .join('');
  }

  private buildProductPrintBody(): string {
    return this.productRows()
      .map(
        (product) => `<section class="print-section">
          ${this.buildPrintSectionHeading(
            product.productName,
            [product.typeLabel, product.productCode, product.unitName].filter(Boolean).join(' · '),
            this.formatQuantity(product.quantity),
          )}
          ${
            product.breakdownItems.length
              ? `<table>
                  <thead><tr><th class="index-cell">#</th><th>Şube</th><th class="document-cell">Evrak</th><th>Tarih</th><th class="quantity-cell">Miktar</th></tr></thead>
                  <tbody>${product.breakdownItems
                    .map(
                      (item, index) => `<tr>
                        <td class="index-cell">${index + 1}</td>
                        <td><span class="product-name">${this.escapeHtml(this.formatBranch(item))}</span></td>
                        <td class="document-cell">${this.escapeHtml(item.document?.documentNo?.trim() || this.formatDocument(item))}</td>
                        <td>${this.escapeHtml(this.formatDateTime(item.latestCreateDate || item.orderDate))}</td>
                        <td class="quantity-cell"><strong>${this.escapeHtml(this.formatQuantity(item.quantity))}</strong>${this.buildCasePrintLines(item.caseInfo)}</td>
                      </tr>`,
                    )
                    .join('')}</tbody>
                </table>`
              : '<p class="empty-line">Şube / evrak kırılımı bulunamadı.</p>'
          }
        </section>`,
      )
      .join('');
  }

  private buildLazyBranchesPrintBody(): string {
    if (!this.lazyBranches().length) {
      return '';
    }

    return `<section class="print-section lazy-section">
      ${this.buildPrintSectionHeading(
        'Sipariş Girmeyen Şubeler',
        'Seçilen rapor tarihinde evrakı bulunmayan şubeler',
        String(this.lazyBranches().length),
      )}
      <div class="lazy-grid">${this.lazyBranches()
        .map(
          (branch) => `<article class="lazy-card">
            <strong>${this.escapeHtml(branch.branchName?.trim() || `Şube ${branch.branchNo}`)}</strong>
            <span>Şube ${this.escapeHtml(String(branch.branchNo ?? '-'))} · Bölge ${this.escapeHtml(branch.regionCode?.trim() || '-')}</span>
          </article>`,
        )
        .join('')}</div>
    </section>`;
  }

  private buildPrintSectionHeading(title: string, subtitle: string, total: string): string {
    return `<header class="section-heading">
      <div><h2>${this.escapeHtml(title)}</h2><p>${this.escapeHtml(subtitle)}</p></div>
      <div class="section-total">${this.escapeHtml(total)}</div>
    </header>`;
  }

  private buildPrintSubline(value: string | null | undefined): string {
    const text = value?.trim();
    return text ? `<span class="subline">${this.escapeHtml(text)}</span>` : '';
  }

  private buildCasePrintLines(caseInfo: GreenGrocerProductCaseInfoDto | null | undefined): string {
    const lines = [this.formatCaseInfo(caseInfo), this.formatCaseAverage(caseInfo)].filter(Boolean);

    return lines.length
      ? `<span class="subline case-line">${lines.map((line) => this.escapeHtml(line)).join('<br>')}</span>`
      : '';
  }

  private formatPrintDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(date);
  }

  private getPrintReportTitle(tab: ReportTab): string {
    switch (tab) {
      case 'summary':
        return 'Genel Manav Raporu';
      case 'byBranch':
        return 'Sube Evrak Manav Raporu';
      case 'byProduct':
        return 'Urun Bazli Manav Raporu';
      case 'greens':
        return 'Yesillik Raporu';
      default:
        return 'Manav Raporu';
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async exportReport(
    tab: ReportTab,
    reportName: string,
    sheets: readonly ExcelExportSheet<object>[],
  ): Promise<void> {
    const exportSheets = sheets.filter((sheet) => sheet.rows.length > 0);

    if (!exportSheets.length || this.exportingReport()) {
      return;
    }

    this.exportingReport.set(tab);
    this.exportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: `${reportName} ${this.lastLoadedDate()}`,
        sheets: exportSheets,
      });
    } catch {
      this.exportErrorMessage.set('Excel dosyasi olusturulamadi.');
    } finally {
      this.exportingReport.set(null);
    }
  }

  private getSummaryExportColumns(): readonly ExcelExportColumn<IFurpaGreenGrocerSummaryReportItemApiDto>[] {
    return [
      { label: 'Tip', value: (row) => this.getReportTypeLabel(row) },
      { label: 'Tip Kodu', value: 'typeCode' },
      { label: 'Stok Kodu', value: (row) => this.getProductCode(row) },
      { label: 'Liste Adi', value: (row) => this.getProductName(row) },
      {
        label: 'Stok Adi',
        value: (row) => row.stockName?.trim() || row.product?.stockName?.trim() || '',
      },
      { label: 'Birim', value: (row) => this.getUnitName(row) },
      {
        label: 'Barkod',
        value: (row) => row.primaryBarcode?.trim() || row.product?.primaryBarcode?.trim() || '',
      },
      { label: 'Miktar', value: (row) => this.toSafeNumber(row.quantity), type: 'number' },
      { label: 'Kasa/Koli', value: (row) => this.formatCaseInfo(row.caseInfo) },
      { label: 'Ortalama', value: (row) => this.formatCaseAverage(row.caseInfo) },
    ];
  }

  private getBranchExportColumns(
    includeType: boolean,
  ): readonly ExcelExportColumn<IFurpaGreenGrocerBranchReportItemApiDto>[] {
    return [
      { label: 'Tarih', value: (row) => row.latestCreateDate || row.orderDate, type: 'datetime' },
      {
        label: 'Sube No',
        value: (row) => this.toSafeNumber(row.branch?.warehouseNo ?? row.branchNo),
        type: 'number',
      },
      { label: 'Sube', value: (row) => row.branch?.warehouseName?.trim() || row.branchName },
      { label: 'Bolge', value: (row) => row.branch?.regionCode?.trim() || '' },
      { label: 'Evrak', value: (row) => this.formatDocument(row) },
      { label: 'Evrak Seri', value: 'documentSerie' },
      { label: 'Evrak Sira', value: 'documentOrderNo', type: 'number' },
      ...(includeType
        ? [
            {
              label: 'Tip',
              value: (row: IFurpaGreenGrocerBranchReportItemApiDto) => this.getReportTypeLabel(row),
            },
            { label: 'Tip Kodu', value: 'typeCode' },
          ]
        : []),
      { label: 'Stok Kodu', value: (row) => this.getProductCode(row) },
      { label: 'Liste Adi', value: (row) => this.getProductName(row) },
      {
        label: 'Stok Adi',
        value: (row) => row.stockName?.trim() || row.product?.stockName?.trim() || '',
      },
      { label: 'Birim', value: (row) => this.getUnitName(row) },
      {
        label: 'Barkod',
        value: (row) => row.primaryBarcode?.trim() || row.product?.primaryBarcode?.trim() || '',
      },
      { label: 'Miktar', value: (row) => this.toSafeNumber(row.quantity), type: 'number' },
      { label: 'Kasa/Koli', value: (row) => this.formatCaseInfo(row.caseInfo) },
      { label: 'Ortalama', value: (row) => this.formatCaseAverage(row.caseInfo) },
      { label: 'Silinebilir', value: (row) => (row.canDelete === false ? 'Hayir' : 'Evet') },
    ];
  }

  private getLazyBranchExportColumns(): readonly ExcelExportColumn<IFurpaGreenGrocerLazyBranchApiDto>[] {
    return [
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Bolge', value: 'regionCode' },
    ];
  }

  private getProductExportColumns(): readonly ExcelExportColumn<ProductReportRow>[] {
    return [
      { label: 'Tip', value: 'typeLabel' },
      { label: 'Tip Kodu', value: 'typeCode' },
      { label: 'Stok Kodu', value: 'productCode' },
      { label: 'Liste Adi', value: 'productName' },
      { label: 'Stok Adi', value: 'stockName' },
      { label: 'Birim', value: 'unitName' },
      { label: 'Barkod', value: 'primaryBarcode' },
      { label: 'Toplam Miktar', value: 'quantity', type: 'number' },
      { label: 'Kasa/Koli', value: (row) => this.formatCaseInfo(row.caseInfo) },
      { label: 'Ortalama', value: (row) => this.formatCaseAverage(row.caseInfo) },
      { label: 'Kirilim Satiri', value: (row) => row.breakdownItems.length, type: 'number' },
    ];
  }

  private getProductBreakdownExportColumns(): readonly ExcelExportColumn<ProductBreakdownExportRow>[] {
    return [
      { label: 'Tip', value: 'typeLabel' },
      { label: 'Tip Kodu', value: 'typeCode' },
      { label: 'Stok Kodu', value: 'productCode' },
      { label: 'Liste Adi', value: 'productName' },
      { label: 'Stok Adi', value: 'stockName' },
      { label: 'Birim', value: 'unitName' },
      { label: 'Barkod', value: 'primaryBarcode' },
      { label: 'Tarih', value: 'orderDate', type: 'datetime' },
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Evrak', value: 'documentLabel' },
      { label: 'Miktar', value: 'quantity', type: 'number' },
      { label: 'Kasa/Koli', value: 'caseText' },
      { label: 'Ortalama', value: 'caseAverageText' },
    ];
  }
}
