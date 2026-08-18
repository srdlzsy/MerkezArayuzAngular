import type {
  IFurpaCompanyOrderListItemApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaGoodsAcceptanceDifferenceApiDto,
  IFurpaInventoryCountListItemApiDto,
  IFurpaStockReceiptListItemApiDto,
  IFurpaVirmanListItemApiDto,
  IFurpaWarehouseOrderListItemApiDto,
  IFurpaWarehouseShippingListItemApiDto,
} from '@interfaces';

import type { ApiListTableColumn } from './api-list-table.types';

type WarehouseCounterpartySide = 'source' | 'target';

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

const MONEY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2
});

const toText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value}`.trim();
};

const joinText = (parts: readonly unknown[], separator = ' / '): string => {
  const value = parts.map(toText).filter(Boolean).join(separator);

  return value || '-';
};

const formatQuantity = (value: number | null | undefined): string => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? NUMBER_FORMATTER.format(numericValue) : '-';
};

const formatAmount = (value: number | null | undefined): string => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? MONEY_FORMATTER.format(numericValue) : '-';
};

const formatDocumentReference = (
  documentSerie: string,
  documentOrderNo: number,
  documentNo?: string | null
): string => {
  const reference = joinText([documentSerie, documentOrderNo], '-');
  const documentNumber = toText(documentNo);

  if (!documentNumber || documentNumber === reference) {
    return reference;
  }

  return `${reference} / ${documentNumber}`;
};

const formatWarehouse = (warehouseNo: number, warehouseName: string): string => {
  const warehouseNoText = Number.isFinite(warehouseNo) && warehouseNo > 0 ? warehouseNo : '';

  return joinText([warehouseNoText, warehouseName], ' - ');
};

const formatWarehouseFlow = (
  sourceWarehouseNo: number,
  sourceWarehouse: string,
  targetWarehouseNo: number,
  targetWarehouse: string
): string => {
  const source = formatWarehouse(sourceWarehouseNo, sourceWarehouse);
  const target = formatWarehouse(targetWarehouseNo, targetWarehouse);

  if (source !== '-' && target !== '-') {
    return `${source} -> ${target}`;
  }

  return source !== '-' ? source : target;
};

const formatCompanyOrderCustomer = (row: IFurpaCompanyOrderListItemApiDto): string => {
  const customerName = row.customerDisplayName || joinText([row.customerName, row.customerTitle], ' ');

  return joinText([row.customerCode, customerName, row.customerAddress]);
};

const formatCompanyOrderQuantity = (row: IFurpaCompanyOrderListItemApiDto): string =>
  joinText([
    `Satir ${formatQuantity(row.lineCount)}`,
    `Toplam ${formatQuantity(row.totalQuantity)}`,
    `Kalan ${formatQuantity(row.totalRemainingQuantity)}`
  ]);

const formatCompanyOrderStatus = (row: IFurpaCompanyOrderListItemApiDto): string => {
  if (row.isClosed) {
    return 'Kapali';
  }

  if (row.totalRemainingQuantity <= 0) {
    return 'Tamamlandi';
  }

  if (row.totalDeliveredQuantity > 0) {
    return 'Kismi';
  }

  return row.canBeCalled ? 'Cagrilabilir' : 'Acik';
};

const formatWarehouseOrderFlow = (row: IFurpaWarehouseOrderListItemApiDto): string => {
  const flow = formatWarehouseFlow(
    row.outWarehouseNo,
    row.outWarehouseName,
    row.inWarehouseNo,
    row.inWarehouseName
  );

  return flow !== '-' ? flow : formatWarehouse(row.relatedWarehouseNo, row.relatedWarehouseName);
};

const formatWarehouseOrderQuantity = (row: IFurpaWarehouseOrderListItemApiDto): string =>
  joinText([`Satir ${formatQuantity(row.lineCount)}`, `Toplam ${formatQuantity(row.totalQuantity)}`]);

const formatCompanyMovementCustomer = (row: IFurpaCompanyMovementListItemApiDto): string => {
  const customerName = row.customerDisplayName || joinText([row.customerName, row.customerTitle], ' ');

  return joinText([row.customerCode, customerName]);
};

const formatCompanyMovementWarehouse = (row: IFurpaCompanyMovementListItemApiDto): string => {
  const flow = formatWarehouseFlow(
    row.outputWarehouseNo,
    row.outputWarehouseName,
    row.inputWarehouseNo,
    row.inputWarehouseName
  );

  return flow !== '-' ? flow : formatWarehouse(row.warehouseNo, row.warehouseName);
};

const formatCompanyMovementQuantity = (row: IFurpaCompanyMovementListItemApiDto): string =>
  joinText([`Satir ${formatQuantity(row.lineCount)}`, `Miktar ${formatQuantity(row.totalQuantity)}`]);

const formatCompanyMovementStatus = (row: IFurpaCompanyMovementListItemApiDto): string =>
  row.documentNo?.trim() ? 'Gonderildi' : 'Taslak';

const formatWarehouseMovementMeta = (row: IFurpaWarehouseShippingListItemApiDto): string =>
  joinText([
    row.plaque ? `Plaka ${row.plaque}` : '',
    row.driverNameSurname ? `Sofor ${row.driverNameSurname}` : ''
  ]);

const formatWarehouseMovementQuantity = (row: IFurpaWarehouseShippingListItemApiDto): string =>
  joinText([`Satir ${formatQuantity(row.lineCount)}`, `Miktar ${formatQuantity(row.totalQuantity)}`]);

const formatWarehouseMovementStatus = (row: IFurpaWarehouseShippingListItemApiDto): string =>
  row.shippingState === 1 ? 'Tamamlandi' : 'Bekliyor';

const formatDifferenceWarehouses = (row: IFurpaGoodsAcceptanceDifferenceApiDto): string =>
  formatWarehouseFlow(
    row.sourceWarehouseNo,
    row.sourceWarehouse,
    row.targetWarehouseNo,
    row.targetWarehouse
  );

const formatDifferenceProduct = (row: IFurpaGoodsAcceptanceDifferenceApiDto): string =>
  joinText([row.productCode, row.productName, row.unitName]);

const formatDifferenceQuantity = (row: IFurpaGoodsAcceptanceDifferenceApiDto): string =>
  joinText([
    `Sevk ${formatQuantity(row.quantity)}`,
    `Kabul ${formatQuantity(row.receivedQuantity)}`,
    `Fark ${formatQuantity(row.differenceQuantity)}`
  ]);

export const FIRMA_SIPARISI_LIST_COLUMNS = [
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  {
    key: 'documentReference',
    label: 'Evrak',
    resolveValue: (row: IFurpaCompanyOrderListItemApiDto) =>
      formatDocumentReference(row.documentSerie, row.documentOrderNo, row.documentNumber)
  },
  {
    key: 'customerSummary',
    label: 'Musteri',
    resolveValue: formatCompanyOrderCustomer
  },
  { key: 'deliveryDate', label: 'Teslim', type: 'date' },
  {
    key: 'quantitySummary',
    label: 'Miktar',
    resolveValue: formatCompanyOrderQuantity
  },
  {
    key: 'orderStatus',
    label: 'Durum',
    type: 'status',
    resolveValue: formatCompanyOrderStatus
  }
] as const satisfies readonly ApiListTableColumn<IFurpaCompanyOrderListItemApiDto>[];

export const DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS = [
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  {
    key: 'documentReference',
    label: 'Evrak',
    resolveValue: (row: IFurpaWarehouseOrderListItemApiDto) =>
      formatDocumentReference(row.documentSerie, row.documentOrderNo, row.documentNumber)
  },
  {
    key: 'warehouseFlow',
    label: 'Depolar',
    resolveValue: formatWarehouseOrderFlow
  },
  { key: 'deliveryDate', label: 'Teslim', type: 'date' },
  {
    key: 'quantitySummary',
    label: 'Miktar',
    resolveValue: formatWarehouseOrderQuantity
  }
] as const satisfies readonly ApiListTableColumn<IFurpaWarehouseOrderListItemApiDto>[];

export const FIRMA_STOK_HAREKETI_LIST_COLUMNS = [
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  {
    key: 'documentReference',
    label: 'Evrak',
    resolveValue: (row: IFurpaCompanyMovementListItemApiDto) =>
      formatDocumentReference(row.documentSerie, row.documentOrderNo, row.documentNo)
  },
  {
    key: 'customerSummary',
    label: 'Cari',
    resolveValue: formatCompanyMovementCustomer
  },
  {
    key: 'warehouseSummary',
    label: 'Depo',
    resolveValue: formatCompanyMovementWarehouse
  },
  {
    key: 'quantitySummary',
    label: 'Miktar',
    resolveValue: formatCompanyMovementQuantity
  },
  {
    key: 'totalAmount',
    label: 'Tutar',
    resolveValue: (row: IFurpaCompanyMovementListItemApiDto) => formatAmount(row.totalAmount)
  },
  {
    key: 'status',
    label: 'Durum',
    type: 'status',
    emptyValue: 'Bilinmiyor',
    resolveValue: formatCompanyMovementStatus
  }
] as const satisfies readonly ApiListTableColumn<IFurpaCompanyMovementListItemApiDto>[];

export const SUBE_ICI_STOK_HAREKETI_LIST_COLUMNS = [
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  {
    key: 'creatorDisplayName',
    label: 'Ekleyen Ad Soyad',
    resolveValue: (row: IFurpaStockReceiptListItemApiDto) => row.creator || row.acceptor
  },
  {
    key: 'movementDate',
    label: 'Tarih',
    type: 'date',
    resolveValue: (row: IFurpaStockReceiptListItemApiDto) => row.documentDate || row.movementDate
  }
] as const satisfies readonly ApiListTableColumn<IFurpaStockReceiptListItemApiDto>[];

export const VIRMAN_STOK_HAREKETI_LIST_COLUMNS = [
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  {
    key: 'movementDate',
    label: 'Tarih',
    type: 'date',
    resolveValue: (row: IFurpaVirmanListItemApiDto) => row.documentDate || row.movementDate
  },
  {
    key: 'lineFlow',
    label: 'C/G Kalem',
    resolveValue: (row: IFurpaVirmanListItemApiDto) =>
      `${row.outgoingLineCount ?? 0} / ${row.incomingLineCount ?? 0}`
  },
  {
    key: 'quantityFlow',
    label: 'C/G Miktar',
    resolveValue: (row: IFurpaVirmanListItemApiDto) =>
      `${row.outgoingQuantity ?? 0} / ${row.incomingQuantity ?? 0}`
  }
] as const satisfies readonly ApiListTableColumn<IFurpaVirmanListItemApiDto>[];

export const SAYIM_SONUCLARI_LIST_COLUMNS = [
  { key: 'documentNo', label: 'Evrak No' },
  {
    key: 'counterName',
    label: 'Sayan Ad Soyad',
    resolveValue: (row: IFurpaInventoryCountListItemApiDto) => row.name || row.warehouseName
  },
  { key: 'documentDate', label: 'Tarih', type: 'date' }
] as const satisfies readonly ApiListTableColumn<IFurpaInventoryCountListItemApiDto>[];

export const buildWarehouseMovementListColumns = (
  _counterpartySide: WarehouseCounterpartySide
): readonly ApiListTableColumn<IFurpaWarehouseShippingListItemApiDto>[] =>
  [
    {
      key: 'movementDate',
      label: 'Tarih',
      type: 'date',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) => row.documentDate || row.movementDate
    },
    {
      key: 'documentReference',
      label: 'Evrak',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        formatDocumentReference(row.documentSerie, row.documentOrderNo, row.documentNo)
    },
    {
      key: 'returnType',
      label: 'Tip',
      type: 'status',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        row.isReturn ? 'Depo Iadesi' : 'Depo Sevki'
    },
    {
      key: 'warehouseFlow',
      label: 'Depolar',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        formatWarehouseFlow(
          row.sourceWarehouseNo,
          row.sourceWarehouse,
          row.targetWarehouseNo,
          row.targetWarehouse
        )
    },
    {
      key: 'shippingMeta',
      label: 'Tasima',
      resolveValue: formatWarehouseMovementMeta
    },
    {
      key: 'quantitySummary',
      label: 'Miktar',
      resolveValue: formatWarehouseMovementQuantity
    },
    {
      key: 'status',
      label: 'Durum',
      type: 'status',
      emptyValue: 'Bilinmiyor',
      resolveValue: formatWarehouseMovementStatus
    }
  ] as const satisfies readonly ApiListTableColumn<IFurpaWarehouseShippingListItemApiDto>[];

export const MAL_KABUL_FARKLARI_LIST_COLUMNS = [
  {
    key: 'movementDate',
    label: 'Tarih',
    type: 'date',
    resolveValue: (row: IFurpaGoodsAcceptanceDifferenceApiDto) =>
      row.documentDate || row.movementDate
  },
  {
    key: 'documentReference',
    label: 'Evrak',
    resolveValue: (row: IFurpaGoodsAcceptanceDifferenceApiDto) =>
      joinText([
        formatDocumentReference(row.documentSerie, row.documentOrderNo, row.documentNo),
        `Satir ${formatQuantity(row.lineNo)}`
      ])
  },
  {
    key: 'returnType',
    label: 'Tip',
    type: 'status',
    resolveValue: (row: IFurpaGoodsAcceptanceDifferenceApiDto) =>
      row.isReturn ? 'Depo Iadesi' : 'Depo Sevki'
  },
  {
    key: 'warehouseFlow',
    label: 'Depolar',
    resolveValue: formatDifferenceWarehouses
  },
  {
    key: 'productSummary',
    label: 'Urun',
    resolveValue: formatDifferenceProduct
  },
  {
    key: 'quantitySummary',
    label: 'Miktar',
    resolveValue: formatDifferenceQuantity
  },
  {
    key: 'differenceType',
    label: 'Fark',
    type: 'status',
    resolveValue: (row: IFurpaGoodsAcceptanceDifferenceApiDto) => {
      if (row.differenceType === 'missing') {
        return 'Eksik';
      }

      if (row.differenceType === 'excess') {
        return 'Fazla';
      }

      return row.differenceType || 'Bilinmiyor';
    }
  }
] as const satisfies readonly ApiListTableColumn<IFurpaGoodsAcceptanceDifferenceApiDto>[];
