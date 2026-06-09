import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import type {
  KasaHareketBranchDto,
  KasaHareketCashRegisterDto,
  KasaHareketImportHttpRequest,
  KasaHareketImportIssueDto,
  KasaHareketImportResultDto,
  KasaHareketProcedureResultDto,
  KasaHareketReportRowDto,
  KasaHareketScheduledImportHttpRequest
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type KasaHareketTab = 'import' | 'rapor' | 'mikro';
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
  imports: [CommonModule, ReactiveFormsModule],
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
  protected readonly procedureLoadingAction = signal<KasaHareketProcedureAction | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly lastImportResult = signal<KasaHareketImportResultDto | null>(null);
  protected readonly lastProcedureResult = signal<KasaHareketProcedureResultDto | null>(null);
  protected readonly reportRows = signal<KasaHareketReportRowDto[]>([]);

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
    this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.netAmount), 0)
  );
  protected readonly reportTotalExpense = computed(() =>
    this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.expense), 0)
  );
  protected readonly reportTotalCheck = computed(() =>
    this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.checkAmount), 0)
  );
  protected readonly reportTotalDifference = computed(() =>
    this.reportRows().reduce((total, row) => total + this.toSafeNumber(row.difference), 0)
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

    this.kasaIslemleriService
      .getKasaHareketRaporu({
        date,
        branchNo: this.getSelectedBranchNo(),
        cashRegisterNo: this.getSelectedCashRegisterNo()
      })
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
          this.feedback.set({
            tone: 'error',
            title: 'Rapor yuklenemedi',
            message: this.getErrorMessage(error, 'Kasa hareket raporu alinirken hata olustu.')
          });
        }
      });
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
    return this.formatJson({
      date: this.reportForm.controls.date.value.trim(),
      branchNo: this.getSelectedBranchNo(),
      cashRegisterNo: this.getSelectedCashRegisterNo()
    });
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
    return `Kasa ${cashRegister.cashRegisterNo} - Tip ${cashRegister.cashRegisterType}`;
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

  protected readonly trackByBranch = (_index: number, branch: KasaHareketBranchDto): number =>
    branch.branchNo;

  protected readonly trackByCashRegister = (
    _index: number,
    cashRegister: KasaHareketCashRegisterDto
  ): string => `${cashRegister.branchNo}-${cashRegister.cashRegisterNo}`;

  protected readonly trackByReportRow = (_index: number, row: KasaHareketReportRowDto): string =>
    `${row.date}-${row.branchNo}-${row.cashRegisterNo}`;

  protected readonly trackByIssue = (_index: number, row: ImportIssueRow): string => row.issueId;

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
}
