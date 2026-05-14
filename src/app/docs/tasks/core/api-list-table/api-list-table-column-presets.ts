import type {
  IFurpaCompanyOrderListItemApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaInventoryCountListItemApiDto,
  IFurpaStockReceiptListItemApiDto,
  IFurpaVirmanListItemApiDto,
  IFurpaWarehouseOrderListItemApiDto,
  IFurpaWarehouseShippingListItemApiDto,
} from '@interfaces';

import type { ApiListTableColumn } from './api-list-table.types';

type WarehouseCounterpartySide = 'source' | 'target';

export const FIRMA_SIPARISI_LIST_COLUMNS = [
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  { key: 'customerDisplayName', label: 'Musteri' },
  { key: 'customerAddress', label: 'Adres' },
  { key: 'lineCount', label: 'Satir' },
  { key: 'totalQuantity', label: 'Toplam Miktar' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' }
] as const satisfies readonly ApiListTableColumn<IFurpaCompanyOrderListItemApiDto>[];

export const DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS = [
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  { key: 'relatedWarehouseName', label: 'Ilgili Depo' },
  { key: 'lineCount', label: 'Satir' },
  { key: 'totalQuantity', label: 'Toplam Miktar' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' }
] as const satisfies readonly ApiListTableColumn<IFurpaWarehouseOrderListItemApiDto>[];

export const FIRMA_STOK_HAREKETI_LIST_COLUMNS = [
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  { key: 'documentNo', label: 'Belge No' },
  { key: 'customerCode', label: 'Cari Kod' },
  {
    key: 'customerDisplayName',
    label: 'Firma',
    resolveValue: (row: IFurpaCompanyMovementListItemApiDto) =>
      row.customerDisplayName || [row.customerName, row.customerTitle].filter(Boolean).join(' ')
  },
  { key: 'documentDate', label: 'Tarih', type: 'date' },
  {
    key: 'status',
    label: 'Durum',
    type: 'status',
    emptyValue: 'Bilinmiyor',
    resolveValue: (row: IFurpaCompanyMovementListItemApiDto) =>
      row.documentNo?.trim() ? 'Gonderildi' : 'Taslak'
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
  { key: 'documentNo', label: 'Belge No' },
  { key: 'warehouseNo', label: 'Muhatap Depo No' },
  { key: 'warehouseName', label: 'Muhatap Depo' },
  { key: 'description', label: 'Muhatap' },
  {
    key: 'movementDate',
    label: 'Tarih',
    type: 'date',
    resolveValue: (row: IFurpaVirmanListItemApiDto) => row.documentDate || row.movementDate
  },
  {
    key: 'status',
    label: 'Durum',
    type: 'status',
    emptyValue: 'Bilinmiyor',
    resolveValue: () => 'Hazir'
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
  counterpartySide: WarehouseCounterpartySide
): readonly ApiListTableColumn<IFurpaWarehouseShippingListItemApiDto>[] =>
  [
    { key: 'documentSerie', label: 'Seri' },
    { key: 'documentOrderNo', label: 'Sira' },
    { key: 'documentNo', label: 'Belge No' },
    {
      key: 'counterpartyWarehouseNo',
      label: 'Muhatap Depo No',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        counterpartySide === 'source' ? row.sourceWarehouseNo : row.targetWarehouseNo
    },
    {
      key: 'counterpartyWarehouse',
      label: 'Muhatap Depo',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        counterpartySide === 'source' ? row.sourceWarehouse : row.targetWarehouse
    },
    {
      key: 'counterpartyName',
      label: 'Muhatap',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        counterpartySide === 'source' ? row.sourceWarehouse : row.targetWarehouse
    },
    {
      key: 'movementDate',
      label: 'Tarih',
      type: 'date',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) => row.documentDate || row.movementDate
    },
    {
      key: 'status',
      label: 'Durum',
      type: 'status',
      emptyValue: 'Bilinmiyor',
      resolveValue: (row: IFurpaWarehouseShippingListItemApiDto) =>
        row.shippingState === 1 ? 'Tamamlandi' : 'Bekliyor'
    }
  ] as const satisfies readonly ApiListTableColumn<IFurpaWarehouseShippingListItemApiDto>[];
