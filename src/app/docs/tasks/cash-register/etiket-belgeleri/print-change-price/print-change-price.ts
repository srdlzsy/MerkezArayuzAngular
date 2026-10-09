import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces';

@Component({
  selector: 'app-print-change-price',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-change-price.html',
  styleUrls: ['./print-change-price.css']
})
export class PrintChangePrice {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];
  @Input() warehouseLabel = '';
  @Input() sourceLabel = '';
  @Input() scopeLabel = '';

  protected readonly today: Date = new Date();

  protected increasedCount(): number {
    return this.productsToPrint.filter((product) => product.price > product.oldPrice).length;
  }

  protected decreasedCount(): number {
    return this.productsToPrint.filter((product) => product.price < product.oldPrice).length;
  }

  protected unchangedCount(): number {
    return this.productsToPrint.filter((product) => product.price === product.oldPrice).length;
  }

  protected missingBarcodeCount(): number {
    return this.productsToPrint.filter((product) => !product.barcode?.trim()).length;
  }

  protected priceDifference(product: IEtiketBasimProduct): number {
    return product.price - product.oldPrice;
  }

  protected totalPriceDifference(): number {
    return this.productsToPrint.reduce(
      (total, product) => total + this.priceDifference(product),
      0
    );
  }

  protected priceDifferencePercent(product: IEtiketBasimProduct): number | null {
    if (!Number.isFinite(product.oldPrice) || product.oldPrice <= 0) {
      return null;
    }

    return (this.priceDifference(product) / product.oldPrice) * 100;
  }

  protected priceTrendLabel(product: IEtiketBasimProduct): string {
    const difference = this.priceDifference(product);

    if (difference > 0) {
      return 'Arttı';
    }

    if (difference < 0) {
      return 'Azaldı';
    }

    return 'Aynı';
  }

  protected formatChangeDate(value: string | null | undefined): string {
    const normalized = value?.trim();

    if (!normalized) {
      return '-';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(normalized);

    if (!match) {
      return normalized;
    }

    const date = `${match[3]}.${match[2]}.${match[1]}`;
    return match[4] && match[5] ? `${date} ${match[4]}:${match[5]}` : date;
  }

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct
  ): string => `${product.productCode}-${product.barcode}-${index}`;
}
