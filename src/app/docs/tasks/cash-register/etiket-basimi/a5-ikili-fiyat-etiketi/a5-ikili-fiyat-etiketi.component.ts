import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces';

import { isDomesticOrigin, renderBarcodeSvg } from '../etiket-barcode.util';

@Component({
  selector: 'app-a5-ikili-fiyat-etiketi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a5-ikili-fiyat-etiketi.component.html',
  styleUrls: ['./a5-ikili-fiyat-etiketi.component.css']
})
export class A5IkiliFiyatEtiketiComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected productPairs: IEtiketBasimProduct[][] = [];
  protected labelPrintDate: string = this.getFormattedPrintDate();

  ngOnInit(): void {
    this.labelPrintDate = this.getFormattedPrintDate();
    this.productPairs = this.chunkProducts(this.productsToPrint);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.productPairs = this.chunkProducts(this.productsToPrint);
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
      this.productPairs.forEach((pair, index) => {
        if (pair[0]) {
          this.renderBarcode(`barcode-left-${index}`, pair[0].barcode);
        }

        if (pair[1]) {
          this.renderBarcode(`barcode-right-${index}`, pair[1].barcode);
        }
      });
    }, 0);
  }

  private chunkProducts(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[][] {
    const pairs: IEtiketBasimProduct[][] = [];

    for (let i = 0; i < products.length; i += 2) {
      pairs.push(products.slice(i, i + 2));
    }

    return pairs;
  }

  private renderBarcode(targetId: string, value: string | null | undefined): void {
    renderBarcodeSvg(document.getElementById(targetId) as SVGSVGElement | null, value, {
      barWidth: 1,
      barHeight: 35,
      fontSize: 13,
      marginX: 0,
      marginTop: 0
    });
  }
}
