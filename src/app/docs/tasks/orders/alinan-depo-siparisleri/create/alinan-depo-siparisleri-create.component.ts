import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  GreenGrocerOrderLineSnapshotHttpRequest,
  GreenGrocerProductCaseResolutionDto,
  IFurpaWarehouseSearchItemApiDto,
  IFurpaCreateWarehouseOrderRequestApiDto,
  IFurpaProductSearchItemApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { GreenGrocerService } from '../../../../../core/api/module-services/green-grocer.service';
import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
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
  siparisMiktari: number | null;
  cozumMiktari: number | null;
  cozumBirim: string;
  cozumMesaj: string;
  cozumDurum: string;
  cozumHata: string;
  greenGrocerCase: GreenGrocerOrderLineSnapshotHttpRequest | null;
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
  cozumMiktari: FormControl<number | null>;
  cozumBirim: FormControl<string>;
  cozumMesaj: FormControl<string>;
  cozumDurum: FormControl<string>;
  cozumHata: FormControl<string>;
  greenGrocerCase: FormControl<GreenGrocerOrderLineSnapshotHttpRequest | null>;
  aciklama: FormControl<string>;
  skt: FormControl<string>;
  modelKodu: FormControl<string>;
}>;

@Component({
  selector: 'app-alinan-depo-siparisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alinan-depo-siparisleri-create.component.html',
  styleUrl: './alinan-depo-siparisleri-create.component.scss'
})
export class AlinanDepoSiparisleriCreateComponent extends DocsTaskDialogBase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly aramaService = inject(AramaService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());
  private readonly lineResolutionRequestIds = new WeakMap<KalemFormGroup, number>();
  private greenGrocerResolutionDisabled = false;

  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-depo-siparisleri'];
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
  protected readonly selectedWarehouse = signal<IFurpaWarehouseSearchItemApiDto | null>(null);
  protected readonly warehouseLoading = signal(false);
  protected readonly stockLoading = signal(false);
  protected readonly warehouseError = signal('');
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  private warehouseRequestId = 0;
  private stockRequestId = 0;

  protected readonly controls = {
    muhatapDepoNo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    muhatapAdSoyad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(25)]
    }),
    ekleyenAdSoyad: new FormControl(this.getCurrentDisplayName(), {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(25)]
    }),
    orderDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    deliveryDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    adminWarehouseNo: new FormControl<number | null>(null),
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
    const warehouseChanged = previousWarehouseNo !== warehouse.warehouseNo;

    this.selectedWarehouse.set(warehouse);
    this.controls.muhatapDepoNo.setValue(warehouse.warehouseNo);
    this.controls.muhatapDepoNo.markAsDirty();
    this.controls.muhatapDepoNo.markAsTouched();

    const contact = this.resolveWarehouseContact(warehouse);
    this.controls.muhatapAdSoyad.setValue(trimToMaxLength(contact, 25));
    this.controls.muhatapAdSoyad.markAsDirty();

    this.warehouseQuery.setValue(this.getWarehouseLabel(warehouse));
    this.warehouseResults.set([]);
    this.warehouseError.set('');

    if (warehouseChanged) {
      this.stockQuery.setValue('');
      this.stockResults.set([]);
      this.stockError.set('');
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
      this.resolveGreenGrocerLine(existingControl);
      this.stockQuery.setValue('');
      this.stockResults.set([]);
      this.stockError.set('');
      return;
    }

    const control = this.createKalemFormGroup(stock);
    this.kalemler.push(control);
    this.resolveGreenGrocerLine(control);
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
      this.stockError.set('Siparis icin en az bir kalem eklemelisin.');
    }

    if (!this.validateGreenGrocerLines()) {
      return;
    }

    if (this.form.invalid || !this.selectedWarehouse() || this.kalemler.length === 0) {
      return;
    }

    this.submitting.set(true);

    this.siparisIslemleriService
      .createAlinanDepoSiparis(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.close({ created: true });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Alinan depo siparisi kaydedilirken hata olustu.')
          );
        }
      });
  }

  protected kalemCount(): number {
    return this.kalemler.length;
  }

  protected toplamSiparisMiktari(): number {
    return this.kalemler.controls.reduce(
      (total, control) => total + this.resolveLineOrderQuantity(control.getRawValue()),
      0
    );
  }

  protected isGreenGrocerOrder(): boolean {
    return this.selectedWarehouse()?.warehouseNo === 56 && !this.greenGrocerResolutionDisabled;
  }

  protected resolveGreenGrocerLine(control: KalemFormGroup): void {
    if (!this.isGreenGrocerOrder()) {
      this.clearLineResolution(control);
      return;
    }

    const stockCode = control.controls.stokKodu.value.trim();
    const inputQuantity = Number(control.controls.siparisMiktari.value ?? 0);
    const sourceWarehouseNo = this.selectedWarehouse()?.warehouseNo ?? null;
    const targetWarehouseNo = this.resolveRequestWarehouseNo() ?? null;

    if (!stockCode || !Number.isFinite(inputQuantity) || inputQuantity <= 0 || !sourceWarehouseNo) {
      this.clearLineResolution(control);
      return;
    }

    const requestId = (this.lineResolutionRequestIds.get(control) ?? 0) + 1;
    this.lineResolutionRequestIds.set(control, requestId);
    control.controls.cozumDurum.setValue('loading', { emitEvent: false });
    control.controls.cozumMesaj.setValue('Cozumleniyor', { emitEvent: false });
    control.controls.cozumHata.setValue('', { emitEvent: false });

    this.greenGrocerService
      .previewProductCaseResolution({
        stockCode,
        inputQuantity,
        sourceWarehouseNo,
        targetWarehouseNo,
        orderDate: this.controls.orderDate.value
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resolution: GreenGrocerProductCaseResolutionDto) => {
          if (this.lineResolutionRequestIds.get(control) !== requestId) {
            return;
          }

          this.applyLineResolution(control, resolution);
        },
        error: (error: HttpErrorResponse) => {
          if (this.lineResolutionRequestIds.get(control) !== requestId) {
            return;
          }

          if (error.status === 409) {
            this.greenGrocerResolutionDisabled = true;
            this.kalemler.controls.forEach((line) => this.clearLineResolution(line));
            return;
          }

          control.controls.cozumDurum.setValue('error', { emitEvent: false });
          control.controls.cozumMiktari.setValue(null, { emitEvent: false });
          control.controls.cozumBirim.setValue('', { emitEvent: false });
          control.controls.greenGrocerCase.setValue(null, { emitEvent: false });
          control.controls.cozumMesaj.setValue('', { emitEvent: false });
          control.controls.cozumHata.setValue(
            this.resolveErrorMessage(error, 'Manav kasa cozumlemesi yapilamadi.'),
            { emitEvent: false }
          );
        }
      });
  }

  protected getLineResolutionLabel(control: KalemFormGroup): string {
    const status = control.controls.cozumDurum.value;

    if (status === 'loading') {
      return 'Cozumleniyor...';
    }

    if (status === 'error') {
      return control.controls.cozumHata.value || 'Cozumleme hatasi';
    }

    return control.controls.cozumMesaj.value;
  }

  protected getLineResolutionClass(control: KalemFormGroup): string {
    const status = control.controls.cozumDurum.value;

    if (status === 'ready') {
      return 'resolution-note-ready';
    }

    if (status === 'warning') {
      return 'resolution-note-warning';
    }

    if (status === 'error') {
      return 'resolution-note-error';
    }

    return 'resolution-note-loading';
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
      cozumMiktari: new FormControl<number | null>(null),
      cozumBirim: new FormControl('', { nonNullable: true }),
      cozumMesaj: new FormControl('', { nonNullable: true }),
      cozumDurum: new FormControl('', { nonNullable: true }),
      cozumHata: new FormControl('', { nonNullable: true }),
      greenGrocerCase: new FormControl<GreenGrocerOrderLineSnapshotHttpRequest | null>(null),
      aciklama: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(25)] })
    });
  }

  private buildRequest(): IFurpaCreateWarehouseOrderRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      inWarehouseNo: this.resolveRequestWarehouseNo(),
      outWarehouseNo: rawValue.muhatapDepoNo ?? 0,
      orderDate: rawValue.orderDate,
      deliveryDate: rawValue.deliveryDate,
      description: trimToMaxLength(rawValue.description, 50),
      lines: rawValue.kalemler.map((kalem) => this.mapKalem(kalem))
    };
  }

  private mapKalem(kalem: KalemFormValue) {
    const quantity = this.resolveLineOrderQuantity(kalem);
    const greenGrocerCase = this.resolveLineGreenGrocerCase(kalem, quantity);

    return {
      stockCode: kalem.stokKodu.trim(),
      quantity,
      recommendedQuantity: 0,
      unitPrice: 0,
      unitPointer: kalem.birimKatsayisi ?? 1,
      description: trimToMaxLength(kalem.aciklama, 50),
      packageCode: trimToMaxLength(kalem.modelKodu, 25),
      projectCode: '',
      responsibilityCenter: '',
      ...(greenGrocerCase ? { greenGrocerCase } : {})
    };
  }

  private applyLineResolution(
    control: KalemFormGroup,
    resolution: GreenGrocerProductCaseResolutionDto
  ): void {
    const estimatedQuantity = Number(resolution.estimatedQuantity ?? 0);
    const inputMode = this.getInputModeLabel(resolution.inputMode);
    const outputUnit = resolution.microUnit?.trim() || resolution.unit1?.trim() || '';
    const baseMessage =
      `${this.formatQuantity(resolution.inputQuantity)} ${inputMode}` +
      ` ~= ${this.formatQuantity(estimatedQuantity)} ${outputUnit}`.trimEnd();

    control.controls.cozumBirim.setValue(outputUnit, { emitEvent: false });

    if (!resolution.isUsable || !Number.isFinite(estimatedQuantity) || estimatedQuantity <= 0) {
      control.controls.cozumDurum.setValue('error', { emitEvent: false });
      control.controls.cozumMiktari.setValue(null, { emitEvent: false });
      control.controls.greenGrocerCase.setValue(null, { emitEvent: false });
      control.controls.cozumMesaj.setValue('', { emitEvent: false });
      control.controls.cozumHata.setValue(
        resolution.errors?.[0] ?? 'Bu manav urunu icin kasa cozumlemesi kullanilamaz.',
        { emitEvent: false }
      );
      return;
    }

    control.controls.cozumMiktari.setValue(estimatedQuantity, { emitEvent: false });
    control.controls.greenGrocerCase.setValue(
      this.buildGreenGrocerCaseSnapshot(resolution, estimatedQuantity, outputUnit),
      { emitEvent: false }
    );
    control.controls.cozumMesaj.setValue(baseMessage, { emitEvent: false });
    control.controls.cozumHata.setValue(resolution.warnings?.[0] ?? '', { emitEvent: false });
    control.controls.cozumDurum.setValue(
      resolution.confidence === 'Medium' || resolution.warnings?.length ? 'warning' : 'ready',
      { emitEvent: false }
    );
  }

  private clearLineResolution(control: KalemFormGroup): void {
    this.lineResolutionRequestIds.set(control, (this.lineResolutionRequestIds.get(control) ?? 0) + 1);
    control.controls.cozumMiktari.setValue(null, { emitEvent: false });
    control.controls.cozumBirim.setValue('', { emitEvent: false });
    control.controls.greenGrocerCase.setValue(null, { emitEvent: false });
    control.controls.cozumMesaj.setValue('', { emitEvent: false });
    control.controls.cozumDurum.setValue('', { emitEvent: false });
    control.controls.cozumHata.setValue('', { emitEvent: false });
  }

  private validateGreenGrocerLines(): boolean {
    if (!this.isGreenGrocerOrder()) {
      return true;
    }

    const pendingLine = this.kalemler.controls.find(
      (control) => control.controls.cozumDurum.value === 'loading'
    );

    if (pendingLine) {
      this.stockError.set('Manav kasa cozumlemesi devam eden kalem var.');
      return false;
    }

    const failedLine = this.kalemler.controls.find(
      (control) => control.controls.cozumDurum.value === 'error'
    );

    if (failedLine) {
      this.stockError.set(failedLine.controls.cozumHata.value || 'Manav kasa cozumlemesi hatali kalem var.');
      return false;
    }

    return true;
  }

  private resolveLineOrderQuantity(kalem: KalemFormValue): number {
    const resolvedQuantity = Number(kalem.cozumMiktari ?? 0);

    if (Number.isFinite(resolvedQuantity) && resolvedQuantity > 0) {
      return resolvedQuantity;
    }

    return Number(kalem.siparisMiktari ?? 0);
  }

  private resolveLineGreenGrocerCase(
    kalem: KalemFormValue,
    quantity: number
  ): GreenGrocerOrderLineSnapshotHttpRequest | null {
    if (!this.isGreenGrocerOrder() || !kalem.greenGrocerCase) {
      return null;
    }

    const estimatedQuantity = Number(kalem.greenGrocerCase.estimatedQuantity ?? 0);

    if (!Number.isFinite(estimatedQuantity) || Math.abs(estimatedQuantity - quantity) > 0.0001) {
      return null;
    }

    return kalem.greenGrocerCase;
  }

  private buildGreenGrocerCaseSnapshot(
    resolution: GreenGrocerProductCaseResolutionDto,
    estimatedQuantity: number,
    outputUnit: string
  ): GreenGrocerOrderLineSnapshotHttpRequest {
    return {
      inputQuantity: Number(resolution.inputQuantity ?? 0),
      inputMode: resolution.inputMode,
      conversionMode: resolution.conversionMode,
      microUnit: outputUnit,
      estimatedQuantity,
      averageKgPerCase: resolution.averageKgPerCase ?? null,
      unitsPerCase: resolution.unitsPerCase ?? null,
      averageSource: resolution.averageSource ?? null,
      averageRecordCount: resolution.averageRecordCount ?? null,
      averageCaseCount: resolution.averageCaseCount ?? null,
      coefficientOfVariation: resolution.coefficientOfVariation ?? null,
      confidence: resolution.confidence
    };
  }

  private getInputModeLabel(value: string | null | undefined): string {
    switch (value) {
      case 'Case':
        return 'kasa';
      case 'Pack':
        return 'koli';
      case 'Piece':
        return 'adet';
      case 'KgDirect':
        return 'kg';
      case 'Sarf':
        return 'sarf';
      default:
        return value?.trim().toLocaleLowerCase('tr-TR') || 'miktar';
    }
  }

  private formatQuantity(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(value);
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

  private getCurrentDisplayName(): string {
    return trimToMaxLength(this.authService.currentUser()?.displayName, 25) || 'Kullanici';
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
    return resolveHttpErrorMessage(error, fallback);
  }
}


