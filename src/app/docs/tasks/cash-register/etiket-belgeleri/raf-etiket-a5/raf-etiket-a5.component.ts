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
  selector: 'app-raf-etiket-a5',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './raf-etiket-a5.component.html',
  styleUrls: ['./raf-etiket-a5.component.css']
})
export class RafEtiketA5Component implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected halfPages: IEtiketBasimProduct[][] = [];
  protected etiketCikarmaTarihi: Date = new Date();

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    this.halfPages = this.chunk(this.productsToPrint, 12);
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngAfterViewInit(): void {
    this.renderBarcodesSafe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.halfPages = this.chunk(this.productsToPrint, 12);
      this.renderBarcodesSafe();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeprint', this.beforePrintHandler);
  }

  protected isDomestic(origin: string | null | undefined): boolean {
    return isDomesticOrigin(origin);
  }

  private chunk(products: readonly IEtiketBasimProduct[], size: number): IEtiketBasimProduct[][] {
    const result: IEtiketBasimProduct[][] = [];

    for (let i = 0; i < products.length; i += size) {
      result.push(products.slice(i, i + size));
    }

    return result;
  }

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.barcode-svg').forEach((svg) => {
      renderBarcodeSvg(svg, svg.getAttribute('data-code'), {
        barWidth: 1.1,
        barHeight: 24,
        fontSize: 10,
        marginX: 0,
        marginTop: 0
      });
    });
  }
}
