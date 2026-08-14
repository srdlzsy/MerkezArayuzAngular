import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  EtiketBasimAcceptanceRecordDto,
  EtiketBasimCalculationDto,
  EtiketBasimDepotStockReportDto,
  EtiketBasimLabelDto,
  EtiketBasimReceivedProductReportDto,
  EtiketBasimStockDto,
  EtiketBasimSupplierDto,
  ManavMalKabulVeEtiketGoodsReceiptComparisonItemDto,
  SaveEtiketBasimAcceptanceRecordHttpRequest
} from '@interfaces';
import { finalize } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserCanUseAllWarehouses,
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';
import { getErrorMessage } from '../../../settings/settings-task.helpers';
import { renderBarcodeSvg } from '../../etiket-belgeleri/etiket-barcode.util';

const TASK_ID = 'manav-mal-kabul-etiket';
const PERMISSION_PREFIX = 'kasa-islemleri.manav-mal-kabul-etiket';
const ALL_WAREHOUSES_PERMISSION = `${PERMISSION_PREFIX}.all-warehouses`;
const DEFAULT_STOCK_PREFIX = 'MNV';

type EtiketBasimTab = 'records' | 'form' | 'reports';
type EtiketBasimReportTab = 'received' | 'comparison' | 'depot';
type SortDirection = 'asc' | 'desc';
type PermissionAction = 'list' | 'detail' | 'create' | 'update' | 'delete' | 'transfer';
type DraftNumberKey = 'grossWeight' | 'caseTare' | 'caseCount' | 'palletTare';
type RecordSortKey =
  | 'createdAt'
  | 'supplierName'
  | 'seriesAndNumber'
  | 'stockName'
  | 'grossWeight'
  | 'netReceivedWeight'
  | 'caseCount'
  | 'averageCaseWeight'
  | 'status';

interface FeedbackState {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

interface EtiketBasimDraft {
  supplierCode: string;
  supplierName: string;
  documentSeries: string;
  documentNo: string;
  stockCode: string;
  stockName: string;
  stockBarcode: string;
  grossWeight: number | null;
  caseTare: number | null;
  caseCount: number | null;
  palletTare: number | null;
  receivedBy: string;
  caseType: 'REHINLI' | 'REHINSIZ';
}

interface SortColumn {
  key: RecordSortKey;
  label: string;
}

function createEmptyDraft(): EtiketBasimDraft {
  return {
    supplierCode: '',
    supplierName: '',
    documentSeries: DEFAULT_STOCK_PREFIX,
    documentNo: '',
    stockCode: '',
    stockName: '',
    stockBarcode: '',
    grossWeight: null,
    caseTare: null,
    caseCount: 1,
    palletTare: 0,
    receivedBy: '',
    caseType: 'REHINLI'
  };
}

@Component({
  selector: 'app-etiket-basim-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etiket-basim-list.component.html',
  styleUrl: './etiket-basim-list.component.scss'
})
export class EtiketBasimListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewBarcode')
  private readonly previewBarcode?: ElementRef<SVGSVGElement>;

  @ViewChildren('printBarcode')
  private readonly printBarcodeElements!: QueryList<ElementRef<SVGSVGElement>>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private calculationTimer: number | undefined;
  private calculationRequestId = 0;
  private labelRenderTimer: number | undefined;
  private printAfterLabelPreview = false;

  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly maxDate = this.getToday();
  protected readonly sortColumns: readonly SortColumn[] = [
    { key: 'createdAt', label: 'Tarih' },
    { key: 'supplierName', label: 'Cari' },
    { key: 'seriesAndNumber', label: 'Evrak' },
    { key: 'stockName', label: 'Stok' },
    { key: 'grossWeight', label: 'Brut' },
    { key: 'netReceivedWeight', label: 'Net' },
    { key: 'caseCount', label: 'Kasa' },
    { key: 'averageCaseWeight', label: 'Ort.' },
    { key: 'status', label: 'Durum' }
  ];

  protected draft: EtiketBasimDraft = createEmptyDraft();
  protected supplierQuery = '';
  protected stockQuery = '';
  protected stockPrefix = DEFAULT_STOCK_PREFIX;
  protected reportWarehouseNo: number | null = null;
  protected labelCopyCount = 1;

  protected readonly selectedDate = signal(this.getToday());
  protected readonly activeTab = signal<EtiketBasimTab>('records');
  protected readonly activeReportTab = signal<EtiketBasimReportTab>('received');
  protected readonly records = signal<EtiketBasimAcceptanceRecordDto[]>([]);
  protected readonly selectedRecord = signal<EtiketBasimAcceptanceRecordDto | null>(null);
  protected readonly supplierResults = signal<EtiketBasimSupplierDto[]>([]);
  protected readonly stockResults = signal<EtiketBasimStockDto[]>([]);
  protected readonly calculation = signal<EtiketBasimCalculationDto | null>(null);
  protected readonly labelPreview = signal<EtiketBasimLabelDto | null>(null);
  protected readonly receivedReportRows = signal<EtiketBasimReceivedProductReportDto[]>([]);
  protected readonly comparisonReportRows = signal<ManavMalKabulVeEtiketGoodsReceiptComparisonItemDto[]>([]);
  protected readonly depotReportRows = signal<EtiketBasimDepotStockReportDto[]>([]);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly supplierSearchMessage = signal<string | null>(null);
  protected readonly stockSearchMessage = signal<string | null>(null);
  protected readonly recordSearch = signal('');
  protected readonly sortKey = signal<RecordSortKey>('createdAt');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isSupplierSearching = signal(false);
  protected readonly isStockSearching = signal(false);
  protected readonly isCalculating = signal(false);
  protected readonly isLabelLoading = signal(false);
  protected readonly isPrinting = signal(false);
  protected readonly isReportLoading = signal(false);

  protected readonly canList = computed(
    () => this.authService.hasTaskAccess(TASK_ID) || this.hasPermission('list')
  );
  protected readonly canDetail = computed(() => this.canList() || this.hasPermission('detail'));
  protected readonly canCreate = computed(() => this.hasPermission('create'));
  protected readonly canUpdate = computed(() => this.hasPermission('update'));
  protected readonly canDelete = computed(() => this.hasPermission('delete'));
  protected readonly canTransfer = computed(() => this.hasPermission('transfer'));
  protected readonly canUseWarehouseScope = computed(() =>
    currentUserCanUseAllWarehouses(this.authService.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly listSummary = computed(() => {
    const records = this.records();

    return {
      total: records.length,
      waiting: records.filter((record) => !record.microTransferred).length,
      transferred: records.filter((record) => record.microTransferred).length,
      netWeight: records.reduce(
        (total, record) => total + this.toSafeNumber(record.netReceivedWeight),
        0
      )
    };
  });
  protected readonly draftModeLabel = computed(() =>
    this.selectedRecord() ? 'Kayit Guncelle' : 'Yeni Kabul'
  );
  protected readonly selectedRecordLabel = computed(() => {
    const record = this.selectedRecord();

    if (!record) {
      return 'Yeni kayit';
    }

    return record.seriesAndNumber || `${record.documentSeries}${record.documentNo}` || `#${record.id}`;
  });
  protected readonly canSaveDraft = computed(() => {
    if (this.isSaving()) {
      return false;
    }

    const record = this.selectedRecord();

    if (record?.microTransferred) {
      return false;
    }

    return record ? this.canUpdate() && this.isDraftValid() : this.canCreate() && this.isDraftValid();
  });

  constructor() {
    this.reportWarehouseNo = getCurrentWarehouseNo(this.authService.currentUser());
  }

  ngOnInit(): void {
    if (this.canList()) {
      this.loadRecords();
    }
  }

  ngAfterViewInit(): void {
    this.printBarcodeElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.renderAllBarcodes());
  }

  ngOnDestroy(): void {
    this.clearCalculationTimer();
    this.clearLabelRenderTimer();
  }

  protected setActiveTab(tab: EtiketBasimTab): void {
    this.activeTab.set(tab);
  }

  protected setSelectedDate(value: string): void {
    this.selectedDate.set(value);
  }

  protected loadRecords(): void {
    const date = this.selectedDate().trim();

    if (!date) {
      this.setFeedback('error', 'Tarih gerekli', 'Kabul kayitlarini getirmek icin tarih secin.');
      return;
    }

    if (!this.canList()) {
      this.setFeedback('error', 'Yetki yok', 'Bu listeyi gormek icin list yetkisi gerekli.');
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService
      .getEtiketBasimAcceptanceRecords(date)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (records: EtiketBasimAcceptanceRecordDto[]) => {
          this.records.set(records ?? []);

          if (!records?.length) {
            this.setFeedback('info', 'Kayit yok', 'Secilen gun icin kabul etiketi kaydi bulunamadi.');
          }
        },
        error: (error: unknown) => {
          this.records.set([]);
          this.setFeedback(
            'error',
            'Liste alinamadi',
            getErrorMessage(error, 'Kabul kayitlari yuklenirken hata olustu.')
          );
        }
      });
  }

  protected startNewRecord(): void {
    this.selectedRecord.set(null);
    this.draft = createEmptyDraft();
    this.supplierQuery = '';
    this.stockQuery = '';
    this.supplierResults.set([]);
    this.stockResults.set([]);
    this.calculation.set(null);
    this.labelPreview.set(null);
    this.labelCopyCount = 1;
    this.feedback.set(null);
    this.activeTab.set('form');
    this.scheduleBarcodeRender();
  }

  protected selectRecord(record: EtiketBasimAcceptanceRecordDto): void {
    this.selectedRecord.set(record);
    this.fillDraftFromRecord(record);
    this.calculation.set({
      caseTotalTare: record.caseTotalTare,
      netReceivedWeight: record.netReceivedWeight,
      averageCaseWeight: record.averageCaseWeight,
      labelBarcodeRaw: record.labelBarcodeRaw,
      labelBarcode: record.labelBarcode,
      barcodeSymbology: record.barcodeSymbology
    });
    this.labelPreview.set(null);
    this.labelCopyCount = Math.max(1, Math.trunc(this.toSafeNumber(record.caseCount) || 1));
    this.activeTab.set('form');
    this.scheduleBarcodeRender();
  }

  protected searchSuppliers(): void {
    const query = this.supplierQuery.trim();

    if (query.length < 2) {
      this.supplierResults.set([]);
      this.supplierSearchMessage.set('En az 2 karakter girin.');
      return;
    }

    this.isSupplierSearching.set(true);
    this.supplierSearchMessage.set(null);

    this.kasaIslemleriService
      .searchEtiketBasimSuppliers({ query, take: 20 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSupplierSearching.set(false))
      )
      .subscribe({
        next: (items: EtiketBasimSupplierDto[]) => {
          this.supplierResults.set(items ?? []);
          this.supplierSearchMessage.set(items?.length ? null : 'Tedarikci bulunamadi.');
        },
        error: (error: unknown) => {
          this.supplierResults.set([]);
          this.supplierSearchMessage.set(
            getErrorMessage(error, 'Tedarikci aramasi yapilamadi.')
          );
        }
      });
  }

  protected selectSupplier(supplier: EtiketBasimSupplierDto): void {
    const supplierCode = this.getSupplierCode(supplier);
    const supplierName = this.getSupplierName(supplier);

    this.draft.supplierCode = supplierCode;
    this.draft.supplierName = supplierName;
    this.supplierQuery = this.joinLabel(supplierCode, supplierName);
    this.supplierResults.set([]);
    this.supplierSearchMessage.set(null);
  }

  protected searchStocks(): void {
    const query = this.stockQuery.trim();

    if (query.length < 2) {
      this.stockResults.set([]);
      this.stockSearchMessage.set('En az 2 karakter girin.');
      return;
    }

    this.isStockSearching.set(true);
    this.stockSearchMessage.set(null);

    this.kasaIslemleriService
      .searchEtiketBasimStocks({
        query,
        prefix: this.stockPrefix.trim() || DEFAULT_STOCK_PREFIX,
        take: 20
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isStockSearching.set(false))
      )
      .subscribe({
        next: (items: EtiketBasimStockDto[]) => {
          this.stockResults.set(items ?? []);
          this.stockSearchMessage.set(items?.length ? null : 'Stok bulunamadi.');
        },
        error: (error: unknown) => {
          this.stockResults.set([]);
          this.stockSearchMessage.set(getErrorMessage(error, 'Stok aramasi yapilamadi.'));
        }
      });
  }

  protected selectStock(stock: EtiketBasimStockDto): void {
    const stockCode = this.getStockCode(stock);
    const stockName = this.getStockName(stock);
    const stockBarcode = this.getStockBarcode(stock);

    this.draft.stockCode = stockCode;
    this.draft.stockName = stockName;
    this.draft.stockBarcode = stockBarcode;
    this.stockQuery = this.joinLabel(stockCode, stockName);
    this.stockResults.set([]);
    this.stockSearchMessage.set(null);
    this.scheduleCalculation();
  }

  protected onDraftNumberChange(key: DraftNumberKey, value: string | number | null): void {
    this.draft[key] = this.toNullableNumber(value);
    this.calculation.set(null);
    this.labelPreview.set(null);
    this.scheduleCalculation();
  }

  protected onDraftTextChange(): void {
    this.labelPreview.set(null);
  }

  protected calculateDraft(silent = false): void {
    this.clearCalculationTimer();

    const request = this.buildCalculationRequest();

    if (!request) {
      this.calculation.set(null);

      if (!silent) {
        this.setFeedback('error', 'Eksik bilgi', 'Brut kilo ve kasa darasi girilmeden hesaplama yapilamaz.');
      }

      return;
    }

    const requestId = ++this.calculationRequestId;
    this.isCalculating.set(true);

    this.kasaIslemleriService
      .calculateEtiketBasimAcceptanceRecord(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.calculationRequestId) {
            this.isCalculating.set(false);
          }
        })
      )
      .subscribe({
        next: (calculation: EtiketBasimCalculationDto) => {
          if (requestId !== this.calculationRequestId) {
            return;
          }

          this.calculation.set(calculation);
          this.scheduleBarcodeRender();
        },
        error: (error: unknown) => {
          if (requestId !== this.calculationRequestId) {
            return;
          }

          this.calculation.set(null);

          if (!silent) {
            this.setFeedback(
              'error',
              'Hesaplama basarisiz',
              getErrorMessage(error, 'Kilo hesaplamasi yapilamadi.')
            );
          }
        }
      });
  }

  protected saveDraft(): void {
    const request = this.buildSaveRequest();

    if (!request) {
      this.setFeedback('error', 'Eksik bilgi', 'Kaydetmek icin zorunlu alanlari doldurun.');
      return;
    }

    const selected = this.selectedRecord();

    if (selected?.microTransferred) {
      this.setFeedback('error', 'Aktarilmis kayit', 'Mikro aktarilmis kayit guncellenemez.');
      return;
    }

    if (selected ? !this.canUpdate() : !this.canCreate()) {
      this.setFeedback('error', 'Yetki yok', 'Bu islem icin yetkiniz bulunmuyor.');
      return;
    }

    this.isSaving.set(true);

    const request$ = selected
      ? this.kasaIslemleriService.updateEtiketBasimAcceptanceRecord(selected.id, request)
      : this.kasaIslemleriService.createEtiketBasimAcceptanceRecord(request);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record: EtiketBasimAcceptanceRecordDto) => {
          this.upsertRecord(record);
          this.selectedRecord.set(record);
          this.fillDraftFromRecord(record);
          this.calculation.set({
            caseTotalTare: record.caseTotalTare,
            netReceivedWeight: record.netReceivedWeight,
            averageCaseWeight: record.averageCaseWeight,
      labelBarcodeRaw: record.labelBarcodeRaw,
      labelBarcode: record.labelBarcode,
            barcodeSymbology: record.barcodeSymbology
          });
          this.labelPreview.set(null);
          this.labelCopyCount = Math.max(1, Math.trunc(this.toSafeNumber(record.caseCount) || 1));
          this.setFeedback(
            'success',
            selected ? 'Kayit guncellendi' : 'Kayit olusturuldu',
            `${record.seriesAndNumber || record.id} hazir.`
          );
        },
        error: (error: unknown) => {
          this.setFeedback(
            'error',
            'Kayit basarisiz',
            getErrorMessage(error, 'Kabul etiketi kaydedilemedi.')
          );
        }
      });
  }

  protected async deleteRecord(record?: EtiketBasimAcceptanceRecordDto | null): Promise<void> {
    const targetRecord = record ?? this.selectedRecord();

    if (!targetRecord) {
      return;
    }

    if (targetRecord.microTransferred) {
      this.setFeedback('error', 'Aktarilmis kayit', 'Mikro aktarilmis kayit silinemez.');
      return;
    }

    if (!this.canDelete()) {
      this.setFeedback('error', 'Yetki yok', 'Silme yetkiniz bulunmuyor.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Etiket kaydi silinsin mi?',
      message: `${targetRecord.seriesAndNumber || targetRecord.id} kaydi silinecek.`,
      confirmText: 'Sil',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.isDeleting.set(true);

    this.kasaIslemleriService
      .deleteEtiketBasimAcceptanceRecord(targetRecord.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDeleting.set(false))
      )
      .subscribe({
        next: () => {
          this.records.set(this.records().filter((item) => item.id !== targetRecord.id));

          if (this.selectedRecord()?.id === targetRecord.id) {
            this.startNewRecord();
          }

          this.setFeedback(
            'success',
            'Kayit silindi',
            `${targetRecord.seriesAndNumber || targetRecord.id} kaldirildi.`
          );
        },
        error: (error: unknown) => {
          this.setFeedback(
            'error',
            'Silme basarisiz',
            getErrorMessage(error, 'Kabul etiketi silinemedi.')
          );
        }
      });
  }

  protected previewDraftLabel(): void {
    const selected = this.selectedRecord();

    if (selected && this.canDetail()) {
      this.loadLabelForRecord(selected);
      return;
    }

    const request = this.buildSaveRequest();

    if (!request) {
      this.setFeedback('error', 'Eksik bilgi', 'Etiket onizleme icin zorunlu alanlari doldurun.');
      return;
    }

    this.isLabelLoading.set(true);

    this.kasaIslemleriService
      .previewEtiketBasimLabel(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLabelLoading.set(false))
      )
      .subscribe({
        next: (label: EtiketBasimLabelDto) => this.applyLabelPreview(label),
        error: (error: unknown) => {
          this.printAfterLabelPreview = false;
          this.setFeedback(
            'error',
            'Onizleme alinamadi',
            getErrorMessage(error, 'Etiket verisi hazirlanamadi.')
          );
        }
      });
  }

  protected printCurrentLabel(): void {
    this.printAfterLabelPreview = true;
    this.previewDraftLabel();
  }

  protected printRecordLabel(record: EtiketBasimAcceptanceRecordDto): void {
    this.printAfterLabelPreview = true;
    this.loadLabelForRecord(record);
  }

  protected loadLabelForRecord(record: EtiketBasimAcceptanceRecordDto): void {
    if (!this.canDetail()) {
      this.setFeedback('error', 'Yetki yok', 'Etiket datasini gormek icin detail yetkisi gerekli.');
      return;
    }

    this.selectedRecord.set(record);
    this.isLabelLoading.set(true);

    this.kasaIslemleriService
      .getEtiketBasimLabel(record.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLabelLoading.set(false))
      )
      .subscribe({
        next: (label: EtiketBasimLabelDto) => this.applyLabelPreview(label),
        error: (error: unknown) => {
          this.printAfterLabelPreview = false;
          this.setFeedback(
            'error',
            'Etiket alinamadi',
            getErrorMessage(error, 'Kayitli etiket datasina ulasilamadi.')
          );
        }
      });
  }

  protected async printLabel(): Promise<void> {
    const label = this.labelPreview();

    if (!label || this.isPrinting()) {
      return;
    }

    this.isPrinting.set(true);
    this.scheduleBarcodeRender();
    await this.waitForNextPaint();
    this.renderAllBarcodes();

    const style = document.createElement('style');
    style.id = 'etiket-basim-print-shell';
    style.textContent = `
      @page {
        size: 38.9mm 57.9mm;
        margin: 0;
      }

      @media print {
        html,
        body {
          width: 38.9mm !important;
          min-width: 38.9mm !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow: visible !important;
        }

        body * {
          visibility: hidden !important;
        }

        .app-sidebar,
        .topbar,
        .topbar-mobile,
        .sidebar-backdrop,
        .etiket-basim-screen {
          display: none !important;
        }

        .content-wrapper {
          padding: 0 !important;
        }

        .etiket-basim-print-root {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          width: 38.9mm !important;
          min-width: 38.9mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          visibility: visible !important;
          gap: 0 !important;
          pointer-events: auto !important;
        }

        .etiket-basim-print-root,
        .etiket-basim-print-root * {
          visibility: visible !important;
        }

        .print-label {
          width: 38.9mm !important;
          height: 57.9mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          break-after: page !important;
          page-break-after: always !important;
        }

        .print-label-content {
          width: 57.9mm !important;
          height: 38.9mm !important;
          box-sizing: border-box !important;
          transform: rotate(90deg) translateY(-38.9mm) !important;
          transform-origin: top left !important;
          writing-mode: horizontal-tb !important;
        }

        .print-label:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }
      }
    `;

    const cleanup = () => {
      style.remove();
      this.isPrinting.set(false);
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(style);
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
    window.print();
  }

  protected loadReport(tab: EtiketBasimReportTab = this.activeReportTab()): void {
    const date = this.selectedDate().trim();

    if (!date) {
      this.setFeedback('error', 'Tarih gerekli', 'Rapor icin tarih secin.');
      return;
    }

    this.activeReportTab.set(tab);
    this.isReportLoading.set(true);

    if (tab === 'received') {
      this.kasaIslemleriService
        .getEtiketBasimReceivedProductsReport(date)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isReportLoading.set(false))
        )
        .subscribe({
          next: (rows: EtiketBasimReceivedProductReportDto[]) => {
            this.receivedReportRows.set(rows ?? []);

            if (!rows?.length) {
              this.setFeedback('info', 'Rapor bos', 'Secilen gun icin gelen urun raporu bulunamadi.');
            }
          },
          error: (error: unknown) => {
            this.receivedReportRows.set([]);
            this.setFeedback(
              'error',
              'Rapor alinamadi',
              getErrorMessage(error, 'Gelen urun raporu yuklenemedi.')
            );
          }
      });
      return;
    }

    if (tab === 'comparison') {
      this.kasaIslemleriService
        .getManavMalKabulVeEtiketGoodsReceiptComparison({ date })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isReportLoading.set(false))
        )
        .subscribe({
          next: (rows: ManavMalKabulVeEtiketGoodsReceiptComparisonItemDto[]) => {
            this.comparisonReportRows.set(rows ?? []);

            if (!rows?.length) {
              this.setFeedback('info', 'Rapor bos', 'Secilen gun icin Mikro karsilastirma kaydi bulunamadi.');
            }
          },
          error: (error: unknown) => {
            this.comparisonReportRows.set([]);
            this.setFeedback(
              'error',
              'Rapor alinamadi',
              getErrorMessage(error, 'Mikro karsilastirma raporu yuklenemedi.')
            );
          }
        });
      return;
    }

    const warehouseNo = this.resolveReportWarehouseNo();

    if (!warehouseNo) {
      this.isReportLoading.set(false);
      this.setFeedback('error', 'Depo gerekli', 'Depo stok raporu icin depo no gerekli.');
      return;
    }

    this.kasaIslemleriService
      .getEtiketBasimDepotStockReport({ date, warehouseNo })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isReportLoading.set(false))
      )
      .subscribe({
        next: (rows: EtiketBasimDepotStockReportDto[]) => {
          this.depotReportRows.set(rows ?? []);

          if (!rows?.length) {
            this.setFeedback('info', 'Rapor bos', 'Secilen depo ve gun icin stok raporu bulunamadi.');
          }
        },
        error: (error: unknown) => {
          this.depotReportRows.set([]);
          this.setFeedback(
            'error',
            'Rapor alinamadi',
            getErrorMessage(error, 'Depo stok raporu yuklenemedi.')
          );
        }
      });
  }

  protected setSort(key: RecordSortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set('asc');
  }

  protected visibleRecords(): EtiketBasimAcceptanceRecordDto[] {
    const term = this.normalizeSearch(this.recordSearch());
    const rows = term
      ? this.records().filter((record) =>
          [
            record.supplierCode,
            record.supplierName,
            record.seriesAndNumber,
            record.stockCode,
            record.stockName,
            record.stockBarcode,
            record.status,
            record.caseType
          ]
            .map((value) => this.normalizeSearch(value))
            .some((value) => value.includes(term))
        )
      : this.records();

    return [...rows].sort((left, right) => this.compareRecords(left, right));
  }

  protected printCopies(): EtiketBasimLabelDto[] {
    const label = this.labelPreview();

    if (!label) {
      return [];
    }

    const copyCount = Math.min(200, Math.max(1, Math.trunc(Number(this.labelCopyCount) || 1)));
    return Array.from({ length: copyCount }, () => label);
  }

  protected setLabelCopyCount(value: string | number | null): void {
    const count = this.toNullableNumber(value);
    this.labelCopyCount = Math.min(200, Math.max(1, Math.trunc(count ?? 1)));
    this.scheduleBarcodeRender();
  }

  protected updateReportWarehouseNo(value: string | number | null): void {
    if (!this.canUseWarehouseScope()) {
      this.reportWarehouseNo = getCurrentWarehouseNo(this.authService.currentUser());
      return;
    }

    this.reportWarehouseNo = this.toNullableNumber(value);
  }

  protected isSelectedRecord(record: EtiketBasimAcceptanceRecordDto): boolean {
    return this.selectedRecord()?.id === record.id;
  }

  protected isSortActive(key: RecordSortKey): boolean {
    return this.sortKey() === key;
  }

  protected sortIcon(key: RecordSortKey): string {
    if (!this.isSortActive(key)) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '^' : 'v';
  }

  protected getStatusClass(record: EtiketBasimAcceptanceRecordDto): string {
    return record.microTransferred ? 'status-transferred' : 'status-waiting';
  }

  protected getComparisonStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toLocaleUpperCase('tr-TR')) {
      case 'ESLESTI':
        return 'Eslesti';
      case 'YAKIN':
        return 'Yakin';
      case 'FARKLI':
        return 'Farkli';
      case 'SADECE_ETIKET':
        return 'Sadece Etiket';
      case 'SADECE_MIKRO':
        return 'Sadece Mikro';
      default:
        return status?.trim() || '-';
    }
  }

  protected getComparisonStatusClass(status: string | null | undefined): string {
    switch ((status ?? '').trim().toLocaleUpperCase('tr-TR')) {
      case 'ESLESTI':
        return 'status-transferred';
      case 'YAKIN':
        return 'status-waiting';
      default:
        return 'status-blocked';
    }
  }

  protected trackByRecord = (_index: number, record: EtiketBasimAcceptanceRecordDto): number =>
    record.id;

  protected trackBySupplier = (index: number, supplier: EtiketBasimSupplierDto): string =>
    this.getSupplierCode(supplier) || `${index}`;

  protected trackByStock = (index: number, stock: EtiketBasimStockDto): string =>
    this.getStockCode(stock) || `${index}`;

  protected trackByPrintCopy = (index: number): number => index;

  private buildCalculationRequest() {
    const grossWeight = this.draft.grossWeight;
    const caseTare = this.draft.caseTare;

    if (grossWeight === null || grossWeight <= 0 || caseTare === null || caseTare < 0) {
      return null;
    }

    return {
      grossWeight,
      caseTare,
      caseCount: this.draft.caseCount && this.draft.caseCount > 0 ? this.draft.caseCount : null,
      palletTare:
        this.draft.palletTare !== null && this.draft.palletTare >= 0
          ? this.draft.palletTare
          : null,
      stockBarcode: this.draft.stockBarcode.trim() || null
    };
  }

  private buildSaveRequest(): SaveEtiketBasimAcceptanceRecordHttpRequest | null {
    const supplierCode = this.draft.supplierCode.trim();
    const supplierName = this.draft.supplierName.trim();
    const documentNo = this.draft.documentNo.trim();
    const stockCode = this.draft.stockCode.trim();
    const stockName = this.draft.stockName.trim();
    const stockBarcode = this.draft.stockBarcode.trim();
    const receivedBy = this.draft.receivedBy.trim();
    const caseType = this.draft.caseType;
    const grossWeight = this.draft.grossWeight;
    const caseTare = this.draft.caseTare;

    if (
      !supplierCode ||
      !supplierName ||
      !documentNo ||
      !stockCode ||
      !stockName ||
      !stockBarcode ||
      !receivedBy ||
      !caseType
    ) {
      return null;
    }

    if (grossWeight === null || grossWeight <= 0 || caseTare === null || caseTare < 0) {
      return null;
    }

    return {
      supplierCode,
      supplierName,
      documentSeries: this.draft.documentSeries.trim() || DEFAULT_STOCK_PREFIX,
      documentNo,
      stockCode,
      stockName,
      stockBarcode,
      grossWeight,
      caseTare,
      caseCount:
        this.draft.caseCount !== null && this.draft.caseCount > 0
          ? Math.trunc(this.draft.caseCount)
          : null,
      palletTare:
        this.draft.palletTare !== null && this.draft.palletTare >= 0
          ? this.draft.palletTare
          : null,
      receivedBy,
      caseType
    };
  }

  private isDraftValid(): boolean {
    return !!this.buildSaveRequest();
  }

  private fillDraftFromRecord(record: EtiketBasimAcceptanceRecordDto): void {
    this.draft = {
      supplierCode: record.supplierCode || '',
      supplierName: record.supplierName || '',
      documentSeries: record.documentSeries || DEFAULT_STOCK_PREFIX,
      documentNo: record.documentNo || '',
      stockCode: record.stockCode || '',
      stockName: record.stockName || '',
      stockBarcode: record.stockBarcode || '',
      grossWeight: this.toNullableNumber(record.grossWeight),
      caseTare: this.toNullableNumber(record.caseTare),
      caseCount: this.toNullableNumber(record.caseCount),
      palletTare: this.toNullableNumber(record.palletTare),
      receivedBy: record.receivedBy || '',
      caseType: this.normalizeCaseType(record.caseType)
    };
    this.supplierQuery = this.joinLabel(record.supplierCode, record.supplierName);
    this.stockQuery = this.joinLabel(record.stockCode, record.stockName);
  }

  private upsertRecord(record: EtiketBasimAcceptanceRecordDto): void {
    const existing = this.records();
    const index = existing.findIndex((item) => item.id === record.id);

    if (index < 0) {
      this.records.set([record, ...existing]);
      return;
    }

    const next = [...existing];
    next[index] = record;
    this.records.set(next);
  }

  private applyLabelPreview(label: EtiketBasimLabelDto): void {
    this.labelPreview.set(label);
    this.labelCopyCount = Math.max(1, Math.trunc(this.toSafeNumber(label.labelCount) || 1));
    this.activeTab.set('form');
    this.scheduleBarcodeRender();

    if (this.printAfterLabelPreview) {
      this.printAfterLabelPreview = false;
      window.setTimeout(() => void this.printLabel(), 120);
    }
  }

  protected scheduleCalculation(): void {
    this.clearCalculationTimer();

    if (!this.buildCalculationRequest()) {
      return;
    }

    this.calculationTimer = window.setTimeout(() => this.calculateDraft(true), 450);
  }

  private clearCalculationTimer(): void {
    if (this.calculationTimer !== undefined) {
      window.clearTimeout(this.calculationTimer);
      this.calculationTimer = undefined;
    }
  }

  private scheduleBarcodeRender(): void {
    this.clearLabelRenderTimer();
    this.labelRenderTimer = window.setTimeout(() => this.renderAllBarcodes(), 0);
  }

  private clearLabelRenderTimer(): void {
    if (this.labelRenderTimer !== undefined) {
      window.clearTimeout(this.labelRenderTimer);
      this.labelRenderTimer = undefined;
    }
  }

  private renderAllBarcodes(): void {
    const label = this.labelPreview();
    const barcode = label?.labelBarcode || label?.labelBarcodeRaw || label?.stockBarcode || '';

    renderBarcodeSvg(this.previewBarcode?.nativeElement ?? null, barcode, {
      barWidth: 1.1,
      barHeight: 34,
      fontSize: 10,
      marginX: 4,
      marginTop: 2
    });

    const elements = this.printBarcodeElements?.toArray() ?? [];

    elements.forEach((element) =>
      renderBarcodeSvg(element.nativeElement, barcode, {
        barWidth: 1,
        barHeight: 28,
        fontSize: 8,
        marginX: 2,
        marginTop: 1
      })
    );
  }

  private compareRecords(
    left: EtiketBasimAcceptanceRecordDto,
    right: EtiketBasimAcceptanceRecordDto
  ): number {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const key = this.sortKey();
    let result = 0;

    switch (key) {
      case 'grossWeight':
      case 'netReceivedWeight':
      case 'caseCount':
      case 'averageCaseWeight':
        result = this.toSafeNumber(left[key]) - this.toSafeNumber(right[key]);
        break;
      case 'createdAt':
        result = this.toTimestamp(left.createdAt) - this.toTimestamp(right.createdAt);
        break;
      case 'supplierName':
      case 'seriesAndNumber':
      case 'stockName':
      case 'status':
        result = this.normalizeSearch(left[key]).localeCompare(
          this.normalizeSearch(right[key]),
          'tr-TR'
        );
        break;
      default:
        result = 0;
        break;
    }

    return result * direction;
  }

  private resolveReportWarehouseNo(): number | null {
    if (!this.canUseWarehouseScope()) {
      return getCurrentWarehouseNo(this.authService.currentUser());
    }

    return this.reportWarehouseNo;
  }

  private hasPermission(action: PermissionAction): boolean {
    const user = this.authService.currentUser();

    if (!user) {
      return false;
    }

    const permissionCode = `${PERMISSION_PREFIX}.${action}`;
    const permissionKeys = [
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => normalizePermissionCode(permission));
    const normalizedPermissionCode = normalizePermissionCode(permissionCode);
    const normalizedAction = normalizePermissionCode(action);

    return (
      currentUserHasPermission(user, permissionCode) ||
      permissionKeys.includes(normalizedPermissionCode) ||
      permissionKeys.includes(normalizedAction)
    );
  }

  protected getSupplierCode(supplier: EtiketBasimSupplierDto): string {
    return (supplier.supplierCode ?? supplier.code ?? '').trim();
  }

  protected getSupplierName(supplier: EtiketBasimSupplierDto): string {
    return (supplier.supplierName ?? supplier.name ?? supplier.displayName ?? '').trim();
  }

  protected getStockCode(stock: EtiketBasimStockDto): string {
    return (stock.stockCode ?? stock.code ?? '').trim();
  }

  protected getStockName(stock: EtiketBasimStockDto): string {
    return (stock.stockName ?? stock.name ?? stock.displayName ?? '').trim();
  }

  protected getStockBarcode(stock: EtiketBasimStockDto): string {
    return (stock.stockBarcode ?? stock.barcode ?? '').trim();
  }

  private normalizeCaseType(value: string | null | undefined): 'REHINLI' | 'REHINSIZ' {
    const normalized = value
      ?.trim()
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/İ/g, 'I')
      .replace(/[^A-Z]/g, '');

    return normalized === 'REHINSIZ' ? 'REHINSIZ' : 'REHINLI';
  }

  private joinLabel(code: string | null | undefined, name: string | null | undefined): string {
    return [code, name].map((value) => value?.trim()).filter(Boolean).join(' - ');
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private toSafeNumber(value: unknown): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private toTimestamp(value: string | null | undefined): number {
    const timestamp = Date.parse(value ?? '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .trim();
  }

  private setFeedback(tone: FeedbackState['tone'], title: string, message: string): void {
    this.feedback.set({ tone, title, message });
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }
}
