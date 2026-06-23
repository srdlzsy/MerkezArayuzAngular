import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';

import type { IManavKunyeTag } from '@interfaces';
import { renderQrSvg } from '../../../kunye-etiket-yazdirma/kunye-qr.util';

interface ManavKunyePrintPage {
  items: readonly IManavKunyeTag[];
  pageNumber: number;
}

type PriceSizeClass = 'price-size-sm' | 'price-size-md' | 'price-size-lg' | 'price-size-xl';

@Component({
  selector: 'app-manav-kunye-etiket-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manav-kunye-etiket-print.component.html',
  styleUrl: './manav-kunye-etiket-print.component.scss'
})
export class ManavKunyeEtiketPrintComponent implements OnChanges, AfterViewInit {
  @Input() tags: IManavKunyeTag[] = [];
  protected pages: readonly ManavKunyePrintPage[] = [];

  @ViewChildren('qrEl')
  qrElements!: QueryList<ElementRef<SVGSVGElement>>;

  private renderScheduled = false;
  private static readonly LABOR_RATE = 0.115;
  private static readonly STORE_EXPENSE_RATE = 0.065;
  private static readonly LOGISTICS_RATE = 0.055;
  private static readonly WASTE_RATE = 0.049;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tags']) {
      this.pages = this.buildPages(this.tags);
      this.scheduleRender();
    }
  }

  ngAfterViewInit(): void {
    this.scheduleRender();
  }

  public async prepareForPrint(): Promise<void> {
    await this.waitForNextPaint();
    this.renderBarcodesNow();
    await this.waitForNextPaint();
  }

  public renderBarcodesNow(): void {
    this.renderQrs();
  }

  private scheduleRender(): void {
    if (this.renderScheduled) {
      return;
    }

    this.renderScheduled = true;
    void this.waitForNextPaint()
      .then(() => this.renderQrs())
      .finally(() => {
        this.renderScheduled = false;
      });
  }

  private renderQrs(): void {
    const elements = this.qrElements?.toArray() ?? [];

    elements.forEach((elRef, index) => {
      const tag = this.tags?.[index];
      if (!tag) {
        elRef.nativeElement.replaceChildren();
        return;
      }

      renderQrSvg(elRef.nativeElement, String(tag.takenTag ?? '').trim());
    });
  }

  protected calculateLaborCost(tag: IManavKunyeTag): number {
    return this.getBuyingPrice(tag) * ManavKunyeEtiketPrintComponent.LABOR_RATE;
  }

  protected calculateStoreExpense(tag: IManavKunyeTag): number {
    return this.getBuyingPrice(tag) * ManavKunyeEtiketPrintComponent.STORE_EXPENSE_RATE;
  }

  protected calculateLogisticsCost(tag: IManavKunyeTag): number {
    return this.getBuyingPrice(tag) * ManavKunyeEtiketPrintComponent.LOGISTICS_RATE;
  }

  protected calculateWasteCost(tag: IManavKunyeTag): number {
    return this.getBuyingPrice(tag) * ManavKunyeEtiketPrintComponent.WASTE_RATE;
  }

  protected getCustomTax(tag: IManavKunyeTag): number {
    return tag.customTax ?? this.getBuyingPrice(tag);
  }

  protected getVat(tag: IManavKunyeTag): number {
    return tag.vat ?? this.getBuyingPrice(tag);
  }

  protected getPriceSizeClass(price: number | null | undefined): PriceSizeClass {
    const absolutePrice = Math.abs(Number(price) || 0);

    if (absolutePrice >= 10_000) {
      return 'price-size-sm';
    }

    if (absolutePrice >= 1_000) {
      return 'price-size-md';
    }

    if (absolutePrice >= 100) {
      return 'price-size-lg';
    }

    return 'price-size-xl';
  }

  protected calculateCostTotal(tag: IManavKunyeTag): number {
    return this.getBuyingPrice(tag)
      + this.calculateLaborCost(tag)
      + this.calculateStoreExpense(tag)
      + this.calculateLogisticsCost(tag)
      + this.calculateWasteCost(tag)
      + this.getCustomTax(tag)
      + this.getVat(tag);
  }

  protected readonly trackByPage = (_index: number, page: ManavKunyePrintPage): number =>
    page.pageNumber;

  protected readonly trackByTag = (index: number, tag: IManavKunyeTag): string =>
    `${tag.stockCode}-${tag.takenTag}-${index}`;

  private buildPages(tags: readonly IManavKunyeTag[]): readonly ManavKunyePrintPage[] {
    const pages: ManavKunyePrintPage[] = [];

    for (let index = 0; index < tags.length; index += 2) {
      pages.push({
        items: tags.slice(index, index + 2),
        pageNumber: pages.length + 1
      });
    }

    return pages;
  }

  private getBuyingPrice(tag: IManavKunyeTag): number {
    return Number.isFinite(tag.buyingPrice) ? tag.buyingPrice : 0;
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }
}
