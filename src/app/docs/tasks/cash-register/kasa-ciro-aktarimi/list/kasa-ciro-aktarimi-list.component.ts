import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  KasaCiroBranchDto,
  KasaCiroImportHttpRequest,
  KasaCiroImportIssueDto,
  KasaCiroImportResultDto
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type FeedbackTone = 'error' | 'info' | 'success';

interface CiroFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface CiroIssueRow extends KasaCiroImportIssueDto {
  severity: 'Hata' | 'Uyari';
  issueId: string;
}

@Component({
  selector: 'app-kasa-ciro-aktarimi-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kasa-ciro-aktarimi-list.component.html',
  styleUrl: './kasa-ciro-aktarimi-list.component.scss'
})
export class KasaCiroAktarimiListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-ciro-aktarimi'];
  protected readonly branches = signal<KasaCiroBranchDto[]>([]);
  protected readonly branchesLoading = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly feedback = signal<CiroFeedback | null>(null);
  protected readonly importResult = signal<KasaCiroImportResultDto | null>(null);

  protected readonly importForm = new FormGroup({
    startDate: new FormControl<string>(this.getRelativeDate(6), { nonNullable: true }),
    endDate: new FormControl<string>(this.getToday(), { nonNullable: true }),
    branches: new FormControl<number[]>([], { nonNullable: true }),
    dryRun: new FormControl<boolean>(true, { nonNullable: true })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly numberFormatter = new Intl.NumberFormat('tr-TR');
  private readonly formVersion = signal(0);

  protected readonly selectedBranchCount = computed(() => {
    this.formVersion();

    return this.importForm.controls.branches.value.length;
  });
  protected readonly branchScopeLabel = computed(() => {
    this.formVersion();

    const selectedBranches = this.importForm.controls.branches.value;

    if (!selectedBranches.length) {
      return 'Tum Subeler';
    }

    if (selectedBranches.length === 1) {
      return this.getBranchName(selectedBranches[0] ?? null);
    }

    return `${selectedBranches.length} Sube`;
  });
  protected readonly importModeLabel = computed(() => {
    this.formVersion();

    return this.importForm.controls.dryRun.value ? 'Onizleme' : 'Canli Aktarim';
  });
  protected readonly resultTotalRows = computed(() => {
    const result = this.importResult();

    if (!result) {
      return 0;
    }

    return (
      this.toSafeNumber(result.insertedTotals) +
      this.toSafeNumber(result.updatedTotals) +
      this.toSafeNumber(result.insertedDetails) +
      this.toSafeNumber(result.updatedDetails) +
      this.toSafeNumber(result.insertedDiscountCards) +
      this.toSafeNumber(result.updatedDiscountCards)
    );
  });
  protected readonly issueRows = computed<CiroIssueRow[]>(() => {
    const result = this.importResult();

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
    this.importForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formVersion.update((value) => value + 1));

    this.loadBranches();
  }

  protected loadBranches(): void {
    this.branchesLoading.set(true);
    this.feedback.set(null);

    this.kasaIslemleriService
      .getKasaCiroAktarimiSubeleri()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.branchesLoading.set(false))
      )
      .subscribe({
        next: (branches: KasaCiroBranchDto[]) => {
          this.branches.set(
            [...(branches ?? [])].sort((left, right) => left.branchNo - right.branchNo)
          );
        },
        error: (error: unknown) => {
          this.branches.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Subeler yuklenemedi',
            message: this.getErrorMessage(error, 'Kasa ciro aktarimi sube listesi alinamadi.')
          });
        }
      });
  }

  protected selectAllBranches(): void {
    this.importForm.controls.branches.setValue(
      this.branches().map((branch) => branch.branchNo)
    );
  }

  protected clearBranches(): void {
    this.importForm.controls.branches.setValue([]);
  }

  protected runImport(): void {
    const request = this.buildImportRequest(true);

    if (!request) {
      return;
    }

    if (!request.dryRun && !window.confirm('Canli kasa ciro aktarimi calistirilsin mi?')) {
      return;
    }

    this.importLoading.set(true);
    this.feedback.set(null);
    this.importResult.set(null);

    this.kasaIslemleriService
      .importKasaCiroMetin(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importLoading.set(false))
      )
      .subscribe({
        next: (result: KasaCiroImportResultDto) => {
          this.importResult.set(result);
          this.feedback.set({
            tone: result.errors?.length ? 'error' : 'success',
            title: result.errors?.length ? 'Aktarim hata ile tamamlandi' : 'Aktarim tamamlandi',
            message: `${this.formatNumber(result.processedFiles)} dosya, ${this.formatNumber(
              result.processedBranches
            )} sube, ${this.formatNumber(this.resultTotalRows())} satir islendi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Aktarim calismadi',
            message: this.getErrorMessage(error, 'Kasa ciro aktarimi istegi tamamlanamadi.')
          });
        }
      });
  }

  protected getBranchLabel(branch: KasaCiroBranchDto): string {
    const region = branch.region?.trim();
    const name = branch.branchName?.trim() || 'Sube';

    return region ? `${name} (${branch.branchNo}) - ${region}` : `${name} (${branch.branchNo})`;
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

  protected readonly trackByBranch = (_index: number, branch: KasaCiroBranchDto): number =>
    branch.branchNo;

  protected readonly trackByIssue = (_index: number, row: CiroIssueRow): string => row.issueId;

  private buildImportRequest(validate: true): KasaCiroImportHttpRequest | null;
  private buildImportRequest(validate: false): KasaCiroImportHttpRequest;
  private buildImportRequest(validate: boolean): KasaCiroImportHttpRequest | null {
    const startDate = this.importForm.controls.startDate.value.trim();
    const endDate = this.importForm.controls.endDate.value.trim();

    if (validate && !this.validateDateRange(startDate, endDate)) {
      return null;
    }

    return {
      startDate,
      endDate,
      branches: [...this.importForm.controls.branches.value],
      movementRootPath: null,
      dryRun: this.importForm.controls.dryRun.value
    };
  }

  private buildIssueRow(
    issue: KasaCiroImportIssueDto,
    severity: 'Hata' | 'Uyari',
    index: number
  ): CiroIssueRow {
    return {
      ...issue,
      severity,
      issueId: [
        severity,
        issue.date ?? 'date',
        issue.branchNo ?? 'sube',
        issue.cashRegisterNo ?? 'kasa',
        issue.file ?? 'file',
        issue.lineNo ?? index,
        index
      ].join('|')
    };
  }

  private validateDateRange(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate || startDate > endDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih araligi hatali',
        message: 'Aktarim icin baslangic ve bitis tarihini dogru sirayla secin.'
      });
      return false;
    }

    return true;
  }

  private getBranchName(branchNo: number | null): string {
    if (!branchNo) {
      return 'Sube';
    }

    const branch = this.branches().find((item) => item.branchNo === branchNo);

    return branch ? this.getBranchLabel(branch) : `Sube ${branchNo}`;
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getRelativeDate(daysBack: number): string {
    const value = new Date();
    value.setDate(value.getDate() - daysBack);
    return value.toISOString().slice(0, 10);
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
