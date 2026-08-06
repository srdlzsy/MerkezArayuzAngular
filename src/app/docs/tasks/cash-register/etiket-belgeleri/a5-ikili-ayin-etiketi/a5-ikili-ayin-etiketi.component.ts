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
  selector: 'app-a5-ikili-ayin-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-ikili-ayin-etiketi.component.html',
  styleUrl: './a5-ikili-ayin-etiketi.component.css'
})
export class A5IkiliAyinEtiketiComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected readonly etiketCikarmaTarihi = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());

  protected productsToPrintChunks: IEtiketBasimProduct[][] = [];

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    this.productsToPrintChunks = this.chunkProducts(this.productsToPrint);
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.productsToPrintChunks = this.chunkProducts(this.productsToPrint);
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

  protected displayPrice(product: IEtiketBasimProduct): number {
    return product.promotionPrice ?? product.price;
  }

  private chunkProducts(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[][] {
    const chunks: IEtiketBasimProduct[][] = [];

    for (let i = 0; i < products.length; i += 2) {
      chunks.push(products.slice(i, i + 2));
    }

    return chunks;
  }

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.barcode-svg').forEach((svg) => {
      renderBarcodeSvg(svg, svg.getAttribute('data-code'), {
        barWidth: 1.3,
        barHeight: 44,
        fontSize: 12,
        marginX: 2,
        marginTop: 0
      });
    });
  }
}
