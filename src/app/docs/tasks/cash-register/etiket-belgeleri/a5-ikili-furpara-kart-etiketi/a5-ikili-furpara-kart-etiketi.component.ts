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
import type { IEtiketBasimProduct } from '@interfaces';

import { isDomesticOrigin, renderBarcodeSvg } from '../etiket-barcode.util';

@Component({
  selector: 'app-a5-ikili-furpara-kart-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-ikili-furpara-kart-etiketi.component.html',
  styleUrl: './a5-ikili-furpara-kart-etiketi.component.css'
})
export class A5IkiliFurparaKartEtiketiComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productPairs: IEtiketBasimProduct[][] = [];
  protected readonly labelPrintDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short'
  }).format(new Date());

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    this.productPairs = this.chunkProducts(this.productsToPrint);
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.productPairs = this.chunkProducts(this.productsToPrint);
      this.renderBarcodesSafe();
    }
  }

  ngAfterViewInit(): void {
    this.renderBarcodesSafe();
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeprint', this.beforePrintHandler);
  }

  protected isDomestic(origin: string | null | undefined): boolean {
    return isDomesticOrigin(origin);
  }

  protected displayPromotionPrice(product: IEtiketBasimProduct): number {
    return product.promotionPrice && product.promotionPrice > 0
      ? product.promotionPrice
      : product.price;
  }

  protected displayExpiration(product: IEtiketBasimProduct): string {
    return product.expirationDate?.trim() || '-';
  }

  protected readonly trackByPair = (index: number): number => index;

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct
  ): string => `${product.productCode}-${product.barcode}-${index}`;

  private chunkProducts(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[][] {
    const pairs: IEtiketBasimProduct[][] = [];

    for (let index = 0; index < products.length; index += 2) {
      pairs.push(products.slice(index, index + 2));
    }

    return pairs;
  }

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.a5-card-barcode').forEach((svg) => {
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
