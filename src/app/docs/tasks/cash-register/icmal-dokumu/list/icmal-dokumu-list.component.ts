import { Dialog } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import type { ISummariesCT } from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { IcmalDokumuDetailComponent } from '../detail/icmal-dokumu-detail.component';
import { openDocsTaskDialog } from '../../../core/task-dialog.config';

interface ActionFeedback {
  tone: 'error' | 'info';
  title: string;
  message: string;
}

@Component({
  selector: 'app-icmal-dokumu-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './icmal-dokumu-list.component.html',
  styleUrl: './icmal-dokumu-list.component.scss'
})
export class IcmalDokumuListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-sayimlari'];
  protected readonly filtersForm = new FormGroup({
    targetDate: new FormControl<string>(this.getDefaultTargetDate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    search: new FormControl<string>('', {
      nonNullable: true
    })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly searchTerm = signal('');
  private readonly currentPage = signal(1);

  protected readonly pageSize = signal(10);
  protected readonly readonlyPageSizeOptions = [10, 25, 50] as const;
  protected readonly summaries = signal<ISummariesCT[]>([]);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly lastLoadedDate = signal(this.getDefaultTargetDate());
  protected readonly maxTargetDate = this.getDefaultTargetDate();

  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly branchLabel = computed(() => {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return 'Depo secilmedi';
    }

    if (currentUser.depoIsmi && currentUser.depoNo !== null) {
      return `${currentUser.depoIsmi} ${currentUser.depoNo}`;
    }

    return currentUser.depoIsmi || (currentUser.depoNo !== null ? `Depo ${currentUser.depoNo}` : 'Depo secilmedi');
  });
  protected readonly hasActiveSearch = computed(() => !!this.searchTerm());
  protected readonly totalAmount = computed(() =>
    this.filteredSummaries().reduce((total, item) => total + this.toSafeNumber(item.total), 0)
  );
  protected readonly filteredSummaries = computed(() => {
    const query = this.searchTerm();

    if (!query) {
      return this.sortSummaries(this.summaries());
    }

    return this.sortSummaries(
      this.summaries().filter((summary) =>
        [
          summary.warehouse,
          summary.documentSerie,
          summary.documentOrderNo,
          summary.cashNo,
          summary.zReportNo,
          summary.cashierNo,
          summary.managerNo,
          summary.total
        ].some((value) => this.toSearchable(value).includes(query))
      )
    );
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSummaries().length / this.pageSize()))
  );
  protected readonly currentPageSafe = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );
  protected readonly paginatedSummaries = computed(() => {
    const page = this.currentPageSafe();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;

    return this.filteredSummaries().slice(startIndex, startIndex + size);
  });
  protected readonly pageStartIndex = computed(() => {
    if (!this.filteredSummaries().length) {
      return 0;
    }

    return (this.currentPageSafe() - 1) * this.pageSize() + 1;
  });
  protected readonly pageEndIndex = computed(() => {
    if (!this.filteredSummaries().length) {
      return 0;
    }

    return Math.min(this.currentPageSafe() * this.pageSize(), this.filteredSummaries().length);
  });
  protected readonly canGoToPreviousPage = computed(() => this.currentPageSafe() > 1);
  protected readonly canGoToNextPage = computed(
    () => this.currentPageSafe() < this.totalPages()
  );

  constructor() {
    this.filtersForm.controls.search.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((query: string | null) => {
        this.searchTerm.set(query?.trim().toLocaleLowerCase('tr-TR') ?? '');
        this.currentPage.set(1);
      });

    this.loadSummaries();
  }

  protected loadSummaries(): void {
    const targetDate = this.filtersForm.controls.targetDate.value.trim();

    if (!targetDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: 'Icmal listesini getirmek icin once gecerli bir gun secin.'
      });
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService
      .getIcmaller(targetDate)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (summaries: ISummariesCT[]) => {
          this.summaries.set(this.sortSummaries(summaries));
          this.lastLoadedDate.set(targetDate);
          this.currentPage.set(1);

          if (!summaries.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit bulunamadi',
              message: 'Secilen gun icin icmal kaydi donmedi.'
            });
          }
        },
        error: () => {
          this.summaries.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Liste getirilemedi',
            message: 'Icmal dokumu listesi alinirken bir hata olustu. Tarihi kontrol edip tekrar deneyin.'
          });
        }
      });
  }

  protected openDetail(summary: ISummariesCT): void {
    openDocsTaskDialog(this.dialog, IcmalDokumuDetailComponent, {
      data: summary,
      width: 'min(1180px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '96vh',
      panelClass: 'icmal-detail-dialog'
    });
  }

  protected openCreate(): void {
    void this.router.navigateByUrl('/docs/api/kasa-sayimlari/ekle');
  }

  protected clearSearch(): void {
    this.filtersForm.controls.search.setValue('', { emitEvent: false });
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  protected setPageSize(size: number): void {
    if (!this.readonlyPageSizeOptions.includes(size as 10 | 25 | 50)) {
      return;
    }

    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPageSafe() - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.set(Math.min(this.totalPages(), this.currentPageSafe() + 1));
  }

  protected readonly trackBySummary = (
    index: number,
    summary: ISummariesCT
  ): string => `${summary.documentSerie}|${summary.documentOrderNo}|${summary.cashNo}|${summary.zReportNo}|${index}`;

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

  private getDefaultTargetDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private sortSummaries(items: readonly ISummariesCT[]): ISummariesCT[] {
    return [...items].sort((left, right) => {
      const rightDate = new Date(right.summaryDate).getTime();
      const leftDate = new Date(left.summaryDate).getTime();

      if (rightDate !== leftDate) {
        return rightDate - leftDate;
      }

      return this.toSafeNumber(right.documentOrderNo) - this.toSafeNumber(left.documentOrderNo);
    });
  }

  private toSearchable(value: unknown): string {
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
}

