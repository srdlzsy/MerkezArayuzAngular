import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type { IKunyeTag } from '@interfaces';

import { renderQrSvg } from '../../kunye-qr.util';

interface TagPage {
  items: IKunyeTag[];
  startIndex: number;
}

@Component({
  selector: 'app-kunye-etiket-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kunye-etiket-print.component.html',
  styleUrl: './kunye-etiket-print.component.scss'
})
export class KunyeEtiketPrintComponent implements OnChanges, AfterViewChecked {
  @Input() tags: IKunyeTag[] = [];
  protected pages: TagPage[] = [];
  private barcodeRendered = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tags']) {
      this.buildPages();
      this.barcodeRendered = false;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.barcodeRendered && this.tags.length) {
      this.barcodeRendered = true;
      setTimeout(() => this.renderBarcodes(), 50);
    }
  }

  public forceRenderBarcodes(): void {
    if (!this.tags.length) {
      return;
    }

    this.barcodeRendered = false;
    setTimeout(() => this.renderBarcodes(), 50);
  }

  private buildPages(): void {
    this.pages = [];

    for (let i = 0; i < this.tags.length; i += 4) {
      this.pages.push({
        items: this.tags.slice(i, i + 4),
        startIndex: i
      });
    }
  }

  private renderBarcodes(): void {
    const tryRender = (): boolean => {
      let needsRetry = false;

      this.tags.forEach((tag, index) => {
        const value = (tag.takenTag ?? '').toString().trim();
        if (!value) {
          return;
        }

        const el = document.querySelector(`#qr-${index}`) as SVGSVGElement | null;
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
