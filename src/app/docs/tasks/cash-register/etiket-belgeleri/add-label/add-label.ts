import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
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
export class AddLabel {
  protected searchText = '';
  protected isSearching = false;
  protected feedbackMessage = '';
  protected findProducts: ProductLookupItemDto[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(DialogRef<IEtiketBasimProduct | undefined>);
  private readonly aramaService = inject(AramaService);
  private readonly authService = inject(AuthService);

  protected onSearchChange(): void {
    const query = this.searchText.trim();
    this.searchText = query;

    if (!query) {
      this.findProducts = [];
      this.feedbackMessage = '';
      return;
    }

    if (query.length < 3) {
      this.feedbackMessage = 'Arama yapmak icin en az 3 karakter girin.';
      return;
    }

    this.isSearching = true;
    this.feedbackMessage = '';

    const warehouseNo = this.authService.currentUser()?.depoNo ?? undefined;

    this.aramaService
      .searchPrices(query, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.feedbackMessage = 'Stok aramasi su anda yapilamadi.';
          return of([] as ProductLookupItemDto[]);
        }),
        finalize(() => {
          this.isSearching = false;
        })
      )
      .subscribe((products: ProductLookupItemDto[]) => {
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
