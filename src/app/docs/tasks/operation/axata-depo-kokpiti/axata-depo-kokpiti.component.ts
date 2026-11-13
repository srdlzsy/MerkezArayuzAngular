import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import type {
  IAxataOutboundDeliveryImportDocumentApiDto,
  IAxataSynchronizationManualDocumentCandidateItemApiDto
} from '@interfaces';
import {
  AxataCapacity,
  AxataDocumentTrace,
  AxataFillRate,
  AxataPickingPerformance,
  AxataWarehouseOperationsApiService,
  AxataWarehouseOverview
} from '../../../../core/api/module-services/axata-depo-operasyonlari.service';
import type {
  AxataOutboundDeliveryImportPreviewDto,
  AxataSynchronizationManualDocumentCandidatesDto
} from '../../../../core/api/module-services/entegrasyon-islemleri.service';
import { EntegrasyonIslemleriService } from '../../../../core/api/module-services/entegrasyon-islemleri.service';

type CockpitTab = 'actions' | 'overview' | 'trace' | 'performance' | 'fillrate' | 'capacity';

@Component({
  selector: 'app-axata-depo-kokpiti',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './axata-depo-kokpiti.component.html',
  styleUrl: './axata-depo-kokpiti.component.scss'
})
export class AxataDepoKokpitiComponent implements OnInit {
  private readonly api = inject(AxataWarehouseOperationsApiService);
  private readonly integrationApi = inject(EntegrasyonIslemleriService);

  activeTab: CockpitTab = 'actions';
  searchTerm = '';
  actionSearchTerm = '';
  selectedDate = this.today();
  reportStartDate = this.relativeDate(6);
  reportEndDate = this.today();

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly overview = signal<AxataWarehouseOverview | null>(null);
  readonly traceResult = signal<AxataDocumentTrace | null>(null);
  readonly performance = signal<AxataPickingPerformance | null>(null);
  readonly fillRate = signal<AxataFillRate | null>(null);
  readonly capacity = signal<AxataCapacity | null>(null);
  readonly actionLoading = signal(false);
  readonly actionMessage = signal<string | null>(null);
  readonly orderCandidates = signal<IAxataSynchronizationManualDocumentCandidateItemApiDto[]>([]);
  readonly deliveryCandidates = signal<IAxataOutboundDeliveryImportDocumentApiDto[]>([]);
  readonly selectedOrderReferences = signal<ReadonlySet<string>>(new Set());
  readonly selectedDeliveryReferences = signal<ReadonlySet<string>>(new Set());
  filteredOrderCandidates(): IAxataSynchronizationManualDocumentCandidateItemApiDto[] {
    const term = this.actionSearchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!term) return this.orderCandidates();
    return this.orderCandidates().filter((item) =>
      `${item.documentReference} ${item.summary}`.toLocaleLowerCase('tr-TR').includes(term)
    );
  }

  filteredDeliveryCandidates(): IAxataOutboundDeliveryImportDocumentApiDto[] {
    const term = this.actionSearchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!term) return this.deliveryCandidates();
    return this.deliveryCandidates().filter((item) =>
      `${item.documentSerie}/${item.documentOrderNo} ${item.axataDeliveryNo}`
        .toLocaleLowerCase('tr-TR')
        .includes(term)
    );
  }

  ngOnInit(): void {
    this.loadOverview();
    this.loadActionDesk();
  }

  setTab(tab: CockpitTab): void {
    this.activeTab = tab;
    this.errorMessage.set(null);
    if (tab === 'overview' && !this.overview()) this.loadOverview();
    if (tab === 'performance' && !this.performance()) this.loadPerformance();
    if (tab === 'fillrate' && !this.fillRate()) this.loadFillRate();
    if (tab === 'capacity' && !this.capacity()) this.loadCapacity();
  }

  refreshActiveTab(): void {
    if (this.activeTab === 'actions') this.loadActionDesk();
    if (this.activeTab === 'overview') this.loadOverview();
    if (this.activeTab === 'performance') this.loadPerformance();
    if (this.activeTab === 'fillrate') this.loadFillRate();
    if (this.activeTab === 'capacity') this.loadCapacity();
    if (this.activeTab === 'trace' && this.searchTerm.trim()) this.searchTrace();
  }

  loadActionDesk(clearMessage: boolean = true): void {
    this.actionLoading.set(true);
    if (clearMessage) this.actionMessage.set(null);
    forkJoin({
      orders: this.integrationApi.getAxataManualDocumentCandidates('issued-warehouse-order-sync', {
        warehouseNo: 50,
        startDate: this.relativeDate(30),
        endDate: this.today(),
        skip: 0,
        take: 100
      }),
      deliveries: this.integrationApi.previewAxataC01OutboundDeliveryImport(100)
    })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: ({ orders, deliveries }: {
          orders: AxataSynchronizationManualDocumentCandidatesDto;
          deliveries: AxataOutboundDeliveryImportPreviewDto;
        }) => {
          this.orderCandidates.set(orders.items);
          this.deliveryCandidates.set(deliveries.documents.filter((item) => item.canImport));
          this.selectedOrderReferences.set(new Set());
          this.selectedDeliveryReferences.set(new Set());
        },
        error: (error: unknown) => this.handleActionError(error)
      });
  }

  toggleOrder(item: IAxataSynchronizationManualDocumentCandidateItemApiDto): void {
    this.selectedOrderReferences.update((current) => this.toggleSetValue(current, item.documentReference));
  }

  toggleDelivery(item: IAxataOutboundDeliveryImportDocumentApiDto): void {
    this.selectedDeliveryReferences.update((current) => this.toggleSetValue(current, this.deliveryKey(item)));
  }

  toggleAllOrders(): void {
    const visible = this.filteredOrderCandidates();
    const allSelected = visible.length > 0 && visible.every((item) => this.isOrderSelected(item));
    this.selectedOrderReferences.set(allSelected ? new Set() : new Set(visible.map((item) => item.documentReference)));
  }

  toggleAllDeliveries(): void {
    const visible = this.filteredDeliveryCandidates();
    const allSelected = visible.length > 0 && visible.every((item) => this.isDeliverySelected(item));
    this.selectedDeliveryReferences.set(allSelected ? new Set() : new Set(visible.map((item) => this.deliveryKey(item))));
  }

  isOrderSelected(item: IAxataSynchronizationManualDocumentCandidateItemApiDto): boolean {
    return this.selectedOrderReferences().has(item.documentReference);
  }

  isDeliverySelected(item: IAxataOutboundDeliveryImportDocumentApiDto): boolean {
    return this.selectedDeliveryReferences().has(this.deliveryKey(item));
  }

  dispatchSelectedOrders(): void {
    const selected = this.orderCandidates().filter((item) => this.isOrderSelected(item));
    if (!selected.length) {
      this.actionMessage.set('AXATA’ya gönderilecek en az bir sipariş seçin.');
      return;
    }

    this.actionLoading.set(true);
    this.actionMessage.set(null);
    this.integrationApi
      .dispatchAxataManualDocumentBatch('issued-warehouse-order-sync', {
        warehouseNo: 50,
        continueOnError: true,
        documents: selected.map((item) => ({
          documentSerie: item.documentSerie,
          documentOrderNo: item.documentOrderNo,
          documentNo: item.documentNo,
          documentDate: item.documentDate
        }))
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (result: {
          succeededDocumentCount: number;
          failedDocumentCount: number;
          failures?: Array<{ documentReference: string; errorMessage: string }>;
        }) => {
          const failureText = result.failures?.slice(0, 3)
            .map((item) => `${item.documentReference}: ${item.errorMessage}`)
            .join(' | ');
          this.actionMessage.set(
            `${result.succeededDocumentCount} sipariş AXATA’ya gönderildi, ${result.failedDocumentCount} sipariş hata aldı.` +
              (failureText ? ` ${failureText}` : '')
          );
          this.loadActionDesk(false);
        },
        error: (error: unknown) => this.handleActionError(error)
      });
  }

  importSelectedDeliveries(): void {
    const selected = this.deliveryCandidates().filter((item) => this.isDeliverySelected(item));
    if (!selected.length) {
      this.actionMessage.set('Mikro’ya aktarılacak en az bir sevk seçin.');
      return;
    }

    this.actionLoading.set(true);
    this.actionMessage.set(null);
    const operations = selected.map((item) =>
      this.integrationApi
        .executeAxataC01OutboundDeliveryDocumentImport(item.documentSerie, item.documentOrderNo, {
          status: item.status,
          acknowledge: true,
          dateMode: 'today'
        })
        .pipe(
          map(() => ({ success: true, reference: `${item.documentSerie}/${item.documentOrderNo}` })),
          catchError((error: unknown) => of({ success: false, reference: `${item.documentSerie}/${item.documentOrderNo}`, error }))
        )
    );

    forkJoin(operations)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe((results: Array<{ success: boolean; reference: string; error?: unknown }>) => {
        const succeeded = results.filter((item) => item.success).length;
        const failed = results.length - succeeded;
        const failureText = results
          .filter((item) => !item.success)
          .slice(0, 3)
          .map((item) => `${item.reference}: ${this.extractErrorDetail(item.error)}`)
          .join(' | ');
        this.actionMessage.set(
          `${succeeded} sevk Mikro’ya aktarıldı, ${failed} sevk hata aldı.` + (failureText ? ` ${failureText}` : '')
        );
        this.loadActionDesk(false);
        this.loadOverview();
      });
  }

  loadOverview(): void {
    this.beginRequest();
    this.api
      .getOverview(null, this.selectedDate)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: AxataWarehouseOverview) => this.overview.set(data),
        error: (error: unknown) => this.handleError(error)
      });
  }

  searchTrace(): void {
    const term = this.searchTerm.trim();
    if (!term) {
      this.errorMessage.set('Sipariş, irsaliye veya sevk numarası girin.');
      return;
    }
    this.beginRequest();
    this.traceResult.set(null);
    this.api
      .getTrace(term)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: AxataDocumentTrace) => this.traceResult.set(data),
        error: (error: unknown) => this.handleError(error)
      });
  }

  traceOrder(orderNo: string): void {
    this.searchTerm = orderNo;
    this.activeTab = 'trace';
    this.searchTrace();
  }

  loadPerformance(): void {
    if (!this.validateReportDates()) return;
    this.beginRequest();
    this.api
      .getPickingPerformance(this.reportStartDate, this.reportEndDate)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: AxataPickingPerformance) => this.performance.set(data),
        error: (error: unknown) => this.handleError(error)
      });
  }

  loadFillRate(): void {
    if (!this.validateReportDates()) return;
    this.beginRequest();
    this.api
      .getFillRate(this.reportStartDate, this.reportEndDate)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: AxataFillRate) => this.fillRate.set(data),
        error: (error: unknown) => this.handleError(error)
      });
  }

  loadCapacity(): void {
    this.beginRequest();
    this.api
      .getCapacity()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: AxataCapacity) => this.capacity.set(data),
        error: (error: unknown) => this.handleError(error)
      });
  }

  private beginRequest(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
  }

  private validateReportDates(): boolean {
    if (!this.reportStartDate || !this.reportEndDate || this.reportStartDate > this.reportEndDate) {
      this.errorMessage.set('Geçerli bir başlangıç ve bitiş tarihi seçin.');
      return false;
    }
    const dayCount = Math.floor((Date.parse(this.reportEndDate) - Date.parse(this.reportStartDate)) / 86_400_000) + 1;
    if (dayCount > 31) {
      this.errorMessage.set('Rapor aralığı en fazla 31 gün olabilir.');
      return false;
    }
    return true;
  }

  private handleError(error: unknown): void {
    const response = error as HttpErrorResponse;
    this.errorMessage.set(
      response.error?.detail || response.error?.title || 'AXATA verisi alınamadı. Bağlantıyı kontrol edip yeniden deneyin.'
    );
  }

  private handleActionError(error: unknown): void {
    this.actionMessage.set(this.extractErrorDetail(error));
  }

  private extractErrorDetail(error: unknown): string {
    const response = error as HttpErrorResponse;
    return response?.error?.detail || response?.error?.title || 'İşlem tamamlanamadı. Bağlantıyı kontrol edip yeniden deneyin.';
  }

  private toggleSetValue(current: ReadonlySet<string>, value: string): ReadonlySet<string> {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  private deliveryKey(item: IAxataOutboundDeliveryImportDocumentApiDto): string {
    return `${item.documentSerie}/${item.documentOrderNo}`;
  }

  private today(): string {
    return new Date().toLocaleDateString('en-CA');
  }

  private relativeDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toLocaleDateString('en-CA');
  }
}
