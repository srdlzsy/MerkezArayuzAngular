import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
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
  KasaHareketScheduledImportHttpRequest
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ExcelExportButtonComponent } from '../../../core/excel-export/excel-export-button.component';
import {
  ExcelExportColumn,
  ExcelExportSheet,
  exportRowsToExcel
} from '../../../core/excel-export/excel-export.utils';

type KasaHareketTab = 'import' | 'rapor' | 'icmal' | 'mikro';
type KasaHareketDetailTab =
  | 'cashiers'
  | 'movement-payments'
  | 'summary-payments'
  | 'documents'
  | 'receipts';
type KasaHareketImportMode = 'normal' | 'cancel' | 'scheduled';
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
  protected readonly comparisonResult = signal<KasaHareketCashSummaryComparisonDto | null>(null);
  protected readonly selectedComparisonRow = signal<KasaHareketCashSummaryComparisonRowDto | null>(null);
  protected readonly comparisonDetail = signal<KasaHareketDetailDto | null>(null);
  protected readonly comparisonDetailTab = signal<KasaHareketDetailTab>('cashiers');
  protected readonly reportExporting = signal(false);
  protected readonly excelExportErrorMessage = signal<string | null>(null);

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
    skipExisting: new FormControl<boolean>(true, { nonNullable: true }),
    dryRun: new FormControl<boolean>(true, { nonNullable: true })
  });
  protected readonly reportForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true })
  });
  protected readonly comparisonForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true }),
    tolerance: new FormControl<number | null>(0.01)
  });
  protected readonly mikroForm = new FormGroup({
    date: new FormControl<string>(this.today, { nonNullable: true })
  });
  protected readonly mikroRangeForm = new FormGroup({
    startDate: new FormControl<string>(this.today, { nonNullable: true }),
    endDate: new FormControl<string>(this.today, { nonNullable: true })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly numberFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private readonly scopeVersion = signal(0);
  private cashRegisterRequestId = 0;

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

    const cashRegisterNo = this.getSelectedCashRegisterNo();

    return cashRegisterNo ? `Kasa ${cashRegisterNo}` : 'Tum Kasalar';
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
            [...(branches ?? [])].sort((left, right) => left.branchNo - right.branchNo)
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
      importType === 'cancel'
        ? this.kasaIslemleriService.importKasaHareketIptalBelgeleri(request)
        : this.kasaIslemleriService.importKasaHareketleri(request);

    this.importLoading.set(true);
    this.feedback.set(null);
    this.lastImportResult.set(null);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importLoading.set(false))
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

  protected runProcedure(action: KasaHareketProcedureAction): void {
    if (this.isDeleteAction(action) && !window.confirm(`${this.getProcedureLabel(action)} calistirilsin mi?`)) {
      return;
    }

    const request$ = this.buildProcedureRequest(action);

    if (!request$) {
      return;
    }

    this.procedureLoadingAction.set(action);
    this.feedback.set(null);
    this.lastProcedureResult.set(null);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procedureLoadingAction.set(null))
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
      date: this.mikroForm.controls.date.value.trim(),
      branchNo: this.getSelectedBranchNo()
    });
  }

  protected getMikroRangeRequestPreview(): string {
    return this.formatJson({
      startDate: this.mikroRangeForm.controls.startDate.value.trim(),
      endDate: this.mikroRangeForm.controls.endDate.value.trim()
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
      case 'cancel':
        return 'IP Iptal';
      case 'scheduled':
        return 'Zamanli';
      case 'normal':
      default:
        return 'HR Hareket';
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

  protected readonly trackByBranch = (_index: number, branch: KasaHareketBranchDto): number =>
    branch.branchNo;

  protected readonly trackByCashRegister = (
    _index: number,
    cashRegister: KasaHareketCashRegisterDto
  ): string => `${cashRegister.branchNo}-${cashRegister.cashRegisterNo}`;

  protected readonly trackByReportRow = (_index: number, row: KasaHareketReportRowDto): string =>
    `${row.date}-${row.branchNo}-${row.cashRegisterNo}`;

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

    this.importLoading.set(true);
    this.feedback.set(null);
    this.lastImportResult.set(null);

    this.kasaIslemleriService
      .runKasaHareketZamanliAktarim(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importLoading.set(false))
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

          this.cashRegisters.set(
            [...(cashRegisters ?? [])].sort(
              (left, right) => left.cashRegisterNo - right.cashRegisterNo
            )
          );
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

  private buildImportRequest(startDate: string, endDate: string): KasaHareketImportHttpRequest {
    const branchNo = this.getSelectedBranchNo();
    const cashRegisterNo = this.getSelectedCashRegisterNo();

    return {
      startDate,
      endDate,
      branches: branchNo ? [branchNo] : [],
      cashRegisters: cashRegisterNo ? [cashRegisterNo] : [],
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
    if (action === 'mikro-range-transfer') {
      const startDate = this.mikroRangeForm.controls.startDate.value.trim();
      const endDate = this.mikroRangeForm.controls.endDate.value.trim();

      if (!this.validateDateRange(startDate, endDate, 'Aralik aktarim tarihleri eksik veya hatali.')) {
        return null;
      }

      return this.kasaIslemleriService.transferKasaHareketRangeToMikro({
        startDate,
        endDate
      });
    }

    const date = this.mikroForm.controls.date.value.trim();

    if (!date) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: `${this.getProcedureLabel(action)} icin tarih secin.`
      });
      return null;
    }

    if (action === 'staging-delete') {
      return this.kasaIslemleriService.deleteKasaHareketStaging({
        date,
        branchNo: this.getSelectedBranchNo(),
        cashRegisterNo: this.getSelectedCashRegisterNo()
      });
    }

    if (action === 'mikro-delete') {
      return this.kasaIslemleriService.deleteKasaHareketFromMikro({
        date,
        branchNo: this.getSelectedBranchNo()
      });
    }

    return this.kasaIslemleriService.transferKasaHareketToMikro({
      date,
      branchNo: this.getSelectedBranchNo()
    });
  }

  private buildIssueRow(
    issue: KasaHareketImportIssueDto,
    severity: 'Hata' | 'Uyari',
    index: number
  ): ImportIssueRow {
    return {
      ...issue,
      severity,
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
      cashierSummaries: detail.cashierSummaries ?? [],
      movementPaymentSummaries: detail.movementPaymentSummaries ?? [],
      cashSummaryPayments: detail.cashSummaryPayments ?? [],
      cashSummaryDocuments: detail.cashSummaryDocuments ?? [],
      receipts: detail.receipts ?? []
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

  private isDeleteAction(action: KasaHareketProcedureAction): boolean {
    return action === 'staging-delete' || action === 'mikro-delete';
  }

  private getSelectedBranchNo(): number | null {
    return this.toOptionalNumber(this.scopeForm.getRawValue().branchNo);
  }

  private getSelectedCashRegisterNo(): number | null {
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
      { label: 'Masraf', value: 'expense', type: 'currency' },
      { label: 'Cek', value: 'checkAmount', type: 'currency' },
      { label: 'Fark', value: 'difference', type: 'currency' }
    ];
  }

  private toDateQueryValue(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';
    return textValue.includes('T') ? textValue.slice(0, 10) : textValue;
  }

  private getComparisonDetailExportSheets(
    detail: KasaHareketDetailDto
  ): readonly ExcelExportSheet<any>[] {
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
      { label: 'Sonuc', value: 'processResult' }
    ];
  }
}
