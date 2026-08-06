import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces/etiket-basimi.dtos';

type PriceSizeClass = 'price-small' | 'price-medium' | 'price-large';

@Component({
  selector: 'app-a5-ikili-ayin-urunu-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-ikili-ayin-urunu-fiyat-etiketi.html',
  styleUrl: './a5-ikili-ayin-urunu-fiyat-etiketi.scss'
})
export class A5IkiliAyinUrunuFiyatEtiketi implements OnInit, OnChanges {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productsToPrintChunks: IEtiketBasimProduct[][] = [];

  ngOnInit(): void {
    this.buildPages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.buildPages();
    }
  }

  protected displayPrice(product: IEtiketBasimProduct): number {
    return product.promotionPrice ?? product.price ?? 0;
  }

  protected getPriceSizeClass(product: IEtiketBasimProduct): PriceSizeClass {
    const price = Math.abs(this.displayPrice(product));

    if (price >= 1_000) {
      return 'price-small';
    }

    if (price >= 100) {
      return 'price-medium';
    }

    return 'price-large';
  }

  protected readonly trackByPage = (index: number): number => index;

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct
  ): string => `${product.productCode}-${product.barcode}-${index}`;

  private buildPages(): void {
    this.productsToPrintChunks = this.chunkProducts(this.productsToPrint);
  }

  private chunkProducts(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[][] {
    const chunks: IEtiketBasimProduct[][] = [];

    for (let index = 0; index < products.length; index += 2) {
      chunks.push(products.slice(index, index + 2));
    }

    return chunks;
  }
}
