import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces';

import { isDomesticOrigin, renderBarcodeSvg } from '../etiket-barcode.util';

@Component({
  selector: 'app-a5-dortlu-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-dortlu-fiyat-etiketi.component.html',
  styleUrls: ['./a5-dortlu-fiyat-etiketi.component.css']
})
export class A5DortluFiyatEtiketiComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productGroups: IEtiketBasimProduct[][] = [];
  protected labelPrintDate: string = this.getFormattedPrintDate();

  ngOnInit(): void {
    this.labelPrintDate = this.getFormattedPrintDate();
    this.productGroups = this.chunkProducts(this.productsToPrint);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.productGroups = this.chunkProducts(this.productsToPrint);
      this.renderBarcodes();
    }
  }

  ngAfterViewInit(): void {
    this.renderBarcodes();
  }

  protected isDomestic(origin: string | null | undefined): boolean {
    return isDomesticOrigin(origin);
  }

  private getFormattedPrintDate(): string {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short'
    }).format(new Date());
  }

  private renderBarcodes(): void {
    setTimeout(() => {
      this.productGroups.forEach((group, groupIndex) => {
        group.forEach((product, itemIndex) => {
          this.renderBarcode(`barcode-quad-${groupIndex}-${itemIndex}`, product.barcode);
        });
      });
    }, 0);
  }

  private chunkProducts(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[][] {
    const groups: IEtiketBasimProduct[][] = [];

    for (let i = 0; i < products.length; i += 4) {
      groups.push(products.slice(i, i + 4));
    }

    return groups;
  }

  private renderBarcode(targetId: string, value: string | null | undefined): void {
    renderBarcodeSvg(document.getElementById(targetId) as SVGSVGElement | null, value, {
      barWidth: 1,
      barHeight: 24,
      fontSize: 10,
      marginX: 0,
      marginTop: 0
    });
  }
}
