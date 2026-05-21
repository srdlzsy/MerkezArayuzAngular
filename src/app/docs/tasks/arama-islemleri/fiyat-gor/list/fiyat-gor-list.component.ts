import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { ProductLookupItemDto } from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';

@Component({
  selector: 'app-fiyat-gor-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fiyat-gor-list.component.html',
  styleUrl: './fiyat-gor-list.component.scss'
})
export class FiyatGorListComponent {
  private readonly aramaService = inject(AramaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly results = signal<ProductLookupItemDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly totalCount = computed(() => this.results().length);

  protected searchQuery = '';
  protected warehouseNo: number | null = null;
  protected take = 20;

  protected search(): void {
    const query = this.searchQuery.trim();

    this.errorMessage.set('');
    this.hasSearched.set(true);

    if (!query) {
      this.results.set([]);
      this.errorMessage.set('Aramak icin barkod, stok kodu veya urun adi gir.');
      return;
    }

    this.isLoading.set(true);

    this.aramaService
      .searchPrices(query, this.normalizeWarehouseNo(), this.take)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (results: ProductLookupItemDto[]) => {
          this.results.set(results ?? []);
        },
        error: (error: HttpErrorResponse) => {
          this.results.set([]);
          this.errorMessage.set(this.resolveErrorMessage(error, 'Fiyat sorgusu yapilamadi.'));
        }
      });
  }

  protected clear(): void {
    this.searchQuery = '';
    this.results.set([]);
    this.errorMessage.set('');
    this.hasSearched.set(false);
  }

  protected formatPrice(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value ?? 0));
  }

  protected getBlockedLabels(item: ProductLookupItemDto): string[] {
    return [
      item.isSalesBlocked ? 'Satis Engelli' : '',
      item.isOrderBlocked ? 'Siparis Engelli' : '',
      item.isGoodsAcceptanceBlocked ? 'Mal Kabul Engelli' : ''
    ].filter((label): label is string => !!label);
  }

  protected readonly trackByProduct = (
    index: number,
    item: ProductLookupItemDto
  ): string => item.stockCode?.trim() || item.barcode?.trim() || `${index}`;

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
