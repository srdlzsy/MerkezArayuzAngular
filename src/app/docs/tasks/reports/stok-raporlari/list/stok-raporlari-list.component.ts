import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map } from 'rxjs';
import type {
  BranchSalesReportItemDto,
  CategoryStockOnHandHttpRequest,
  CountingComparisonReportHttpRequest,
  CountingComparisonReportItemDto,
  FilteredDateRangeReportHttpRequest,
  MovementInOutComparisonDto,
  NotSoldProductReportHttpRequest,
  NotSoldProductReportItemDto,
  ProducerStockOnHandHttpRequest,
  ProductWarehouseStockDto,
  ProductWarehouseStockHttpRequest,
  ProfitabilityReportHttpRequest,
  ProfitabilityReportItemDto,
  ReportStockCardDetailHttpRequest,
  ReturnBranchReportHttpRequest,
  ReturnBranchReportItemDto,
  StockCardDetailDto,
  StockMovementReportHttpRequest,
  StockMovementReportItemDto,
  StockOnHandReportDto,
  StockOnHandReportHttpRequest,
  StockOnHandReportItemDto,
  SupplierStockOnHandHttpRequest,
  WarehouseMissingStockDto,
  WarehouseMissingStockHttpRequest,
  WarehouseZeroStockDto,
  WarehouseZeroStockHttpRequest,
  YearSalesComparisonItemDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserIsAdmin,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../../../core/admin-warehouse.helpers';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type StockReportKey =
  | 'son-stok'
  | 'tedarikci-son-stok'
  | 'kategori-son-stok'
  | 'uretici-son-stok'
  | 'envanter-degeri'
  | 'urun-depo-durum'
  | 'stok-kartlari'
  | 'depoda-var-subede-yok'
  | 'depo-sifir-stok'
  | 'hareketler'
  | 'giris-cikis-karsilastirma'
  | 'satis-sube-detay'
  | 'satis-yil-karsilastirma'
  | 'iadeler-subeler'
  | 'satmayan-urunler'
  | 'karlilik'
  | 'sayim-karsilastirma';

type StockReportMode = 'snapshot' | 'date-range' | 'count-date';
type StockReportScope = 'all' | 'current' | 'manual';

interface StockReportDefinition {
  key: StockReportKey;
  group: string;
  label: string;
  description: string;
  endpoint: string;
  mode: StockReportMode;
  columns: readonly ApiListTableColumn[];
  requiresWarehouse?: boolean;
  primaryLabel?: string;
  primaryPlaceholder?: string;
}

interface StockReportMetric {
  label: string;
  value: string;
}

interface StockReportLoadResult {
  rows: readonly object[];
  metrics: readonly StockReportMetric[];
  note?: string;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

const INTEGER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0
});

const MONEY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const PERCENT_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const FILTER_TYPES = [
  { value: 'stock', label: 'Stok' },
  { value: 'category', label: 'Kategori' },
  { value: 'producer', label: 'Uretici' },
  { value: 'supplier', label: 'Tedarikci' },
  { value: 'product-manager', label: 'Satin Almaci' },
  { value: 'model', label: 'Model' }
] as const;

const PROFIT_SCOPES = [
  { value: 'producer', label: 'Uretici' },
  { value: 'supplier', label: 'Tedarikci' },
  { value: 'product-manager', label: 'Satin Almaci' },
  { value: 'category', label: 'Kategori' },
  { value: 'stock', label: 'Stok' }
] as const;

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value.replace(',', '.'));

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
}

function formatNumber(value: unknown): string {
  return NUMBER_FORMATTER.format(toSafeNumber(value));
}

function formatInteger(value: unknown): string {
  return INTEGER_FORMATTER.format(toSafeNumber(value));
}

function formatMoney(value: unknown): string {
  return `${MONEY_FORMATTER.format(toSafeNumber(value))} TL`;
}

function formatPercent(value: unknown): string {
  return PERCENT_FORMATTER.format(toSafeNumber(value));
}

function formatDateOnly(value: string | null | undefined): string {
  const textValue = value?.trim() ?? '';
  return textValue.includes('T') ? textValue.split('T')[0] ?? textValue : textValue || '-';
}

function formatWarehouse(row: {
  warehouseName?: string | null;
  warehouseNo?: number | null;
  branchName?: string | null;
  branchNo?: number | null;
}): string {
  const name = row.warehouseName?.trim() || row.branchName?.trim() || '';
  const no = row.warehouseNo ?? row.branchNo;

  if (name && Number.isFinite(no)) {
    return `${name} (${no})`;
  }

  if (name) {
    return name;
  }

  return Number.isFinite(no) ? `Depo ${no}` : '-';
}

function formatStock(row: { stockCode?: string | null; stockName?: string | null; name?: string | null }): string {
  const name = row.stockName?.trim() || row.name?.trim() || '';
  const code = row.stockCode?.trim() || '';

  if (name && code) {
    return `${name} (${code})`;
  }

  return name || code || '-';
}

function sumBy<Row>(rows: readonly Row[], selector: (row: Row) => unknown): number {
  return rows.reduce((total, row) => total + toSafeNumber(selector(row)), 0);
}

const ON_HAND_COLUMNS: readonly ApiListTableColumn<StockOnHandReportItemDto>[] = [
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'unitName', label: 'Birim' },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'salesPrice', label: 'Satis', resolveValue: (row) => formatMoney(row.salesPrice) },
  {
    key: 'salesValue',
    label: 'Deger',
    resolveValue: (row) => formatMoney(row.salesValue ?? row.totalSalesValue)
  },
  {
    key: 'supplierName',
    label: 'Tedarikci',
    resolveValue: (row) => row.supplierName || row.supplierCode || '-'
  },
  {
    key: 'categoryName',
    label: 'Kategori',
    resolveValue: (row) => row.categoryName || row.categoryCode || '-'
  }
];

const PRODUCT_WAREHOUSE_COLUMNS: readonly ApiListTableColumn<ProductWarehouseStockDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  { key: 'unitName', label: 'Birim' },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'salesPrice', label: 'Satis', resolveValue: (row) => formatMoney(row.salesPrice) },
  { key: 'salesValue', label: 'Deger', resolveValue: (row) => formatMoney(row.salesValue) },
  { key: 'lastMovementDate', label: 'Son Hareket', resolveValue: (row) => formatDateOnly(row.lastMovementDate) }
];

const STOCK_CARD_COLUMNS: readonly ApiListTableColumn<StockCardDetailDto>[] = [
  { key: 'stockCode', label: 'Stok Kodu' },
  { key: 'name', label: 'Stok Adi' },
  { key: 'shortName', label: 'Kisa Ad' },
  { key: 'supplierCode', label: 'Tedarikci' },
  { key: 'categoryCode', label: 'Kategori' },
  { key: 'mainGroupCode', label: 'Ana Grup' },
  { key: 'subGroupCode', label: 'Alt Grup' },
  { key: 'unit1Name', label: 'Birim' },
  {
    key: 'isPassive',
    label: 'Durum',
    type: 'status',
    resolveValue: (row) => (row.isPassive ? 'Pasif' : 'Aktif')
  }
];

const MISSING_STOCK_COLUMNS: readonly ApiListTableColumn<WarehouseMissingStockDto>[] = [
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  {
    key: 'sourceWarehouseName',
    label: 'Kaynak',
    resolveValue: (row) =>
      formatWarehouse({ warehouseName: row.sourceWarehouseName, warehouseNo: row.sourceWarehouseNo })
  },
  {
    key: 'targetWarehouseName',
    label: 'Hedef',
    resolveValue: (row) =>
      formatWarehouse({ warehouseName: row.targetWarehouseName, warehouseNo: row.targetWarehouseNo })
  },
  { key: 'sourceQuantity', label: 'Kaynak Miktar', resolveValue: (row) => formatNumber(row.sourceQuantity) },
  { key: 'targetQuantity', label: 'Hedef Miktar', resolveValue: (row) => formatNumber(row.targetQuantity) },
  { key: 'salesValue', label: 'Deger', resolveValue: (row) => formatMoney(row.salesValue) },
  { key: 'modelName', label: 'Model', resolveValue: (row) => row.modelName || row.modelCode || '-' }
];

const ZERO_STOCK_COLUMNS: readonly ApiListTableColumn<WarehouseZeroStockDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  { key: 'unitName', label: 'Birim' },
  { key: 'salesPrice', label: 'Satis', resolveValue: (row) => formatMoney(row.salesPrice) },
  { key: 'modelName', label: 'Model', resolveValue: (row) => row.modelName || row.modelCode || '-' },
  { key: 'lastMovementDate', label: 'Son Hareket', resolveValue: (row) => formatDateOnly(row.lastMovementDate) }
];

const MOVEMENT_COLUMNS: readonly ApiListTableColumn<StockMovementReportItemDto>[] = [
  { key: 'movementDate', label: 'Hareket', type: 'date' },
  { key: 'documentDate', label: 'Belge', type: 'date' },
  {
    key: 'documentSerie',
    label: 'Evrak',
    resolveValue: (row) => [row.documentSerie, row.documentOrderNo].filter(Boolean).join(' / ') || row.documentNo || '-'
  },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'customerName', label: 'Cari', resolveValue: (row) => row.customerName || row.customerCode || '-' },
  { key: 'movementName', label: 'Hareket Tipi', resolveValue: (row) => row.movementName || row.movementType || '-' },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatMoney(row.amount) }
];

const IN_OUT_COLUMNS: readonly ApiListTableColumn<MovementInOutComparisonDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'inputQuantity', label: 'Giris', resolveValue: (row) => formatNumber(row.inputQuantity) },
  { key: 'outputQuantity', label: 'Cikis', resolveValue: (row) => formatNumber(row.outputQuantity) },
  { key: 'netQuantity', label: 'Net', resolveValue: (row) => formatNumber(row.netQuantity) },
  { key: 'inputAmount', label: 'Giris Tutar', resolveValue: (row) => formatMoney(row.inputAmount) },
  { key: 'outputAmount', label: 'Cikis Tutar', resolveValue: (row) => formatMoney(row.outputAmount) },
  { key: 'netAmount', label: 'Net Tutar', resolveValue: (row) => formatMoney(row.netAmount) }
];

const BRANCH_SALES_COLUMNS: readonly ApiListTableColumn<BranchSalesReportItemDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'netSalesAmount', label: 'Net Satis', resolveValue: (row) => formatMoney(row.netSalesAmount) },
  { key: 'grossSalesAmount', label: 'Brut Satis', resolveValue: (row) => formatMoney(row.grossSalesAmount) },
  { key: 'receiptCount', label: 'Fis', resolveValue: (row) => formatInteger(row.receiptCount) }
];

const YEAR_SALES_COLUMNS: readonly ApiListTableColumn<YearSalesComparisonItemDto>[] = [
  { key: 'groupName', label: 'Kirilim', resolveValue: (row) => row.groupName || row.groupCode || formatStock(row) },
  { key: 'currentYearQuantity', label: 'Bu Yil Miktar', resolveValue: (row) => formatNumber(row.currentYearQuantity) },
  { key: 'previousYearQuantity', label: 'Gecen Yil Miktar', resolveValue: (row) => formatNumber(row.previousYearQuantity) },
  { key: 'quantityDifference', label: 'Miktar Fark', resolveValue: (row) => formatNumber(row.quantityDifference) },
  { key: 'currentYearAmount', label: 'Bu Yil', resolveValue: (row) => formatMoney(row.currentYearAmount) },
  { key: 'previousYearAmount', label: 'Gecen Yil', resolveValue: (row) => formatMoney(row.previousYearAmount) },
  { key: 'amountDifference', label: 'Tutar Fark', resolveValue: (row) => formatMoney(row.amountDifference) },
  { key: 'changePercent', label: 'Degisim', resolveValue: (row) => formatPercent(row.changePercent) }
];

const RETURN_COLUMNS: readonly ApiListTableColumn<ReturnBranchReportItemDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'customerName', label: 'Cari', resolveValue: (row) => row.customerName || row.customerCode || '-' },
  { key: 'quantity', label: 'Iade Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'amount', label: 'Iade Tutar', resolveValue: (row) => formatMoney(row.amount) },
  { key: 'documentCount', label: 'Belge', resolveValue: (row) => formatInteger(row.documentCount) }
];

const NOT_SOLD_COLUMNS: readonly ApiListTableColumn<NotSoldProductReportItemDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  {
    key: 'productManagerName',
    label: 'Satin Almaci',
    resolveValue: (row) => row.productManagerName || row.productManagerCode || '-'
  },
  { key: 'quantity', label: 'Stok', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'salesPrice', label: 'Satis', resolveValue: (row) => formatMoney(row.salesPrice) },
  { key: 'salesValue', label: 'Deger', resolveValue: (row) => formatMoney(row.salesValue) },
  { key: 'lastSaleDate', label: 'Son Satis', resolveValue: (row) => formatDateOnly(row.lastSaleDate) }
];

const PROFITABILITY_COLUMNS: readonly ApiListTableColumn<ProfitabilityReportItemDto>[] = [
  { key: 'groupName', label: 'Kirilim', resolveValue: (row) => row.groupName || row.groupCode || '-' },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'netSalesAmount', label: 'Net Satis', resolveValue: (row) => formatMoney(row.netSalesAmount) },
  { key: 'grossSalesAmount', label: 'Brut Satis', resolveValue: (row) => formatMoney(row.grossSalesAmount) },
  { key: 'estimatedCostAmount', label: 'Tahmini Maliyet', resolveValue: (row) => formatMoney(row.estimatedCostAmount) },
  { key: 'marginAmount', label: 'Marj', resolveValue: (row) => formatMoney(row.marginAmount) },
  { key: 'marginPercent', label: 'Marj %', resolveValue: (row) => formatPercent(row.marginPercent) }
];

const COUNTING_COLUMNS: readonly ApiListTableColumn<CountingComparisonReportItemDto>[] = [
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => formatWarehouse(row) },
  { key: 'stockName', label: 'Stok', resolveValue: (row) => formatStock(row) },
  { key: 'barcode', label: 'Barkod' },
  { key: 'packageCode', label: 'Paket' },
  { key: 'systemQuantity', label: 'Sistem', resolveValue: (row) => formatNumber(row.systemQuantity) },
  { key: 'countedQuantity', label: 'Sayim', resolveValue: (row) => formatNumber(row.countedQuantity) },
  { key: 'differenceQuantity', label: 'Fark', resolveValue: (row) => formatNumber(row.differenceQuantity) },
  { key: 'differenceValue', label: 'Fark Deger', resolveValue: (row) => formatMoney(row.differenceValue) }
];

const REPORT_DEFINITIONS: readonly StockReportDefinition[] = [
  {
    key: 'son-stok',
    group: 'Stok',
    label: 'Son Stok',
    description: 'Secili depo icin anlik stok miktari ve satis degeri.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/son-stok',
    mode: 'snapshot',
    columns: ON_HAND_COLUMNS,
    requiresWarehouse: true
  },
  {
    key: 'tedarikci-son-stok',
    group: 'Stok',
    label: 'Tedarikci Son Stok',
    description: 'Tedarikci kodu ile filtrelenen depo stok durumu.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/tedarikci-son-stok',
    mode: 'snapshot',
    columns: ON_HAND_COLUMNS,
    requiresWarehouse: true,
    primaryLabel: 'Tedarikci Kodu',
    primaryPlaceholder: '120.01.03106'
  },
  {
    key: 'kategori-son-stok',
    group: 'Stok',
    label: 'Kategori Son Stok',
    description: 'Kategori kodu bazli depo stok durumu.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/kategori-son-stok',
    mode: 'snapshot',
    columns: ON_HAND_COLUMNS,
    requiresWarehouse: true,
    primaryLabel: 'Kategori Kodu',
    primaryPlaceholder: 'Kategori kodu'
  },
  {
    key: 'uretici-son-stok',
    group: 'Stok',
    label: 'Uretici Son Stok',
    description: 'Uretici kodu ile filtrelenen depo stok durumu.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/uretici-son-stok',
    mode: 'snapshot',
    columns: ON_HAND_COLUMNS,
    requiresWarehouse: true,
    primaryLabel: 'Uretici Kodu',
    primaryPlaceholder: 'Uretici kodu'
  },
  {
    key: 'envanter-degeri',
    group: 'Stok',
    label: 'Envanter Degeri',
    description: 'Son stok modelini deger odakli ozetlerle getirir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/envanter-degeri',
    mode: 'snapshot',
    columns: ON_HAND_COLUMNS,
    requiresWarehouse: true
  },
  {
    key: 'urun-depo-durum',
    group: 'Stok',
    label: 'Urun Depo Durum',
    description: 'Tek urunun depolar/subeler bazindaki miktar ve satis degeri.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/urun-depo-durum',
    mode: 'snapshot',
    columns: PRODUCT_WAREHOUSE_COLUMNS,
    primaryLabel: 'Stok Kodu / Barkod',
    primaryPlaceholder: '015550 veya barkod'
  },
  {
    key: 'stok-kartlari',
    group: 'Kart',
    label: 'Stok Kartlari',
    description: 'Stok kartlarini kod, barkod, ad, tedarikci ve satin almaci ile listeler.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/stok-kartlari',
    mode: 'snapshot',
    columns: STOCK_CARD_COLUMNS,
    primaryLabel: 'Stok Kodu',
    primaryPlaceholder: 'Opsiyonel stok kodu'
  },
  {
    key: 'depoda-var-subede-yok',
    group: 'Depo',
    label: 'Depoda Var Subede Yok',
    description: 'Kaynak depoda mevcut, hedef subede bulunmayan urunleri gosterir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/depoda-var-subede-yok',
    mode: 'snapshot',
    columns: MISSING_STOCK_COLUMNS,
    primaryLabel: 'Arama',
    primaryPlaceholder: 'Urun adi veya kod'
  },
  {
    key: 'depo-sifir-stok',
    group: 'Depo',
    label: 'Depo Sifir Stok',
    description: 'Secili depoda sistem miktari sifir olan urunler.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/depo-sifir-stok',
    mode: 'snapshot',
    columns: ZERO_STOCK_COLUMNS,
    requiresWarehouse: true
  },
  {
    key: 'hareketler',
    group: 'Hareket',
    label: 'Hareketler',
    description: 'Stok hareketlerini tarih araligi ve stok kodu ile listeler.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/hareketler',
    mode: 'date-range',
    columns: MOVEMENT_COLUMNS,
    primaryLabel: 'Stok Kodu',
    primaryPlaceholder: 'Opsiyonel stok kodu'
  },
  {
    key: 'giris-cikis-karsilastirma',
    group: 'Hareket',
    label: 'Giris Cikis',
    description: 'Giris/cikis miktar ve tutarlarini filtre kirilimiyle karsilastirir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/giris-cikis-karsilastirma',
    mode: 'date-range',
    columns: IN_OUT_COLUMNS
  },
  {
    key: 'satis-sube-detay',
    group: 'Satis',
    label: 'Sube Satis',
    description: 'Satislari sube, stok ve tutar kirilimlariyla listeler.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/satislar/sube-detay',
    mode: 'date-range',
    columns: BRANCH_SALES_COLUMNS
  },
  {
    key: 'satis-yil-karsilastirma',
    group: 'Satis',
    label: 'Yil Karsilastirma',
    description: 'Secili araligi onceki yil degerleriyle karsilastirir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/satislar/yil-karsilastirma',
    mode: 'date-range',
    columns: YEAR_SALES_COLUMNS
  },
  {
    key: 'iadeler-subeler',
    group: 'Iade',
    label: 'Sube Iadeleri',
    description: 'Zorunlu stok kodu ile sube iade hareketlerini getirir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/iadeler/subeler',
    mode: 'date-range',
    columns: RETURN_COLUMNS,
    primaryLabel: 'Stok Kodu',
    primaryPlaceholder: 'Zorunlu stok kodu'
  },
  {
    key: 'satmayan-urunler',
    group: 'Satis',
    label: 'Satmayan Urunler',
    description: 'Secili aralikta satisi olmayan urunleri listeler.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/satislar/satmayan-urunler',
    mode: 'date-range',
    columns: NOT_SOLD_COLUMNS,
    primaryLabel: 'Satin Almaci Kodu',
    primaryPlaceholder: 'Opsiyonel kod'
  },
  {
    key: 'karlilik',
    group: 'Satis',
    label: 'Karlilik',
    description: 'Uretici, tedarikci, satin almaci, kategori veya stok bazli karlilik.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/karlilik',
    mode: 'date-range',
    columns: PROFITABILITY_COLUMNS,
    primaryLabel: 'Filtre Degeri',
    primaryPlaceholder: 'Opsiyonel kod/deger'
  },
  {
    key: 'sayim-karsilastirma',
    group: 'Sayim',
    label: 'Sayim Karsilastirma',
    description: 'Sayim gunu icin sistem ve sayim miktari farklarini gosterir.',
    endpoint: '/api/rapor-islemleri/stok-raporlari/sayim-karsilastirma',
    mode: 'count-date',
    columns: COUNTING_COLUMNS,
    requiresWarehouse: true
  }
];

@Component({
  selector: 'app-stok-raporlari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './stok-raporlari-list.component.html',
  styleUrl: './stok-raporlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StokRaporlariListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['stok-raporlari'];
  protected readonly reportDefinitions = REPORT_DEFINITIONS;
  protected readonly filterTypes = FILTER_TYPES;
  protected readonly profitScopes = PROFIT_SCOPES;
  protected readonly selectedReport = signal<StockReportKey>('son-stok');
  protected readonly startDate = signal(this.getRelativeDate(-6));
  protected readonly endDate = signal(this.getToday());
  protected readonly reportDate = signal(this.getToday());
  protected readonly countDate = signal(this.getToday());
  protected readonly scope = signal<StockReportScope>('current');
  protected readonly manualWarehouseNo = signal('');
  protected readonly sourceWarehouseNo = signal('');
  protected readonly targetWarehouseNo = signal('');
  protected readonly primaryCode = signal('');
  protected readonly searchText = signal('');
  protected readonly modelCode = signal('');
  protected readonly filterType = signal<(typeof FILTER_TYPES)[number]['value']>('stock');
  protected readonly profitScope = signal<(typeof PROFIT_SCOPES)[number]['value']>('producer');
  protected readonly onlyWithStock = signal(true);
  protected readonly includeDls = signal(false);
  protected readonly take = signal(250);
  protected readonly rows = signal<readonly object[]>([]);
  protected readonly metrics = signal<readonly StockReportMetric[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);
  protected readonly resultNote = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly raporIslemleriService = inject(RaporIslemleriService);
  private activeRequestId = 0;

  protected readonly selectedDefinition = computed(
    () =>
      this.reportDefinitions.find((report) => report.key === this.selectedReport()) ??
      this.reportDefinitions[0]
  );
  protected readonly tableColumns = computed(() => this.selectedDefinition().columns);
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
  protected readonly canSelectAllWarehouses = computed(
    () => this.isAdminUser() && !this.selectedDefinition().requiresWarehouse
  );
  protected readonly usesDateRange = computed(() => this.selectedDefinition().mode === 'date-range');
  protected readonly usesSnapshotDate = computed(() => this.selectedDefinition().mode === 'snapshot');
  protected readonly usesCountDate = computed(() => this.selectedDefinition().mode === 'count-date');
  protected readonly usesFilterType = computed(() =>
    [
      'giris-cikis-karsilastirma',
      'satis-sube-detay',
      'satis-yil-karsilastirma'
    ].includes(this.selectedReport())
  );
  protected readonly usesProfitScope = computed(() => this.selectedReport() === 'karlilik');
  protected readonly usesMissingWarehouseFilters = computed(
    () => this.selectedReport() === 'depoda-var-subede-yok'
  );
  protected readonly primaryLabel = computed(() => this.selectedDefinition().primaryLabel ?? '');
  protected readonly primaryPlaceholder = computed(
    () => this.selectedDefinition().primaryPlaceholder ?? 'Kod veya filtre'
  );
  protected readonly selectedDateLabel = computed(() => {
    if (this.usesDateRange()) {
      return `${this.startDate() || 'YYYY-MM-DD'} - ${this.endDate() || 'YYYY-MM-DD'}`;
    }

    if (this.usesCountDate()) {
      return this.countDate() || 'YYYY-MM-DD';
    }

    return this.reportDate() || 'YYYY-MM-DD';
  });
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly scopeLabel = computed(() => {
    if (!this.isAdminUser()) {
      return this.currentWarehouseLabel();
    }

    switch (this.scope()) {
      case 'all':
        return 'Tum Depolar';
      case 'manual': {
        const warehouseNo = this.getManualWarehouseNo();
        return warehouseNo ? `Depo ${warehouseNo}` : 'Depo no bekleniyor';
      }
      case 'current':
      default:
        return this.currentWarehouseLabel();
    }
  });
  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly requestPreview = computed(() => {
    const params = this.buildRequestPreviewParams();
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }

    const queryText = query.toString();
    return queryText ? `${this.selectedDefinition().endpoint}?${queryText}` : this.selectedDefinition().endpoint;
  });

  ngOnInit(): void {
    this.loadRows();
  }

  protected selectReport(reportKey: StockReportKey): void {
    if (this.selectedReport() === reportKey) {
      return;
    }

    this.selectedReport.set(reportKey);

    if (this.selectedDefinition().requiresWarehouse && this.scope() === 'all') {
      this.scope.set('current');
    }

    this.rows.set([]);
    this.metrics.set([]);
    this.resultNote.set(null);
    this.loadRows();
  }

  protected selectScope(scope: StockReportScope): void {
    if (scope === 'all' && !this.canSelectAllWarehouses()) {
      return;
    }

    this.scope.set(scope);

    if (scope !== 'manual' || this.getManualWarehouseNo()) {
      this.loadRows();
    }
  }

  protected updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  protected updateEndDate(value: string): void {
    this.endDate.set(value);
  }

  protected updateReportDate(value: string): void {
    this.reportDate.set(value);
  }

  protected updateCountDate(value: string): void {
    this.countDate.set(value);
  }

  protected updateManualWarehouseNo(value: string): void {
    this.manualWarehouseNo.set(value);
  }

  protected updateSourceWarehouseNo(value: string): void {
    this.sourceWarehouseNo.set(value);
  }

  protected updateTargetWarehouseNo(value: string): void {
    this.targetWarehouseNo.set(value);
  }

  protected updatePrimaryCode(value: string): void {
    this.primaryCode.set(value);
  }

  protected updateSearchText(value: string): void {
    this.searchText.set(value);
  }

  protected updateModelCode(value: string): void {
    this.modelCode.set(value);
  }

  protected updateFilterType(value: string): void {
    if (FILTER_TYPES.some((option) => option.value === value)) {
      this.filterType.set(value as (typeof FILTER_TYPES)[number]['value']);
    }
  }

  protected updateProfitScope(value: string): void {
    if (PROFIT_SCOPES.some((option) => option.value === value)) {
      this.profitScope.set(value as (typeof PROFIT_SCOPES)[number]['value']);
    }
  }

  protected updateOnlyWithStock(value: boolean): void {
    this.onlyWithStock.set(value);
  }

  protected updateIncludeDls(value: boolean): void {
    this.includeDls.set(value);
  }

  protected updateTake(value: string | number): void {
    this.take.set(this.toLimitedNumber(value, 1, 1000, 250));
  }

  protected loadRows(): void {
    if (!this.validateRequest()) {
      return;
    }

    const requestId = ++this.activeRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resultNote.set(null);

    this.fetchSelectedReport()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (result: StockReportLoadResult) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set(result.rows ?? []);
          this.metrics.set(result.metrics ?? []);
          this.resultNote.set(result.note ?? null);
          this.lastLoadedAt.set(new Date().toISOString());
        },
        error: (error: unknown) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set([]);
          this.metrics.set([]);
          this.errorMessage.set(getErrorMessage(error, `${this.selectedDefinition().label} raporu yuklenemedi.`));
        }
      });
  }

  protected formatDate(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: textValue.includes('T') ? 'short' : undefined
    }).format(date);
  }

  protected readonly trackByReport = (_index: number, report: StockReportDefinition): string =>
    report.key;
  protected readonly trackByMetric = (_index: number, metric: StockReportMetric): string =>
    metric.label;
  protected readonly trackByFilter = (
    _index: number,
    option: (typeof FILTER_TYPES)[number] | (typeof PROFIT_SCOPES)[number]
  ): string => option.value;

  private fetchSelectedReport(): Observable<StockReportLoadResult> {
    switch (this.selectedReport()) {
      case 'tedarikci-son-stok':
        return this.raporIslemleriService
          .getSupplierStockOnHandReport(this.buildSupplierOnHandRequest())
          .pipe(map((report: StockOnHandReportDto) => this.buildOnHandResult(report)));
      case 'kategori-son-stok':
        return this.raporIslemleriService
          .getCategoryStockOnHandReport(this.buildCategoryOnHandRequest())
          .pipe(map((report: StockOnHandReportDto) => this.buildOnHandResult(report)));
      case 'uretici-son-stok':
        return this.raporIslemleriService
          .getProducerStockOnHandReport(this.buildProducerOnHandRequest())
          .pipe(map((report: StockOnHandReportDto) => this.buildOnHandResult(report)));
      case 'envanter-degeri':
        return this.raporIslemleriService
          .getInventoryValueReport(this.buildOnHandRequest())
          .pipe(
            map((report: StockOnHandReportDto) =>
              this.buildOnHandResult(report, 'Envanter degeri satis fiyatlariyla hesaplanir.')
            )
          );
      case 'urun-depo-durum':
        return this.raporIslemleriService
          .getProductWarehouseStockReport(this.buildProductWarehouseRequest())
          .pipe(map((rows: ProductWarehouseStockDto[]) => this.buildProductWarehouseResult(rows ?? [])));
      case 'stok-kartlari':
        return this.raporIslemleriService
          .getReportStockCards(this.buildStockCardRequest())
          .pipe(map((rows: StockCardDetailDto[]) => this.buildStockCardResult(rows ?? [])));
      case 'depoda-var-subede-yok':
        return this.raporIslemleriService
          .getWarehouseMissingStockReport(this.buildWarehouseMissingRequest())
          .pipe(map((rows: WarehouseMissingStockDto[]) => this.buildMissingStockResult(rows ?? [])));
      case 'depo-sifir-stok':
        return this.raporIslemleriService
          .getWarehouseZeroStockReport(this.buildWarehouseZeroRequest())
          .pipe(map((rows: WarehouseZeroStockDto[]) => this.buildZeroStockResult(rows ?? [])));
      case 'hareketler':
        return this.raporIslemleriService
          .getStockMovementReport(this.buildMovementRequest())
          .pipe(map((rows: StockMovementReportItemDto[]) => this.buildMovementResult(rows ?? [])));
      case 'giris-cikis-karsilastirma':
        return this.raporIslemleriService
          .getMovementInOutComparisonReport(this.buildFilteredDateRangeRequest())
          .pipe(map((rows: MovementInOutComparisonDto[]) => this.buildInOutResult(rows ?? [])));
      case 'satis-sube-detay':
        return this.raporIslemleriService
          .getBranchSalesReport(this.buildFilteredDateRangeRequest())
          .pipe(map((rows: BranchSalesReportItemDto[]) => this.buildBranchSalesResult(rows ?? [])));
      case 'satis-yil-karsilastirma':
        return this.raporIslemleriService
          .getYearSalesComparisonReport(this.buildFilteredDateRangeRequest())
          .pipe(map((rows: YearSalesComparisonItemDto[]) => this.buildYearSalesResult(rows ?? [])));
      case 'iadeler-subeler':
        return this.raporIslemleriService
          .getReturnBranchReport(this.buildReturnBranchRequest())
          .pipe(map((rows: ReturnBranchReportItemDto[]) => this.buildReturnResult(rows ?? [])));
      case 'satmayan-urunler':
        return this.raporIslemleriService
          .getNotSoldProductReport(this.buildNotSoldRequest())
          .pipe(map((rows: NotSoldProductReportItemDto[]) => this.buildNotSoldResult(rows ?? [])));
      case 'karlilik':
        return this.raporIslemleriService
          .getProfitabilityReport(this.buildProfitabilityRequest())
          .pipe(map((rows: ProfitabilityReportItemDto[]) => this.buildProfitabilityResult(rows ?? [])));
      case 'sayim-karsilastirma':
        return this.raporIslemleriService
          .getCountingComparisonReport(this.buildCountingRequest())
          .pipe(
            map((rows: CountingComparisonReportItemDto[]) =>
              this.buildCountingResult(rows ?? [])
            )
          );
      case 'son-stok':
      default:
        return this.raporIslemleriService
          .getStockOnHandReport(this.buildOnHandRequest())
          .pipe(map((report: StockOnHandReportDto) => this.buildOnHandResult(report)));
    }
  }

  private buildOnHandResult(report: StockOnHandReportDto | null | undefined, note?: string): StockReportLoadResult {
    const rows = report?.items ?? [];

    return {
      rows,
      metrics: [
        { label: 'Toplam Miktar', value: formatNumber(report?.totalQuantity ?? sumBy(rows, (row) => row.quantity)) },
        {
          label: 'Satis Degeri',
          value: formatMoney(report?.totalSalesValue ?? sumBy(rows, (row) => row.salesValue ?? row.totalSalesValue))
        },
        { label: 'Iade', value: formatInteger(report?.returnedCount ?? sumBy(rows, (row) => row.returnedCount)) },
        { label: 'Kayit', value: formatInteger(rows.length) }
      ],
      note
    };
  }

  private buildProductWarehouseResult(rows: readonly ProductWarehouseStockDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Depo', value: formatInteger(new Set(rows.map((row) => row.warehouseNo)).size) },
        { label: 'Toplam Miktar', value: formatNumber(sumBy(rows, (row) => row.quantity)) },
        { label: 'Satis Degeri', value: formatMoney(sumBy(rows, (row) => row.salesValue)) },
        { label: 'Kayit', value: formatInteger(rows.length) }
      ]
    };
  }

  private buildStockCardResult(rows: readonly StockCardDetailDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Stok Karti', value: formatInteger(rows.length) },
        { label: 'Pasif', value: formatInteger(rows.filter((row) => row.isPassive).length) },
        { label: 'Kategori', value: formatInteger(new Set(rows.map((row) => row.categoryCode)).size) },
        { label: 'Tedarikci', value: formatInteger(new Set(rows.map((row) => row.supplierCode)).size) }
      ]
    };
  }

  private buildMissingStockResult(rows: readonly WarehouseMissingStockDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Eksik Urun', value: formatInteger(rows.length) },
        { label: 'Kaynak Miktar', value: formatNumber(sumBy(rows, (row) => row.sourceQuantity)) },
        { label: 'Hedef Miktar', value: formatNumber(sumBy(rows, (row) => row.targetQuantity)) },
        { label: 'Deger', value: formatMoney(sumBy(rows, (row) => row.salesValue)) }
      ]
    };
  }

  private buildZeroStockResult(rows: readonly WarehouseZeroStockDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Sifir Stok', value: formatInteger(rows.length) },
        { label: 'Model', value: formatInteger(new Set(rows.map((row) => row.modelCode)).size) },
        { label: 'Depo', value: this.scopeLabel() },
        { label: 'Tarih', value: this.reportDate() }
      ]
    };
  }

  private buildMovementResult(rows: readonly StockMovementReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Hareket', value: formatInteger(rows.length) },
        { label: 'Miktar', value: formatNumber(sumBy(rows, (row) => row.quantity)) },
        { label: 'Tutar', value: formatMoney(sumBy(rows, (row) => row.amount)) },
        { label: 'Stok', value: formatInteger(new Set(rows.map((row) => row.stockCode)).size) }
      ]
    };
  }

  private buildInOutResult(rows: readonly MovementInOutComparisonDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Giris', value: formatNumber(sumBy(rows, (row) => row.inputQuantity)) },
        { label: 'Cikis', value: formatNumber(sumBy(rows, (row) => row.outputQuantity)) },
        { label: 'Net', value: formatNumber(sumBy(rows, (row) => row.netQuantity)) },
        { label: 'Net Tutar', value: formatMoney(sumBy(rows, (row) => row.netAmount)) }
      ]
    };
  }

  private buildBranchSalesResult(rows: readonly BranchSalesReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Net Satis', value: formatMoney(sumBy(rows, (row) => row.netSalesAmount)) },
        { label: 'Brut Satis', value: formatMoney(sumBy(rows, (row) => row.grossSalesAmount)) },
        { label: 'Miktar', value: formatNumber(sumBy(rows, (row) => row.quantity)) },
        { label: 'Fis', value: formatInteger(sumBy(rows, (row) => row.receiptCount)) }
      ]
    };
  }

  private buildYearSalesResult(rows: readonly YearSalesComparisonItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Bu Yil', value: formatMoney(sumBy(rows, (row) => row.currentYearAmount)) },
        { label: 'Gecen Yil', value: formatMoney(sumBy(rows, (row) => row.previousYearAmount)) },
        { label: 'Fark', value: formatMoney(sumBy(rows, (row) => row.amountDifference)) },
        { label: 'Kirilim', value: formatInteger(rows.length) }
      ]
    };
  }

  private buildReturnResult(rows: readonly ReturnBranchReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Iade Miktar', value: formatNumber(sumBy(rows, (row) => row.quantity)) },
        { label: 'Iade Tutar', value: formatMoney(sumBy(rows, (row) => row.amount)) },
        { label: 'Belge', value: formatInteger(sumBy(rows, (row) => row.documentCount)) },
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.warehouseNo)).size) }
      ]
    };
  }

  private buildNotSoldResult(rows: readonly NotSoldProductReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Satmayan Urun', value: formatInteger(rows.length) },
        { label: 'Stok Miktari', value: formatNumber(sumBy(rows, (row) => row.quantity)) },
        { label: 'Stok Degeri', value: formatMoney(sumBy(rows, (row) => row.salesValue)) },
        { label: 'Satin Almaci', value: formatInteger(new Set(rows.map((row) => row.productManagerCode)).size) }
      ]
    };
  }

  private buildProfitabilityResult(rows: readonly ProfitabilityReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Net Satis', value: formatMoney(sumBy(rows, (row) => row.netSalesAmount)) },
        { label: 'Maliyet', value: formatMoney(sumBy(rows, (row) => row.estimatedCostAmount)) },
        { label: 'Marj', value: formatMoney(sumBy(rows, (row) => row.marginAmount)) },
        { label: 'Kirilim', value: formatInteger(rows.length) }
      ],
      note: 'Karlilik maliyeti Mikro stok hareket maliyetinden gelir; SAS maliyet modu bu fazda yoktur.'
    };
  }

  private buildCountingResult(rows: readonly CountingComparisonReportItemDto[]): StockReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Sistem', value: formatNumber(sumBy(rows, (row) => row.systemQuantity)) },
        { label: 'Sayim', value: formatNumber(sumBy(rows, (row) => row.countedQuantity)) },
        { label: 'Fark', value: formatNumber(sumBy(rows, (row) => row.differenceQuantity)) },
        { label: 'Fark Deger', value: formatMoney(sumBy(rows, (row) => row.differenceValue)) }
      ]
    };
  }

  private buildOnHandRequest(): StockOnHandReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      reportDate: this.reportDate() || null,
      search: this.searchText().trim() || null,
      modelCode: this.modelCode().trim() || null,
      onlyWithStock: this.onlyWithStock(),
      take: this.take()
    };
  }

  private buildSupplierOnHandRequest(): SupplierStockOnHandHttpRequest {
    return {
      ...this.buildOnHandRequest(),
      supplierCode: this.primaryCode().trim()
    };
  }

  private buildCategoryOnHandRequest(): CategoryStockOnHandHttpRequest {
    return {
      ...this.buildOnHandRequest(),
      categoryCode: this.primaryCode().trim()
    };
  }

  private buildProducerOnHandRequest(): ProducerStockOnHandHttpRequest {
    return {
      ...this.buildOnHandRequest(),
      producerCode: this.primaryCode().trim()
    };
  }

  private buildProductWarehouseRequest(): ProductWarehouseStockHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      reportDate: this.reportDate() || null,
      stockCodeOrBarcode: this.primaryCode().trim(),
      onlyWithStock: this.onlyWithStock(),
      take: this.take()
    };
  }

  private buildStockCardRequest(): ReportStockCardDetailHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      stockCode: this.primaryCode().trim() || null,
      stockName: this.searchText().trim() || null,
      supplierCode: this.modelCode().trim() || null,
      take: this.take()
    };
  }

  private buildWarehouseMissingRequest(): WarehouseMissingStockHttpRequest {
    return {
      sourceWarehouseNo: this.getSourceWarehouseNo() as number,
      targetWarehouseNo: this.getTargetWarehouseNo(),
      reportDate: this.reportDate() || null,
      search: this.primaryCode().trim() || this.searchText().trim() || null,
      modelCode: this.modelCode().trim() || null,
      take: this.take()
    };
  }

  private buildWarehouseZeroRequest(): WarehouseZeroStockHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      reportDate: this.reportDate() || null,
      modelCode: this.modelCode().trim() || null,
      take: this.take()
    };
  }

  private buildMovementRequest(): StockMovementReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      stockCode: this.primaryCode().trim() || null,
      take: this.take()
    };
  }

  private buildFilteredDateRangeRequest(): FilteredDateRangeReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      filterType: this.filterType(),
      filterValue: this.primaryCode().trim() || this.searchText().trim() || null,
      take: this.take()
    };
  }

  private buildReturnBranchRequest(): ReturnBranchReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      stockCode: this.primaryCode().trim(),
      take: this.take()
    };
  }

  private buildNotSoldRequest(): NotSoldProductReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      productManagerCode: this.primaryCode().trim() || null,
      includeDls: this.includeDls(),
      take: this.take()
    };
  }

  private buildProfitabilityRequest(): ProfitabilityReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      scope: this.profitScope(),
      filterValue: this.primaryCode().trim() || this.searchText().trim() || null,
      take: this.take()
    };
  }

  private buildCountingRequest(): CountingComparisonReportHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      countDate: this.countDate(),
      documentNo: this.primaryCode().trim() || null,
      packageCode: this.modelCode().trim() || null,
      take: this.take()
    };
  }

  private buildRequestPreviewParams(): object {
    switch (this.selectedReport()) {
      case 'depoda-var-subede-yok':
        return this.buildWarehouseMissingRequest();
      case 'sayim-karsilastirma':
        return this.buildCountingRequest();
      case 'hareketler':
        return this.buildMovementRequest();
      case 'iadeler-subeler':
        return this.primaryCode().trim()
          ? this.buildReturnBranchRequest()
          : {
              warehouseNo: this.resolveWarehouseNo(),
              startDate: this.startDate(),
              endDate: this.endDate(),
              stockCode: 'STOK_KODU',
              take: this.take()
            };
      case 'satmayan-urunler':
        return this.buildNotSoldRequest();
      case 'karlilik':
        return this.buildProfitabilityRequest();
      case 'giris-cikis-karsilastirma':
      case 'satis-sube-detay':
      case 'satis-yil-karsilastirma':
        return this.buildFilteredDateRangeRequest();
      case 'urun-depo-durum':
        return this.primaryCode().trim()
          ? this.buildProductWarehouseRequest()
          : {
              warehouseNo: this.resolveWarehouseNo(),
              reportDate: this.reportDate(),
              stockCodeOrBarcode: 'STOK_KODU_VEYA_BARKOD',
              onlyWithStock: this.onlyWithStock(),
              take: this.take()
            };
      case 'stok-kartlari':
        return this.buildStockCardRequest();
      case 'depo-sifir-stok':
        return this.buildWarehouseZeroRequest();
      case 'tedarikci-son-stok':
        return {
          ...this.buildOnHandRequest(),
          supplierCode: this.primaryCode().trim() || 'TEDARIKCI_KODU'
        };
      case 'kategori-son-stok':
        return {
          ...this.buildOnHandRequest(),
          categoryCode: this.primaryCode().trim() || 'KATEGORI_KODU'
        };
      case 'uretici-son-stok':
        return {
          ...this.buildOnHandRequest(),
          producerCode: this.primaryCode().trim() || 'URETICI_KODU'
        };
      case 'son-stok':
      case 'envanter-degeri':
      default:
        return this.buildOnHandRequest();
    }
  }

  private validateRequest(): boolean {
    if (this.usesDateRange()) {
      if (!this.startDate().trim() || !this.endDate().trim()) {
        this.failValidation('Rapor icin baslangic ve bitis tarihi secin.');
        return false;
      }

      if (this.startDate().trim() > this.endDate().trim()) {
        this.failValidation('Baslangic tarihi bitis tarihinden buyuk olamaz.');
        return false;
      }
    }

    if (this.usesSnapshotDate() && !this.reportDate().trim()) {
      this.failValidation('Rapor tarihi secin.');
      return false;
    }

    if (this.usesCountDate() && !this.countDate().trim()) {
      this.failValidation('Sayim tarihi secin.');
      return false;
    }

    if (this.selectedDefinition().requiresWarehouse && this.isAdminUser() && !this.resolveWarehouseNo()) {
      this.failValidation('Bu rapor tek depo ister. Aktif depo veya manuel depo no secin.');
      return false;
    }

    if (this.scope() === 'manual' && !this.resolveWarehouseNo()) {
      this.failValidation('Manuel kapsam icin gecerli bir depo no girin.');
      return false;
    }

    if (
      ['tedarikci-son-stok', 'kategori-son-stok', 'uretici-son-stok', 'urun-depo-durum', 'iadeler-subeler'].includes(
        this.selectedReport()
      ) &&
      !this.primaryCode().trim()
    ) {
      this.failValidation(`${this.primaryLabel()} zorunludur.`);
      return false;
    }

    if (this.usesMissingWarehouseFilters() && !this.getSourceWarehouseNo()) {
      this.failValidation('Kaynak depo no zorunludur.');
      return false;
    }

    return true;
  }

  private failValidation(message: string): void {
    this.rows.set([]);
    this.metrics.set([]);
    this.resultNote.set(null);
    this.errorMessage.set(message);
  }

  private resolveWarehouseNo(): number | undefined {
    if (!this.isAdminUser()) {
      return undefined;
    }

    if (this.scope() === 'all') {
      return undefined;
    }

    if (this.scope() === 'manual') {
      return this.getManualWarehouseNo() ?? undefined;
    }

    return getCurrentWarehouseNo(this.authService.currentUser()) ?? undefined;
  }

  private getManualWarehouseNo(): number | null {
    return toPositiveWarehouseNo(this.manualWarehouseNo());
  }

  private getSourceWarehouseNo(): number | null {
    return toPositiveWarehouseNo(this.sourceWarehouseNo());
  }

  private getTargetWarehouseNo(): number | null {
    return toPositiveWarehouseNo(this.targetWarehouseNo());
  }

  private toLimitedNumber(
    value: string | number,
    minimum: number,
    maximum: number,
    fallback: number
  ): number {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, Math.trunc(numberValue)));
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getRelativeDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().slice(0, 10);
  }
}
