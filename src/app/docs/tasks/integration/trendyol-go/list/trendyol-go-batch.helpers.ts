import type {
  ITrendyolGoBatchWorkflowApiDto,
  ITrendyolGoCatalogPreviewItemApiDto,
  ITrendyolGoDirectPriceStockDispatchResultApiDto,
  ITrendyolGoDirectStoreDispatchResultApiDto,
  ITrendyolGoPriceStockPreviewItemApiDto
} from '@interfaces';
import type { TrendyolGoJsonDto } from '../../../../../core/api/module-services/entegrasyon-islemleri.service';

export type JsonRecord = Record<string, unknown>;
export type TrendyolGoLiveTone = 'info' | 'success' | 'warning' | 'danger';
export type ProductBatchAction =
  | 'create'
  | 'update'
  | 'price-and-inventory'
  | 'sale-on'
  | 'sale-off'
  | 'seller-attributes';
export type PackageAction =
  | 'read'
  | 'unsupplied'
  | 'alternative'
  | 'manual-shipped'
  | 'manual-delivered'
  | 'invoice-link';
export type ClaimAction = 'read' | 'accept' | 'reject' | 'objectionable' | 'objections';
export type PriceStockDispatchMode = 'selected' | 'changed' | 'all-existing';
export type DirectTargetScope = 'single' | 'multiple' | 'all';
export type ReadyCatalogItem = ITrendyolGoCatalogPreviewItemApiDto & { barcode: string };

export interface ITrendyolGoBatchSummary {
  status: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger';
  batchRequestType: string;
  itemCount: number;
  failedItemCount: number;
  successItemCount: number;
  formattedDate: string;
  rawStatus: string;
}

export interface ITrendyolGoOrderLineView {
  barcode: string;
  stockCode: string;
  name: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  status: string;
}

export interface ITrendyolGoBatchFailedItemView {
  barcode: string;
  reasons: string[];
}

export interface ITrendyolGoInvoiceLimitSummary {
  minAmount: number | null;
  maxAmount: number | null;
  suggestedAmount: number | null;
}

export interface ITrendyolGoDirectStoreLiveStatus {
  label: string;
  tone: TrendyolGoLiveTone;
  isPending: boolean;
  detailText: string;
}

export interface ITrendyolGoDirectDispatchLiveSummary {
  tone: TrendyolGoLiveTone;
  title: string;
  subtitle: string;
  isPending: boolean;
  pendingCount: number;
  succeededCount: number;
  warningCount: number;
  failedCount: number;
}

export interface TrendyolGoBatchSummaryInput {
  status: string;
  statusTone: 'success' | 'warning' | 'danger';
}

export function isTrendyolGoRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readTrendyolGoPath(record: JsonRecord, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, key) => (isTrendyolGoRecord(current) ? current[key] : undefined), record);
}

export function getTrendyolGoTextValue(record: JsonRecord, ...paths: string[]): string {
  for (const path of paths) {
    const value = readTrendyolGoPath(record, path);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

export function getTrendyolGoNumericValue(
  record: JsonRecord | TrendyolGoJsonDto | null | undefined,
  ...paths: string[]
): number | null {
  if (!isTrendyolGoRecord(record)) {
    return null;
  }

  for (const path of paths) {
    const rawValue = readTrendyolGoPath(record, path);
    const value = Number(rawValue);
    if (rawValue !== null && rawValue !== undefined && rawValue !== '' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function extractTrendyolGoRows(response: TrendyolGoJsonDto | null): JsonRecord[] {
  if (Array.isArray(response)) {
    return response.filter((item): item is JsonRecord => isTrendyolGoRecord(item));
  }

  if (!isTrendyolGoRecord(response)) {
    return [];
  }

  for (const key of ['content', 'items', 'orders', 'packages', 'results']) {
    const value = response[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is JsonRecord => isTrendyolGoRecord(item));
    }
  }

  const data = response['data'];
  return isTrendyolGoRecord(data) ? extractTrendyolGoRows(data) : [];
}

export function extractTrendyolGoBatchIds(responses: readonly JsonRecord[] | null | undefined): string[] {
  return Array.from(
    new Set(
      (responses ?? []).flatMap((response) => {
        const value =
          readTrendyolGoPath(response, 'batchRequestId') ??
          readTrendyolGoPath(response, 'batchRequestID') ??
          readTrendyolGoPath(response, 'batchId') ??
          readTrendyolGoPath(response, 'response.batchRequestId') ??
          readTrendyolGoPath(response, 'response.batchRequestID');
        return typeof value === 'string' && value.trim()
          ? [value.trim()]
          : typeof value === 'number' && Number.isFinite(value)
            ? [String(value)]
            : [];
      })
    )
  );
}

export function extractTrendyolGoOrderLines(record: JsonRecord): ITrendyolGoOrderLineView[] {
  let rawLines: unknown[] = [];

  for (const key of ['lines', 'items', 'orderLines', 'packageItems']) {
    if (Array.isArray(record[key])) {
      rawLines = record[key] as unknown[];
      break;
    }
  }

  if (!rawLines.length && Array.isArray(record['packages']) && isTrendyolGoRecord(record['packages'][0])) {
    const firstPkg = record['packages'][0] as JsonRecord;
    for (const key of ['lines', 'items', 'packageItems']) {
      if (Array.isArray(firstPkg[key])) {
        rawLines = firstPkg[key] as unknown[];
        break;
      }
    }
  }

  if (!rawLines.length && isTrendyolGoRecord(record['data'])) {
    return extractTrendyolGoOrderLines(record['data'] as JsonRecord);
  }

  return rawLines
    .filter((item): item is JsonRecord => isTrendyolGoRecord(item))
    .map((line) => {
      const product = isTrendyolGoRecord(line['product']) ? (line['product'] as JsonRecord) : {};
      const barcode =
        getTrendyolGoTextValue(line, 'barcode', 'productBarcode') ||
        getTrendyolGoTextValue(product, 'barcode', 'productBarcode') ||
        '-';
      const stockCode =
        getTrendyolGoTextValue(line, 'stockCode', 'merchantSku', 'sku', 'productCode') ||
        getTrendyolGoTextValue(product, 'stockCode', 'merchantSku', 'sku') ||
        '-';
      const name =
        getTrendyolGoTextValue(line, 'productName', 'name', 'title', 'description') ||
        getTrendyolGoTextValue(product, 'productName', 'name', 'title') ||
        '-';
      const qtyNum = getTrendyolGoNumericValue(line, 'quantity', 'amount', 'count');
      const itemsArray = Array.isArray(line['items']) ? line['items'] : null;
      const quantity =
        qtyNum !== null ? String(qtyNum) : itemsArray ? String(itemsArray.length) : '-';
      const priceVal = getTrendyolGoNumericValue(line, 'price', 'unitPrice', 'sellingPrice', 'amount');
      const totalVal = getTrendyolGoNumericValue(line, 'totalPrice', 'totalAmount', 'lineTotal');
      const computedTotal =
        totalVal !== null
          ? totalVal
          : priceVal !== null && qtyNum !== null
            ? priceVal * qtyNum
            : priceVal;
      const status =
        getTrendyolGoTextValue(line, 'status', 'orderLineItemStatusName', 'lineStatus') || '-';

      return {
        barcode,
        stockCode,
        name,
        quantity,
        unitPrice:
          priceVal !== null
            ? `${priceVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
            : '-',
        totalPrice:
          computedTotal !== null
            ? `${computedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
            : '-',
        status
      };
    });
}

export function getTrendyolGoOrderNumber(order: JsonRecord): string {
  return getTrendyolGoTextValue(order, 'orderNumber', 'orderNo', 'order.number', 'id');
}

export function getTrendyolGoPackageId(order: JsonRecord): string {
  const direct = getTrendyolGoTextValue(order, 'packageId', 'package.id', 'shipmentPackageId');
  if (direct) {
    return direct;
  }
  const packages = order['packages'];
  return Array.isArray(packages) && isTrendyolGoRecord(packages[0])
    ? getTrendyolGoTextValue(packages[0], 'packageId', 'id')
    : '';
}

export function getTrendyolGoOrderId(order: JsonRecord): string {
  return getTrendyolGoTextValue(order, 'orderId', 'order.id', 'id');
}

export function getTrendyolGoOrderStatus(order: JsonRecord): string {
  return getTrendyolGoTextValue(order, 'status', 'orderStatus', 'package.status') || '-';
}

export function getTrendyolGoOrderStatusLabel(rawStatus: string): string {
  const normalized = rawStatus.trim();
  const map: Record<string, string> = {
    Created: 'Yeni Siparis (Created)',
    Picking: 'Hazirlaniyor (Picking)',
    Invoiced: 'Faturalandi (Invoiced)',
    Shipped: 'Yolda / Sevk (Shipped)',
    Delivered: 'Teslim Edildi (Delivered)',
    Cancelled: 'Iptal (Cancelled)',
    Returned: 'Iade (Returned)',
    UnPacked: 'Paketlenmedi (UnPacked)',
    UnSupplied: 'Tedarik Edilemedi (UnSupplied)'
  };
  return map[normalized] || normalized || '-';
}

export function getTrendyolGoOrderStatusTone(
  rawStatus: string
): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  const normalized = rawStatus.trim().toLowerCase();
  if (normalized === 'created' || normalized === 'unpacked') return 'info';
  if (normalized === 'picking' || normalized === 'shipped') return 'warning';
  if (normalized === 'invoiced' || normalized === 'delivered') return 'success';
  if (normalized === 'cancelled' || normalized === 'unsupplied' || normalized === 'returned') return 'danger';
  return 'neutral';
}

export function getTrendyolGoCustomerName(order: JsonRecord): string {
  const fullName = getTrendyolGoTextValue(order, 'customerName', 'customer.name', 'customer.fullName');
  if (fullName) {
    return fullName;
  }
  return (
    [getTrendyolGoTextValue(order, 'customer.firstName'), getTrendyolGoTextValue(order, 'customer.lastName')]
      .filter(Boolean)
      .join(' ') || '-'
  );
}

export function getTrendyolGoOrderDate(order: JsonRecord): string {
  const value =
    readTrendyolGoPath(order, 'orderDate') ??
    readTrendyolGoPath(order, 'createdDate') ??
    readTrendyolGoPath(order, 'createdAt');
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const date = new Date(
    typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : (value as string | number)
  );
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('tr-TR');
}

export function getTrendyolGoOrderAmount(order: JsonRecord): string {
  const value = getTrendyolGoNumericValue(order, 'totalAmount', 'totalPrice', 'invoiceAmount', 'price');
  return value === null
    ? '-'
    : `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function parseTrendyolGoBatchFailedItems(batchResult: unknown): ITrendyolGoBatchFailedItemView[] {
  if (!isTrendyolGoRecord(batchResult) || !Array.isArray(batchResult['items'])) {
    return [];
  }

  const failed: ITrendyolGoBatchFailedItemView[] = [];
  for (const rawItem of batchResult['items']) {
    if (!isTrendyolGoRecord(rawItem)) continue;
    const status = typeof rawItem['status'] === 'string' ? rawItem['status'].toUpperCase() : '';
    if (status !== 'FAILED') continue;

    const reasons = Array.isArray(rawItem['failureReasons'])
      ? rawItem['failureReasons'].map((r) => String(r || '').trim()).filter(Boolean)
      : [];
    const reqItem = isTrendyolGoRecord(rawItem['requestItem']) ? rawItem['requestItem'] : {};
    const product = isTrendyolGoRecord(reqItem['product']) ? reqItem['product'] : {};
    const barcode =
      getTrendyolGoTextValue(rawItem, 'barcode') ||
      getTrendyolGoTextValue(product, 'productBarcode', 'barcode') ||
      getTrendyolGoTextValue(reqItem, 'barcode') ||
      '-';

    failed.push({
      barcode,
      reasons: reasons.length ? reasons : ['Bilinmeyen hata']
    });
  }

  return failed;
}

export function parseTrendyolGoMissingCatalogInfo(
  batchResult: unknown,
  fallbackStoreId: number | null
): { storeId: number | null; barcodes: string[] } {
  if (!batchResult || typeof batchResult !== 'object') {
    return { storeId: null, barcodes: [] };
  }

  const res = batchResult as Record<string, unknown>;
  const items = Array.isArray(res['items']) ? (res['items'] as Record<string, unknown>[]) : [];
  const barcodesSet = new Set<string>();
  let detectedStoreId: number | null = null;

  for (const item of items) {
    if (item['status'] !== 'FAILED') continue;

    const reasons = Array.isArray(item['failureReasons'])
      ? (item['failureReasons'] as unknown[]).map((r) => String(r || '').toLowerCase())
      : [];

    const isMissing = reasons.some(
      (r) =>
        r.includes('bulunamadı') ||
        r.includes('bulunamadi') ||
        r.includes('not found') ||
        r.includes('katalog')
    );

    if (!isMissing) continue;

    const reqItem = (item['requestItem'] as Record<string, unknown>) || {};
    const product = (reqItem['product'] as Record<string, unknown>) || {};

    let barcode =
      typeof item['barcode'] === 'string' && item['barcode'].trim()
        ? item['barcode'].trim()
        : typeof product['productBarcode'] === 'string' && product['productBarcode'].trim()
          ? product['productBarcode'].trim()
          : typeof reqItem['barcode'] === 'string' && reqItem['barcode'].trim()
            ? reqItem['barcode'].trim()
            : '';

    if (!barcode && reasons.length > 0) {
      const match = reasons[0]?.match(/(\d{4,18})\s*barkod/i);
      if (match?.[1]) {
        barcode = match[1];
      }
    }

    if (barcode) {
      barcodesSet.add(barcode);
    }

    if (!detectedStoreId) {
      const storeIdVal = product['storeId'] ?? reqItem['storeId'];
      if (typeof storeIdVal === 'number' && storeIdVal > 0) {
        detectedStoreId = storeIdVal;
      } else if (reasons.length > 0) {
        const storeMatch = reasons[0]?.match(/storeid:\s*(\d+)/i);
        if (storeMatch?.[1]) {
          detectedStoreId = Number(storeMatch[1]);
        }
      }
    }
  }

  return {
    storeId: detectedStoreId || fallbackStoreId,
    barcodes: Array.from(barcodesSet)
  };
}

export function parseTrendyolGoBatchSummary(result: unknown): ITrendyolGoBatchSummary | null {
  if (!isTrendyolGoRecord(result)) {
    return null;
  }

  const rawStatus = (typeof result['status'] === 'string' ? result['status'] : '').toUpperCase();
  const batchRequestType = typeof result['batchRequestType'] === 'string' ? result['batchRequestType'] : '';

  let itemCount = typeof result['itemCount'] === 'number' ? result['itemCount'] : 0;
  if (!itemCount && Array.isArray(result['items'])) {
    itemCount = result['items'].length;
  }

  let failedItemCount = typeof result['failedItemCount'] === 'number' ? result['failedItemCount'] : 0;
  if (!failedItemCount && Array.isArray(result['items'])) {
    failedItemCount = result['items'].filter(
      (it) => isTrendyolGoRecord(it) && typeof it['status'] === 'string' && it['status'].toUpperCase() === 'FAILED'
    ).length;
  }

  const successItemCount = Math.max(0, itemCount - failedItemCount);
  let statusLabel = rawStatus;
  let statusTone: 'success' | 'warning' | 'danger' = 'warning';

  if (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS') {
    if (failedItemCount === 0) {
      statusLabel = 'Tamamlandi (Kusursuz)';
      statusTone = 'success';
    } else {
      statusLabel = `Kismi Tamamlandi (${failedItemCount} Hata)`;
      statusTone = 'warning';
    }
  } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'PROCESSING') {
    statusLabel = 'Isleniyor...';
    statusTone = 'warning';
  } else if (rawStatus === 'FAILED') {
    statusLabel = 'Basarisiz';
    statusTone = 'danger';
  } else if (!rawStatus) {
    statusLabel = 'Bilinmiyor';
    statusTone = 'warning';
  }

  let formattedDate = '';
  const creationDate = result['creationDate'] || result['creation_date'] || result['lastModification'];
  if (typeof creationDate === 'number' && creationDate > 0) {
    formattedDate = new Date(creationDate).toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  } else if (typeof creationDate === 'string' && creationDate.trim()) {
    const parsed = new Date(creationDate);
    if (!Number.isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleString('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    }
  }

  return {
    status: rawStatus,
    statusLabel,
    statusTone,
    batchRequestType,
    itemCount,
    failedItemCount,
    successItemCount,
    formattedDate,
    rawStatus
  };
}

export function buildTrendyolGoProductBatchTemplate(action: ProductBatchAction, storeId: number): string {
  const templates: Record<ProductBatchAction, unknown> = {
    'price-and-inventory': {
      items: [{ barcode: '8690000000001', storeId, quantity: 10, sellingPrice: 99.9, originalPrice: 99.9 }]
    },
    create: {
      items: [
        {
          barcode: '8690000000001',
          title: 'Ornek Urun Adi',
          productMainId: 'STK-001',
          brandId: 100,
          categoryId: 200,
          quantity: 10,
          stockCode: 'STK-001',
          dimensionalWeight: 1,
          description: 'Urun aciklamasi',
          currencyType: 'TRY',
          listPrice: 99.9,
          salePrice: 99.9,
          vatRate: 10,
          images: [{ url: 'https://cdn.example.com/product.jpg' }],
          attributes: []
        }
      ]
    },
    update: {
      items: [
        {
          barcode: '8690000000001',
          title: 'Guncel Urun Adi',
          productMainId: 'STK-001',
          brandId: 100,
          categoryId: 200,
          stockCode: 'STK-001',
          dimensionalWeight: 1,
          description: 'Guncel aciklama',
          vatRate: 10
        }
      ]
    },
    'sale-on': { items: [{ barcode: '8690000000001', storeId }] },
    'sale-off': { items: [{ barcode: '8690000000001', storeId }] },
    'seller-attributes': {
      items: [{ barcode: '8690000000001', attributes: [{ attributeId: 1, customAttributeValue: 'Deger' }] }]
    }
  };
  return JSON.stringify(templates[action], null, 2);
}

export function buildTrendyolGoPackageTemplate(action: PackageAction): string | null {
  if (action === 'unsupplied') {
    return JSON.stringify({ lines: [{ lineId: 12345, quantity: 1 }], reasonId: 500 }, null, 2);
  }
  if (action === 'alternative') {
    return JSON.stringify(
      { lines: [{ lineId: 12345, alternativeBarcode: '8690000000002', quantity: 1 }] },
      null,
      2
    );
  }
  if (action === 'invoice-link') {
    return JSON.stringify(
      { invoiceLink: 'https://fatura.example.com/e-arsiv.pdf', shipmentPackageId: 123456 },
      null,
      2
    );
  }
  return null;
}

export function buildTrendyolGoClaimTemplate(action: ClaimAction): string | null {
  if (action === 'accept') {
    return JSON.stringify({ claimLineItemIdList: ['claim-item-id-1'] }, null, 2);
  }
  if (action === 'reject' || action === 'objections') {
    return JSON.stringify(
      {
        claimIssueReasonId: 1,
        claimItemIdList: ['claim-item-id-1'],
        description: 'Itiraz / red aciklamasi'
      },
      null,
      2
    );
  }
  return null;
}

export function formatTrendyolGoBatchWorkflowLabel(item: ITrendyolGoBatchWorkflowApiDto): string {
  if (item.status === 'Succeeded') return 'Tamamlandi';
  if (item.status === 'PartiallySucceeded') return 'Kismi hata';
  if (item.status === 'Failed') return 'Hata';
  if (item.kind === 'CatalogThenPriceStock') return 'Katalog bekleniyor';
  if (item.kind === 'SaleStatus') return 'Satis kapatma sonucu bekleniyor';
  return item.status === 'Processing' ? 'Kontrol ediliyor' : 'TGO sonucu bekleniyor';
}

export function formatTrendyolGoBatchWorkflowKindLabel(item: ITrendyolGoBatchWorkflowApiDto): string {
  if (item.kind === 'CatalogThenPriceStock') return 'Katalog -> Fiyat/Stok -> Sube';
  if (item.kind === 'SaleStatus') return 'Satis Kapatma -> Sube';
  return 'Fiyat/Stok -> Sube';
}

export function calculateTrendyolGoPriceDelta(item: ITrendyolGoPriceStockPreviewItemApiDto): number | null {
  if (item.mikroPrice === null || item.trendyolPrice === null) {
    return null;
  }
  const diff = Number((item.mikroPrice - item.trendyolPrice).toFixed(2));
  return Math.abs(diff) < 0.005 ? 0 : diff;
}

export function calculateTrendyolGoStockDelta(item: ITrendyolGoPriceStockPreviewItemApiDto): number | null {
  if (item.mikroQuantity === null || item.trendyolQuantity === null) {
    return null;
  }
  const diff = Number((item.mikroQuantity - item.trendyolQuantity).toFixed(3));
  return Math.abs(diff) < 0.0005 ? 0 : diff;
}

export function splitTrendyolGoIdentifiers(value: string): string[] {
  return Array.from(new Set(value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)));
}

export function toTrendyolGoTimestamp(value: string, endOfDay: boolean): number | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function formatTrendyolGoDateIso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function shortTrendyolGoBatchId(batchId: string): string {
  if (!batchId || batchId.length <= 16) {
    return batchId;
  }

  return `${batchId.slice(0, 8)}...${batchId.slice(-6)}`;
}

export function isTrendyolGoCatalogPending(
  result: ITrendyolGoDirectStoreDispatchResultApiDto
): boolean {
  return result.workflowStatus === 'CatalogAndPriceStockQueued';
}

export function formatTrendyolGoDirectStoreStatusLabel(
  result: ITrendyolGoDirectStoreDispatchResultApiDto
): string {
  if (result.workflowStatus === 'QueuedWithWarnings') {
    return `Kuyrukta, uyari: ${result.errorMessage || 'Bazi urunler gonderilmedi'}`;
  }

  if (result.success) {
    if (result.workflowStatus === 'CatalogAndPriceStockQueued') {
      return 'Katalog ve fiyat/stok bekleniyor';
    }
    if (result.workflowStatus === 'SaleOffQueued') {
      return 'Satis kapatma sonucu bekleniyor';
    }
    if (result.workflowStatus === 'PriceStockAndSaleOffQueued') {
      return 'Fiyat/stok ve kapatma sonucu bekleniyor';
    }
    return 'TGO sonucu bekleniyor';
  }

  if (isTrendyolGoCatalogPending(result)) {
    return 'Katalog onayi bekleniyor';
  }

  return `Hata: ${result.errorMessage || 'Gonderim tamamlanamadi'}`;
}

export function resolveTrendyolGoBatchChipTone(
  batchId: string,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  manualSummary?: TrendyolGoBatchSummaryInput | null
): TrendyolGoLiveTone {
  if (manualSummary) {
    if (manualSummary.statusTone === 'success') return 'success';
    if (manualSummary.statusTone === 'danger') return 'danger';
    if (manualSummary.status === 'COMPLETED' || manualSummary.status === 'SUCCESS') return 'warning';
  }

  const wf = workflowByBatchId.get(batchId);
  if (wf) {
    if (wf.status === 'Succeeded') return 'success';
    if (wf.status === 'PartiallySucceeded') return 'warning';
    if (wf.status === 'Failed') return 'danger';
  }

  return 'info';
}

export function resolveTrendyolGoDirectStoreLiveStatus(
  sr: ITrendyolGoDirectStoreDispatchResultApiDto,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  getManualBatchSummary: (batchId: string) => TrendyolGoBatchSummaryInput | null
): ITrendyolGoDirectStoreLiveStatus {
  if (!sr.success && !isTrendyolGoCatalogPending(sr) && sr.workflowStatus !== 'QueuedWithWarnings') {
    return {
      label: 'Hata Olustu',
      tone: 'danger',
      isPending: false,
      detailText: sr.errorMessage || 'Gonderim tamamlanamadi'
    };
  }

  const allBatchIds = [
    ...(sr.batchRequestIds || []),
    ...(sr.catalogBatchRequestIds || [])
  ];

  if (allBatchIds.length === 0) {
    if (sr.workflowStatus === 'QueuedWithWarnings') {
      return {
        label: 'Uyari ile Kuyrukta',
        tone: 'warning',
        isPending: false,
        detailText: sr.errorMessage || 'Bazi urunler gonderilmedi'
      };
    }

    return {
      label: sr.success ? 'Tamamlandi' : formatTrendyolGoDirectStoreStatusLabel(sr),
      tone: sr.success ? 'success' : 'warning',
      isPending: false,
      detailText: sr.errorMessage || ''
    };
  }

  const tones = allBatchIds.map((id) =>
    resolveTrendyolGoBatchChipTone(id, workflowByBatchId, getManualBatchSummary(id))
  );
  const hasPending = tones.some((tone) => tone === 'info');
  const hasDanger = tones.some((tone) => tone === 'danger');
  const hasWarning = tones.some((tone) => tone === 'warning');

  const workflowDetails = allBatchIds
    .map((id) => workflowByBatchId.get(id))
    .filter((wf): wf is ITrendyolGoBatchWorkflowApiDto => !!wf)
    .map((wf) => wf.lastError || wf.resultSummary || '')
    .filter(Boolean);

  if (hasPending) {
    return {
      label: formatTrendyolGoDirectStoreStatusLabel(sr),
      tone: isTrendyolGoCatalogPending(sr) ? 'warning' : 'info',
      isPending: true,
      detailText: workflowDetails[0] || sr.errorMessage || 'TGO batch sonucu bekleniyor'
    };
  }

  if (hasDanger) {
    return {
      label: 'Hata Olustu',
      tone: 'danger',
      isPending: false,
      detailText: workflowDetails[0] || sr.errorMessage || 'Batch isleminde hata olustu'
    };
  }

  if (hasWarning || sr.workflowStatus === 'QueuedWithWarnings') {
    return {
      label: 'Kismi Hata',
      tone: 'warning',
      isPending: false,
      detailText: workflowDetails[0] || sr.errorMessage || 'Bazi urunlerde uyari/hata var'
    };
  }

  return {
    label: 'Basariyla Tamamlandi',
    tone: 'success',
    isPending: false,
    detailText: workflowDetails[0] || 'Tum batch islemleri basariyla tamamlandi'
  };
}

export function buildTrendyolGoDirectDispatchSummary(
  res: ITrendyolGoDirectPriceStockDispatchResultApiDto,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  getManualBatchSummary: (batchId: string) => TrendyolGoBatchSummaryInput | null
): ITrendyolGoDirectDispatchLiveSummary {
  const statuses = res.storeResults.map((sr) =>
    resolveTrendyolGoDirectStoreLiveStatus(sr, workflowByBatchId, getManualBatchSummary)
  );
  const pendingCount = statuses.filter((s) => s.isPending).length;
  const succeededCount = statuses.filter((s) => !s.isPending && s.tone === 'success').length;
  const warningCount = statuses.filter((s) => !s.isPending && s.tone === 'warning').length;
  const failedCount = statuses.filter((s) => !s.isPending && s.tone === 'danger').length;

  let tone: TrendyolGoLiveTone = 'info';
  let title = 'Gonderim Isleniyor';
  if (pendingCount === 0) {
    if (failedCount > 0 && succeededCount === 0 && warningCount === 0) {
      tone = 'danger';
      title = 'Gonderim Basarisiz';
    } else if (failedCount > 0 || warningCount > 0) {
      tone = 'warning';
      title = 'Trendyol Go Gonderimi Kismi Hata ile Tamamlandi';
    } else {
      tone = 'success';
      title = 'Trendyol Go Gonderimi Tamamlandi';
    }
  }

  const subtitle = pendingCount > 0
    ? `${res.targetStoresCount} magaza, ${res.totalItemsDispatched} urun TGO tarafinda isleniyor (${succeededCount}/${res.storeResults.length} tamamlandi).`
    : `${res.targetStoresCount} magaza, toplam ${res.totalItemsDispatched} urun icin TGO islemi tamamlandi. Varsa sube POS aktarimi ayri izleniyor.`;

  return {
    tone,
    title,
    subtitle,
    isPending: pendingCount > 0,
    pendingCount,
    succeededCount,
    warningCount,
    failedCount
  };
}
