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
  IFurpaProductSearchItemApiDto,
  IFurpaCreateWarehouseShippingRequestApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import { BrowserCreateDraftBarComponent } from '../../../core/browser-create-draft/browser-create-draft-bar.component';
import {
  SafeCreateFailure,
  SafeCreateRetryDraft,
  classifySafeCreateFailure
} from '../../../core/safe-create-retry.helpers';
import { SafeCreatePendingStore, buildSafeCreatePendingScope } from '../../../core/safe-create-pending.store';
import { resolveHttpErrorMessage, trimToMaxLength } from '../../../core/api-error.helpers';
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
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
  miktar: number | null;
  aciklama: string;
  skt: string;
  modelKodu: string;
}

interface DepoDagitimSevkDraftPayload {
  form: {
    muhatapDepoNo: number | null;
    muhatapAdSoyad: string;
    transitWarehouseNo: number | null;
    movementDate: string;
    documentDate: string;
    adminWarehouseNo: number | null;
    documentNo: string;
    description: string;
    kalemler: KalemFormValue[];
  };
  selectedWarehouse: IFurpaWarehouseSearchItemApiDto | null;
}

type KalemFormGroup = FormGroup<{
  stokKodu: FormControl<string>;
  stokIsmi: FormControl<string>;
  barkodu: FormControl<string>;
  birim: FormControl<string>;
  birimKatsayisi: FormControl<number | null>;
  miktar: FormControl<number | null>;
  aciklama: FormControl<string>;
  skt: FormControl<string>;
  modelKodu: FormControl<string>;
}>;

@Component({
  selector: 'app-depo-dagitim-sevk-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BrowserCreateDraftBarComponent],
  templateUrl: './depo-dagitim-sevk-fisleri-create.component.html',
  styleUrl: './depo-dagitim-sevk-fisleri-create.component.scss'
})
export class DepoDagitimSevkFisleriCreateComponent extends DocsTaskDialogBase {
  private readonly authService = inject(AuthService);
  private readonly pendingStore = inject(SafeCreatePendingStore);
  private readonly aramaService = inject(AramaService);
  private readonly sevkIslemleriService = inject(SevkIslemleriService);
  private readonly today = formatDateOnly(new Date());
  private readonly safeCreateRetry = new SafeCreateRetryDraft<IFurpaCreateWarehouseShippingRequestApiDto>({
    store: this.pendingStore,
    resolveScope: (request) => buildSafeCreatePendingScope(
      this.authService.currentUser(),
      'inter-warehouse-shipment.create',
      request
    )
  });

  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-depolar-arasi-sevkler'];
  protected readonly isAdminUser = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    )
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly warehouseQuery = new FormControl('', { nonNullable: true });
  protected readonly stockQuery = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  protected readonly warehouseResults = signal<IFurpaWarehouseSearchItemApiDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected hideDelistedProducts = false;
  protected readonly selectedWarehouse = signal<IFurpaWarehouseSearchItemApiDto | null>(null);
  protected readonly warehouseLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly warehouseError = signal('');
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly safeCreateFailure = signal<SafeCreateFailure | null>(null);
  protected readonly submitting = signal(false);
  private warehouseRequestId = 0;
  private stockRequestId = 0;

  protected readonly controls = {
    muhatapDepoNo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    muhatapAdSoyad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(25)]
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
    adminWarehouseNo: new FormControl<number | null>(null),
    documentNo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(25)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
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

    this.setupBrowserDraft<DepoDagitimSevkDraftPayload>({
      user: this.authService.currentUser(),
      moduleCode: 'shipment',
      operationCode: 'warehouse-distribution-shipment.create',
      changes$: this.form.valueChanges,
      capture: () => ({
        form: this.form.getRawValue(),
        selectedWarehouse: this.selectedWarehouse()
      }),
      restore: (payload) => this.restoreBrowserDraft(payload),
      reset: () => this.resetBrowserDraftForm(),
      isMeaningful: (payload) => this.isBrowserDraftMeaningful(payload),
      title: (payload) => payload.selectedWarehouse
        ? this.getWarehouseLabel(payload.selectedWarehouse)
        : 'Yeni depo dagitim sevki',
      lineCount: (payload) => payload.form.kalemler.length,
      warehouseNo: () => this.resolveRequestWarehouseNo()
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
    this.controls.muhatapAdSoyad.setValue(trimToMaxLength(this.resolveWarehouseContact(warehouse), 25));
    this.controls.muhatapAdSoyad.markAsDirty();

    this.warehouseQuery.setValue(this.getWarehouseLabel(warehouse));
    this.warehouseResults.set([]);
    this.warehouseError.set('');
    this.stockQuery.setValue('');
    this.stockResults.set([]);
    this.stockError.set('');

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
      .searchStock(query, 20, this.resolveIncludeDelisted())
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
    if (this.submitting() || this.safeCreateFailure()?.blocksSubmit) {
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

    let request: IFurpaCreateWarehouseShippingRequestApiDto;
    try {
      request = this.buildRequest();
    } catch (error: unknown) {
      this.submitError.set(error instanceof Error ? error.message : 'Sevk guvenli olarak hazirlanamadi.');
      return;
    }

    this.submitting.set(true);
    this.sevkIslemleriService
      .createDepoDagitimSevkFisi(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.safeCreateRetry.reset();
          this.completeBrowserDraft();
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.applySafeCreateFailure(error, 'Depo dagitim sevk fisi kaydedilirken hata olustu.');
        }
      });
  }

  protected startNewCreateAttempt(): void {
    this.safeCreateRetry.reset();
    this.safeCreateFailure.set(null);
    this.submitError.set('');
    this.submit();
  }

  private applySafeCreateFailure(error: HttpErrorResponse, fallbackMessage: string): void {
    const failure = classifySafeCreateFailure(error, fallbackMessage);
    this.safeCreateRetry.recordFailure(failure, error.status);
    this.safeCreateFailure.set(failure);
    this.submitError.set(failure.message);
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
    control.controls.stokKodu.value.trim() || `${index}`;

  private createKalemFormGroup(stock: IFurpaProductSearchItemApiDto): KalemFormGroup {
    return this.createKalemFormGroupFromValue({
      stokKodu: stock.stockCode?.trim() ?? '',
      stokIsmi: stock.stockName?.trim() ?? '',
      barkodu: stock.barcode?.trim() ?? '',
      birim: stock.unitName?.trim() ?? '',
      birimKatsayisi: stock.unitMultiplier ?? null,
      miktar: 1,
      aciklama: '',
      skt: '',
      modelKodu: ''
    });
  }

  private createKalemFormGroupFromValue(value: KalemFormValue): KalemFormGroup {
    return new FormGroup({
      stokKodu: new FormControl(value.stokKodu, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stokIsmi: new FormControl(value.stokIsmi, { nonNullable: true }),
      barkodu: new FormControl(value.barkodu, { nonNullable: true }),
      birim: new FormControl(value.birim, { nonNullable: true }),
      birimKatsayisi: new FormControl(value.birimKatsayisi),
      miktar: new FormControl<number | null>(value.miktar, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      aciklama: new FormControl(value.aciklama, { nonNullable: true, validators: [Validators.maxLength(50)] }),
      skt: new FormControl(value.skt, { nonNullable: true }),
      modelKodu: new FormControl(value.modelKodu, { nonNullable: true, validators: [Validators.maxLength(25)] })
    });
  }

  private restoreBrowserDraft(payload: DepoDagitimSevkDraftPayload): void {
    if (!payload?.form || !Array.isArray(payload.form.kalemler)) {
      throw new Error('Gecersiz depo dagitim taslagi.');
    }

    const { kalemler, ...header } = payload.form;
    this.kalemler.clear({ emitEvent: false });
    this.form.patchValue(header, { emitEvent: false });
    kalemler.forEach((kalem) => this.kalemler.push(this.createKalemFormGroupFromValue(kalem), { emitEvent: false }));
    this.selectedWarehouse.set(payload.selectedWarehouse);
    this.warehouseQuery.setValue(
      payload.selectedWarehouse ? this.getWarehouseLabel(payload.selectedWarehouse) : '',
      { emitEvent: false }
    );
    this.warehouseResults.set([]);
    this.stockResults.set([]);
    this.warehouseError.set('');
    this.stockError.set('');
  }

  private resetBrowserDraftForm(): void {
    this.kalemler.clear({ emitEvent: false });
    this.form.reset({
      muhatapDepoNo: null,
      muhatapAdSoyad: '',
      transitWarehouseNo: 60,
      movementDate: this.today,
      documentDate: this.today,
      adminWarehouseNo: null,
      documentNo: '',
      description: ''
    }, { emitEvent: false });
    this.selectedWarehouse.set(null);
    this.warehouseQuery.setValue('', { emitEvent: false });
    this.stockQuery.setValue('', { emitEvent: false });
    this.warehouseResults.set([]);
    this.stockResults.set([]);
    this.warehouseError.set('');
    this.stockError.set('');
    this.submitError.set('');
  }

  private isBrowserDraftMeaningful(payload: DepoDagitimSevkDraftPayload): boolean {
    const form = payload.form;
    return !!payload.selectedWarehouse
      || form.kalemler.length > 0
      || !!form.documentNo.trim()
      || !!form.description.trim()
      || !!form.muhatapAdSoyad.trim();
  }

  private buildRequest(): IFurpaCreateWarehouseShippingRequestApiDto {
    const rawValue = this.form.getRawValue();

    return this.safeCreateRetry.withClientRequestId({
      sourceWarehouseNo: this.resolveRequestWarehouseNo(),
      targetWarehouseNo: rawValue.muhatapDepoNo ?? 0,
      transitWarehouseNo: rawValue.transitWarehouseNo ?? 60,
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: trimToMaxLength(rawValue.documentNo, 25),
      description: trimToMaxLength(rawValue.description, 50),
      lines: rawValue.kalemler.map((kalem) => this.mapKalem(kalem))
    });
  }

  private mapKalem(kalem: KalemFormValue) {
    return {
      stockCode: kalem.stokKodu.trim(),
      quantity: Number(kalem.miktar ?? 0),
      unitPrice: 0,
      unitPointer: kalem.birimKatsayisi ?? 1,
      description: trimToMaxLength(kalem.aciklama, 50),
      partyCode: '',
      lotNo: 0,
      projectCode: ''
    };
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

  private resolveIncludeDelisted(): boolean | undefined {
    return this.hideDelistedProducts ? false : undefined;
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
    return resolveHttpErrorMessage(error, fallback);
  }
}



