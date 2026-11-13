import type { IManavKunyeTag } from '@interfaces';

import { ManavKunyeEtiketPrintComponent } from './manav-kunye-etiket-print.component';

describe('ManavKunyeEtiketPrintComponent', () => {
  const createTag = (overrides: Partial<IManavKunyeTag> = {}): IManavKunyeTag => ({
    branchNo: 56,
    branchName: 'MANAV DEPO',
    productionCity: 'BURSA',
    productionDistrict: 'KESTEL',
    productName: 'DOMATES',
    goodsType: 'SEBZE',
    goodsGenus: 'DOMATES',
    quantity: 1,
    takenTag: 'KUNYE-1',
    buyer: 'FURPA',
    productionDate: '2026-11-12',
    buyingPrice: 100,
    shippingDate: '2026-11-12',
    manufacturer: 'URETICI',
    stockCode: 'MNV001',
    stockName: 'MNV DOMATES KG',
    salesPrice: 149.9,
    productUnit: 'KG',
    ...overrides
  });

  it('prints a trailing product unit only in the dedicated unit line', () => {
    const component = new ManavKunyeEtiketPrintComponent() as any;

    expect(component.getPriceLabelProductName(createTag())).toBe('MNV DOMATES');
    expect(component.getPriceLabelProductName(createTag({ stockName: 'MNV MAYDANOZ ADET', productUnit: 'ADET' })))
      .toBe('MNV MAYDANOZ');
    expect(component.getPriceLabelProductName(createTag({ stockName: 'MNV DOMATES', productUnit: 'KG' })))
      .toBe('MNV DOMATES');
  });

  it('uses one-percent estimates instead of adding the full buying price for tax rows', () => {
    const component = new ManavKunyeEtiketPrintComponent() as any;
    const tag = createTag();

    expect(component.getCustomTax(tag)).toBe(1);
    expect(component.getVat(tag)).toBe(1);
    expect(component.calculateCostTotal(tag)).toBeCloseTo(130.4, 5);
  });

  it('fits estimated expenses into the available margin without exceeding the sales price', () => {
    const component = new ManavKunyeEtiketPrintComponent() as any;
    const tag = createTag({ buyingPrice: 55, salesPrice: 59.9 });
    const expenseRows = [
      component.calculateLaborCost(tag),
      component.calculateStoreExpense(tag),
      component.calculateLogisticsCost(tag),
      component.calculateWasteCost(tag),
      component.getCustomTax(tag),
      component.getVat(tag)
    ];

    expect(expenseRows.reduce((total, value) => total + value, 55)).toBeCloseTo(59.9, 2);
    expect(component.calculateCostTotal(tag)).toBe(59.9);
  });

  it('keeps every displayed cost row consistent with the capped total', () => {
    const component = new ManavKunyeEtiketPrintComponent() as any;
    const tag = createTag({ buyingPrice: 43, salesPrice: 49.9 });
    const displayedRowsTotal = 43
      + component.calculateLaborCost(tag)
      + component.calculateStoreExpense(tag)
      + component.calculateLogisticsCost(tag)
      + component.calculateWasteCost(tag)
      + component.getCustomTax(tag)
      + component.getVat(tag);

    expect(displayedRowsTotal).toBeCloseTo(49.9, 2);
    expect(component.calculateCostTotal(tag)).toBe(49.9);
  });

  it('does not exceed a sales price with only one cent of available margin', () => {
    const component = new ManavKunyeEtiketPrintComponent() as any;
    const tag = createTag({ buyingPrice: 55, salesPrice: 55.01 });

    expect(component.calculateCostTotal(tag)).toBe(55.01);
  });
});
