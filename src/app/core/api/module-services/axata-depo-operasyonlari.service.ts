import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AxataOperationsMetadata {
  generatedAtUtc: string;
  dataSource: string;
  freshness: string;
  warehouseNo?: number | null;
  date?: string | null;
}

export interface AxataWarehouseOverview {
  metadata: AxataOperationsMetadata;
  outbound: {
    pendingOrderCount: number;
    pickingOrderCount: number;
    shippedTodayCount: number;
    shippedTodayQty: number;
  };
  inbound: {
    pendingReceivingCount: number;
    processingReceivingCount: number;
    completedTodayCount: number;
  };
  queues: {
    outboundWaitingIntegrationCount: number;
    inboundWaitingIntegrationCount: number;
  };
  activeLoadings: Array<{
    shipmentYear: number;
    shipmentNo: number;
    plate?: string | null;
    destinationCode?: string | null;
    destinationName?: string | null;
    ramp?: string | null;
    picker?: string | null;
    startTime?: string | null;
    lineCount: number;
  }>;
  pendingOrders: Array<{
    orderNo: string;
    movementType?: string | null;
    targetCode?: string | null;
    targetName?: string | null;
    orderDate: string;
    lineCount: number;
    totalOrderQty: number;
  }>;
}

export interface AxataWarehouseDocumentListItem {
  documentType: 'Order' | 'Shipment' | 'Receiving';
  documentTypeDescription: string;
  documentKey: string;
  documentNo: string;
  movementType?: string | null;
  documentDate?: string | null;
  sourceCode?: string | null;
  sourceName?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  status: number;
  statusDescription: string;
  flowState: 'Pending' | 'Processing' | 'Completed' | 'ActionRequired';
  lineCount: number;
  quantity: number;
  isInTransit: boolean;
  vehiclePlate?: string | null;
}

export interface AxataWarehouseDocumentList {
  metadata: AxataOperationsMetadata;
  startDate: string;
  endDate: string;
  totalCount: number;
  skip: number;
  take: number;
  items: AxataWarehouseDocumentListItem[];
}

export interface AxataWarehouseDocumentQuery {
  startDate?: string | null;
  endDate?: string | null;
  documentType?: string | null;
  movementType?: string | null;
  status?: string | null;
  searchTerm?: string | null;
  skip?: number;
  take?: number;
}

export interface AxataDocumentTrace {
  metadata: AxataOperationsMetadata;
  searchTerm: string;
  documentType: string;
  orderNo?: string | null;
  movementType?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  orderDate?: string | null;
  orderStatus?: number | null;
  orderStatusDescription?: string | null;
  shipments: Array<{
    shipmentYear: number;
    shipmentNo: number;
    movementType?: string | null;
    status?: number | null;
    statusDescription?: string | null;
    plate?: string | null;
    ramp?: string | null;
    shipmentDate?: string | null;
    details: Array<{
      lineNo: number;
      itemOrderNo: number;
      sku: string;
      skuName?: string | null;
      orderedQty: number;
      shippedQty: number;
      differenceQty: number;
    }>;
  }>;
  pickingLogs: Array<{
    sequence: number;
    warehouse?: string | null;
    zone?: string | null;
    location?: string | null;
    sku?: string | null;
    skuName?: string | null;
    quantity: number;
    picker?: string | null;
    logDate?: string | null;
    logTime?: string | null;
    palletNo?: string | null;
  }>;
  inbounds: Array<{
    orderId: number;
    documentNo: string;
    movementType?: string | null;
    supplierCode?: string | null;
    supplierName?: string | null;
    receiptNo?: string | null;
    receiptDate?: string | null;
    status?: number | null;
    statusDescription?: string | null;
    details: Array<{
      lineNo: number;
      sku: string;
      skuName?: string | null;
      expectedQty: number;
      receivedQty: number;
    }>;
  }>;
  integrationQueues: Array<{
    queueType: string;
    documentNo: string;
    status: number;
    statusDescription: string;
    targetCode?: string | null;
    creationDate?: string | null;
  }>;
  mikroCrossCheck?: AxataTraceMikroCrossCheck | null;
}

export interface AxataTraceMikroCrossCheck {
  orderSerie?: string | null;
  orderNo?: number | null;
  orderFound: boolean;
  orderDate?: string | null;
  sourceWarehouseNo?: number | null;
  targetWarehouseNo?: number | null;
  lineCount: number;
  openLineCount: number;
  closedLineCount: number;
  orderedQuantity: number;
  deliveredQuantity: number;
  shipments: Array<{
    documentSerie: string;
    documentOrderNo: number;
    documentDate?: string | null;
    officialDocumentNo?: string | null;
    sourceWarehouseNo?: number | null;
    targetWarehouseNo?: number | null;
    lineCount: number;
    quantity: number;
  }>;
  decisionCode: string;
  decision: string;
  warning?: string | null;
}

export interface AxataPickingPerformance {
  metadata: AxataOperationsMetadata;
  pickers: Array<{
    userId: string;
    userName?: string | null;
    totalShipments: number;
    totalPickTasks: number;
    totalLines: number;
    totalQuantity: number;
    unpickedLines: number;
    completionRate: number;
    averageDurationMinutes: number;
  }>;
  zones: Array<{
    zoneCode: string;
    totalShipments: number;
    totalLines: number;
    totalQuantity: number;
    unpickedLines: number;
  }>;
}

export interface AxataFillRate {
  metadata: AxataOperationsMetadata;
  overallFillRate: number;
  totalOrderedLines: number;
  fullySuppliedLines: number;
  partiallySuppliedLines: number;
  unsuppliedLines: number;
  stores: Array<{
    storeCode: string;
    storeName?: string | null;
    orderCount: number;
    totalLines: number;
    totalOrderedQty: number;
    totalShippedQty: number;
    totalMissingQty: number;
    fillRatePercentage: number;
  }>;
  topMissingSkus: Array<{
    sku: string;
    skuName?: string | null;
    orderCount: number;
    totalOrderedQty: number;
    totalShippedQty: number;
    totalMissingQty: number;
    fillRatePercentage: number;
  }>;
}

export interface AxataCapacity {
  metadata: AxataOperationsMetadata;
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  blockedLocations: number;
  occupancyRatePercentage: number;
  zones: Array<{
    zone: string;
    totalLocations: number;
    occupiedLocations: number;
    emptyLocations: number;
    occupancyRatePercentage: number;
  }>;
  stockTypes: Array<{
    typeCode: string;
    typeDescription?: string | null;
    locationCount: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AxataWarehouseOperationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiurl}/operasyon-islemleri/axata-depo-operasyonlari`;

  getOverview(warehouseNo?: number | null, date?: string | null): Observable<AxataWarehouseOverview> {
    let params = new HttpParams();
    if (warehouseNo != null) params = params.set('warehouseNo', warehouseNo.toString());
    if (date) params = params.set('date', date);

    return this.http.get<AxataWarehouseOverview>(`${this.baseUrl}/overview`, { params });
  }

  getDocuments(query: AxataWarehouseDocumentQuery): Observable<AxataWarehouseDocumentList> {
    let params = new HttpParams();
    if (query.startDate) params = params.set('startDate', query.startDate);
    if (query.endDate) params = params.set('endDate', query.endDate);
    if (query.documentType) params = params.set('documentType', query.documentType);
    if (query.movementType) params = params.set('movementType', query.movementType);
    if (query.status) params = params.set('status', query.status);
    if (query.searchTerm) params = params.set('searchTerm', query.searchTerm);
    params = params.set('skip', (query.skip ?? 0).toString());
    params = params.set('take', (query.take ?? 100).toString());

    return this.http.get<AxataWarehouseDocumentList>(`${this.baseUrl}/documents`, { params });
  }

  getTrace(searchTerm: string): Observable<AxataDocumentTrace> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<AxataDocumentTrace>(`${this.baseUrl}/trace`, { params });
  }

  getPickingPerformance(startDate?: string | null, endDate?: string | null, warehouseNo?: number | null, take: number = 50): Observable<AxataPickingPerformance> {
    let params = new HttpParams().set('take', take.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (warehouseNo != null) params = params.set('warehouseNo', warehouseNo.toString());

    return this.http.get<AxataPickingPerformance>(`${this.baseUrl}/picking-performance`, { params });
  }

  getFillRate(startDate?: string | null, endDate?: string | null, targetStoreCode?: string | null, warehouseNo?: number | null, take: number = 50): Observable<AxataFillRate> {
    let params = new HttpParams().set('take', take.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (targetStoreCode) params = params.set('targetStoreCode', targetStoreCode);
    if (warehouseNo != null) params = params.set('warehouseNo', warehouseNo.toString());

    return this.http.get<AxataFillRate>(`${this.baseUrl}/fill-rate`, { params });
  }

  getCapacity(warehouseNo?: number | null): Observable<AxataCapacity> {
    let params = new HttpParams();
    if (warehouseNo != null) params = params.set('warehouseNo', warehouseNo.toString());

    return this.http.get<AxataCapacity>(`${this.baseUrl}/capacity`, { params });
  }
}
