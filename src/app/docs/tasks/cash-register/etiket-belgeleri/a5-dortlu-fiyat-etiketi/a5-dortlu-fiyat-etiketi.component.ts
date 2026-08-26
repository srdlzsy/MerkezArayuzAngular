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
  selector: 'app-a5-dortlu-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-dortlu-fiyat-etiketi.component.html',
  styleUrls: ['./a5-dortlu-fiyat-etiketi.component.css']
})
export class A5DortluFiyatEtiketiComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productGroups: Array<Array<IEtiketBasimProduct | null>> = [];
  protected labelPrintDate: string = this.getFormattedPrintDate();

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    this.labelPrintDate = this.getFormattedPrintDate();
    this.productGroups = this.chunkProducts(this.productsToPrint);
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.productGroups = this.chunkProducts(this.productsToPrint);
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

  private getFormattedPrintDate(): string {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short'
    }).format(new Date());
  }

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct | null
  ): string => product ? `${product.productCode}-${product.barcode}-${index}` : `empty-${index}`;

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.a5-quad-barcode').forEach((svg) => {
      renderBarcodeSvg(svg, svg.getAttribute('data-code'), {
        barWidth: 0.82,
        barHeight: 21,
        fontSize: 7,
        marginX: 0,
        marginTop: 0
      });
    });
  }

  private chunkProducts(products: readonly IEtiketBasimProduct[]): Array<Array<IEtiketBasimProduct | null>> {
    const groups: Array<Array<IEtiketBasimProduct | null>> = [];

    for (let i = 0; i < products.length; i += 4) {
      const group: Array<IEtiketBasimProduct | null> = products.slice(i, i + 4);

      while (group.length < 4) {
        group.push(null);
      }

      groups.push(group);
    }

    return groups;
  }

}
