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
import { renderBarcodeSvg } from '../../../etiket-belgeleri/etiket-barcode.util';
import { renderQrSvg } from '../../../kunye-etiket-yazdirma/kunye-qr.util';

interface ManavKunyePrintPage {
  items: readonly IManavKunyeTag[];
  pageNumber: number;
}

type PriceSizeClass = 'price-size-sm' | 'price-size-md' | 'price-size-lg' | 'price-size-xl';

interface ManavCostBreakdown {
  labor: number;
  storeExpense: number;
  logistics: number;
  waste: number;
  customTax: number;
  vat: number;
  total: number;
}

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

  @ViewChildren('priceBarcode')
  priceBarcodeElements!: QueryList<ElementRef<SVGSVGElement>>;

  private renderScheduled = false;
  private static readonly LABOR_RATE = 0.115;
  private static readonly STORE_EXPENSE_RATE = 0.065;
  private static readonly LOGISTICS_RATE = 0.055;
  private static readonly WASTE_RATE = 0.049;
  private static readonly ESTIMATED_CUSTOM_TAX_RATE = 0.01;
  private static readonly ESTIMATED_VAT_RATE = 0.01;

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
    this.renderPriceBarcodes();
  }

  private scheduleRender(): void {
    if (this.renderScheduled) {
      return;
    }

    this.renderScheduled = true;
    void this.waitForNextPaint()
      .then(() => this.renderBarcodesNow())
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

  private renderPriceBarcodes(): void {
    const elements = this.priceBarcodeElements?.toArray() ?? [];

    elements.forEach((elRef) => {
      renderBarcodeSvg(elRef.nativeElement, elRef.nativeElement.getAttribute('data-code'), {
        barWidth: 1,
        barHeight: 22,
        fontSize: 7,
        marginX: 2,
        marginTop: 0,
        textMargin: 0
      });
    });
  }

  protected calculateLaborCost(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).labor;
  }

  protected calculateStoreExpense(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).storeExpense;
  }

  protected calculateLogisticsCost(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).logistics;
  }

  protected calculateWasteCost(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).waste;
  }

  protected getCustomTax(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).customTax;
  }

  protected getVat(tag: IManavKunyeTag): number {
    return this.calculateCostBreakdown(tag).vat;
  }

  protected getPriceLabelProductName(tag: IManavKunyeTag): string {
    const productName = String(tag.stockName || tag.productName || '').trim();
    const productUnit = String(tag.productUnit || 'KG').trim();
    const normalizedName = productName.toLocaleUpperCase('tr-TR');
    const normalizedSuffix = ` ${productUnit.toLocaleUpperCase('tr-TR')}`;

    return normalizedName.endsWith(normalizedSuffix)
      ? productName.slice(0, -normalizedSuffix.length).trim()
      : productName;
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
    return this.calculateCostBreakdown(tag).total;
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

  private calculateCostBreakdown(tag: IManavKunyeTag): ManavCostBreakdown {
    const buyingPriceCents = this.toCurrencyCents(this.getBuyingPrice(tag));
    const nominalExpenses = [
      ManavKunyeEtiketPrintComponent.LABOR_RATE,
      ManavKunyeEtiketPrintComponent.STORE_EXPENSE_RATE,
      ManavKunyeEtiketPrintComponent.LOGISTICS_RATE,
      ManavKunyeEtiketPrintComponent.WASTE_RATE,
      ManavKunyeEtiketPrintComponent.ESTIMATED_CUSTOM_TAX_RATE,
      ManavKunyeEtiketPrintComponent.ESTIMATED_VAT_RATE
    ].map((rate) => Math.round(buyingPriceCents * rate));
    const nominalExpenseTotal = nominalExpenses.reduce((total, value) => total + value, 0);
    const salesPriceCents = this.toCurrencyCents(tag.salesPrice);
    const availableExpenseCents = salesPriceCents > 0
      ? Math.max(0, Math.min(nominalExpenseTotal, salesPriceCents - buyingPriceCents))
      : nominalExpenseTotal;
    const expenses = this.allocateExpenseCents(
      nominalExpenses,
      nominalExpenseTotal,
      availableExpenseCents
    );
    const totalCents = buyingPriceCents + expenses.reduce((total, value) => total + value, 0);

    return {
      labor: expenses[0] / 100,
      storeExpense: expenses[1] / 100,
      logistics: expenses[2] / 100,
      waste: expenses[3] / 100,
      customTax: expenses[4] / 100,
      vat: expenses[5] / 100,
      total: totalCents / 100
    };
  }

  private allocateExpenseCents(
    nominalExpenses: readonly number[],
    nominalExpenseTotal: number,
    availableExpenseCents: number
  ): number[] {
    if (nominalExpenseTotal <= 0 || availableExpenseCents <= 0) {
      return nominalExpenses.map(() => 0);
    }

    if (availableExpenseCents >= nominalExpenseTotal) {
      return [...nominalExpenses];
    }

    const expenses = nominalExpenses.map((value) =>
      Math.round((value * availableExpenseCents) / nominalExpenseTotal)
    );
    let correction = availableExpenseCents
      - expenses.reduce((total, value) => total + value, 0);

    // Keep the displayed rows and total equal to the cent while preserving equal tax estimates.
    while (correction !== 0) {
      if (correction > 0) {
        expenses[0] += 1;
        correction -= 1;
        continue;
      }

      const adjustableIndex = expenses.findIndex((value) => value > 0);
      if (adjustableIndex < 0) {
        break;
      }

      expenses[adjustableIndex] -= 1;
      correction += 1;
    }

    return expenses;
  }

  private toCurrencyCents(value: number | null | undefined): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0
      ? Math.round(numberValue * 100)
      : 0;
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }
}
