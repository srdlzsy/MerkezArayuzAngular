import type { WarehouseOrderLineItemDto } from '@interfaces';

import { buildWarehouseOrderPrintLayout } from './warehouse-order-print-layout';

describe('buildWarehouseOrderPrintLayout', () => {
  function createItem(stockName: string, stockCode = stockName): WarehouseOrderLineItemDto {
    return { stockName, stockCode } as WarehouseOrderLineItemDto;
  }

  it('sorts products with Turkish alphabetical rules without mutating the input', () => {
    const items = [createItem('Üzüm'), createItem('Armut'), createItem('Çilek')];

    const layout = buildWarehouseOrderPrintLayout(items);

    expect(layout.columns.flatMap((column) => column.items).map((item) => item.stockName)).toEqual([
      'Armut',
      'Çilek',
      'Üzüm'
    ]);
    expect(items.map((item) => item.stockName)).toEqual(['Üzüm', 'Armut', 'Çilek']);
  });

  it('keeps every item in one left-aligned print column', () => {
    const createItems = (count: number) =>
      Array.from({ length: count }, (_, index) => createItem(`Urun ${index + 1}`));

    expect(buildWarehouseOrderPrintLayout(createItems(40)).columnCount).toBe(1);
    expect(buildWarehouseOrderPrintLayout(createItems(80)).columnCount).toBe(1);
    expect(buildWarehouseOrderPrintLayout(createItems(120)).columnCount).toBe(1);
  });

  it('keeps all rows in the same print table', () => {
    const layout = buildWarehouseOrderPrintLayout(
      Array.from({ length: 43 }, (_, index) => createItem(`Urun ${index + 1}`))
    );

    expect(layout.columns.map((column) => column.startIndex)).toEqual([0]);
    expect(layout.columns.map((column) => column.items.length)).toEqual([43]);
  });

  it('keeps common order sizes readable before using denser layouts', () => {
    const createItems = (count: number) =>
      Array.from({ length: count }, (_, index) => createItem(`Urun ${index + 1}`));

    expect(buildWarehouseOrderPrintLayout(createItems(36)).density).toBe('comfortable');
    expect(buildWarehouseOrderPrintLayout(createItems(37)).density).toBe('compact');
    expect(buildWarehouseOrderPrintLayout(createItems(52)).density).toBe('compact');
    expect(buildWarehouseOrderPrintLayout(createItems(53)).density).toBe('dense');
    expect(buildWarehouseOrderPrintLayout(createItems(68)).density).toBe('dense');
    expect(buildWarehouseOrderPrintLayout(createItems(69)).density).toBe('ultra');
  });
});
