import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces';
import {
  getLabelPriceDifference,
  type LabelPriceChangeStatus,
  normalizeLabelPrice,
  resolveLabelPriceChangeStatus
} from '../price-change-status';

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
    return this.countByStatus('increased');
  }

  protected decreasedCount(): number {
    return this.countByStatus('decreased');
  }

  protected unchangedCount(): number {
    return this.countByStatus('unchanged');
  }

  protected initialPriceCount(): number {
    return this.countByStatus('initial');
  }

  protected missingBarcodeCount(): number {
    return this.productsToPrint.filter((product) => !product.barcode?.trim()).length;
  }

  protected priceDifference(product: IEtiketBasimProduct): number | null {
    return getLabelPriceDifference(product);
  }

  protected totalPriceDifference(): number {
    return this.productsToPrint.reduce(
      (total, product) => total + (this.priceDifference(product) ?? 0),
      0
    );
  }

  protected priceDifferencePercent(product: IEtiketBasimProduct): number | null {
    const difference = this.priceDifference(product);
    const oldPrice = normalizeLabelPrice(product.oldPrice);

    if (difference === null || oldPrice === null || oldPrice <= 0) {
      return null;
    }

    return (difference / oldPrice) * 100;
  }

  protected priceTrendLabel(product: IEtiketBasimProduct): string {
    const labels: Record<LabelPriceChangeStatus, string> = {
      initial: 'Yeni fiyat tanımı',
      increased: 'Fiyat arttı',
      decreased: 'Fiyat düştü',
      unchanged: 'Fiyat aynı',
      unavailable: 'Fiyat bilgisi yok'
    };

    return labels[this.priceStatus(product)];
  }

  protected priceStatus(product: IEtiketBasimProduct): LabelPriceChangeStatus {
    return resolveLabelPriceChangeStatus(product);
  }

  protected hasPreviousPrice(product: IEtiketBasimProduct): boolean {
    const status = this.priceStatus(product);
    return status !== 'initial' && status !== 'unavailable';
  }

  protected hasPriceDifference(product: IEtiketBasimProduct): boolean {
    const status = this.priceStatus(product);
    return status === 'increased' || status === 'decreased';
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

  private countByStatus(status: LabelPriceChangeStatus): number {
    return this.productsToPrint.filter((product) => this.priceStatus(product) === status).length;
  }
}
