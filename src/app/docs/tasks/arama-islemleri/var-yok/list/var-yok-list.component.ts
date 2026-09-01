import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { VarYokLookupItemDto } from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { currentUserCanUseAllWarehouses } from '../../../core/admin-warehouse.helpers';

const ALL_WAREHOUSES_PERMISSION = 'arama-islemleri.var-yok.all-warehouses';

@Component({
  selector: 'app-var-yok-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './var-yok-list.component.html',
  styleUrl: './var-yok-list.component.scss'
})
export class VarYokListComponent {
  private readonly aramaService = inject(AramaService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly results = signal<VarYokLookupItemDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly totalCount = computed(() => this.results().length);
  protected readonly stockedCount = computed(
    () => this.results().filter((item) => item.hasStock).length
  );
  protected readonly canUseWarehouseScope = computed(() =>
    currentUserCanUseAllWarehouses(this.authService.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );

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
      .searchVarYok(query, this.normalizeWarehouseNo(), this.take)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (results: VarYokLookupItemDto[]) => {
          this.results.set(results ?? []);
        },
        error: (error: HttpErrorResponse) => {
          this.results.set([]);
          this.errorMessage.set(this.resolveErrorMessage(error, 'Var yok sorgusu yapilamadi.'));
        }
      });
  }

  protected clear(): void {
    this.searchQuery = '';
    this.warehouseNo = null;
    this.results.set([]);
    this.errorMessage.set('');
    this.hasSearched.set(false);
  }

  protected formatQuantity(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(Number(value ?? 0));
  }

  protected formatPrice(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value ?? 0));
  }

  protected formatCheckDigit(value: boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return value ? 'Gecerli' : 'Kontrol edilmeli';
  }

  protected getStockStateLabel(item: VarYokLookupItemDto): string {
    return item.hasStock ? 'Var' : 'Yok';
  }

  protected getBlockedLabels(item: VarYokLookupItemDto): string[] {
    return [
      item.isSalesBlocked ? 'Satis Engelli' : '',
      item.isOrderBlocked ? 'Siparis Engelli' : '',
      item.isGoodsAcceptanceBlocked ? 'Mal Kabul Engelli' : ''
    ].filter((label): label is string => !!label);
  }

  protected hasPackInfo(item: VarYokLookupItemDto): boolean {
    return !!item.secondaryUnitName?.trim() && Number(item.unitMultiplier ?? 0) > 1;
  }

  protected hasBarcodeLookupInfo(item: VarYokLookupItemDto): boolean {
    return (
      !!item.requestedBarcode?.trim() ||
      !!item.lookupBarcode?.trim() ||
      !!item.isVariableWeightBarcode ||
      (item.embeddedQuantity !== null && item.embeddedQuantity !== undefined) ||
      (item.isBarcodeCheckDigitValid !== null && item.isBarcodeCheckDigitValid !== undefined)
    );
  }

  protected readonly trackByProduct = (
    index: number,
    item: VarYokLookupItemDto
  ): string => item.stockCode?.trim() || item.barcode?.trim() || `${index}`;

  private normalizeWarehouseNo(): number | undefined {
    if (!this.canUseWarehouseScope()) {
      return undefined;
    }

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
