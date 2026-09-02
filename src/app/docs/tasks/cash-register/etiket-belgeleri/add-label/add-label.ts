import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import type { IEtiketBasimProduct, ProductLookupItemDto } from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-add-label',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-label.html',
  styleUrls: ['./add-label.css']
})
export class AddLabel implements OnDestroy {
  protected searchText = '';
  protected isSearching = false;
  protected feedbackMessage = '';
  protected findProducts: ProductLookupItemDto[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(DialogRef<IEtiketBasimProduct | undefined>);
  private readonly aramaService = inject(AramaService);
  private readonly authService = inject(AuthService);
  private searchTimer: number | undefined;
  private searchRequestId = 0;

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  protected onSearchChange(): void {
    const query = this.searchText.trim();
    this.clearSearchTimer();

    if (!query) {
      this.findProducts = [];
      this.feedbackMessage = '';
      this.isSearching = false;
      return;
    }

    if (query.length < 2) {
      this.findProducts = [];
      this.feedbackMessage = 'Arama yapmak icin en az 2 karakter girin.';
      this.isSearching = false;
      return;
    }

    this.feedbackMessage = 'Yazmayi bitirince arama baslayacak.';
    this.searchTimer = window.setTimeout(() => this.searchProducts(query), 280);
  }

  private searchProducts(query: string): void {
    const requestId = ++this.searchRequestId;
    this.isSearching = true;
    this.feedbackMessage = '';

    const warehouseNo = this.authService.currentUser()?.depoNo ?? undefined;

    this.aramaService
      .searchPrices(query, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          if (requestId === this.searchRequestId) {
            this.feedbackMessage = 'Stok aramasi su anda yapilamadi.';
          }
          return of([] as ProductLookupItemDto[]);
        }),
        finalize(() => {
          if (requestId === this.searchRequestId) {
            this.isSearching = false;
          }
        })
      )
      .subscribe((products: ProductLookupItemDto[]) => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.findProducts = products;

        if (!this.findProducts.length && !this.feedbackMessage) {
          this.feedbackMessage = 'Sonuc bulunamadi.';
        }
      });
  }

  protected selectProduct(product: ProductLookupItemDto): void {
    this.dialogRef.close(this.mapLookupToLabelProduct(product));
  }

  protected closeDialog(): void {
    this.dialogRef.close();
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private mapLookupToLabelProduct(product: ProductLookupItemDto): IEtiketBasimProduct {
    return {
      package: '',
      packageFactor: product.secondaryUnitMultiplier > 1 ? String(product.secondaryUnitMultiplier) : '',
      lastUpdateDate: '',
      barcodeContent: product.barcode || '',
      bulkSaleTaxRate: 0,
      retailSaleTaxRate: 0,
      productCode: product.stockCode || '',
      productName: product.stockName || product.stockCode || product.barcode || 'Urun',
      barcode: product.barcode || '',
      oldPrice: product.price || 0,
      price: product.price || 0,
      priceChangeDate: '',
      supplierCode: '',
      isClosedToSale: product.isSalesBlocked ? 1 : 0,
      isClosedToOrder: product.isOrderBlocked ? 1 : 0,
      isClosedToReceiving: product.isGoodsAcceptanceBlocked ? 1 : 0,
      isPassive: false,
      unitName: product.unitName || '',
      unitName2: product.secondaryUnitName || '',
      typeCode: '',
      isDomestic: 1,
      origin: '',
      unitPriceFactor: product.unitMultiplier || 1,
      alternativeUnitName: product.secondaryUnitName || product.unitName || '',
      pluNo: 0,
      sectorCode: '',
      shelfLife: 0,
      type: '',
      orderGuid: null,
      canBeCalled: true,
      quantity: 0,
      deliveredQuantity: 0,
      documentOrderNo: 0,
      categoryCode: ''
    };
  }
}
