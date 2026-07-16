import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  IFurpaCustomerSearchItemApiDto,
  IFurpaCreateCompanyOrderRequestApiDto,
  IFurpaCreateCompanyOrderLineRequestApiDto,
  IFurpaProductSearchItemApiDto,
} from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import {
  currentUserIsAdmin,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../../../core/admin-warehouse.helpers';

interface KalemFormValue {
  stokKodu: string;
  stokIsmi: string;
  barkodu: string;
  birim: string;
  birimKatsayisi: number | null;
  siparisMiktari: number | null;
  aciklama: string;
  skt: string;
  modelKodu: string;
}

type KalemFormGroup = FormGroup<{
  stokKodu: FormControl<string>;
  stokIsmi: FormControl<string>;
  barkodu: FormControl<string>;
  birim: FormControl<string>;
  birimKatsayisi: FormControl<number | null>;
  siparisMiktari: FormControl<number | null>;
  aciklama: FormControl<string>;
  skt: FormControl<string>;
  modelKodu: FormControl<string>;
}>;

@Component({
  selector: 'app-verilen-siparisler-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verilen-siparisler-create.component.html',
  styleUrl: './verilen-siparisler-create.component.scss'
})
export class VerilenSiparislerCreateComponent extends DocsTaskDialogBase {
  private readonly aramaService = inject(AramaService);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());

  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-firma-siparisleri'];
  protected readonly customerQuery = new FormControl('', { nonNullable: true });
  protected readonly stockQuery = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly customerResults = signal<IFurpaCustomerSearchItemApiDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly selectedCustomer = signal<IFurpaCustomerSearchItemApiDto | null>(null);
  protected readonly customerLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly recommendedKalemlerLoading = signal(false);
  protected readonly customerError = signal('');
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  private customerRequestId = 0;
  private stockRequestId = 0;
  private recommendedKalemlerRequestId = 0;

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
    orderDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    deliveryDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    description1: new FormControl('', { nonNullable: true }),
    description2: new FormControl('', { nonNullable: true }),
    deliverer: new FormControl('', { nonNullable: true }),
    receiver: new FormControl('', { nonNullable: true }),
    adminWarehouseNo: new FormControl<number | null>(null),
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
    const previousCariKod = this.selectedCustomer()?.customerCode?.trim() ?? '';
    const nextCariKod = customer.customerCode?.trim() ?? '';
    const customerChanged = previousCariKod !== nextCariKod;

    this.recommendedKalemlerRequestId++;
    this.recommendedKalemlerLoading.set(false);

    this.selectedCustomer.set(customer);
    this.controls.muhatapFirmaCariKod.setValue(nextCariKod);
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

    if (customerChanged) {
      this.stockQuery.setValue('');
      this.stockResults.set([]);
      this.stockError.set('');
      this.kalemler.clear();
    }
  }

  protected clearCustomer(): void {
    this.recommendedKalemlerRequestId++;
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
    this.recommendedKalemlerLoading.set(false);
    this.kalemler.clear();
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
      (control) => control.controls.stokKodu.value.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode
    );

    if (existingControl) {
      const step = stock.unitMultiplier ?? existingControl.controls.birimKatsayisi.value ?? 1;
      const current = Number(existingControl.controls.siparisMiktari.value ?? 0);
      existingControl.controls.siparisMiktari.setValue(current + step);
      existingControl.controls.siparisMiktari.markAsDirty();
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

  protected loadRecommendedKalemler(): void {
    const customer = this.selectedCustomer();
    const cariKod = customer?.customerCode?.trim() ?? '';

    if (!cariKod || this.recommendedKalemlerLoading()) {
      return;
    }

    const requestId = ++this.recommendedKalemlerRequestId;
    this.recommendedKalemlerLoading.set(true);
    this.stockError.set('');

    this.siparisIslemleriService
      .getFirmaIcinOnerilenSiparisKalemleri(cariKod, this.resolveRequestWarehouseNo())
      .pipe(
        finalize(() => requestId === this.recommendedKalemlerRequestId && this.recommendedKalemlerLoading.set(false))
      )
      .subscribe({
        next: (results: IFurpaCreateCompanyOrderLineRequestApiDto[]) => {
          if (
            requestId !== this.recommendedKalemlerRequestId ||
            (this.selectedCustomer()?.customerCode?.trim() ?? '') !== cariKod
          ) {
            return;
          }

          const normalizedKalemler = this.normalizeRecommendedKalemler(results ?? []);

          if (normalizedKalemler.length === 0) {
            this.stockError.set('Secilen firma icin onerilen kalem bulunamadi.');
            return;
          }

          for (const kalem of normalizedKalemler) {
            const normalizedStockCode = (kalem.stockCode ?? '').trim().toLocaleUpperCase('tr-TR');

            if (!normalizedStockCode) {
              continue;
            }

            const existingControl = this.kalemler.controls.find(
              (control) => control.controls.stokKodu.value.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode
            );

            if (existingControl) {
              continue;
            }

            this.kalemler.push(this.createRecommendedKalemFormGroup(kalem));
          }

          this.stockQuery.setValue('');
          this.stockResults.set([]);
          this.stockError.set('');
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.recommendedKalemlerRequestId) {
            return;
          }

          this.stockError.set(this.resolveErrorMessage(error, 'Secilen firmanin onerilen kalemleri getirilemedi.'));
        }
      });
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
      this.stockError.set('Siparis icin en az bir kalem eklemelisin.');
    }

    if (this.form.invalid || !this.selectedCustomer() || this.kalemler.length === 0) {
      return;
    }

    this.submitting.set(true);

    this.siparisIslemleriService
      .createVerilenSiparis(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Verilen siparis kaydedilirken hata olustu.')
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

  protected getCustomerLabel(customer: IFurpaCustomerSearchItemApiDto): string {
    const name = customer.customerDisplayName?.trim() || 'Firma';
    return `${customer.customerCode?.trim() || ''} - ${name}`;
  }

  protected readonly trackByCustomer = (_index: number, customer: IFurpaCustomerSearchItemApiDto): string =>
    customer.customerCode?.trim() || customer.customerDisplayName?.trim() || `${_index}`;

  protected readonly trackByStock = (_index: number, stock: IFurpaProductSearchItemApiDto): string =>
    stock.stockCode?.trim() || stock.barcode?.trim() || `${_index}`;

  protected readonly trackByKalem = (index: number, control: KalemFormGroup): string =>
    control.controls.stokKodu.value.trim() || `${index}`;

  private createKalemFormGroup(stock: IFurpaProductSearchItemApiDto): KalemFormGroup {
    return new FormGroup({
      stokKodu: new FormControl(stock.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stokIsmi: new FormControl(stock.stockName?.trim() ?? '', { nonNullable: true }),
      barkodu: new FormControl(stock.barcode?.trim() ?? '', { nonNullable: true }),
      birim: new FormControl(stock.unitName?.trim() ?? '', { nonNullable: true }),
      birimKatsayisi: new FormControl(stock.unitMultiplier ?? null),
      siparisMiktari: new FormControl<number | null>(1, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      aciklama: new FormControl('', { nonNullable: true }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl('', { nonNullable: true })
    });
  }

  private createRecommendedKalemFormGroup(kalem: IFurpaCreateCompanyOrderLineRequestApiDto): KalemFormGroup {
    const siparisMiktari = this.resolveRecommendedQuantity(kalem);

    return new FormGroup({
      stokKodu: new FormControl(kalem.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stokIsmi: new FormControl('', { nonNullable: true }),
      barkodu: new FormControl('', { nonNullable: true }),
      birim: new FormControl('', { nonNullable: true }),
      birimKatsayisi: new FormControl<number | null>(kalem.unitPointer ?? 1),
      siparisMiktari: new FormControl<number | null>(siparisMiktari, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      aciklama: new FormControl(kalem.description1?.trim() ?? '', { nonNullable: true }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl(kalem.packageCode?.trim() ?? '', { nonNullable: true })
    });
  }

  private buildRequest(): IFurpaCreateCompanyOrderRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      warehouseNo: this.resolveRequestWarehouseNo(),
      customerCode: rawValue.muhatapFirmaCariKod.trim(),
      orderDate: rawValue.orderDate,
      deliveryDate: rawValue.deliveryDate,
      description1: rawValue.description1.trim(),
      description2: rawValue.description2.trim(),
      deliverer: rawValue.deliverer.trim(),
      receiver: rawValue.receiver.trim(),
      lines: rawValue.kalemler.map((kalem) => this.mapKalem(kalem))
    };
  }

  private mapKalem(kalem: KalemFormValue) {
    return {
      stockCode: kalem.stokKodu.trim(),
      quantity: Number(kalem.siparisMiktari ?? 0),
      recommendedQuantity: 0,
      unitPrice: 0,
      unitPointer: kalem.birimKatsayisi ?? 1,
      description1: kalem.aciklama.trim(),
      description2: '',
      packageCode: kalem.modelKodu.trim(),
      projectCode: '',
      customerResponsibilityCenter: '',
      productResponsibilityCenter: ''
    };
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

  private normalizeRecommendedKalemler(
    results: IFurpaCreateCompanyOrderLineRequestApiDto[]
  ): IFurpaCreateCompanyOrderLineRequestApiDto[] {
    const uniqueKalemler = new Map<string, IFurpaCreateCompanyOrderLineRequestApiDto>();

    for (const kalem of results) {
      const stokKodu = kalem.stockCode?.trim();
      const key = stokKodu?.toLocaleUpperCase('tr-TR');

      if (!stokKodu || !key || uniqueKalemler.has(key)) {
        continue;
      }

      uniqueKalemler.set(key, {
        ...kalem,
        stockCode: stokKodu,
        description1: kalem.description1?.trim() ?? '',
        description2: kalem.description2?.trim() ?? '',
        packageCode: kalem.packageCode?.trim() ?? '',
        projectCode: kalem.projectCode?.trim() ?? '',
        customerResponsibilityCenter: kalem.customerResponsibilityCenter?.trim() ?? '',
        productResponsibilityCenter: kalem.productResponsibilityCenter?.trim() ?? ''
      });
    }

    return Array.from(uniqueKalemler.values()).sort((left, right) =>
      (left.stockCode ?? '').localeCompare(right.stockCode ?? '', 'tr')
    );
  }

  private resolveRecommendedQuantity(kalem: IFurpaCreateCompanyOrderLineRequestApiDto): number {
    return this.normalizePositiveNumber(kalem.recommendedQuantity)
      ?? this.normalizePositiveNumber(kalem.quantity)
      ?? this.normalizePositiveNumber(kalem.unitPointer)
      ?? 1;
  }

  private normalizePositiveNumber(value: number | null): number | null {
    if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private normalizeOptionalText(value: string): string | null {
    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private resolveRequestWarehouseNo(): number | undefined {
    const adminWarehouseNo = this.isAdminUser()
      ? toPositiveWarehouseNo(this.controls.adminWarehouseNo.value)
      : null;

    return adminWarehouseNo
      ?? getCurrentWarehouseNo(this.authService.currentUser())
      ?? undefined;
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



