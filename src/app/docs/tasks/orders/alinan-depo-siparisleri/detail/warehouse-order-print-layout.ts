import type { WarehouseOrderLineItemDto } from '@interfaces';

export type WarehouseOrderPrintDensity = 'comfortable' | 'compact' | 'dense' | 'ultra';

export interface WarehouseOrderPrintColumn {
  startIndex: number;
  items: readonly WarehouseOrderLineItemDto[];
}

export interface WarehouseOrderPrintLayout {
  columnCount: number;
  density: WarehouseOrderPrintDensity;
  columns: readonly WarehouseOrderPrintColumn[];
}

const productNameCollator = new Intl.Collator('tr-TR', {
  sensitivity: 'base',
  numeric: true
});

export function buildWarehouseOrderPrintLayout(
  items: readonly WarehouseOrderLineItemDto[]
): WarehouseOrderPrintLayout {
  const sortedItems = [...items].sort((left, right) => {
    const nameComparison = productNameCollator.compare(
      left.stockName?.trim() || '',
      right.stockName?.trim() || ''
    );

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return productNameCollator.compare(left.stockCode?.trim() || '', right.stockCode?.trim() || '');
  });
  const rowCount = Math.max(1, sortedItems.length);
  const density: WarehouseOrderPrintDensity =
    rowCount <= 36
      ? 'comfortable'
      : rowCount <= 52
        ? 'compact'
        : rowCount <= 68
          ? 'dense'
          : 'ultra';
  const columns: readonly WarehouseOrderPrintColumn[] = [
    {
      startIndex: 0,
      items: sortedItems
    }
  ];

  return {
    columnCount: 1,
    density,
    columns
  };
}
