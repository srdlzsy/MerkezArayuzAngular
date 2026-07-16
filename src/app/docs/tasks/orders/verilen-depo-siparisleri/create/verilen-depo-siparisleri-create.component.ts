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
  IFurpaWarehouseSearchItemApiDto,
  IFurpaCreateWarehouseOrderRequestApiDto,
  IFurpaCreateWarehouseOrderLineRequestApiDto,
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
  selector: 'app-verilen-depo-siparisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verilen-depo-siparisleri-create.component.html',
  styleUrl: './verilen-depo-siparisleri-create.component.scss'
})
export class VerilenDepoSiparisleriCreateComponent extends DocsTaskDialogBase {
  private readonly aramaService = inject(AramaService);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());

  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-depo-siparisleri'];
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly warehouseQuery = new FormControl('', { nonNullable: true });
  protected readonly warehouseSelect = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly stockQuery = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly warehouseResults = signal<IFurpaWarehouseSearchItemApiDto[]>([]);
  protected readonly warehouseOptions = signal<IFurpaWarehouseSearchItemApiDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly selectedWarehouse = signal<IFurpaWarehouseSearchItemApiDto | null>(null);
  protected readonly warehouseLoading = signal(false);
  protected readonly warehouseOptionsLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly presetProductsLoading = signal(false);
  protected readonly warehouseError = signal('');
  protected readonly warehouseOptionsError = signal('');
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  private warehouseRequestId = 0;
  private warehouseOptionsRequestId = 0;
  private stockRequestId = 0;
  private presetProductsRequestId = 0;

  protected readonly controls = {
    muhatapDepoNo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    muhatapAdSoyad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    ekleyenAdSoyad: new FormControl(this.getCurrentDisplayName(), {
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
    description: new FormControl('', { nonNullable: true }),
    adminWarehouseNo: new FormControl<number | null>(null),
    kalemler: new FormArray<KalemFormGroup>([])
  };
  protected readonly form = new FormGroup(this.controls);

  constructor() {
    super();
    this.loadWarehouseOptions();

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
    this.applyWarehouseSelection(warehouse);
  }

  protected selectWarehouseFromDropdown(): void {
    const selectedValue = this.warehouseSelect.value.trim();

    if (!selectedValue) {
      this.clearWarehouse();
      return;
    }

    const selectedDepotNo = Number(selectedValue);
    const warehouse = this.warehouseOptions().find((item) => item.warehouseNo === selectedDepotNo);

    if (!warehouse) {
      this.warehouseError.set('Secilen depo listede bulunamadi.');
      return;
    }

    this.applyWarehouseSelection(warehouse);
  }

  protected clearWarehouse(): void {
    this.presetProductsRequestId++;
    this.selectedWarehouse.set(null);
    this.controls.muhatapDepoNo.reset(null);
    this.controls.muhatapAdSoyad.setValue('');
    this.warehouseQuery.setValue('');
    this.warehouseSelect.setValue('', { emitEvent: false });
    this.warehouseResults.set([]);
    this.warehouseError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');
    this.presetProductsLoading.set(false);
    this.kalemler.clear();
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
    const warehouse = this.selectedWarehouse();

    if (!warehouse || this.presetProductsLoading()) {
      return;
    }

    const requestId = ++this.presetProductsRequestId;
    this.presetProductsLoading.set(true);
    this.stockError.set('');

    this.siparisIslemleriService
      .getDepoIcinOnerilenSiparisKalemleri(warehouse.warehouseNo, this.resolveRequestWarehouseNo())
      .pipe(finalize(() => requestId === this.presetProductsRequestId && this.presetProductsLoading.set(false)))
      .subscribe({
        next: (results: IFurpaCreateWarehouseOrderLineRequestApiDto[]) => {
          if (requestId !== this.presetProductsRequestId || this.selectedWarehouse()?.warehouseNo !== warehouse.warehouseNo) {
            return;
          }

          const normalizedKalemler = this.normalizeRecommendedKalemler(results ?? []);

          if (normalizedKalemler.length === 0) {
            this.stockError.set('Secilen depo icin onerilen kalem bulunamadi.');
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
          if (requestId !== this.presetProductsRequestId) {
            return;
          }

          this.stockError.set(this.resolveErrorMessage(error, 'Secilen deponun onerilen kalemleri getirilemedi.'));
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

    if (!this.selectedWarehouse()) {
      this.warehouseError.set('Muhatap depo secilmelidir.');
    }

    if (this.kalemler.length === 0) {
      this.stockError.set('Siparis icin en az bir kalem eklemelisin.');
    }

    if (this.form.invalid || !this.selectedWarehouse() || this.kalemler.length === 0) {
      return;
    }

    this.submitting.set(true);

    this.siparisIslemleriService
      .createVerilenDepoSiparis(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Verilen depo siparisi kaydedilirken hata olustu.')
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

  protected getWarehouseLabel(warehouse: IFurpaWarehouseSearchItemApiDto): string {
    const depotName = warehouse.warehouseName?.trim() || 'Depo';
    return `${warehouse.warehouseNo} - ${depotName}`;
  }

  protected readonly trackByWarehouse = (_index: number, warehouse: IFurpaWarehouseSearchItemApiDto): string =>
    `${warehouse.warehouseNo}-${warehouse.warehouseName?.trim() || _index}`;

  protected readonly trackByStock = (_index: number, stock: IFurpaProductSearchItemApiDto): string =>
    stock.stockCode?.trim() || stock.barcode?.trim() || `${_index}`;

  protected readonly trackByKalem = (index: number, control: KalemFormGroup): string =>
    control.controls.stokKodu.value.trim() || `${index}`;

  private applyWarehouseSelection(warehouse: IFurpaWarehouseSearchItemApiDto): void {
    const previousWarehouseNo = this.selectedWarehouse()?.warehouseNo ?? null;
    const warehouseChanged = previousWarehouseNo !== warehouse.warehouseNo;

    this.presetProductsRequestId++;
    this.presetProductsLoading.set(false);

    this.selectedWarehouse.set(warehouse);
    this.controls.muhatapDepoNo.setValue(warehouse.warehouseNo);
    this.controls.muhatapDepoNo.markAsDirty();
    this.controls.muhatapDepoNo.markAsTouched();
    this.controls.muhatapAdSoyad.setValue(this.resolveWarehouseContact(warehouse));
    this.controls.muhatapAdSoyad.markAsDirty();

    this.warehouseQuery.setValue(this.getWarehouseLabel(warehouse));
    this.warehouseSelect.setValue(String(warehouse.warehouseNo), { emitEvent: false });
    this.warehouseResults.set([]);
    this.warehouseError.set('');
    this.stockResults.set([]);

    if (warehouseChanged) {
      this.stockQuery.setValue('');
      this.stockError.set('');
      this.kalemler.clear();
    }
  }

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

  private createRecommendedKalemFormGroup(
    kalem: IFurpaCreateWarehouseOrderLineRequestApiDto
  ): KalemFormGroup {
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
      aciklama: new FormControl(kalem.description?.trim() ?? '', { nonNullable: true }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl(kalem.packageCode?.trim() ?? '', { nonNullable: true })
    });
  }

  private buildRequest(): IFurpaCreateWarehouseOrderRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      inWarehouseNo: this.resolveRequestWarehouseNo(),
      outWarehouseNo: rawValue.muhatapDepoNo ?? 0,
      orderDate: rawValue.orderDate,
      deliveryDate: rawValue.deliveryDate,
      description: rawValue.description.trim(),
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
      description: kalem.aciklama.trim(),
      packageCode: kalem.modelKodu.trim(),
      projectCode: '',
      responsibilityCenter: ''
    };
  }

  private loadWarehouseOptions(): void {
    const requestId = ++this.warehouseOptionsRequestId;
    this.warehouseOptionsLoading.set(true);
    this.warehouseOptionsError.set('');
    this.warehouseSelect.disable({ emitEvent: false });

    this.aramaService
      .listWarehouses(100)
      .pipe(finalize(() => requestId === this.warehouseOptionsRequestId && this.warehouseOptionsLoading.set(false)))
      .subscribe({
        next: (results: IFurpaWarehouseSearchItemApiDto[]) => {
          if (requestId !== this.warehouseOptionsRequestId) {
            return;
          }

          const normalizedResults = this.normalizeWarehouses(results ?? []);
          this.warehouseOptions.set(normalizedResults);
          this.warehouseSelect.enable({ emitEvent: false });

          if (normalizedResults.length === 0) {
            this.warehouseOptionsError.set('Depo listesi getirilemedi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.warehouseOptionsRequestId) {
            return;
          }

          this.warehouseSelect.enable({ emitEvent: false });
          this.warehouseOptionsError.set(this.resolveErrorMessage(error, 'Depo listesi alinamadi.'));
        }
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

  private normalizeRecommendedKalemler(
    results: IFurpaCreateWarehouseOrderLineRequestApiDto[]
  ): IFurpaCreateWarehouseOrderLineRequestApiDto[] {
    const uniqueKalemler = new Map<string, IFurpaCreateWarehouseOrderLineRequestApiDto>();

    for (const kalem of results) {
      const stokKodu = kalem.stockCode?.trim();
      const key = stokKodu?.toLocaleUpperCase('tr-TR');

      if (!stokKodu || !key || uniqueKalemler.has(key)) {
        continue;
      }

      uniqueKalemler.set(key, {
        ...kalem,
        stockCode: stokKodu,
        description: kalem.description?.trim() ?? '',
        packageCode: kalem.packageCode?.trim() ?? '',
        projectCode: kalem.projectCode?.trim() ?? '',
        responsibilityCenter: kalem.responsibilityCenter?.trim() ?? ''
      });
    }

    return Array.from(uniqueKalemler.values()).sort((left, right) =>
      (left.stockCode ?? '').localeCompare(right.stockCode ?? '', 'tr')
    );
  }

  private resolveRecommendedQuantity(kalem: IFurpaCreateWarehouseOrderLineRequestApiDto): number {
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

  private resolveWarehouseContact(warehouse: IFurpaWarehouseSearchItemApiDto): string {
    return warehouse.warehouseName?.trim()
      || [warehouse.address, warehouse.district, warehouse.province].filter(Boolean).join(' ').trim()
      || '';
  }

  private getCurrentDisplayName(): string {
    return this.authService.currentUser()?.displayName?.trim() || 'Kullanici';
  }

  private resolveRequestWarehouseNo(): number | undefined {
    const adminWarehouseNo = this.isAdminUser()
      ? toPositiveWarehouseNo(this.controls.adminWarehouseNo.value)
      : null;

    return adminWarehouseNo
      ?? getCurrentWarehouseNo(this.authService.currentUser())
      ?? undefined;
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


