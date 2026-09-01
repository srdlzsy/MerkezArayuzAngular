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
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { currentUserCanUseAllWarehouses } from '../../../core/admin-warehouse.helpers';

const ALL_WAREHOUSES_PERMISSION = 'arama-islemleri.cari-bul.all-warehouses';

@Component({
  selector: 'app-cari-bul-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cari-bul-list.component.html',
  styleUrl: './cari-bul-list.component.scss'
})
export class CariBulListComponent {
  private readonly aramaService = inject(AramaService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly result = signal<CariBulResultDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly suggestionCount = computed(() => this.result()?.suggestions?.length ?? 0);
  protected readonly canUseWarehouseScope = computed(() =>
    currentUserCanUseAllWarehouses(this.authService.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );
  private readonly sourceLabels: Record<string, string> = {
    'varsayilan-tedarikci': 'Varsayilan tedarikci',
    'satinalma-sarti': 'Satinalma sarti',
    'stok-hareketleri': 'Stok hareketi'
  };

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
    this.warehouseNo = null;
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
    return sources?.filter(Boolean).map((source) => this.formatSource(source)).join(', ') || '-';
  }

  protected hasPurchaseConditionSource(sources: string[] | null | undefined): boolean {
    return this.hasSource(sources, 'satinalma-sarti');
  }

  protected getSuggestionTitle(suggestion: CariBulResultDto['suggestions'][number]): string {
    return (
      suggestion.selectionLabel?.trim() ||
      suggestion.customerDisplayName?.trim() ||
      suggestion.customerTitle?.trim() ||
      suggestion.customerName?.trim() ||
      suggestion.customerCode?.trim() ||
      '-'
    );
  }

  protected hasDuplicateTaxCustomer(suggestion: CariBulResultDto['suggestions'][number]): boolean {
    return Number(suggestion.sameTaxCustomerCount ?? 0) > 1;
  }

  protected getPackMultiplier(result: CariBulResultDto | null | undefined): number | null {
    const value = Number(result?.unitMultiplier ?? result?.unitsPerCase ?? 0);
    return Number.isFinite(value) && value > 1 ? value : null;
  }

  protected readonly trackBySuggestion = (
    index: number,
    suggestion: CariBulResultDto['suggestions'][number]
  ): string => suggestion.customerCode?.trim() || `${index}`;

  private normalizeWarehouseNo(): number | undefined {
    if (!this.canUseWarehouseScope()) {
      return undefined;
    }

    const value = Number(this.warehouseNo ?? Number.NaN);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private formatSource(source: string): string {
    const normalizedSource = source.trim();
    return this.sourceLabels[normalizedSource] ?? normalizedSource;
  }

  private hasSource(sources: string[] | null | undefined, expectedSource: string): boolean {
    return sources?.some((source) => source.trim() === expectedSource) ?? false;
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
