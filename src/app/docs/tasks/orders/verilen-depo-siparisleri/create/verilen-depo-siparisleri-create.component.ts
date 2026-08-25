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
  IFurpaCreateWarehouseOrderLineRequestApiDto,
  IFurpaProductSearchItemApiDto,
  SuggestedWarehouseSourceProductDto
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

const MANUAL_SOURCE_PRODUCT_WAREHOUSE_NOS = new Set([53, 55, 56, 58]);

interface KalemFormValue {
  stokKodu: string;
  stokIsmi: string;
  barkodu: string;
  birim: string;
  birimKatsayisi: number | null;
  ikinciBirim: string;
  koliKatsayisi: number | null;
  koliBarkodu: string;
  koliMiktari: number | null;
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
  ikinciBirim: FormControl<string>;
  koliKatsayisi: FormControl<number | null>;
  koliBarkodu: FormControl<string>;
  koliMiktari: FormControl<number | null>;
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
  selector: 'app-verilen-depo-siparisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verilen-depo-siparisleri-create.component.html',
  styleUrl: './verilen-depo-siparisleri-create.component.scss'
})
export class VerilenDepoSiparisleriCreateComponent extends DocsTaskDialogBase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly aramaService = inject(AramaService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());
  private readonly lineResolutionRequestIds = new WeakMap<KalemFormGroup, number>();
  private greenGrocerResolutionDisabled = false;

  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-depo-siparisleri'];
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

  protected loadRecommendedKalemler(): void {
    const warehouse = this.selectedWarehouse();

    if (!warehouse || this.presetProductsLoading()) {
      return;
    }

    const requestId = ++this.presetProductsRequestId;
    this.presetProductsLoading.set(true);
    this.stockError.set('');

    if (this.usesManualSourceProductSelection(warehouse.warehouseNo)) {
      this.loadSourceWarehouseProducts(requestId, warehouse.warehouseNo);
      return;
    }

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

            const control = this.createRecommendedKalemFormGroup(kalem);
            this.kalemler.push(control);
            this.resolveGreenGrocerLine(control);
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

  private loadSourceWarehouseProducts(requestId: number, warehouseNo: number): void {
    this.siparisIslemleriService
      .listSuggestedWarehouseSourceProducts(warehouseNo)
      .pipe(finalize(() => requestId === this.presetProductsRequestId && this.presetProductsLoading.set(false)))
      .subscribe({
        next: (results: SuggestedWarehouseSourceProductDto[]) => {
          if (
            requestId !== this.presetProductsRequestId ||
            this.selectedWarehouse()?.warehouseNo !== warehouseNo
          ) {
            return;
          }

          const normalizedKalemler = this.normalizeSourceWarehouseProducts(results ?? []);

          if (normalizedKalemler.length === 0) {
            this.stockError.set('Secilen kaynak depo icin siparise eklenebilir urun bulunamadi.');
            return;
          }

          let addedCount = 0;

          for (const kalem of normalizedKalemler) {
            const normalizedStockCode = kalem.stockCode.trim().toLocaleUpperCase('tr-TR');
            const existingControl = this.kalemler.controls.find(
              (control) =>
                control.controls.stokKodu.value.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode
            );

            if (existingControl) {
              continue;
            }

            this.kalemler.push(this.createSourceWarehouseProductFormGroup(kalem));
            addedCount++;
          }

          this.stockQuery.setValue('');
          this.stockResults.set([]);
          this.stockError.set(
            addedCount ? '' : 'Kaynak depo urunleri zaten siparis satirlarinda bulunuyor.'
          );
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.presetProductsRequestId) {
            return;
          }

          this.stockError.set(this.resolveErrorMessage(error, 'Kaynak depo urun listesi getirilemedi.'));
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

    if (this.kalemler.length > 0 && this.getPositiveOrderLineCount() === 0) {
      this.stockError.set('Siparise cevrilecek en az bir kalemde miktar 0dan buyuk olmalidir.');
      return;
    }

    if (!this.validateGreenGrocerLines()) {
      return;
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
      (total, control) => total + this.resolveLineOrderQuantity(control.getRawValue()),
      0
    );
  }

  private getPositiveOrderLineCount(): number {
    return this.kalemler.controls.filter(
      (control) => this.resolveLineOrderQuantity(control.getRawValue()) > 0
    ).length;
  }

  protected isGreenGrocerOrder(): boolean {
    const warehouseNo = this.selectedWarehouse()?.warehouseNo;
    return (
      warehouseNo !== undefined &&
      this.usesManualSourceProductSelection(warehouseNo) &&
      !this.greenGrocerResolutionDisabled
    );
  }

  private usesManualSourceProductSelection(warehouseNo: number | null | undefined): boolean {
    return typeof warehouseNo === 'number' && MANUAL_SOURCE_PRODUCT_WAREHOUSE_NOS.has(warehouseNo);
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
            this.resolveErrorMessage(error, 'Kaynak depo urunu cozumlemesi yapilamadi.'),
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

  protected hasPackageInput(control: KalemFormGroup): boolean {
    const packageFactor = Number(control.controls.koliKatsayisi.value ?? 0);
    return Number.isFinite(packageFactor) && packageFactor > 1;
  }

  protected getPackageHint(control: KalemFormGroup): string {
    const packageFactor = Number(control.controls.koliKatsayisi.value ?? 0);
    const secondaryUnitName = control.controls.ikinciBirim.value.trim() || 'KOLI';
    const unitName = control.controls.birim.value.trim() || 'birim';

    if (!Number.isFinite(packageFactor) || packageFactor <= 1) {
      return '';
    }

    return `1 ${secondaryUnitName} = ${this.formatQuantity(packageFactor)} ${unitName}`;
  }

  protected applyPackageQuantity(control: KalemFormGroup): void {
    const packageQuantity = Number(control.controls.koliMiktari.value ?? 0);
    const packageFactor = Number(control.controls.koliKatsayisi.value ?? 0);

    if (
      !Number.isFinite(packageQuantity)
      || packageQuantity <= 0
      || !Number.isFinite(packageFactor)
      || packageFactor <= 1
    ) {
      return;
    }

    control.controls.siparisMiktari.setValue(this.roundQuantity(packageQuantity * packageFactor), {
      emitEvent: false
    });
    this.clearLineResolution(control);
  }

  protected clearPackageQuantity(control: KalemFormGroup): void {
    if (control.controls.koliMiktari.value === null) {
      return;
    }

    control.controls.koliMiktari.setValue(null, { emitEvent: false });
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
    this.controls.muhatapAdSoyad.setValue(trimToMaxLength(this.resolveWarehouseContact(warehouse), 25));
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
      ikinciBirim: new FormControl('', { nonNullable: true }),
      koliKatsayisi: new FormControl<number | null>(null),
      koliBarkodu: new FormControl('', { nonNullable: true }),
      koliMiktari: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
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
      ikinciBirim: new FormControl('', { nonNullable: true }),
      koliKatsayisi: new FormControl<number | null>(null),
      koliBarkodu: new FormControl('', { nonNullable: true }),
      koliMiktari: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
      siparisMiktari: new FormControl<number | null>(siparisMiktari, {
        validators: [Validators.required, Validators.min(0.01)]
      }),
      cozumMiktari: new FormControl<number | null>(null),
      cozumBirim: new FormControl('', { nonNullable: true }),
      cozumMesaj: new FormControl('', { nonNullable: true }),
      cozumDurum: new FormControl('', { nonNullable: true }),
      cozumHata: new FormControl('', { nonNullable: true }),
      greenGrocerCase: new FormControl<GreenGrocerOrderLineSnapshotHttpRequest | null>(null),
      aciklama: new FormControl(trimToMaxLength(kalem.description, 50), { nonNullable: true, validators: [Validators.maxLength(50)] }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl(trimToMaxLength(kalem.packageCode, 25), { nonNullable: true, validators: [Validators.maxLength(25)] })
    });
  }

  private createSourceWarehouseProductFormGroup(
    kalem: SuggestedWarehouseSourceProductDto
  ): KalemFormGroup {
    return new FormGroup({
      stokKodu: new FormControl(kalem.stockCode.trim(), {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stokIsmi: new FormControl(kalem.stockName.trim(), { nonNullable: true }),
      barkodu: new FormControl(kalem.barcode?.trim() ?? '', { nonNullable: true }),
      birim: new FormControl(kalem.unitName?.trim() ?? '', { nonNullable: true }),
      birimKatsayisi: new FormControl<number | null>(kalem.unitPointer ?? 1),
      ikinciBirim: new FormControl(kalem.secondaryUnitName?.trim() ?? '', { nonNullable: true }),
      koliKatsayisi: new FormControl<number | null>(this.normalizePositiveNumber(kalem.packageFactor ?? null)),
      koliBarkodu: new FormControl(kalem.caseBarcode?.trim() ?? '', { nonNullable: true }),
      koliMiktari: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
      siparisMiktari: new FormControl<number | null>(0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      cozumMiktari: new FormControl<number | null>(null),
      cozumBirim: new FormControl('', { nonNullable: true }),
      cozumMesaj: new FormControl('', { nonNullable: true }),
      cozumDurum: new FormControl('', { nonNullable: true }),
      cozumHata: new FormControl('', { nonNullable: true }),
      greenGrocerCase: new FormControl<GreenGrocerOrderLineSnapshotHttpRequest | null>(null),
      aciklama: new FormControl(trimToMaxLength(kalem.stockName, 50), {
        nonNullable: true,
        validators: [Validators.maxLength(50)]
      }),
      skt: new FormControl('', { nonNullable: true }),
      modelKodu: new FormControl(trimToMaxLength(kalem.modelCode, 25), {
        nonNullable: true,
        validators: [Validators.maxLength(25)]
      })
    });
  }

  private buildRequest(): IFurpaCreateWarehouseOrderRequestApiDto {
    const rawValue = this.form.getRawValue();
    const inWarehouseNo = this.resolveCreateInWarehouseNo();

    return {
      ...(inWarehouseNo ? { inWarehouseNo } : {}),
      outWarehouseNo: rawValue.muhatapDepoNo ?? 0,
      orderDate: rawValue.orderDate,
      deliveryDate: rawValue.deliveryDate,
      description: trimToMaxLength(rawValue.description, 50),
      lines: rawValue.kalemler
        .filter((kalem) => this.resolveLineOrderQuantity(kalem) > 0)
        .map((kalem) => this.mapKalem(kalem))
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
        resolution.errors?.[0] ?? 'Bu kaynak depo urunu icin kasa cozumlemesi kullanilamaz.',
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
      this.stockError.set('Kaynak depo urunu cozumlemesi devam eden kalem var.');
      return false;
    }

    const failedLine = this.kalemler.controls.find(
      (control) => control.controls.cozumDurum.value === 'error'
    );

    if (failedLine) {
      this.stockError.set(failedLine.controls.cozumHata.value || 'Kaynak depo urunu cozumlemesi hatali kalem var.');
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

  private normalizeSourceWarehouseProducts(
    results: SuggestedWarehouseSourceProductDto[]
  ): SuggestedWarehouseSourceProductDto[] {
    const uniqueKalemler = new Map<string, SuggestedWarehouseSourceProductDto>();

    for (const kalem of results) {
      const stockCode = kalem.stockCode?.trim();
      const key = stockCode?.toLocaleUpperCase('tr-TR');

      if (!stockCode || !key || uniqueKalemler.has(key)) {
        continue;
      }

      uniqueKalemler.set(key, {
        ...kalem,
        stockCode,
        stockName: kalem.stockName?.trim() ?? '',
        modelCode: kalem.modelCode?.trim() ?? '',
        modelName: kalem.modelName?.trim() ?? '',
        unitName: kalem.unitName?.trim() ?? '',
        secondaryUnitName: kalem.secondaryUnitName?.trim() ?? '',
        packageFactor: this.normalizePositiveNumber(kalem.packageFactor ?? null),
        sourceWarehouseName: kalem.sourceWarehouseName?.trim() ?? '',
        barcode: kalem.barcode?.trim() ?? '',
        caseBarcode: kalem.caseBarcode?.trim() ?? '',
        quantity: 0,
        recommendedQuantity: 0,
        unitPrice: kalem.unitPrice ?? 0,
        unitPointer: kalem.unitPointer ?? 1
      });
    }

    return Array.from(uniqueKalemler.values()).sort((left, right) =>
      (left.stockName || left.stockCode).localeCompare(right.stockName || right.stockCode, 'tr')
    );
  }

  private resolveRecommendedQuantity(kalem: IFurpaCreateWarehouseOrderLineRequestApiDto): number {
    return this.normalizePositiveNumber(kalem.recommendedQuantity)
      ?? this.normalizePositiveNumber(kalem.quantity)
      ?? this.normalizePositiveNumber(kalem.unitPointer)
      ?? 1;
  }

  private normalizePositiveNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private roundQuantity(value: number): number {
    return Math.round(value * 1000) / 1000;
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

  private resolveCreateInWarehouseNo(): number | undefined {
    return this.isAdminUser()
      ? toPositiveWarehouseNo(this.controls.adminWarehouseNo.value) ?? undefined
      : undefined;
  }

  private normalizeOptionalText(value: string): string | null {
    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return resolveHttpErrorMessage(error, fallback);
  }
}
