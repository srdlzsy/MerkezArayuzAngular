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
  IFurpaCustomerSearchItemApiDto,
  IFurpaCompanyOrderDetailApiDto,
  IFurpaCompanyOrderItemApiDto,
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaProductSearchItemApiDto,
} from '@interfaces';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import { MalKabulIslemleriService, TaslakService } from '@core/api/module-services';

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
  malKabulMiktari: number | null;
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
  malKabulMiktari: FormControl<number | null>;
  aciklama: FormControl<string>;
  skt: FormControl<string>;
  modelKodu: FormControl<string>;
}>;

const DOCUMENT_NO_PATTERN = /^[A-Za-z][A-Za-z0-9]*\d{9}$/;

@Component({
  selector: 'app-toptan-giris-irsaliyeleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './toptan-giris-irsaliyeleri-create.component.html',
  styleUrl: './toptan-giris-irsaliyeleri-create.component.scss'
})
export class ToptanGirisIrsaliyeleriCreateComponent extends DocsTaskDialogBase {
  private readonly authService = inject(AuthService);
  private readonly aramaService = inject(AramaService);
  private readonly taslakService = inject(TaslakService);
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);
  private readonly today = formatDateOnly(new Date());

  protected readonly page: DocsContentPage = DOCS_PAGES['firma-mal-kabulleri'];
  protected readonly customerQuery = new FormControl('', { nonNullable: true });
  protected readonly stockQuery = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly customerResults = signal<IFurpaCustomerSearchItemApiDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly selectedCustomer = signal<IFurpaCustomerSearchItemApiDto | null>(null);
  protected readonly customerLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly orderLoading = signal(false);
  protected readonly customerError = signal('');
  protected readonly stockError = signal('');
  protected readonly orderError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly availableOrders = signal<IFurpaCompanyOrderDetailApiDto[]>([]);
  protected readonly selectedOrderKeys = signal<string[]>([]);
  private customerRequestId = 0;
  private stockRequestId = 0;
  private orderRequestId = 0;

  protected readonly controls = {
    muhatapFirmaCariKod: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    muhatapFirmaUnvani: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    muhatapAdSoyad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    movementDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentNo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(DOCUMENT_NO_PATTERN)]
    }),
    deliverer: new FormControl('', { nonNullable: true }),
    receiver: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    allowOrderOverReceiving: new FormControl(false, { nonNullable: true }),
    kalemler: new FormArray<KalemFormGroup>([])
  };
  protected readonly form = new FormGroup(this.controls);

  constructor() {
    super();
    effect(() => {
      const hasCustomer = !!this.selectedCustomer();
      if (hasCustomer) {
        this.stockQuery.enable({ emitEvent: false });
      } else {
        this.stockQuery.disable({ emitEvent: false });
      }
    });
  }

  protected get kalemler(): FormArray<KalemFormGroup> {
    return this.controls.kalemler;
  }

  protected isDocumentNoInvalid(): boolean {
    const control = this.controls.documentNo;
    return control.invalid && (control.touched || control.dirty);
  }

  protected searchCustomer(): void {
    const query = this.customerQuery.value.trim();

    if (this.customerLoading()) {
      return;
    }

    this.customerError.set('');
    this.customerResults.set([]);

    if (query.length < 2) {
      this.customerError.set('Firma aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = ++this.customerRequestId;
    this.customerLoading.set(true);

    this.aramaService
      .searchCustomerAccount(query)
      .pipe(finalize(() => requestId === this.customerRequestId && this.customerLoading.set(false)))
      .subscribe({
        next: (results: IFurpaCustomerSearchItemApiDto[]) => {
          if (requestId !== this.customerRequestId) {
            return;
          }

          const normalizedResults = this.normalizeCustomers(results ?? []);
          this.customerResults.set(normalizedResults);

          if (normalizedResults.length === 0) {
            this.customerError.set('Aramana uygun firma bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.customerRequestId) {
            return;
          }

          this.customerError.set(this.resolveErrorMessage(error, 'Firma aramasi yapilamadi.'));
        }
      });
  }

  protected selectCustomer(customer: IFurpaCustomerSearchItemApiDto): void {
    const previousCustomerCode = this.selectedCustomer()?.customerCode?.trim() ?? '';
    const nextCustomerCode = customer.customerCode?.trim() ?? '';
    const customerChanged = !!previousCustomerCode && previousCustomerCode !== nextCustomerCode;

    this.selectedCustomer.set(customer);
    this.controls.muhatapFirmaCariKod.setValue(customer.customerCode?.trim() ?? '');
    this.controls.muhatapFirmaUnvani.setValue(customer.customerDisplayName?.trim() ?? '');
    this.controls.muhatapAdSoyad.setValue(customer.customerDisplayName?.trim() ?? '');
    this.controls.muhatapFirmaCariKod.markAsDirty();
    this.controls.muhatapFirmaUnvani.markAsDirty();
    this.controls.muhatapAdSoyad.markAsDirty();

    if (!this.controls.deliverer.value.trim()) {
      this.controls.deliverer.setValue(customer.customerDisplayName?.trim() ?? '');
    }

    this.customerQuery.setValue(this.getCustomerLabel(customer));
    this.customerResults.set([]);
    this.customerError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);
    this.orderError.set('');

    if (customerChanged) {
      this.kalemler.clear();
    }
  }

  protected clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.controls.muhatapFirmaCariKod.setValue('');
    this.controls.muhatapFirmaUnvani.setValue('');
    this.controls.muhatapAdSoyad.setValue('');
    this.customerQuery.setValue('');
    this.customerResults.set([]);
    this.customerError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);
    this.orderError.set('');
    this.kalemler.clear();
  }

  protected loadOrdersFromCustomer(): void {
    if (this.orderLoading()) {
      return;
    }

    const selectedCustomer = this.selectedCustomer();
    if (!selectedCustomer?.customerCode?.trim()) {
      this.orderError.set('Siparis getirmek icin once firma secmelisin.');
      return;
    }

    const depoNo = this.authService.currentUser()?.depoNo;
    if (depoNo === null || depoNo === undefined) {
      this.orderError.set('Aktif depo bilgisi bulunamadi.');
      return;
    }

    const requestId = ++this.orderRequestId;
    this.orderLoading.set(true);
    this.orderError.set('');
    this.availableOrders.set([]);
    this.selectedOrderKeys.set([]);

    this.taslakService
      .getVerilenFirmaSiparisleri(selectedCustomer.customerCode.trim(), depoNo)
      .pipe(finalize(() => requestId === this.orderRequestId && this.orderLoading.set(false)))
      .subscribe({
        next: (orders: IFurpaCompanyOrderDetailApiDto[]) => {
          if (requestId !== this.orderRequestId) {
            return;
          }

          const normalizedOrders = this.normalizeOrders(orders ?? []);
          this.availableOrders.set(normalizedOrders);

          if (normalizedOrders.length === 0) {
            this.orderError.set('Secilen firma icin verilen siparis bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.orderRequestId) {
            return;
          }

          this.orderError.set(
            this.resolveErrorMessage(error, 'Siparisler yuklenirken hata olustu.')
          );
        }
      });
  }

  protected toggleOrderSelection(order: IFurpaCompanyOrderDetailApiDto, checked: boolean): void {
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

  protected isOrderSelected(order: IFurpaCompanyOrderDetailApiDto): boolean {
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
        .map((kalem) => kalem.orderGuid?.trim().toLocaleUpperCase('tr-TR') ?? '')
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

  protected getOrderDisplay(order: IFurpaCompanyOrderDetailApiDto): string {
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

    if (!this.selectedCustomer()) {
      this.stockError.set('Once muhatap firma secmelisin.');
      return;
    }

    if (query.length < 2) {
      this.stockError.set('Stok aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = ++this.stockRequestId;
    this.stockLoading.set(true);

    this.aramaService
      .searchStockByCustomerCode(query, this.selectedCustomer()?.customerCode ?? '')
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
      const currentMalKabul = Number(existingControl.controls.malKabulMiktari.value ?? 0);
      existingControl.controls.malKabulMiktari.setValue(currentMalKabul + step);
      existingControl.controls.malKabulMiktari.markAsDirty();
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

    if (!this.selectedCustomer()) {
      this.customerError.set('Muhatap firma secilmelidir.');
    }

    if (this.kalemler.length === 0) {
      this.stockError.set('Irsaliye icin en az bir kalem eklemelisin.');
    }

    if (this.form.invalid || !this.selectedCustomer() || this.kalemler.length === 0) {
      return;
    }

    this.submitting.set(true);

    this.malKabulIslemleriService
      .createToptanGirisIrsaliyesi(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Toptan giris irsaliyesi kaydedilirken hata olustu.')
          );
        }
      });
  }

  protected kalemCount(): number {
    return this.kalemler.length;
  }

  protected toplamSiparisMiktari(): number {
    return this.kalemler.controls.reduce(
      (total, control) => total + Number(control.controls.siparisMiktari.value ?? 0),
      0
    );
  }

  protected toplamMalKabulMiktari(): number {
    return this.kalemler.controls.reduce(
      (total, control) => total + Number(control.controls.malKabulMiktari.value ?? 0),
      0
    );
  }

  protected getKalemFark(control: KalemFormGroup): number {
    return (
      Number(control.controls.siparisMiktari.value ?? 0) -
      Number(control.controls.malKabulMiktari.value ?? 0)
    );
  }

  protected getCustomerLabel(customer: IFurpaCustomerSearchItemApiDto): string {
    const name = customer.customerDisplayName?.trim() || 'Firma';
    return `${customer.customerCode?.trim() || ''} - ${name}`;
  }

  protected readonly trackByCustomer = (_index: number, customer: IFurpaCustomerSearchItemApiDto): string =>
    customer.customerCode?.trim() || customer.customerDisplayName?.trim() || `${_index}`;

  protected readonly trackByStock = (_index: number, stock: IFurpaProductSearchItemApiDto): string =>
    stock.stockCode?.trim() || stock.barcode?.trim() || `${_index}`;

  protected readonly trackByKalem = (index: number, control: KalemFormGroup): string =>
    `${control.controls.stokKodu.value.trim()}_${control.controls.siparisGuid.value.trim() || index}`;

  protected readonly trackByOrder = (_index: number, order: IFurpaCompanyOrderDetailApiDto): string =>
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
      siparisMiktari: new FormControl<number | null>(0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      malKabulMiktari: new FormControl<number | null>(1, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      aciklama: new FormControl('', { nonNullable: true }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl('', { nonNullable: true })
    });
  }

  private addOrMergeKalemFromSiparis(kalem: IFurpaCompanyOrderItemApiDto, siparisReferansi: string): void {
    const stokKodu = kalem.stockCode?.trim() ?? '';
    if (!stokKodu) {
      return;
    }

    const siparisGuid = kalem.orderGuid?.trim() ?? '';
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
      const currentMalKabul = Number(existingControl.controls.malKabulMiktari.value ?? 0);
      existingControl.controls.siparisMiktari.setValue(currentSiparis + incomingQuantity);
      existingControl.controls.malKabulMiktari.setValue(currentMalKabul + incomingQuantity);
      existingControl.controls.siparisMiktari.markAsDirty();
      existingControl.controls.malKabulMiktari.markAsDirty();
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
        siparisMiktari: new FormControl<number | null>(incomingQuantity, {
          validators: [Validators.required, Validators.min(0.01)]
        }),
        malKabulMiktari: new FormControl<number | null>(incomingQuantity, {
          validators: [Validators.required, Validators.min(0.01)]
        }),
        aciklama: new FormControl(kalem.description?.trim() ?? '', { nonNullable: true }),
        skt: new FormControl('', { nonNullable: true }),
        modelKodu: new FormControl('', { nonNullable: true })
      })
    );
  }

  private buildRequest(): IFurpaCreateCompanyReceiptRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      customerCode: rawValue.muhatapFirmaCariKod.trim(),
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: rawValue.documentNo.trim(),
      deliverer: rawValue.deliverer.trim(),
      receiver: rawValue.receiver.trim(),
      description: rawValue.description.trim(),
      allowOrderOverReceiving: rawValue.allowOrderOverReceiving,
      lines: rawValue.kalemler.map((kalem) => this.mapKalem(kalem))
    };
  }

  private mapKalem(kalem: KalemFormValue) {
    return {
      stockCode: kalem.stokKodu.trim(),
      quantity: Number(kalem.malKabulMiktari ?? 0),
      unitPrice: 0,
      unitPointer: kalem.birimKatsayisi ?? 1,
      lastConsumingDate: this.normalizeOptionalText(kalem.skt) ?? undefined,
      orderGuid: this.normalizeOptionalText(kalem.siparisGuid),
      description: kalem.aciklama.trim(),
      partyCode: '',
      lotNo: 0,
      projectCode: '',
      customerResponsibilityCenter: '',
      productResponsibilityCenter: ''
    };
  }

  private getSelectedOrders(): IFurpaCompanyOrderDetailApiDto[] {
    return this.availableOrders().filter((order) =>
      this.selectedOrderKeys().includes(this.getOrderKey(order))
    );
  }

  private getOrderKey(order: IFurpaCompanyOrderDetailApiDto): string {
    return `${order.header.documentSerie ?? ''}__${order.header.documentOrderNo ?? ''}`.trim();
  }

  private getOrderReference(order: IFurpaCompanyOrderDetailApiDto): string {
    return `${order.header.documentSerie ?? ''}/${order.header.documentOrderNo ?? ''}`.replace(/^\/+|\/+$/g, '');
  }

  private normalizeOrders(orders: IFurpaCompanyOrderDetailApiDto[]): IFurpaCompanyOrderDetailApiDto[] {
    const uniqueOrders = new Map<string, IFurpaCompanyOrderDetailApiDto>();

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

  private normalizeCustomers(results: IFurpaCustomerSearchItemApiDto[]): IFurpaCustomerSearchItemApiDto[] {
    const uniqueCustomers = new Map<string, IFurpaCustomerSearchItemApiDto>();

    for (const customer of results) {
      const key = customer.customerCode?.trim();
      if (!key || uniqueCustomers.has(key)) {
        continue;
      }

      uniqueCustomers.set(key, customer);
    }

    return Array.from(uniqueCustomers.values()).sort((left, right) =>
      (left.customerDisplayName ?? '').localeCompare(right.customerDisplayName ?? '', 'tr')
    );
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


