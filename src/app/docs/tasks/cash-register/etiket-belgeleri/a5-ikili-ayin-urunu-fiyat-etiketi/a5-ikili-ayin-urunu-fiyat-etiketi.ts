import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces/etiket-basimi.dtos';

import { isDomesticOrigin, renderBarcodeSvg } from '../etiket-barcode.util';

type PriceSizeClass = 'price-small' | 'price-medium' | 'price-large';

@Component({
  selector: 'app-a5-ikili-ayin-urunu-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-ikili-ayin-urunu-fiyat-etiketi.html',
  styleUrl: './a5-ikili-ayin-urunu-fiyat-etiketi.scss'
})
export class A5IkiliAyinUrunuFiyatEtiketi
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productsToPrintChunks: IEtiketBasimProduct[][] = [];
  protected readonly labelPrintDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short'
  }).format(new Date());

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    this.buildPages();
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.buildPages();
      this.renderBarcodesSafe();
    }
  }

  ngAfterViewInit(): void {
    this.renderBarcodesSafe();
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeprint', this.beforePrintHandler);
  }

  protected displayPrice(product: IEtiketBasimProduct): number {
    return product.promotionPrice ?? product.price ?? 0;
  }

  protected isDomestic(origin: string | null | undefined): boolean {
    return isDomesticOrigin(origin);
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

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.a5-advantage-product-barcode').forEach((svg) => {
      renderBarcodeSvg(svg, svg.getAttribute('data-code'), {
        barWidth: 1,
        barHeight: 35,
        fontSize: 13,
        marginX: 0,
        marginTop: 0
      });
    });
  }
}
