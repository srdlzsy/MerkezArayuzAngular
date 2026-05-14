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
  selector: 'app-fiyatetiket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fiyatetiket.component.html',
  styleUrls: ['./fiyatetiket.component.css']
})
export class FiyatetiketComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected readonly etiketCikarmaTarihi = new Date().toISOString().slice(0, 16);

  private readonly beforePrintHandler = () => this.renderBarcodesSafe();

  ngOnInit(): void {
    window.addEventListener('beforeprint', this.beforePrintHandler);
  }

  ngAfterViewInit(): void {
    this.renderBarcodesSafe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsToPrint']) {
      this.renderBarcodesSafe();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeprint', this.beforePrintHandler);
  }

  protected isDomestic(origin: string | null | undefined): boolean {
    return isDomesticOrigin(origin);
  }

  private renderBarcodesSafe(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.renderBarcodes());
    });
  }

  private renderBarcodes(): void {
    document.querySelectorAll<SVGSVGElement>('svg.barcode-svg').forEach((svg) => {
      renderBarcodeSvg(svg, svg.getAttribute('data-code'), {
        barWidth: 1.2,
        barHeight: 40,
        fontSize: 14,
        marginX: 0,
        marginTop: 0
      });
    });
  }
}
