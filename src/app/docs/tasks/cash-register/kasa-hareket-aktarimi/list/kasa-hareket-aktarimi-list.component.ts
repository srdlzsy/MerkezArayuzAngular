import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, catchError, exhaustMap, finalize, of, timer } from 'rxjs';
import type {
  KasaHareketBranchDto,
  KasaHareketCashSummaryComparisonDto,
  KasaHareketCashSummaryComparisonRowDto,
  KasaHareketCashRegisterDto,
  KasaHareketCashSummaryDocumentDto,
  KasaHareketCashSummaryPaymentDto,
  KasaHareketCashierSummaryDto,
  KasaHareketDetailDto,
  KasaHareketImportHttpRequest,
  KasaHareketImportIssueDto,
  KasaHareketImportResultDto,
  KasaHareketMovementPaymentSummaryDto,
  KasaHareketProcedureResultDto,
  KasaHareketReceiptDto,
  KasaHareketReportRowDto,
  KasaHareketReportSummaryDto,
  KasaHareketSalesComparisonDto,
  KasaHareketSalesComparisonRowDto,
  KasaHareketScheduledImportHttpRequest,
  KasaHareketTransferStatusDto
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ExcelExportButtonComponent } from '../../../core/excel-export/excel-export-button.component';
import {
  ExcelExportColumn,
  ExcelExportSheet,
  exportRowsToExcel
} from '../../../core/excel-export/excel-export.utils';
import { InPlacePrintService } from '../../../core/document-print/in-place-print.service';

type KasaHareketTab = 'import' | 'rapor' | 'satis' | 'icmal' | 'mikro';
type KasaHareketDetailTab =
  | 'cashiers'
  | 'movement-payments'
  | 'summary-payments'
  | 'documents'
  | 'receipts'
  | 'canceled-receipts'
  | 'missing-receipts';
type KasaHareketImportMode = 'normal' | 'scheduled';
type KasaHareketProcedureAction =
  | 'staging-delete'
  | 'mikro-transfer'
  | 'mikro-delete'
  | 'mikro-range-transfer';

interface ActionFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

interface ImportIssueRow extends KasaHareketImportIssueDto {
  severity: 'Hata' | 'Uyari';
  issueId: string;
  displayMessage: string;
}

interface MissingReceiptRow {
  receiptNo: number;
}

@Component({
  selector: 'app-kasa-hareket-aktarimi-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ExcelExportButtonComponent],
  templateUrl: './kasa-hareket-aktarimi-list.component.html',
  styleUrl: './kasa-hareket-aktarimi-list.component.scss'
})
export class KasaHareketAktarimiListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-hareket-aktarimi'];
  protected readonly today = this.getToday();
  protected readonly activeTab = signal<KasaHareketTab>('import');
  protected readonly branches = signal<KasaHareketBranchDto[]>([]);
  protected readonly cashRegisters = signal<KasaHareketCashRegisterDto[]>([]);
  protected readonly branchesLoading = signal(false);
  protected readonly cashRegistersLoading = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly reportLoading = signal(false);
  protected readonly reportCsvExporting = signal(false);
  protected readonly comparisonLoading = signal(false);
  protected readonly comparisonCsvExporting = signal(false);
  protected readonly comparisonDetailLoading = signal(false);
  protected readonly comparisonDetailExporting = signal(false);
  protected readonly procedureLoadingAction = signal<KasaHareketProcedureAction | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly lastImportResult = signal<KasaHareketImportResultDto | null>(null);
  protected readonly lastProcedureResult = signal<KasaHareketProcedureResultDto | null>(null);
  protected readonly reportRows = signal<KasaHareketReportRowDto[]>([]);
  protected readonly reportSummary = signal<KasaHareketReportSummaryDto | null>(null);
  protected readonly salesComparisonLoading = signal(false);
  protected readonly salesComparison = signal<KasaHareketSalesComparisonDto | null>(null);
  protected readonly salesComparisonExporting = signal(false);
  protected readonly salesComparisonPrinting = signal(false);
  protected readonly printDate = signal('');
  protected readonly comparisonResult = signal<KasaHareketCashSummaryComparisonDto | null>(null);
  protected readonly selectedComparisonRow = signal<KasaHareketCashSummaryComparisonRowDto | null>(null);
  protected readonly comparisonDetail = signal<KasaHareketDetailDto | null>(null);
  protected readonly comparisonDetailTab = signal<KasaHareketDetailTab>('cashiers');
  protected readonly reportExporting = signal(false);
  protected readonly excelExportErrorMessage = signal<string | null>(null);
  protected readonly selectedCashRegisterNos = signal<number[]>([]);
  protected readonly transferStatus = signal<KasaHareketTransferStatusDto | null>(null);
  protected readonly transferStatusLoading = signal(false);

  protected readonly transferProgressPercent = computed(() => {
    const status = this.transferStatus();
    if (!status?.totalReceiptCount) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((status.transferredReceiptCount / status.totalReceiptCount) * 100)
    );
  });

  protected readonly isAllCashRegistersSelected = computed(() => {
    const list = this.cashRegisters();
    const selected = this.selectedCashRegisterNos();
    return list.length > 0 && selected.length === list.length;
  });

  protected readonly scopeForm = new FormGroup({
    branchNo: new FormControl<number | null>(null),
    cashRegisterNo: new FormControl<number | null>({ value: null, disabled: true })
  });
  protected readonly importForm = new FormGroup({
    importType: new FormControl<KasaHareketImportMode>('normal', {
      nonNullable: true
    }),
    startDate: new FormControl<string>(this.today, { nonNullable: true }),
    endDate: new FormControl<string>(this.today, { nonNullable: true }),
    scheduledDate: new FormControl<string>(this.today, { nonNullable: true }),
    addDay: new FormControl<number | null>(null),
    fileRootPath: new FormControl<string>('', { nonNullable: true }),
    skipExisting: new FormControl<boolean>(false, { nonNullable: true }),
    dryRun: new FormControl<boolean>(false, { nonNullable: true })
  });
  protected readonly reportForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true })
  });
  protected readonly salesComparisonForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true })
  });
  protected readonly comparisonForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true }),
    tolerance: new FormControl<number | null>(0.01)
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly inPlacePrintService = inject(InPlacePrintService);
  private readonly document = inject(DOCUMENT);
  private readonly numberFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private readonly scopeVersion = signal(0);
  private cashRegisterRequestId = 0;
  private transferStatusSubscription: { unsubscribe: () => void } | null = null;

  protected readonly selectedBranchLabel = computed(() => {
    this.scopeVersion();

    const branchNo = this.getSelectedBranchNo();

    if (!branchNo) {
      return 'Tum Subeler';
    }

    const branch = this.branches().find((item) => item.branchNo === branchNo);

    if (!branch) {
      return `Sube ${branchNo}`;
    }

    return `${branch.branchName || 'Sube'} (${branch.branchNo})`;
  });
  protected readonly selectedCashRegisterLabel = computed(() => {
    this.scopeVersion();
    const selected = this.selectedCashRegisterNos();
    if (!this.getSelectedBranchNo() || selected.length === this.cashRegisters().length) {
      return 'Tum Kasalar';
    }

    if (!selected.length) {
      return 'Kasa secilmedi';
    }

    return selected.length === 1 ? `Kasa ${selected[0]}` : `${selected.length} kasa`;
  });
  protected readonly scopeSummary = computed(
    () => `${this.selectedBranchLabel()} / ${this.selectedCashRegisterLabel()}`
  );
  protected readonly reportTotalNet = computed(() =>
    this.reportSummary()?.totalNetAmount
    ?? this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.netAmount), 0)
  );
  protected readonly reportTotalExpense = computed(() =>
    this.reportSummary()?.totalExpense
    ?? this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.expense), 0)
  );
  protected readonly reportTotalCheck = computed(() =>
    this.reportSummary()?.totalCheckAmount
    ?? this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.checkAmount), 0)
  );
  protected readonly reportTotalDifference = computed(() =>
    this.reportSummary()?.totalDifference
    ?? this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.difference), 0)
  );
  protected readonly importIssueRows = computed<ImportIssueRow[]>(() => {
    const result = this.lastImportResult();

    if (!result) {
      return [];
    }

    return [
      ...(result.errors ?? []).map((issue, index) => this.buildIssueRow(issue, 'Hata', index)),
      ...(result.warnings ?? []).map((issue, index) =>
        this.buildIssueRow(issue, 'Uyari', index)
      )
    ];
  });

  constructor() {
    this.scopeForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.scopeVersion.update((value) => value + 1);
    });

    this.scopeForm.controls.branchNo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branchNo: number | null) =>
        this.loadCashRegisters(this.toOptionalNumber(branchNo))
      );

    this.destroyRef.onDestroy(() => this.stopTransferStatusPolling());

    this.loadBranches();
  }

  protected selectTab(tab: KasaHareketTab): void {
    this.activeTab.set(tab);
  }

  protected selectImportMode(mode: KasaHareketImportMode): void {
    this.importForm.controls.importType.setValue(mode);
  }

  protected loadBranches(): void {
    this.branchesLoading.set(true);
    this.feedback.set(null);

    this.kasaIslemleriService
      .getKasaHareketSubeleri()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.branchesLoading.set(false))
      )
      .subscribe({
        next: (branches: KasaHareketBranchDto[]) => {
          this.branches.set(
            [...(branches ?? [])].sort((left, right) =>
              (left.branchName || '').localeCompare(right.branchName || '', 'tr') ||
              left.branchNo - right.branchNo
            )
          );
        },
        error: (error: unknown) => {
          this.branches.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Subeler yuklenemedi',
            message: this.getErrorMessage(error, 'Kasa hareket sube listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected runImport(): void {
    const importType = this.importForm.controls.importType.value;

    if (importType === 'scheduled') {
      this.runScheduledImport();
      return;
    }

    const startDate = this.importForm.controls.startDate.value.trim();
    const endDate = this.importForm.controls.endDate.value.trim();

    if (!this.validateDateRange(startDate, endDate, 'Import tarih araligi eksik veya hatali.')) {
      return;
    }

    const request = this.buildImportRequest(startDate, endDate);
    const request$: Observable<KasaHareketImportResultDto> =
      this.kasaIslemleriService.importKasaHareketleri(request);

    this.importLoading.set(true);
    this.feedback.set(null);
    this.lastImportResult.set(null);
    this.startTransferStatusPolling(startDate, endDate);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.importLoading.set(false);
          this.stopTransferStatusPolling();
          this.refreshTransferStatus(startDate, endDate);
        })
      )
      .subscribe({
        next: (result: KasaHareketImportResultDto) => this.handleImportResult(result),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Import calismadi',
            message: this.getErrorMessage(error, 'Kasa hareket import istegi basarisiz oldu.')
          });
        }
      });
  }

  protected loadReport(): void {
    const date = this.reportForm.controls.date.value.trim();

    if (!date) {
      this.feedback.set({
        tone: 'error',
        title: 'Rapor tarihi gerekli',
        message: 'Rapor gridini doldurmak icin tarih secin.'
      });
      return;
    }

    this.reportLoading.set(true);
    this.feedback.set(null);
    this.reportSummary.set(null);

    const request = this.buildReportRequest(date);

    this.kasaIslemleriService
      .getKasaHareketRaporu(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reportLoading.set(false))
      )
      .subscribe({
        next: (rows: KasaHareketReportRowDto[]) => {
          this.reportRows.set(this.sortReportRows(rows ?? []));

          if (!rows?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Rapor bos',
              message: 'Secilen filtrelerle kasa hareket raporu kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.reportRows.set([]);
          this.reportSummary.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Rapor yuklenemedi',
            message: this.getErrorMessage(error, 'Kasa hareket raporu alinirken hata olustu.')
          });
        }
      });

    this.kasaIslemleriService
      .getKasaHareketRaporOzeti(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary: KasaHareketReportSummaryDto) => this.reportSummary.set(summary ?? null),
        error: () => this.reportSummary.set(null)
      });
  }

  protected loadComparison(): void {
    const date = this.comparisonForm.controls.date.value.trim();

    if (!date) {
      this.feedback.set({
        tone: 'error',
        title: 'Icmal tarihi gerekli',
        message: 'Icmal kontrolu icin tarih secin.'
      });
      return;
    }

    this.comparisonLoading.set(true);
    this.feedback.set(null);
    this.comparisonResult.set(null);
    this.selectedComparisonRow.set(null);
    this.comparisonDetail.set(null);

    this.kasaIslemleriService
      .getKasaHareketIcmalKarsilastirma(this.buildComparisonRequest(date))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.comparisonLoading.set(false))
      )
      .subscribe({
        next: (result: KasaHareketCashSummaryComparisonDto) => {
          this.comparisonResult.set({
            ...result,
            rows: this.sortComparisonRows(result.rows ?? [])
          });

          if (!result.rows?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Icmal kontrol bos',
              message: 'Secilen filtrelerle karsilastirilacak kasa kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.comparisonResult.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Icmal kontrol yuklenemedi',
            message: this.getErrorMessage(error, 'Icmal karsilastirma alinirken hata olustu.')
          });
        }
      });
  }

  protected loadSalesComparison(): void {
    const date = this.salesComparisonForm.controls.date.value.trim();
    if (!date) {
      this.feedback.set({
        tone: 'error',
        title: 'Karsilastirma tarihi gerekli',
        message: 'Satis karsilastirmasi icin tarih secin.'
      });
      return;
    }

    this.salesComparisonLoading.set(true);
    this.salesComparison.set(null);
    this.feedback.set(null);

    this.kasaIslemleriService
      .getKasaHareketSatisKarsilastirma({
        date: this.toDateQueryValue(date),
        branchNo: this.getSelectedBranchNo()
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.salesComparisonLoading.set(false))
      )
      .subscribe({
        next: (result: KasaHareketSalesComparisonDto) => {
          this.salesComparison.set({
            ...result,
            rows: [...(result.rows ?? [])].sort((left, right) => left.branchNo - right.branchNo)
          });

          if (!result.rows?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Satis karsilastirmasi bos',
              message: 'Secilen tarih ve sube icin karsilastirilacak hareket bulunamadi.'
            });
          }
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Satis karsilastirmasi yuklenemedi',
            message: this.getErrorMessage(error, 'Satis karsilastirma verileri alinirken hata olustu.')
          });
        }
      });
  }

  protected openComparisonDetail(row: KasaHareketCashSummaryComparisonRowDto): void {
    if (!row.branchNo || !row.cashRegisterNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Detay acilamadi',
        message: 'Detay icin sube ve kasa bilgisi zorunludur.'
      });
      return;
    }

    this.selectedComparisonRow.set(row);
    this.comparisonDetail.set(null);
    this.comparisonDetailTab.set('cashiers');
    this.comparisonDetailLoading.set(true);
    this.feedback.set(null);

    this.kasaIslemleriService
      .getKasaHareketIcmalKarsilastirmaDetay({
        date: this.toDateQueryValue(row.date || this.comparisonForm.controls.date.value),
        branchNo: row.branchNo,
        cashRegisterNo: row.cashRegisterNo,
        receiptTake: 500
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.comparisonDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: KasaHareketDetailDto) =>
          this.comparisonDetail.set(this.normalizeComparisonDetail(detail)),
        error: (error: unknown) => {
          this.comparisonDetail.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Icmal detayi yuklenemedi',
            message: this.getErrorMessage(error, 'Kasa hareket icmal detayi alinirken hata olustu.')
          });
        }
      });
  }

  protected closeComparisonDetail(): void {
    this.selectedComparisonRow.set(null);
    this.comparisonDetail.set(null);
  }

  protected selectComparisonDetailTab(tab: KasaHareketDetailTab): void {
    this.comparisonDetailTab.set(tab);
  }

  @HostListener('document:keydown.escape')
  protected closeComparisonDetailWithEscape(): void {
    if (this.selectedComparisonRow()) {
      this.closeComparisonDetail();
    }
  }

  protected async runProcedure(action: KasaHareketProcedureAction): Promise<void> {
    if (this.procedureLoadingAction()) {
      return;
    }

    const request$ = this.buildProcedureRequest(action);

    if (!request$) {
      return;
    }

    this.procedureLoadingAction.set(action);
    this.feedback.set(null);
    this.lastProcedureResult.set(null);
    const [statusStartDate, statusEndDate] = this.getProcedureDateRange(action);
    this.startTransferStatusPolling(statusStartDate, statusEndDate);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.procedureLoadingAction.set(null);
          this.stopTransferStatusPolling();
          this.refreshTransferStatus(statusStartDate, statusEndDate);
        })
      )
      .subscribe({
        next: (result: KasaHareketProcedureResultDto) => {
          this.lastProcedureResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: `${this.getProcedureLabel(action)} tamamlandi`,
            message: result.message || `${result.procedure || 'Procedure'} calisti.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: `${this.getProcedureLabel(action)} calismadi`,
            message: this.getErrorMessage(error, 'Procedure istegi basarisiz oldu.')
          });
        }
      });
  }

  protected isProcedureLoading(action: KasaHareketProcedureAction): boolean {
    return this.procedureLoadingAction() === action;
  }

  protected getImportRequestPreview(): string {
    if (this.importForm.controls.importType.value === 'scheduled') {
      return this.formatJson(this.buildScheduledImportRequest());
    }

    return this.formatJson(
      this.buildImportRequest(
        this.importForm.controls.startDate.value.trim(),
        this.importForm.controls.endDate.value.trim()
      )
    );
  }

  protected getReportRequestPreview(): string {
    return this.formatJson(this.buildReportRequest(this.reportForm.controls.date.value.trim()));
  }

  protected getComparisonRequestPreview(): string {
    return this.formatJson(this.buildComparisonRequest(this.comparisonForm.controls.date.value.trim()));
  }

  protected getMikroRequestPreview(): string {
    return this.formatJson({
      date: this.importForm.controls.startDate.value.trim(),
      branchNo: this.getSelectedBranchNo()
    });
  }

  protected getMikroRangeRequestPreview(): string {
    return this.formatJson({
      startDate: this.importForm.controls.startDate.value.trim(),
      endDate: this.importForm.controls.endDate.value.trim()
    });
  }

  protected getBranchLabel(branch: KasaHareketBranchDto): string {
    const region = branch.region?.trim();
    const name = branch.branchName?.trim() || 'Sube';

    return region ? `${name} (${branch.branchNo}) - ${region}` : `${name} (${branch.branchNo})`;
  }

  protected getCashRegisterLabel(cashRegister: KasaHareketCashRegisterDto): string {
    const typeName =
      cashRegister.cashRegisterTypeName?.trim() || `Tip ${cashRegister.cashRegisterType}`;

    return `Kasa ${cashRegister.cashRegisterNo} - ${typeName}`;
  }

  protected getImportModeLabel(mode: KasaHareketImportMode): string {
    switch (mode) {
      case 'scheduled':
        return 'Zamanli';
      case 'normal':
      default:
        return 'HR + IP Hareket';
    }
  }

  protected getProcedureLabel(action: KasaHareketProcedureAction): string {
    switch (action) {
      case 'staging-delete':
        return 'Staging sil';
      case 'mikro-delete':
        return 'Mikrodan sil';
      case 'mikro-range-transfer':
        return 'Aralik aktar';
      case 'mikro-transfer':
      default:
        return 'Mikroya aktar';
    }
  }

  protected formatCurrency(value: number | null | undefined): string {
    return `${this.numberFormatter.format(this.toSafeNumber(value))} TL`;
  }

  protected formatNumber(value: number | null | undefined): string {
    return this.numberFormatter.format(this.toSafeNumber(value));
  }

  protected formatDate(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short'
    }).format(date);
  }

  protected async exportReportRows(): Promise<void> {
    const rows = this.reportRows();

    if (!rows.length || this.reportExporting()) {
      return;
    }

    this.reportExporting.set(true);
    this.excelExportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: `Kasa Hareket Raporu ${this.reportForm.controls.date.value} ${this.scopeSummary()}`,
        sheetName: 'Kasa Hareket Raporu',
        rows,
        columns: this.getReportExportColumns()
      });
    } catch {
      this.excelExportErrorMessage.set('Excel dosyasi olusturulamadi.');
    } finally {
      this.reportExporting.set(false);
    }
  }

  protected exportReportCsv(): void {
    const date = this.reportForm.controls.date.value.trim();

    if (!date || this.reportCsvExporting()) {
      return;
    }

    this.reportCsvExporting.set(true);
    this.excelExportErrorMessage.set(null);

    this.kasaIslemleriService
      .exportKasaHareketRaporu(this.buildReportRequest(date))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reportCsvExporting.set(false))
      )
      .subscribe({
        next: (blob: Blob) => this.downloadBlob(blob, `kasa-hareket-rapor-${this.toCompactDate(date)}.csv`),
        error: (error: unknown) => {
          this.excelExportErrorMessage.set(
            this.getErrorMessage(error, 'Kasa hareket raporu CSV dosyasi indirilemedi.')
          );
        }
      });
  }

  protected exportComparisonCsv(): void {
    const date = this.comparisonForm.controls.date.value.trim();

    if (!date || this.comparisonCsvExporting()) {
      return;
    }

    this.comparisonCsvExporting.set(true);
    this.excelExportErrorMessage.set(null);

    this.kasaIslemleriService
      .exportKasaHareketIcmalKarsilastirma(this.buildComparisonRequest(date))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.comparisonCsvExporting.set(false))
      )
      .subscribe({
        next: (blob: Blob) =>
          this.downloadBlob(blob, `kasa-hareket-icmal-karsilastirma-${this.toCompactDate(date)}.csv`),
        error: (error: unknown) => {
          this.excelExportErrorMessage.set(
            this.getErrorMessage(error, 'Icmal karsilastirma CSV dosyasi indirilemedi.')
          );
        }
      });
  }

  protected async exportComparisonDetailExcel(): Promise<void> {
    const detail = this.comparisonDetail();

    if (!detail || this.comparisonDetailExporting()) {
      return;
    }

    this.comparisonDetailExporting.set(true);
    this.excelExportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: `Kasa Hareket Icmal Detay ${this.toDateQueryValue(detail.date)} ${detail.branchNo} Kasa ${detail.cashRegisterNo}`,
        sheets: this.getComparisonDetailExportSheets(detail).filter((sheet) => sheet.rows.length > 0)
      });
    } catch {
      this.excelExportErrorMessage.set('Icmal detay Excel dosyasi olusturulamadi.');
    } finally {
      this.comparisonDetailExporting.set(false);
    }
  }

  protected async exportSalesComparisonExcel(): Promise<void> {
    const comparison = this.salesComparison();
    const rows = comparison?.rows ?? [];

    if (!rows.length || this.salesComparisonExporting()) {
      return;
    }

    this.salesComparisonExporting.set(true);
    this.excelExportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: `Satis Karsilastirma ${this.salesComparisonForm.controls.date.value} ${this.selectedBranchLabel()}`,
        sheetName: 'Satis Karsilastirma',
        rows,
        columns: this.getSalesComparisonExportColumns()
      });
    } catch {
      this.excelExportErrorMessage.set('Satis karsilastirma Excel dosyasi olusturulamadi.');
    } finally {
      this.salesComparisonExporting.set(false);
    }
  }

  protected async printSalesComparison(): Promise<void> {
    const comparison = this.salesComparison();
    if (!comparison || !comparison.rows.length || this.salesComparisonPrinting()) {
      return;
    }

    const printSection = this.document.getElementById('sales-comparison-print-section');
    if (!printSection) {
      return;
    }

    this.printDate.set(
      new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'medium'
      }).format(new Date())
    );
    this.salesComparisonPrinting.set(true);

    const started = await this.inPlacePrintService.print({
      styleId: 'sales-comparison-print-style',
      mount: {
        element: printSection,
        documentClassName: 'is-printing-sales-comparison'
      },
      styles: `
        @page {
          size: A4 portrait;
          margin: 3mm 3mm;
        }

        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            font-size: 8px !important;
            color: #000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body.is-printing-sales-comparison > *:not(#sales-comparison-print-section) {
            display: none !important;
          }

          body.is-printing-sales-comparison {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }

          #sales-comparison-print-section {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .only-print {
            display: block !important;
          }

          .no-print,
          .sales-comparison-summary,
          .report-toolbar {
            display: none !important;
          }

          .print-header {
            margin-bottom: 1.2mm !important;
            padding-bottom: 0.8mm !important;
            border-bottom: 1.5px solid #000 !important;
          }

          .print-header-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            margin-bottom: 0.6mm !important;
          }

          .print-brand {
            font-size: 9.5px !important;
            font-weight: 900 !important;
            letter-spacing: 0.08em !important;
            color: #0f766e !important;
          }

          .print-title {
            margin: 0 !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            color: #000 !important;
            text-transform: uppercase !important;
            letter-spacing: -0.2px !important;
          }

          .print-date {
            font-size: 8px !important;
            color: #334155 !important;
          }

          .print-meta-line {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 7.5px !important;
            color: #1e293b !important;
            background: #f1f5f9 !important;
            padding: 0.6mm 1.2mm !important;
            border-radius: 2px !important;
          }

          .print-meta-line strong {
            color: #000 !important;
          }

          .print-meta-line strong.color-danger {
            color: #dc2626 !important;
          }

          .sales-comparison-table-wrap {
            max-height: none !important;
            overflow: visible !important;
            border: 1px solid #000 !important;
          }

          table.sales-comparison-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7.8px !important;
            table-layout: auto !important;
          }

          table.sales-comparison-table thead {
            display: table-header-group !important;
          }

          table.sales-comparison-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table.sales-comparison-table th,
          table.sales-comparison-table td {
            padding: 1.2px 1.2px !important;
            border: 1px solid #94a3b8 !important;
            line-height: 1.08 !important;
            color: #000 !important;
          }

          table.sales-comparison-table th {
            background: #e2e8f0 !important;
            color: #000 !important;
            font-weight: 800 !important;
            font-size: 7.5px !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            border: 1px solid #64748b !important;
          }

          table.sales-comparison-table td {
            font-size: 7.8px !important;
          }

          table.sales-comparison-table td strong {
            font-size: 7.8px !important;
            font-weight: 700 !important;
            color: #000 !important;
          }

          table.sales-comparison-table td.font-mono {
            white-space: nowrap !important;
            font-size: 7.8px !important;
            font-weight: 600 !important;
            letter-spacing: -0.2px !important;
            font-variant-numeric: tabular-nums !important;
          }

          table.sales-comparison-table td.cell-strong {
            font-weight: 700 !important;
          }

          table.sales-comparison-table td.amount-negative {
            color: #dc2626 !important;
            font-weight: 700 !important;
          }

          table.sales-comparison-table tfoot td {
            background: #e2e8f0 !important;
            font-weight: 800 !important;
            border-top: 1.5px solid #000 !important;
            border-bottom: 1px solid #000 !important;
            font-size: 7.8px !important;
            white-space: nowrap !important;
            color: #000 !important;
            padding: 1.8px 1.2px !important;
          }

          .status-pill {
            padding: 0.8px 2px !important;
            font-size: 7px !important;
            font-weight: 800 !important;
            border-radius: 2px !important;
            white-space: nowrap !important;
            display: inline-block !important;
            border: 1px solid #94a3b8 !important;
          }

          .status-pill.status-difference {
            background: #fee2e2 !important;
            color: #991b1b !important;
            border-color: #f87171 !important;
          }

          .status-pill.status-balanced {
            background: #dcfce7 !important;
            color: #166534 !important;
            border-color: #86efac !important;
          }
        }
      `,
      cleanupTimeoutMs: 30_000,
      afterPrint: () => this.salesComparisonPrinting.set(false)
    });

    if (!started) {
      this.salesComparisonPrinting.set(false);
    }
  }

  protected readonly trackByBranch = (_index: number, branch: KasaHareketBranchDto): number =>
    branch.branchNo;

  protected readonly trackByCashRegister = (
    _index: number,
    cashRegister: KasaHareketCashRegisterDto
  ): string => `${cashRegister.branchNo}-${cashRegister.cashRegisterNo}`;

  protected readonly trackByReportRow = (_index: number, row: KasaHareketReportRowDto): string =>
    `${row.date}-${row.branchNo}-${row.cashRegisterNo}`;

  protected readonly trackBySalesComparisonRow = (
    _index: number,
    row: KasaHareketSalesComparisonRowDto
  ): number => row.branchNo;

  protected readonly trackByComparisonRow = (
    _index: number,
    row: KasaHareketCashSummaryComparisonRowDto
  ): string => `${row.date}-${row.branchNo}-${row.cashRegisterNo}-${row.status}`;

  protected readonly trackByIssue = (_index: number, row: ImportIssueRow): string => row.issueId;

  protected readonly trackByCashierSummary = (
    _index: number,
    row: KasaHareketCashierSummaryDto
  ): string => row.cashierCode || row.cashierName;

  protected readonly trackByMovementPaymentSummary = (
    _index: number,
    row: KasaHareketMovementPaymentSummaryDto
  ): string => `${row.paymentType}-${row.paymentTypeName}`;

  protected readonly trackByCashSummaryPayment = (
    _index: number,
    row: KasaHareketCashSummaryPaymentDto
  ): string => `${row.paymentTypeId}-${row.accountCode}`;

  protected readonly trackByCashSummaryDocument = (
    _index: number,
    row: KasaHareketCashSummaryDocumentDto
  ): string => row.documentNo || `${row.documentSerie}-${row.documentOrderNo}`;

  protected readonly trackByReceipt = (_index: number, row: KasaHareketReceiptDto): string =>
    row.invoiceGuid || `${row.branchNo}-${row.cashRegisterNo}-${row.receiptNo}`;

  protected readonly trackByMissingReceipt = (_index: number, row: number): number => row;

  protected isSelectedComparisonRow(row: KasaHareketCashSummaryComparisonRowDto): boolean {
    const selected = this.selectedComparisonRow();

    return !!selected
      && selected.date === row.date
      && selected.branchNo === row.branchNo
      && selected.cashRegisterNo === row.cashRegisterNo
      && selected.status === row.status;
  }

  private runScheduledImport(): void {
    const request = this.buildScheduledImportRequest();
    const statusDate = request.date || this.today;

    this.importLoading.set(true);
    this.feedback.set(null);
    this.lastImportResult.set(null);
    this.startTransferStatusPolling(statusDate, statusDate);

    this.kasaIslemleriService
      .runKasaHareketZamanliAktarim(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.importLoading.set(false);
          this.stopTransferStatusPolling();
          this.refreshTransferStatus(statusDate, statusDate);
        })
      )
      .subscribe({
        next: (result: KasaHareketImportResultDto) => this.handleImportResult(result),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Zamanli import calismadi',
            message: this.getErrorMessage(error, 'Zamanli kasa hareket import istegi basarisiz oldu.')
          });
        }
      });
  }

  private handleImportResult(result: KasaHareketImportResultDto): void {
    this.lastImportResult.set(result);
    this.feedback.set({
      tone: result.errors?.length ? 'error' : 'success',
      title: result.errors?.length ? 'Import hata ile tamamlandi' : 'Import tamamlandi',
      message: `${result.processedFiles ?? 0} dosya, ${result.processedInvoices ?? 0} fis islendi.`
    });
  }

  private loadCashRegisters(branchNo: number | null): void {
    const requestId = ++this.cashRegisterRequestId;

    this.cashRegisters.set([]);
    this.selectedCashRegisterNos.set([]);
    this.scopeForm.controls.cashRegisterNo.reset(null, { emitEvent: false });
    this.scopeForm.controls.cashRegisterNo.disable({ emitEvent: false });
    this.scopeVersion.update((value) => value + 1);

    if (!branchNo) {
      this.cashRegistersLoading.set(false);
      return;
    }

    this.cashRegistersLoading.set(true);

    this.kasaIslemleriService
      .getKasaHareketKasalar(branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.cashRegisterRequestId) {
            this.cashRegistersLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (cashRegisters: KasaHareketCashRegisterDto[]) => {
          if (requestId !== this.cashRegisterRequestId) {
            return;
          }

          const sorted = [...(cashRegisters ?? [])].sort(
            (left, right) => left.cashRegisterNo - right.cashRegisterNo
          );
          this.cashRegisters.set(sorted);
          this.selectedCashRegisterNos.set(sorted.map((item) => item.cashRegisterNo));
          this.scopeForm.controls.cashRegisterNo.enable({ emitEvent: false });
          this.scopeVersion.update((value) => value + 1);
        },
        error: (error: unknown) => {
          if (requestId !== this.cashRegisterRequestId) {
            return;
          }

          this.cashRegisters.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Kasalar yuklenemedi',
            message: this.getErrorMessage(error, 'Secilen subenin kasa listesi alinamadi.')
          });
        }
      });
  }

  protected toggleCashRegister(cashRegisterNo: number): void {
    const current = this.selectedCashRegisterNos();
    if (current.includes(cashRegisterNo)) {
      this.selectedCashRegisterNos.set(current.filter((no) => no !== cashRegisterNo));
    } else {
      this.selectedCashRegisterNos.set([...current, cashRegisterNo].sort((a, b) => a - b));
    }
  }

  protected isCashRegisterSelected(cashRegisterNo: number): boolean {
    return this.selectedCashRegisterNos().includes(cashRegisterNo);
  }

  protected selectAllCashRegisters(): void {
    this.selectedCashRegisterNos.set(this.cashRegisters().map((item) => item.cashRegisterNo));
  }

  protected clearCashRegisters(): void {
    this.selectedCashRegisterNos.set([]);
  }

  protected async actionHareketAktar(): Promise<void> {
    const dryRun = this.importForm.controls.dryRun.value;
    const confirmed = await this.confirmDialog.confirm({
      title: dryRun ? 'Hareketleri Kontrol Et' : 'Hareketleri Aktar',
      message: dryRun
        ? 'Hareket ve iptal dosyalari okunacak ancak veritabanina kayit yazilmayacak.'
        : 'Secilen tarih, sube ve kasalardaki hareketler ile iptal belgeleri ara tabloya aktarilacak.',
      confirmText: dryRun ? 'Kontrol Et' : 'Aktar',
      tone: 'info'
    });
    if (!confirmed) {
      return;
    }
    this.importForm.controls.importType.setValue('normal');
    this.runImport();
  }

  protected async actionHareketSil(): Promise<void> {
    const date = this.importForm.controls.startDate.value.trim();
    const branchNo = this.getSelectedBranchNo();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Hareketleri Sil',
      message: `${date || 'Secili tarih'} / ${branchNo ? `Sube ${branchNo}` : 'tum subeler'} ara tablo hareketleri silinecek.`,
      confirmText: 'Evet, Sil',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    this.runProcedure('staging-delete');
  }

  protected async actionMikroAktar(): Promise<void> {
    const date = this.importForm.controls.startDate.value.trim();
    const branchNo = this.getSelectedBranchNo();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Mikroya Aktar',
      message: `${date || 'Secili gun'} / ${branchNo ? `Sube ${branchNo}` : 'tum subeler'} bekleyen hareketleri Mikroya aktarilacak.`,
      confirmText: 'Evet, Aktar',
      tone: 'info'
    });
    if (!confirmed) {
      return;
    }
    this.runProcedure('mikro-transfer');
  }

  protected async actionMikroAktar2(): Promise<void> {
    const startDate = this.importForm.controls.startDate.value.trim();
    const endDate = this.importForm.controls.endDate.value.trim();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Toplu Mikro Aktarimi',
      message: `${startDate || 'Baslangic'} - ${endDate || 'Bitis'} araligindaki tum subelerin bekleyen hareketleri Mikroya aktarilacak.`,
      confirmText: 'Evet, Aktar',
      tone: 'info'
    });
    if (!confirmed) {
      return;
    }
    this.runProcedure('mikro-range-transfer');
  }

  protected async actionMikroSil(): Promise<void> {
    const branchNo = this.getSelectedBranchNo();
    if (!branchNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Sube secin',
        message: 'Mikrodan silme islemi tum subelere uygulanamaz. Once tek bir sube secin.'
      });
      return;
    }

    const startDate = this.importForm.controls.startDate.value.trim();
    const endDate = this.importForm.controls.endDate.value.trim() || startDate;
    if (!this.validateDateRange(startDate, endDate, 'Mikro silme tarihleri eksik veya hatali.')) {
      return;
    }

    const dateLabel = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Mikrodan Sil',
      message: `${dateLabel || 'Secili tarih'} / Sube ${branchNo} POS evraklari Mikrodan silinecek. Baska bir tarih silinmeyecek.`,
      confirmText: 'Evet, Sil',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    this.runProcedure('mikro-delete');
  }

  protected actionReport(): void {
    const start = this.importForm.controls.startDate.value;
    if (start) {
      this.reportForm.controls.date.setValue(start);
    }
    this.activeTab.set('rapor');
    this.loadReport();
  }

  protected actionOpenLog(): void {
    const el = document.getElementById('log-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private buildImportRequest(startDate: string, endDate: string): KasaHareketImportHttpRequest {
    const branchNo = this.getSelectedBranchNo();
    const selectedNos = this.selectedCashRegisterNos();

    return {
      startDate,
      endDate,
      branches: branchNo ? [branchNo] : [],
      cashRegisters: selectedNos.length
        ? selectedNos
        : (this.getSelectedCashRegisterNo() ? [this.getSelectedCashRegisterNo()!] : []),
      fileRootPath: this.getOptionalText(this.importForm.controls.fileRootPath.value),
      skipExisting: this.importForm.controls.skipExisting.value,
      dryRun: this.importForm.controls.dryRun.value
    };
  }

  private buildScheduledImportRequest(): KasaHareketScheduledImportHttpRequest {
    return {
      date: this.getOptionalText(this.importForm.controls.scheduledDate.value),
      addDay: this.toOptionalNumber(this.importForm.controls.addDay.value),
      fileRootPath: this.getOptionalText(this.importForm.controls.fileRootPath.value),
      skipExisting: this.importForm.controls.skipExisting.value,
      dryRun: this.importForm.controls.dryRun.value
    };
  }

  private buildReportRequest(date: string) {
    return {
      date,
      branchNo: this.getSelectedBranchNo(),
      cashRegisterNo: this.getSelectedCashRegisterNo()
    };
  }

  private buildComparisonRequest(date: string) {
    return {
      ...this.buildReportRequest(date),
      tolerance: this.toOptionalNumber(this.comparisonForm.controls.tolerance.value) ?? 0.01
    };
  }

  private buildProcedureRequest(
    action: KasaHareketProcedureAction
  ): Observable<KasaHareketProcedureResultDto> | null {
    const importStart = this.importForm.controls.startDate.value.trim();
    const importEnd = this.importForm.controls.endDate.value.trim();

    if (action === 'mikro-range-transfer') {
      const startDate = importStart;
      const endDate = importEnd;

      if (!this.validateDateRange(startDate, endDate, 'Aralik aktarim tarihleri eksik veya hatali.')) {
        return null;
      }

      return this.kasaIslemleriService.transferKasaHareketRangeToMikro({
        startDate,
        endDate
      });
    }

    const actionDate = importStart;
    if (!actionDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: `${this.getProcedureLabel(action)} icin tarih secin.`
      });
      return null;
    }

    if (action === 'staging-delete') {
      const selectedNos = this.selectedCashRegisterNos();
      return this.kasaIslemleriService.deleteKasaHareketStaging({
        date: actionDate,
        branchNo: this.getSelectedBranchNo(),
        cashRegisterNo: selectedNos.length === 1 ? selectedNos[0] : this.getSelectedCashRegisterNo()
      });
    }

    if (action === 'mikro-delete') {
      if (!this.validateDateRange(
        actionDate,
        importEnd || actionDate,
        'Mikro silme tarihleri eksik veya hatali.'
      )) {
        return null;
      }

      return this.kasaIslemleriService.deleteKasaHareketFromMikro({
        date: actionDate,
        endDate: importEnd && importEnd !== actionDate ? importEnd : null,
        branchNo: this.getSelectedBranchNo()
      });
    }

    return this.kasaIslemleriService.transferKasaHareketToMikro({
      date: actionDate,
      branchNo: this.getSelectedBranchNo()
    });
  }

  private startTransferStatusPolling(startDate: string, endDate: string): void {
    this.stopTransferStatusPolling();
    this.transferStatusLoading.set(true);
    this.transferStatusSubscription = timer(0, 3000)
      .pipe(
        exhaustMap(() =>
          this.kasaIslemleriService
            .getKasaHareketTransferStatus(
              this.buildTransferStatusRequest(startDate, endDate)
            )
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((status: KasaHareketTransferStatusDto | null) => {
        this.transferStatusLoading.set(false);
        if (status) {
          this.transferStatus.set(status);
        }
      });
  }

  private stopTransferStatusPolling(): void {
    this.transferStatusSubscription?.unsubscribe();
    this.transferStatusSubscription = null;
    this.transferStatusLoading.set(false);
  }

  private refreshTransferStatus(startDate: string, endDate: string): void {
    if (!startDate || !endDate) {
      return;
    }

    this.transferStatusLoading.set(true);
    this.kasaIslemleriService
      .getKasaHareketTransferStatus(this.buildTransferStatusRequest(startDate, endDate))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.transferStatusLoading.set(false))
      )
      .subscribe({
        next: (status: KasaHareketTransferStatusDto) => this.transferStatus.set(status),
        error: () => undefined
      });
  }

  private buildTransferStatusRequest(startDate: string, endDate: string) {
    const selectedCashRegisters = this.selectedCashRegisterNos();
    return {
      startDate,
      endDate,
      branchNo: this.getSelectedBranchNo(),
      cashRegisterNo:
        selectedCashRegisters.length === 1 ? selectedCashRegisters[0] : null,
      cashRegisterNos:
        selectedCashRegisters.length > 1 ? selectedCashRegisters : undefined
    };
  }

  private getProcedureDateRange(action: KasaHareketProcedureAction): [string, string] {
    if (action === 'mikro-range-transfer') {
      const startDate = this.importForm.controls.startDate.value.trim();
      return [startDate, this.importForm.controls.endDate.value.trim() || startDate];
    }

    const actionDate = this.importForm.controls.startDate.value.trim();
    const endDate = action === 'mikro-delete'
      ? this.importForm.controls.endDate.value.trim() || actionDate
      : actionDate;
    return [actionDate, endDate];
  }

  private buildIssueRow(
    issue: KasaHareketImportIssueDto,
    severity: 'Hata' | 'Uyari',
    index: number
  ): ImportIssueRow {
    return {
      ...issue,
      severity,
      displayMessage: this.sanitizeIssueMessage(issue.message),
      issueId: [
        severity,
        issue.branchNo ?? 'sube',
        issue.cashRegisterNo ?? 'kasa',
        issue.file ?? 'file',
        issue.receiptNo ?? 'fis',
        issue.lineNo ?? index,
        index
      ].join('|')
    };
  }

  private sanitizeIssueMessage(message: string | null | undefined): string {
    const normalized = (message ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return 'Bilinmeyen aktarim hatasi.';
    }

    return normalized.length > 500 ? `${normalized.slice(0, 500).trimEnd()}...` : normalized;
  }

  private sortReportRows(rows: KasaHareketReportRowDto[]): KasaHareketReportRowDto[] {
    return [...rows].sort(
      (left, right) =>
        left.branchNo - right.branchNo ||
        left.cashRegisterNo - right.cashRegisterNo ||
        left.date.localeCompare(right.date)
    );
  }

  private sortComparisonRows(
    rows: KasaHareketCashSummaryComparisonRowDto[]
  ): KasaHareketCashSummaryComparisonRowDto[] {
    return [...rows].sort(
      (left, right) =>
        left.branchNo - right.branchNo ||
        left.cashRegisterNo - right.cashRegisterNo ||
        left.status.localeCompare(right.status, 'tr')
    );
  }

  private normalizeComparisonDetail(detail: KasaHareketDetailDto): KasaHareketDetailDto {
    return {
      ...detail,
      summary: {
        ...detail.summary,
        missingReceiptNos: detail.summary?.missingReceiptNos ?? []
      },
      cashierSummaries: detail.cashierSummaries ?? [],
      movementPaymentSummaries: detail.movementPaymentSummaries ?? [],
      cashSummaryPayments: detail.cashSummaryPayments ?? [],
      cashSummaryDocuments: detail.cashSummaryDocuments ?? [],
      receipts: detail.receipts ?? [],
      canceledReceipts: detail.canceledReceipts ?? []
    };
  }

  protected getComparisonStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'balanced':
        return 'status-balanced';
      case 'difference':
        return 'status-difference';
      case 'missing-cash-summary':
        return 'status-missing-summary';
      case 'missing-movement':
        return 'status-missing-movement';
      default:
        return 'status-unknown';
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private toCompactDate(date: string): string {
    return this.toDateQueryValue(date).replace(/-/g, '');
  }

  private validateDateRange(startDate: string, endDate: string, message: string): boolean {
    if (!startDate || !endDate || startDate > endDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih araligi hatali',
        message
      });
      return false;
    }

    return true;
  }

  protected getSelectedBranchNo(): number | null {
    return this.toOptionalNumber(this.scopeForm.getRawValue().branchNo);
  }

  protected getSelectedCashRegisterNo(): number | null {
    return this.toOptionalNumber(this.scopeForm.getRawValue().cashRegisterNo);
  }

  private getOptionalText(value: string | null | undefined): string | null {
    const trimmedValue = value?.trim() ?? '';
    return trimmedValue || null;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }

    const httpError = error as { error?: unknown; message?: unknown };

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error;
    }

    if (typeof httpError.error === 'object' && httpError.error !== null) {
      const body = httpError.error as Record<string, unknown>;
      const bodyMessage = body['message'] ?? body['title'] ?? body['detail'];

      if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
        return bodyMessage;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message;
    }

    return fallback;
  }

  private getReportExportColumns(): readonly ExcelExportColumn<KasaHareketReportRowDto>[] {
    return [
      { label: 'Tarih', value: 'date', type: 'date' },
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Kasa', value: 'cashRegisterNo', type: 'number' },
      { label: 'Net', value: 'netAmount', type: 'currency' },
      { label: 'Gider', value: 'expense', type: 'currency' },
      { label: 'Cek', value: 'checkAmount', type: 'currency' },
      { label: 'Fark', value: 'difference', type: 'currency' }
    ];
  }

  private getSalesComparisonExportColumns(): readonly ExcelExportColumn<KasaHareketSalesComparisonRowDto>[] {
    return [
      { label: 'Tarih', value: (row) => this.formatDate(row.date) },
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Stok Hareket Tutari', value: 'stockMovementAmount', type: 'currency' },
      { label: 'Cari Hesap Tutari', value: 'currentAccountAmount', type: 'currency' },
      { label: 'Aktarilan Tutar', value: 'transferredAmount', type: 'currency' },
      { label: 'GPS Haric', value: 'expenseExcludedAmount', type: 'currency' },
      { label: 'GPS Tutari', value: 'expenseReceiptAmount', type: 'currency' },
      { label: 'Z Raporu', value: 'zReportAmount', type: 'currency' },
      { label: 'ZRP / Aktarim Fark', value: 'zReportTransferDifference', type: 'currency' },
      { label: 'Aktarilan / Ciro Fark', value: 'transferredTurnoverDifference', type: 'currency' },
      { label: 'Cari / Stok Fark', value: 'currentStockDifference', type: 'currency' },
      { label: 'Durum', value: (row) => (row.hasDifference ? 'Fark Var' : 'Dengeli') }
    ];
  }

  private toDateQueryValue(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';
    return textValue.includes('T') ? textValue.slice(0, 10) : textValue;
  }

  private getComparisonDetailExportSheets(
    detail: KasaHareketDetailDto
  ): readonly ExcelExportSheet<object>[] {
    return [
      {
        sheetName: 'Ozet',
        rows: [detail],
        columns: this.getComparisonDetailSummaryExportColumns()
      },
      {
        sheetName: 'Kasiyer Ozeti',
        rows: detail.cashierSummaries ?? [],
        columns: this.getCashierSummaryExportColumns()
      },
      {
        sheetName: 'Aktarim Odeme',
        rows: detail.movementPaymentSummaries ?? [],
        columns: this.getMovementPaymentExportColumns()
      },
      {
        sheetName: 'Icmal Odeme',
        rows: detail.cashSummaryPayments ?? [],
        columns: this.getCashSummaryPaymentExportColumns()
      },
      {
        sheetName: 'Icmal Belgeleri',
        rows: detail.cashSummaryDocuments ?? [],
        columns: this.getCashSummaryDocumentExportColumns()
      },
      {
        sheetName: 'Fisler',
        rows: detail.receipts ?? [],
        columns: this.getReceiptExportColumns()
      },
      {
        sheetName: 'Iptal Fisler',
        rows: detail.canceledReceipts ?? [],
        columns: this.getReceiptExportColumns()
      },
      {
        sheetName: 'Eksik Fisler',
        rows: this.getMissingReceiptRows(detail),
        columns: this.getMissingReceiptExportColumns()
      }
    ];
  }

  private getComparisonDetailSummaryExportColumns(): readonly ExcelExportColumn<KasaHareketDetailDto>[] {
    return [
      { label: 'Tarih', value: 'date', type: 'date' },
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Kasa', value: 'cashRegisterNo', type: 'number' },
      { label: 'Aktarim Z', value: (row) => row.summary.movementZReportAmount, type: 'currency' },
      { label: 'Icmal', value: (row) => row.summary.cashSummaryAmount, type: 'currency' },
      { label: 'Fark', value: (row) => row.summary.differenceAmount, type: 'currency' },
      { label: 'Durum', value: (row) => row.comparison.statusName },
      { label: 'Fis Sayisi', value: (row) => row.summary.receiptCount, type: 'number' },
      { label: 'Donen Fis', value: (row) => row.summary.returnedReceiptCount, type: 'number' },
      { label: 'Iptal Fis', value: (row) => row.summary.canceledReceiptCount, type: 'number' },
      { label: 'Eksik Fis', value: (row) => row.summary.missingReceiptNos.length, type: 'number' },
      { label: 'Min Fis No', value: (row) => row.summary.minReceiptNo, type: 'number' },
      { label: 'Max Fis No', value: (row) => row.summary.maxReceiptNo, type: 'number' },
      { label: 'Icmal Belge', value: (row) => row.summary.cashSummaryDocumentCount, type: 'number' }
    ];
  }

  private getCashierSummaryExportColumns(): readonly ExcelExportColumn<KasaHareketCashierSummaryDto>[] {
    return [
      { label: 'Kasiyer Kodu', value: 'cashierCode' },
      { label: 'Kasiyer', value: 'cashierName' },
      { label: 'Fis', value: 'receiptCount', type: 'number' },
      { label: 'Satir', value: 'lineCount', type: 'number' },
      { label: 'Net', value: 'netAmount', type: 'currency' },
      { label: 'Gider', value: 'expense', type: 'currency' },
      { label: 'Cek', value: 'checkAmount', type: 'currency' },
      { label: 'Z Raporu', value: 'zReportAmount', type: 'currency' }
    ];
  }

  private getMovementPaymentExportColumns(): readonly ExcelExportColumn<KasaHareketMovementPaymentSummaryDto>[] {
    return [
      { label: 'Odeme Tipi', value: 'paymentType', type: 'number' },
      { label: 'Odeme Adi', value: 'paymentTypeName' },
      { label: 'Adet', value: 'paymentCount', type: 'number' },
      { label: 'Tutar', value: 'amount', type: 'currency' }
    ];
  }

  private getCashSummaryPaymentExportColumns(): readonly ExcelExportColumn<KasaHareketCashSummaryPaymentDto>[] {
    return [
      { label: 'Odeme Tipi', value: 'paymentTypeId', type: 'number' },
      { label: 'Odeme Adi', value: 'paymentTypeName' },
      { label: 'Hesap Kodu', value: 'accountCode' },
      { label: 'Fis', value: 'slipCount', type: 'number' },
      { label: 'Tutar', value: 'amount', type: 'currency' },
      { label: 'Karsilastirmada', value: 'isIncludedInComparison', type: 'boolean' }
    ];
  }

  private getCashSummaryDocumentExportColumns(): readonly ExcelExportColumn<KasaHareketCashSummaryDocumentDto>[] {
    return [
      { label: 'Belge No', value: 'documentNo' },
      { label: 'Seri', value: 'documentSerie' },
      { label: 'Sira', value: 'documentOrderNo', type: 'number' },
      { label: 'Kasa', value: 'cashNo', type: 'number' },
      { label: 'Z No', value: 'zReportNo', type: 'number' },
      { label: 'Kasiyer', value: 'cashierName' },
      { label: 'Yonetici', value: 'managerName' },
      { label: 'Tarih', value: 'summaryDate', type: 'date' },
      { label: 'Toplam', value: 'totalAmount', type: 'currency' },
      { label: 'Odeme Satiri', value: 'paymentLineCount', type: 'number' },
      { label: 'Olusturma', value: 'createDate', type: 'datetime' }
    ];
  }

  private getReceiptExportColumns(): readonly ExcelExportColumn<KasaHareketReceiptDto>[] {
    return [
      { label: 'Fis No', value: 'receiptNo', type: 'number' },
      { label: 'Tarih', value: 'date', type: 'date' },
      { label: 'Saat', value: 'time' },
      { label: 'Sube', value: 'branchNo', type: 'number' },
      { label: 'Kasa', value: 'cashRegisterNo', type: 'number' },
      { label: 'Z No', value: 'zNo' },
      { label: 'Belge Tipi', value: 'documentKindName' },
      { label: 'Kasiyer Kodu', value: 'cashierCode' },
      { label: 'Kasiyer', value: 'cashierName' },
      { label: 'Brut', value: 'grossAmount', type: 'currency' },
      { label: 'Kdv', value: 'taxAmount', type: 'currency' },
      { label: 'Indirim', value: 'discountAmount', type: 'currency' },
      { label: 'Net', value: 'netAmount', type: 'currency' },
      { label: 'Gider', value: 'expenseAmount', type: 'currency' },
      { label: 'Cek', value: 'checkAmount', type: 'currency' },
      { label: 'Z Raporu', value: 'zReportAmount', type: 'currency' },
      { label: 'Satir', value: 'lineCount', type: 'number' },
      { label: 'Odeme', value: 'paymentCount', type: 'number' },
      { label: 'Promosyon', value: 'promotionCount', type: 'number' },
      { label: 'Mali Bellek', value: 'fiscalMemoryCode' },
      { label: 'Sonuc', value: 'processResult' },
      { label: 'Iptal Nedeni', value: 'cancelReason', type: 'number' },
      { label: 'Iptal Nedeni Adi', value: 'cancelReasonName' }
    ];
  }

  private getMissingReceiptRows(detail: KasaHareketDetailDto): MissingReceiptRow[] {
    return (detail.summary.missingReceiptNos ?? []).map((receiptNo) => ({ receiptNo }));
  }

  private getMissingReceiptExportColumns(): readonly ExcelExportColumn<MissingReceiptRow>[] {
    return [
      { label: 'Eksik Fis No', value: 'receiptNo', type: 'number' }
    ];
  }
}
