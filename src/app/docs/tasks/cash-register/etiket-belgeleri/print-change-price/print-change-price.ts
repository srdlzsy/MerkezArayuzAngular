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

  protected readonly today: Date = new Date();

  protected increasedCount(): number {
    return this.productsToPrint.filter((product) => product.price > product.oldPrice).length;
  }

  protected decreasedCount(): number {
    return this.productsToPrint.filter((product) => product.price < product.oldPrice).length;
  }

  protected missingBarcodeCount(): number {
    return this.productsToPrint.filter((product) => !product.barcode?.trim()).length;
  }

  protected priceDifference(product: IEtiketBasimProduct): number {
    return product.price - product.oldPrice;
  }
}
