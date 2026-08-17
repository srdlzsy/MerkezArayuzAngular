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
  selector: 'app-a5-tekli-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-tekli-fiyat-etiketi.component.html',
  styleUrl: './a5-tekli-fiyat-etiketi.component.css'
})
export class A5TekliFiyatEtiketiComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected readonly labelPrintDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short'
  }).format(new Date());

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
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

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct
  ): string => `${product.productCode}-${product.barcode}-${index}`;

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.a5-single-barcode').forEach((svg) => {
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
