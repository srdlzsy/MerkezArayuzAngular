import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  IFurpaWarehouseSearchItemApiDto,
  IFurpaWarehouseOrderDetailApiDto,
  IFurpaWarehouseOrderItemApiDto,
  IFurpaProductSearchItemApiDto,
  IFurpaCreateWarehouseShippingRequestApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { TaslakService } from '../../../../../core/api/module-services/taslak.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

interface KalemFormValue {
  taslakGuid: string;
  siparisGuid: string;
  siparisReferansi: string;
  stokKodu: string;
  stokIsmi: string;
  barkodu: string;
  birim: string;
  birimKatsayisi: number | null;
  siparisMiktari: number | null;
  miktar: number | null;
  aciklama: string;
  skt: string;
  modelKodu: string;
}

type KalemFormGroup = FormGroup<{
  taslakGuid: FormControl<string>;
  siparisGuid: FormControl<string>;
  siparisReferansi: FormControl<string>;
  stokKodu: FormControl<string>;
  stokIsmi: FormControl<string>;
  barkodu: FormControl<string>;
  birim: FormControl<string>;
  birimKatsayisi: FormControl<number | null>;
  siparisMiktari: FormControl<number | null>;
  miktar: FormControl<number | null>;
  aciklama: FormControl<string>;
  skt: FormControl<string>;
  modelKodu: FormControl<string>;
}>;

@Component({
  selector: 'app-depolar-arasi-nakliye-sevk-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './depolar-arasi-nakliye-sevk-fisleri-create.component.html',
  styleUrl: './depolar-arasi-nakliye-sevk-fisleri-create.component.scss'
})
export class DepolarArasiNakliyeSevkFisleriCreateComponent extends DocsTaskDialogBase {
  private readonly authService = inject(AuthService);
  private readonly aramaService = inject(AramaService);
  private readonly taslakService = inject(TaslakService);
  private readonly sevkIslemleriService = inject(SevkIslemleriService);
  private readonly today = formatDateOnly(new Date());

  protected readonly page: DocsContentPage = DOCS_PAGES['giden-depolar-arasi-sevkler'];
  protected readonly warehouseQuery = new FormControl('', { nonNullable: true });
  protected readonly stockQuery = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly warehouseResults = signal<IFurpaWarehouseSearchItemApiDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly selectedWarehouse = signal<IFurpaWarehouseSearchItemApiDto | null>(null);
  protected readonly warehouseLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly orderLoading = signal(false);
  protected readonly warehouseError = signal('');
  protected readonly stockError = signal('');
  protected readonly orderError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly availableOrders = signal<IFurpaWarehouseOrderDetailApiDto[]>([]);
  protected readonly selectedOrderKeys = signal<string[]>([]);
  private warehouseRequestId = 0;
  private stockRequestId = 0;
  private orderRequestId = 0;

  protected readonly controls = {
    muhatapDepoNo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    muhatapAdSoyad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    transitWarehouseNo: new FormControl<number | null>(60, {
      validators: [Validators.required, Validators.min(1)]
    }),
    movementDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentNo: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    kalemler: new FormArray<KalemFormGroup>([])
  };
  protected readonly form = new FormGroup(this.controls);

  constructor() {
    super();
    effect(() => {
      const hasWarehouse = !!this.selectedWarehouse();
      if (hasWarehouse) {
        this.stockQuery.enable({ emitEvent: false });
      } else {
        this.stockQuery.disable({ emitEvent: false });
      }
    });
  }

  protected get kalemler(): FormArray<KalemFormGroup> {
    return this.controls.kalemler;
  }

  protected searchWarehouse(): void {
    const query = this.warehouseQuery.value.trim();

    if (this.warehouseLoading()) {
      return;
    }

    this.warehouseError.set('');
    this.warehouseResults.set([]);

    if (query.length < 2) {
      this.warehouseError.set('Depo aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = ++this.warehouseRequestId;
    this.warehouseLoading.set(true);

    this.aramaService
      .searchWarehouse(query)
      .pipe(finalize(() => requestId === this.warehouseRequestId && this.warehouseLoading.set(false)))
      .subscribe({
        next: (results: IFurpaWarehouseSearchItemApiDto[]) => {
          if (requestId !== this.warehouseRequestId) {
            return;
          }

          const normalizedResults = this.normalizeWarehouses(results ?? []);
          this.warehouseResults.set(normalizedResults);

          if (normalizedResults.length === 0) {
            this.warehouseError.set('Aramana uygun depo bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.warehouseRequestId) {
            return;
          }

          this.warehouseError.set(this.resolveErrorMessage(error, 'Depo aramasi yapilamadi.'));
        }
      });
  }

  protected selectWarehouse(warehouse: IFurpaWarehouseSearchItemApiDto): void {
    const previousWarehouseNo = this.selectedWarehouse()?.warehouseNo ?? null;
    const warehouseChanged = previousWarehouseNo !== null && previousWarehouseNo !== warehouse.warehouseNo;

    this.selectedWarehouse.set(warehouse);
    this.controls.muhatapDepoNo.setValue(warehouse.warehouseNo);
    this.controls.muhatapDepoNo.markAsDirty();
    this.controls.muhatapDepoNo.markAsTouched();
    this.controls.muhatapAdSoyad.setValue(this.resolveWarehouseContact(warehouse));
    this.controls.muhatapAdSoyad.markAsDirty();

    this.warehouseQuery.setValue(this.getWarehouseLabel(warehouse));
    this.warehouseResults.set([]);
    this.warehouseError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);
    this.orderError.set('');

    if (warehouseChanged) {
      this.kalemler.clear();
    }
  }

  protected clearWarehouse(): void {
    this.selectedWarehouse.set(null);
    this.controls.muhatapDepoNo.reset(null);
    this.controls.muhatapAdSoyad.setValue('');
    this.warehouseQuery.setValue('');
    this.warehouseResults.set([]);
    this.warehouseError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);
    this.orderError.set('');
    this.kalemler.clear();
  }

  protected loadOrdersFromWarehouse(): void {
    if (this.orderLoading()) {
      return;
    }

    const selectedWarehouse = this.selectedWarehouse();
    if (!selectedWarehouse) {
      this.orderError.set('Siparis getirmek icin once muhatap depo secmelisin.');
      return;
    }

    const currentWarehouseNo = this.authService.currentUser()?.depoNo;
    if (currentWarehouseNo === null || currentWarehouseNo === undefined) {
      this.orderError.set('Aktif depo bilgisi bulunamadi.');
      return;
    }

    const requestId = ++this.orderRequestId;
    this.orderLoading.set(true);
    this.orderError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);

    this.taslakService
      .getAlinanDepoSiparisleri(selectedWarehouse.warehouseNo, currentWarehouseNo)
      .pipe(finalize(() => requestId === this.orderRequestId && this.orderLoading.set(false)))
      .subscribe({
        next: (orders: IFurpaWarehouseOrderDetailApiDto[]) => {
          if (requestId !== this.orderRequestId) {
            return;
          }

          const normalizedOrders = this.normalizeOrders(orders ?? []);
          this.availableOrders.set(normalizedOrders);

          if (normalizedOrders.length === 0) {
            this.orderError.set('Secilen depo icin sevk edilecek siparis bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.orderRequestId) {
            return;
          }

          this.orderError.set(this.resolveErrorMessage(error, 'Siparisler yuklenirken hata olustu.'));
        }
      });
  }

  protected toggleOrderSelection(order: IFurpaWarehouseOrderDetailApiDto, checked: boolean): void {
    const key = this.getOrderKey(order);
    const currentSelection = this.selectedOrderKeys();

    if (checked) {
      if (!currentSelection.includes(key)) {
        this.selectedOrderKeys.set([...currentSelection, key]);
      }
      return;
    }

    this.selectedOrderKeys.set(currentSelection.filter((item) => item !== key));
  }

  protected isOrderSelected(order: IFurpaWarehouseOrderDetailApiDto): boolean {
    return this.selectedOrderKeys().includes(this.getOrderKey(order));
  }

  protected selectedOrderCount(): number {
    return this.selectedOrderKeys().length;
  }

  protected addSelectedOrdersToKalemler(): void {
    const selectedOrders = this.getSelectedOrders();

    if (selectedOrders.length === 0) {
      this.orderError.set('Kalemlere eklemek icin en az bir siparis secmelisin.');
      return;
    }

    let addedKalemCount = 0;

    for (const order of selectedOrders) {
      const siparisReferansi = this.getOrderReference(order);

      for (const kalem of order.items ?? []) {
        this.addOrMergeKalemFromSiparis(kalem, siparisReferansi || 'Siparis');
        addedKalemCount += 1;
      }
    }

    if (addedKalemCount === 0) {
      this.orderError.set('Secilen siparislerde kalem bulunamadi.');
      return;
    }

    this.orderError.set('');
    this.stockError.set('');
  }

  protected removeSelectedOrdersFromKalemler(): void {
    const selectedOrders = this.getSelectedOrders();

    if (selectedOrders.length === 0) {
      this.orderError.set('Kalemlerden kaldirmak icin en az bir siparis secmelisin.');
      return;
    }

    const selectedReferences = new Set(
      selectedOrders.map((order) => this.getOrderReference(order).toLocaleUpperCase('tr-TR')).filter(Boolean)
    );
    const selectedSiparisGuids = new Set(
      selectedOrders
        .flatMap((order) => order.items ?? [])
        .map((kalem) => kalem.lineGuid?.trim().toLocaleUpperCase('tr-TR') ?? '')
        .filter(Boolean)
    );

    let removedKalemCount = 0;

    for (let index = this.kalemler.length - 1; index >= 0; index -= 1) {
      const control = this.kalemler.at(index);
      const siparisGuid = control.controls.siparisGuid.value.trim().toLocaleUpperCase('tr-TR');
      const siparisReferansi = control.controls.siparisReferansi.value.trim().toLocaleUpperCase('tr-TR');

      if (
        selectedSiparisGuids.has(siparisGuid) ||
        (siparisReferansi && selectedReferences.has(siparisReferansi))
      ) {
        this.kalemler.removeAt(index);
        removedKalemCount += 1;
      }
    }

    if (removedKalemCount === 0) {
      this.orderError.set('Secilen siparislere ait ekli kalem bulunamadi.');
      return;
    }

    this.orderError.set('');
    this.stockError.set('');
  }

  protected getOrderDisplay(order: IFurpaWarehouseOrderDetailApiDto): string {
    const seri = order.header.documentSerie?.trim() || '-';
    const sira = order.header.documentOrderNo ?? '-';
    return `${seri}/${sira}`;
  }

  protected searchStock(): void {
    const query = this.stockQuery.value.trim();

    if (this.stockLoading()) {
      return;
    }

    this.stockError.set('');
    this.stockResults.set([]);

    if (!this.selectedWarehouse()) {
      this.stockError.set('Once muhatap depo secmelisin.');
      return;
    }

    if (query.length < 2) {
      this.stockError.set('Stok aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = ++this.stockRequestId;
    this.stockLoading.set(true);

    this.aramaService
      .searchStock(query)
      .pipe(finalize(() => requestId === this.stockRequestId && this.stockLoading.set(false)))
      .subscribe({
        next: (results: IFurpaProductSearchItemApiDto[]) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          const normalizedResults = this.normalizeStocks(results ?? []);
          this.stockResults.set(normalizedResults);

          if (normalizedResults.length === 0) {
            this.stockError.set('Aramana uygun stok bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          this.stockError.set(this.resolveErrorMessage(error, 'Stok aramasi yapilamadi.'));
        }
      });
  }

  protected addKalem(stock: IFurpaProductSearchItemApiDto): void {
    const normalizedStockCode = stock.stockCode.trim().toLocaleUpperCase('tr-TR');
    const existingControl = this.kalemler.controls.find(
      (control) =>
        control.controls.stokKodu.value.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode &&
        !control.controls.siparisGuid.value.trim()
    );

    if (existingControl) {
      const step = stock.unitMultiplier ?? existingControl.controls.birimKatsayisi.value ?? 1;
      const current = Number(existingControl.controls.miktar.value ?? 0);
      existingControl.controls.miktar.setValue(current + step);
      existingControl.controls.miktar.markAsDirty();
      this.stockQuery.setValue('');
      this.stockResults.set([]);
      this.stockError.set('');
      return;
    }

    this.kalemler.push(this.createKalemFormGroup(stock));
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
  }

  protected removeKalem(index: number): void {
    this.kalemler.removeAt(index);
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.submitError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }

    if (!this.selectedWarehouse()) {
      this.warehouseError.set('Muhatap depo secilmelidir.');
    }

    if (this.kalemler.length === 0) {
      this.stockError.set('Sevk icin en az bir kalem eklemelisin.');
    }

    if (this.form.invalid || !this.selectedWarehouse() || this.kalemler.length === 0) {
      return;
    }

    this.submitting.set(true);

    this.sevkIslemleriService
      .createDepolarArasiNakliyeSevkFisi(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Depolar arasi nakliye sevk fisi kaydedilirken hata olustu.')
          );
        }
      });
  }

  protected kalemCount(): number {
    return this.kalemler.length;
  }

  protected toplamMiktar(): number {
    return this.kalemler.controls.reduce(
      (total, control) => total + Number(control.controls.miktar.value ?? 0),
      0
    );
  }

  protected getWarehouseLabel(warehouse: IFurpaWarehouseSearchItemApiDto): string {
    return `${warehouse.warehouseNo} - ${this.getWarehouseName(warehouse)}`;
  }

  protected getWarehouseName(warehouse: IFurpaWarehouseSearchItemApiDto): string {
    return warehouse.warehouseName?.trim() || 'Depo';
  }

  protected readonly trackByWarehouse = (_index: number, warehouse: IFurpaWarehouseSearchItemApiDto): string =>
    `${warehouse.warehouseNo}-${warehouse.warehouseName?.trim() || _index}`;

  protected readonly trackByStock = (_index: number, stock: IFurpaProductSearchItemApiDto): string =>
    stock.stockCode?.trim() || stock.barcode?.trim() || `${_index}`;

  protected readonly trackByKalem = (index: number, control: KalemFormGroup): string =>
    `${control.controls.stokKodu.value.trim()}_${control.controls.siparisGuid.value.trim() || index}`;

  protected readonly trackByOrder = (_index: number, order: IFurpaWarehouseOrderDetailApiDto): string =>
    this.getOrderKey(order);

  private createKalemFormGroup(stock: IFurpaProductSearchItemApiDto): KalemFormGroup {
    return new FormGroup({
      taslakGuid: new FormControl('', { nonNullable: true }),
      siparisGuid: new FormControl('', { nonNullable: true }),
      siparisReferansi: new FormControl('', { nonNullable: true }),
      stokKodu: new FormControl(stock.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stokIsmi: new FormControl(stock.stockName?.trim() ?? '', { nonNullable: true }),
      barkodu: new FormControl(stock.barcode?.trim() ?? '', { nonNullable: true }),
      birim: new FormControl(stock.unitName?.trim() ?? '', { nonNullable: true }),
      birimKatsayisi: new FormControl(stock.unitMultiplier ?? null),
      siparisMiktari: new FormControl<number | null>(null),
      miktar: new FormControl<number | null>(1, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      aciklama: new FormControl('', { nonNullable: true }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl('', { nonNullable: true })
    });
  }

  private addOrMergeKalemFromSiparis(kalem: IFurpaWarehouseOrderItemApiDto, siparisReferansi: string): void {
    const stokKodu = kalem.stockCode?.trim() ?? '';
    if (!stokKodu) {
      return;
    }

    const siparisGuid = kalem.lineGuid?.trim() ?? '';
    const normalizedStockCode = stokKodu.toLocaleUpperCase('tr-TR');
    const normalizedSiparisGuid = siparisGuid.toLocaleUpperCase('tr-TR');

    const existingControl = this.kalemler.controls.find((control) => {
      const controlStockCode = control.controls.stokKodu.value.trim().toLocaleUpperCase('tr-TR');
      const controlSiparisGuid = control.controls.siparisGuid.value.trim().toLocaleUpperCase('tr-TR');
      return controlStockCode === normalizedStockCode && controlSiparisGuid === normalizedSiparisGuid;
    });

    const quantity = Number(kalem.quantity ?? 0);
    const incomingQuantity = quantity > 0 ? quantity : 1;

    if (existingControl) {
      const currentSiparis = Number(existingControl.controls.siparisMiktari.value ?? 0);
      const currentSevk = Number(existingControl.controls.miktar.value ?? 0);
      existingControl.controls.siparisMiktari.setValue(currentSiparis + incomingQuantity);
      existingControl.controls.miktar.setValue(currentSevk + incomingQuantity);
      existingControl.controls.siparisMiktari.markAsDirty();
      existingControl.controls.miktar.markAsDirty();
      return;
    }

    this.kalemler.push(
      new FormGroup({
        taslakGuid: new FormControl('', { nonNullable: true }),
        siparisGuid: new FormControl(siparisGuid, { nonNullable: true }),
        siparisReferansi: new FormControl(siparisReferansi, { nonNullable: true }),
        stokKodu: new FormControl(stokKodu, {
          nonNullable: true,
          validators: [Validators.required]
        }),
        stokIsmi: new FormControl(kalem.stockName?.trim() ?? '', { nonNullable: true }),
        barkodu: new FormControl('', { nonNullable: true }),
        birim: new FormControl(kalem.unitName?.trim() ?? '', { nonNullable: true }),
        birimKatsayisi: new FormControl(kalem.unitPointer ?? 1),
        siparisMiktari: new FormControl<number | null>(incomingQuantity),
        miktar: new FormControl<number | null>(incomingQuantity, {
          validators: [Validators.required, Validators.min(0.01)]
        }),
        aciklama: new FormControl(kalem.description?.trim() ?? '', { nonNullable: true }),
        skt: new FormControl('', { nonNullable: true }),
        modelKodu: new FormControl('', { nonNullable: true })
      })
    );
  }

  private buildRequest(): IFurpaCreateWarehouseShippingRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      targetWarehouseNo: rawValue.muhatapDepoNo ?? 0,
      transitWarehouseNo: rawValue.transitWarehouseNo ?? 60,
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: rawValue.documentNo.trim(),
      description: rawValue.description.trim(),
      lines: rawValue.kalemler.map((kalem) => this.mapKalem(kalem))
    };
  }

  private mapKalem(kalem: KalemFormValue) {
    const warehouseOrderLineGuid = this.normalizeOptionalText(kalem.siparisGuid);

    return {
      ...(warehouseOrderLineGuid ? { warehouseOrderLineGuid } : {}),
      stockCode: kalem.stokKodu.trim(),
      quantity: Number(kalem.miktar ?? 0),
      unitPrice: 0,
      unitPointer: kalem.birimKatsayisi ?? 1,
      description: kalem.aciklama.trim(),
      partyCode: '',
      lotNo: 0,
      projectCode: ''
    };
  }

  private getSelectedOrders(): IFurpaWarehouseOrderDetailApiDto[] {
    return this.availableOrders().filter((order) =>
      this.selectedOrderKeys().includes(this.getOrderKey(order))
    );
  }

  private getOrderKey(order: IFurpaWarehouseOrderDetailApiDto): string {
    return `${order.header.documentSerie ?? ''}__${order.header.documentOrderNo ?? ''}`.trim();
  }

  private getOrderReference(order: IFurpaWarehouseOrderDetailApiDto): string {
    return `${order.header.documentSerie ?? ''}/${order.header.documentOrderNo ?? ''}`.replace(/^\/+|\/+$/g, '');
  }

  private normalizeOrders(orders: IFurpaWarehouseOrderDetailApiDto[]): IFurpaWarehouseOrderDetailApiDto[] {
    const uniqueOrders = new Map<string, IFurpaWarehouseOrderDetailApiDto>();

    for (const order of orders) {
      const key = this.getOrderKey(order);
      if (!key || uniqueOrders.has(key)) {
        continue;
      }

      uniqueOrders.set(key, order);
    }

    return Array.from(uniqueOrders.values()).sort((left, right) => {
      const leftDate = new Date(left.header.documentDate ?? '').getTime();
      const rightDate = new Date(right.header.documentDate ?? '').getTime();

      if (Number.isNaN(leftDate) || Number.isNaN(rightDate)) {
        return this.getOrderDisplay(left).localeCompare(this.getOrderDisplay(right), 'tr');
      }

      return rightDate - leftDate;
    });
  }

  private normalizeWarehouses(results: IFurpaWarehouseSearchItemApiDto[]): IFurpaWarehouseSearchItemApiDto[] {
    const uniqueWarehouses = new Map<number, IFurpaWarehouseSearchItemApiDto>();

    for (const warehouse of results) {
      if (!Number.isFinite(warehouse.warehouseNo) || uniqueWarehouses.has(warehouse.warehouseNo)) {
        continue;
      }

      uniqueWarehouses.set(warehouse.warehouseNo, warehouse);
    }

    return Array.from(uniqueWarehouses.values()).sort((left, right) => left.warehouseNo - right.warehouseNo);
  }

  private normalizeStocks(results: IFurpaProductSearchItemApiDto[]): IFurpaProductSearchItemApiDto[] {
    const uniqueStocks = new Map<string, IFurpaProductSearchItemApiDto>();

    for (const stock of results) {
      const key = stock.stockCode?.trim().toLocaleUpperCase('tr-TR');

      if (!key || uniqueStocks.has(key)) {
        continue;
      }

      uniqueStocks.set(key, stock);
    }

    return Array.from(uniqueStocks.values()).sort((left, right) =>
      (left.stockName ?? '').localeCompare(right.stockName ?? '', 'tr')
    );
  }

  private resolveWarehouseContact(warehouse: IFurpaWarehouseSearchItemApiDto): string {
    return warehouse.warehouseName?.trim()
      || [warehouse.address, warehouse.district, warehouse.province].filter(Boolean).join(' ').trim()
      || '';
  }

  private normalizeOptionalText(value: string): string | null {
    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string' &&
      error.error.message.trim()
    ) {
      return error.error.message;
    }

    return fallback;
  }
}
