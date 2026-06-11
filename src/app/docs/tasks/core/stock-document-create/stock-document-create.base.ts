import { HttpErrorResponse } from '@angular/common/http';
import { Directive, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import type {
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaCreateStockReceiptRequestApiDto,
  IFurpaCreateVirmanRequestApiDto,
  IFurpaProductSearchItemApiDto
} from '@interfaces';
import { Observable, finalize } from 'rxjs';

import { formatDateOnly } from '../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../core/api/module-services/arama.service';
import { SayimIslemleriService } from '../../../../core/api/module-services/sayim-islemleri.service';
import { StokIslemleriService } from '../../../../core/api/module-services/stok-islemleri.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { DocsContentPage } from '../../../models/docs.models';
import { DocsTaskDialogBase } from '../task-dialog.base';

type StockDocumentCreateKind = 'stock-receipt' | 'inventory-count' | 'virman';

interface StockDocumentCreateConfig {
  kind: StockDocumentCreateKind;
  page: DocsContentPage;
  eyebrow: string;
  submitLabel: string;
  submittingLabel: string;
  controllerName?: string;
  descriptionPlaceholder?: string;
}

type StockDocumentLineFormGroup = FormGroup<{
  stockCode: FormControl<string>;
  stockName: FormControl<string>;
  barcode: FormControl<string>;
  unitName: FormControl<string>;
  unitPointer: FormControl<number | null>;
  movementType: FormControl<number | null>;
  quantity: FormControl<number | null>;
  description: FormControl<string>;
  partyCode: FormControl<string>;
  lotNo: FormControl<number | null>;
  projectCode: FormControl<string>;
}>;

@Directive()
export abstract class StockDocumentCreateBase extends DocsTaskDialogBase {
  private readonly guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private readonly aramaService = inject(AramaService);
  private readonly stokIslemleriService = inject(StokIslemleriService);
  private readonly sayimIslemleriService = inject(SayimIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());

  protected readonly page: DocsContentPage;
  protected readonly config: StockDocumentCreateConfig;
  protected readonly stockQuery = new FormControl('', { nonNullable: true });
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly stockLoading = signal(false);
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly lastResult = signal<unknown | null>(null);
  protected readonly controls: {
    creator: FormControl<string>;
    acceptor: FormControl<string>;
    name: FormControl<string>;
    clientRequestId: FormControl<string>;
    movementDate: FormControl<string>;
    documentDate: FormControl<string>;
    documentNo: FormControl<string>;
    description: FormControl<string>;
    lines: FormArray<StockDocumentLineFormGroup>;
  };
  protected readonly form: FormGroup<StockDocumentCreateBase['controls']>;

  private stockRequestId = 0;

  protected constructor(config: StockDocumentCreateConfig) {
    super();

    this.config = config;
    this.page = config.page;

    const displayName = this.authService.currentUser()?.displayName || '';

    this.controls = {
      creator: new FormControl(displayName, {
        nonNullable: true,
        validators: config.kind === 'stock-receipt' ? [Validators.required] : []
      }),
      acceptor: new FormControl('', {
        nonNullable: true,
        validators: config.kind === 'stock-receipt' ? [Validators.required] : []
      }),
      name: new FormControl('', {
        nonNullable: true,
        validators: config.kind === 'inventory-count' ? [Validators.required] : []
      }),
      clientRequestId: new FormControl(this.createClientRequestId(), {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(this.guidPattern)]
      }),
      movementDate: new FormControl(this.today, {
        nonNullable: true,
        validators: config.kind === 'inventory-count' ? [] : [Validators.required]
      }),
      documentDate: new FormControl(this.today, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      documentNo: new FormControl('', { nonNullable: true }),
      description: new FormControl('', { nonNullable: true }),
      lines: new FormArray<StockDocumentLineFormGroup>([])
    };
    this.form = new FormGroup(this.controls);
  }

  protected get lines(): FormArray<StockDocumentLineFormGroup> {
    return this.controls.lines;
  }

  protected usesStockReceiptFields(): boolean {
    return this.config.kind === 'stock-receipt';
  }

  protected usesInventoryCountFields(): boolean {
    return this.config.kind === 'inventory-count';
  }

  protected usesVirmanFields(): boolean {
    return this.config.kind === 'virman';
  }

  protected usesMovementDate(): boolean {
    return this.config.kind !== 'inventory-count';
  }

  protected getDescriptionPlaceholder(): string {
    return this.config.descriptionPlaceholder ?? 'Opsiyonel aciklama';
  }

  protected getStockSearchPlaceholder(): string {
    return 'Stok adi, kodu veya barkod';
  }

  protected lineCount(): number {
    return this.lines.length;
  }

  protected totalQuantity(): number {
    return this.lines.controls.reduce(
      (total, control) => total + this.normalizeNumber(control.controls.quantity.value),
      0
    );
  }

  protected searchStock(): void {
    const query = this.stockQuery.value.trim();

    if (this.stockLoading()) {
      return;
    }

    this.stockError.set('');
    this.stockResults.set([]);

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

          if (!normalizedResults.length) {
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

  protected addStockLine(stock: IFurpaProductSearchItemApiDto): void {
    this.lines.push(this.createLineFormGroup(stock));
    this.stockResults.set([]);
    this.stockQuery.setValue('');
  }

  protected addManualLine(): void {
    this.lines.push(this.createLineFormGroup());
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  protected regenerateClientRequestId(): void {
    this.controls.clientRequestId.setValue(this.createClientRequestId());
    this.controls.clientRequestId.markAsDirty();
  }

  protected hasClientRequestIdError(): boolean {
    const control = this.controls.clientRequestId;
    return control.invalid && (control.dirty || control.touched);
  }

  protected submit(): void {
    this.submitError.set('');
    this.lastResult.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Zorunlu alanlari ve Client Request Id GUID formatini kontrol et.');
      return;
    }

    if (!this.lines.length) {
      this.submitError.set('Kaydetmek icin en az bir kalem ekle.');
      return;
    }

    const invalidLine = this.lines.controls.find(
      (line) =>
        !line.controls.stockCode.value.trim() ||
        this.normalizeNumber(line.controls.quantity.value) <= 0 ||
        this.normalizeNumber(line.controls.unitPointer.value) <= 0 ||
        (this.usesVirmanFields() && this.normalizeNumber(line.controls.movementType.value) < 0)
    );

    if (invalidLine) {
      invalidLine.markAllAsTouched();
      this.submitError.set('Kalemlerde stok kodu, miktar ve birim bilgilerini kontrol et.');
      return;
    }

    this.submitting.set(true);

    this.submitRequest()
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result: unknown) => {
          this.lastResult.set(result);
          this.close({ created: true, result });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, 'Fis kaydedilemedi.'));
        }
      });
  }

  protected readonly trackByStock = (
    index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string => stock.stockCode?.trim() || stock.barcode?.trim() || `${index}`;

  protected readonly trackByLine = (
    index: number,
    control: StockDocumentLineFormGroup
  ): string => control.controls.stockCode.value.trim() || `${index}`;

  private submitRequest(): Observable<unknown> {
    switch (this.config.kind) {
      case 'stock-receipt':
        return this.stokIslemleriService.createSubeIci(
          this.config.controllerName ?? '',
          this.buildStockReceiptRequest()
        );
      case 'inventory-count':
        return this.sayimIslemleriService.createSayimSonucu(this.buildInventoryCountRequest());
      case 'virman':
        return this.stokIslemleriService.createVirman(
          this.config.controllerName ?? 'StokVirmanCikisFisleri',
          this.buildVirmanRequest()
        );
    }
  }

  private buildStockReceiptRequest(): IFurpaCreateStockReceiptRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      creator: rawValue.creator.trim(),
      acceptor: rawValue.acceptor.trim(),
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: rawValue.documentNo.trim(),
      description: rawValue.description.trim(),
      lines: rawValue.lines.map((line) => ({
        stockCode: line.stockCode.trim(),
        quantity: this.normalizeNumber(line.quantity),
        unitPointer: this.normalizeNumber(line.unitPointer),
        description: line.description.trim(),
        partyCode: line.partyCode.trim(),
        lotNo: this.normalizeNumber(line.lotNo),
        projectCode: line.projectCode.trim()
      }))
    };
  }

  private buildInventoryCountRequest(): IFurpaCreateInventoryCountRequestApiDto {
    const rawValue = this.form.getRawValue();
    const clientRequestId = rawValue.clientRequestId.trim();

    return {
      clientRequestId: clientRequestId || undefined,
      name: rawValue.name.trim(),
      documentDate: rawValue.documentDate,
      lines: rawValue.lines.map((line) => ({
        stockCode: line.stockCode.trim(),
        quantity: this.normalizeNumber(line.quantity),
        barcode: line.barcode.trim() || undefined,
        unitPointer: this.normalizeNumber(line.unitPointer)
      }))
    };
  }

  private buildVirmanRequest(): IFurpaCreateVirmanRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: rawValue.documentNo.trim(),
      description: rawValue.description.trim(),
      lines: rawValue.lines.map((line) => ({
        stockCode: line.stockCode.trim(),
        movementType: this.normalizeNumber(line.movementType),
        quantity: this.normalizeNumber(line.quantity),
        unitPointer: this.normalizeNumber(line.unitPointer),
        description: line.description.trim(),
        partyCode: line.partyCode.trim(),
        lotNo: this.normalizeNumber(line.lotNo),
        projectCode: line.projectCode.trim()
      }))
    };
  }

  private createLineFormGroup(
    stock?: IFurpaProductSearchItemApiDto
  ): StockDocumentLineFormGroup {
    return new FormGroup({
      stockCode: new FormControl(stock?.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockName: new FormControl(stock?.stockName?.trim() ?? '', { nonNullable: true }),
      barcode: new FormControl(stock?.barcode?.trim() ?? '', { nonNullable: true }),
      unitName: new FormControl(stock?.unitName?.trim() ?? '', { nonNullable: true }),
      unitPointer: new FormControl(this.resolveUnitPointer(stock), {
        validators: [Validators.required, Validators.min(1)]
      }),
      movementType: new FormControl(this.usesVirmanFields() ? 2 : null, {
        validators: this.usesVirmanFields() ? [Validators.required, Validators.min(0)] : []
      }),
      quantity: new FormControl(1, {
        validators: [Validators.required, Validators.min(0.001)]
      }),
      description: new FormControl('', { nonNullable: true }),
      partyCode: new FormControl('', { nonNullable: true }),
      lotNo: new FormControl(0),
      projectCode: new FormControl('', { nonNullable: true })
    });
  }

  private resolveUnitPointer(stock?: IFurpaProductSearchItemApiDto): number {
    if (!stock) {
      return 1;
    }

    return stock.unitMultiplier && stock.unitMultiplier > 0 ? 1 : 1;
  }

  private normalizeStocks(
    results: IFurpaProductSearchItemApiDto[]
  ): IFurpaProductSearchItemApiDto[] {
    const uniqueStocks = new Map<string, IFurpaProductSearchItemApiDto>();

    for (const stock of results) {
      const key = stock.stockCode?.trim() || stock.barcode?.trim();

      if (key && !uniqueStocks.has(key)) {
        uniqueStocks.set(key, stock);
      }
    }

    return Array.from(uniqueStocks.values());
  }

  private normalizeNumber(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 0);
    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
  }

  private createClientRequestId(): string {
    const cryptoApi = globalThis.crypto;

    if (typeof cryptoApi?.randomUUID === 'function') {
      return cryptoApi.randomUUID();
    }

    const bytes = new Uint8Array(16);

    if (typeof cryptoApi?.getRandomValues === 'function') {
      cryptoApi.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return this.formatGuid(bytes);
  }

  private formatGuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.error === 'object' && error.error !== null) {
      if ('detail' in error.error && typeof error.error.detail === 'string' && error.error.detail.trim()) {
        return error.error.detail;
      }

      if ('message' in error.error && typeof error.error.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if ('title' in error.error && typeof error.error.title === 'string' && error.error.title.trim()) {
        return error.error.title;
      }
    }

    return fallback;
  }
}
