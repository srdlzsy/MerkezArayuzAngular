import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  AramaService,
  type CariBulResultDto
} from '../../../../../core/api/module-services/arama.service';

@Component({
  selector: 'app-cari-bul-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cari-bul-list.component.html',
  styleUrl: './cari-bul-list.component.scss'
})
export class CariBulListComponent {
  private readonly aramaService = inject(AramaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly result = signal<CariBulResultDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly suggestionCount = computed(() => this.result()?.suggestions?.length ?? 0);

  protected barcodeInput = '';
  protected warehouseNo: number | null = null;
  protected take = 10;

  protected searchByBarcode(): void {
    const barcode = this.barcodeInput.trim();

    this.errorMessage.set('');
    this.hasSearched.set(true);

    if (!barcode) {
      this.result.set(null);
      this.errorMessage.set('Cari bulmak icin barkod gir.');
      return;
    }

    this.isLoading.set(true);

    this.aramaService
      .searchCustomerByBarcode(barcode, this.normalizeWarehouseNo(), this.take)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (result: CariBulResultDto) => {
          this.result.set({
            ...result,
            suggestions: result.suggestions ?? []
          });
        },
        error: (error: HttpErrorResponse) => {
          this.result.set(null);
          this.errorMessage.set(this.resolveErrorMessage(error, 'Cari aramasi yapilamadi.'));
        }
      });
  }

  protected clear(): void {
    this.barcodeInput = '';
    this.result.set(null);
    this.errorMessage.set('');
    this.hasSearched.set(false);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR').format(parsedDate);
  }

  protected formatSources(sources: string[] | null | undefined): string {
    return sources?.filter(Boolean).join(', ') || '-';
  }

  protected readonly trackBySuggestion = (
    index: number,
    suggestion: CariBulResultDto['suggestions'][number]
  ): string => suggestion.customerCode?.trim() || `${index}`;

  private normalizeWarehouseNo(): number | undefined {
    const value = Number(this.warehouseNo ?? Number.NaN);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.error === 'object' && error.error !== null) {
      if ('detail' in error.error && typeof error.error.detail === 'string' && error.error.detail.trim()) {
        return error.error.detail;
      }

      if ('message' in error.error && typeof error.error.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }
    }

    return fallback;
  }
}
