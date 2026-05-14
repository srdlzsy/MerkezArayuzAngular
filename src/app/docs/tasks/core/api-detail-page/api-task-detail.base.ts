import { Directive, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import { DocsTaskDialogBase } from '../task-dialog.base';

interface DetailRequestOptions<TPayload, TValidatedPayload extends TPayload, TDetail> {
  validatePayload: (payload: TPayload | null) => payload is TValidatedPayload;
  requestFactory: (payload: TValidatedPayload) => Observable<TDetail>;
  missingKeyMessage: string;
  loadErrorMessage: string;
}

@Directive()
export abstract class ApiTaskDetailBase<TPayload, TDetail>
  extends DocsTaskDialogBase<TPayload>
  implements OnInit
{
  protected abstract readonly page: DocsContentPage;
  protected abstract readonly screenTitle: string;

  private readonly destroyRef = inject(DestroyRef);

  protected readonly detail = signal<TDetail | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDetail();
  }

  protected abstract loadDetail(): void;

  protected runDetailRequest<TValidatedPayload extends TPayload>(
    options: DetailRequestOptions<TPayload, TValidatedPayload, TDetail>
  ): void {
    const payload = this.data;

    if (!options.validatePayload(payload)) {
      this.errorMessage.set(options.missingKeyMessage);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    options.requestFactory(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (detail: TDetail) => {
          this.detail.set(detail);
        },
        error: () => {
          this.detail.set(null);
          this.errorMessage.set(options.loadErrorMessage);
        }
      });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 2
    }).format(value);
  }
}
