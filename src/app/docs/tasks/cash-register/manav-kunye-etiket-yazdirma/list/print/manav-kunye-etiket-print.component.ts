import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type { IManavKunyeTag } from '@interfaces';

import { renderQrSvg } from '../../../kunye-etiket-yazdirma/kunye-qr.util';

@Component({
  selector: 'app-manav-kunye-etiket-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manav-kunye-etiket-print.component.html',
  styleUrl: './manav-kunye-etiket-print.component.scss'
})
export class ManavKunyeEtiketPrintComponent implements OnChanges, AfterViewChecked {
  @Input() tags: IManavKunyeTag[] = [];
  private qrRendered = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tags']) {
      this.qrRendered = false;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.qrRendered && this.tags.length) {
      this.qrRendered = true;
      setTimeout(() => this.renderQrs(), 50);
    }
  }

  public forceRenderBarcodes(): void {
    if (!this.tags.length) {
      return;
    }

    this.qrRendered = false;
    setTimeout(() => this.renderQrs(), 50);
  }

  protected isLast(index: number): boolean {
    return index === this.tags.length - 1;
  }

  protected calculateCostTotal(tag: IManavKunyeTag): number {
    const buyingPrice = tag.buyingPrice || 0;

    return (
      buyingPrice +
      buyingPrice * 0.115 +
      buyingPrice * 0.065 +
      buyingPrice * 0.055 +
      buyingPrice * 0.049 +
      buyingPrice +
      buyingPrice
    );
  }

  private renderQrs(): void {
    const tryRender = (): boolean => {
      let needsRetry = false;

      this.tags.forEach((tag, index) => {
        const value = (tag.takenTag ?? '').toString().trim();
        if (!value) {
          return;
        }

        const el = document.querySelector(`#manav-qr-${index}`) as SVGSVGElement | null;
        if (!el) {
          needsRetry = true;
          return;
        }

        renderQrSvg(el, value);

        if (!el.childNodes.length) {
          needsRetry = true;
        }
      });

      return needsRetry;
    };

    const attempt = (remaining: number) => {
      const retry = tryRender();
      if (retry && remaining > 0) {
        setTimeout(() => attempt(remaining - 1), 180);
      }
    };

    attempt(3);
  }
}
