import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  IFurpaCreateVirmanRequestApiDto,
  IFurpaProductSearchItemApiDto,
  VirmanConversionSuggestionDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import {
  SafeCreateFailure,
  SafeCreateRetryDraft,
  classifySafeCreateFailure
} from '../../../core/safe-create-retry.helpers';
import { resolveHttpErrorMessage, trimToMaxLength } from '../../../core/api-error.helpers';
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../../../core/admin-warehouse.helpers';

type VirmanLineFormGroup = FormGroup<{
  stockCode: FormControl<string>;
  stockName: FormControl<string>;
  movementType: FormControl<number | null>;
  unitPointer: FormControl<number | null>;
  quantity: FormControl<number | null>;
  description: FormControl<string>;
  partyCode: FormControl<string>;
  lotNo: FormControl<number | null>;
  projectCode: FormControl<string>;
}>;

interface VirmanStockSelection {
  stockCode: string;
  stockName: string;
  barcode?: string | null;
  unitName?: string | null;
}

const VIRMAN_STOCK_SEARCH_TAKE = 100;

@Component({
  selector: 'app-stok-virman-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stok-virman-cikis-fisleri-create.component.html',
  styleUrl: './stok-virman-cikis-fisleri-create.component.scss'
})
export class StokVirmanCikisFisleriCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['virmanlar'];
  protected readonly outgoingStockQuery = new FormControl('', { nonNullable: true });
  protected readonly incomingStockQuery = new FormControl('', { nonNullable: true });
  protected readonly outgoingQuantity = new FormControl<number | null>(1, {
    validators: [Validators.required, Validators.min(1)]
  });
  protected readonly incomingQuantity = new FormControl<number | null>(1, {
    validators: [Validators.required, Validators.min(1)]
  });
  protected readonly outgoingStockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly incomingStockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected hideDelistedProducts = false;
  protected readonly selectedOutgoingStock = signal<VirmanStockSelection | null>(null);
  protected readonly selectedIncomingStock = signal<VirmanStockSelection | null>(null);
  protected readonly outgoingStockLoading = signal(false);
  protected readonly incomingStockLoading = signal(false);
  protected readonly conversionSuggestionLoading = signal(false);
  protected readonly conversionSuggestion = signal<VirmanConversionSuggestionDto | null>(null);
  protected readonly conversionSuggestionError = signal('');
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly safeCreateFailure = signal<SafeCreateFailure | null>(null);
  protected readonly submitting = signal(false);

  private readonly aramaService = inject(AramaService);
  private readonly stokIslemleriService = inject(StokIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly today = formatDateOnly(new Date());
  private readonly safeCreateRetry = new SafeCreateRetryDraft<IFurpaCreateVirmanRequestApiDto>();
  private outgoingStockRequestId = 0;
  private incomingStockRequestId = 0;
  private conversionSuggestionRequestId = 0;
  protected readonly isAdminUser = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    )
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );

  protected readonly form = new FormGroup({
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
    description: new FormControl('Reyon duzenleme virmani', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    lines: new FormArray<VirmanLineFormGroup>([])
  });

  constructor() {
    super();

    this.outgoingQuantity.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((quantity: number | null) => this.refreshSuggestedTargetQuantity(quantity));
  }

  protected get lines(): FormArray<VirmanLineFormGroup> {
    return this.form.controls.lines;
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

  protected effectiveLineCount(): number {
    return this.lines.controls.reduce(
      (total, control) => total + (this.isExpandedVirmanLine(control) ? 2 : 1),
      0
    );
  }

  protected effectiveTotalQuantity(): number {
    return this.lines.controls.reduce((total, control) => {
      const quantity = this.normalizeNumber(control.controls.quantity.value);
      return total + quantity * (this.isExpandedVirmanLine(control) ? 2 : 1);
    }, 0);
  }

  protected hasExpandedVirmanLines(): boolean {
    return this.lines.controls.some((line) => this.isExpandedVirmanLine(line));
  }

  protected searchVirmanStock(target: 'outgoing' | 'incoming'): void {
    const queryControl = target === 'outgoing' ? this.outgoingStockQuery : this.incomingStockQuery;
    const loading = target === 'outgoing' ? this.outgoingStockLoading : this.incomingStockLoading;
    const results = target === 'outgoing' ? this.outgoingStockResults : this.incomingStockResults;
    const query = queryControl.value.trim();

    if (loading()) {
      return;
    }

    this.stockError.set('');
    results.set([]);

    if (query.length < 2) {
      this.stockError.set('Virman stogu aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = target === 'outgoing' ? ++this.outgoingStockRequestId : ++this.incomingStockRequestId;
    loading.set(true);

    this.aramaService
      .searchStock(query, VIRMAN_STOCK_SEARCH_TAKE, this.resolveIncludeDelisted())
      .pipe(finalize(() => {
        const currentRequestId = target === 'outgoing' ? this.outgoingStockRequestId : this.incomingStockRequestId;
        if (requestId === currentRequestId) {
          loading.set(false);
        }
      }))
      .subscribe({
        next: (results: IFurpaProductSearchItemApiDto[]) => {
          const currentRequestId = target === 'outgoing' ? this.outgoingStockRequestId : this.incomingStockRequestId;
          if (requestId !== currentRequestId) {
            return;
          }

          const normalizedResults = this.normalizeStocks(results ?? []);
          (target === 'outgoing' ? this.outgoingStockResults : this.incomingStockResults).set(normalizedResults);

          if (!normalizedResults.length) {
            this.stockError.set('Aramana uygun virman stogu bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          const currentRequestId = target === 'outgoing' ? this.outgoingStockRequestId : this.incomingStockRequestId;
          if (requestId !== currentRequestId) {
            return;
          }

          this.stockError.set(this.resolveErrorMessage(error, 'Stok aramasi yapilamadi.'));
        }
      });
  }

  protected selectVirmanStock(stock: IFurpaProductSearchItemApiDto, target: 'outgoing' | 'incoming'): void {
    const label = this.getStockLabel(stock);

    if (target === 'outgoing') {
      this.selectedOutgoingStock.set(stock);
      this.outgoingStockQuery.setValue(label);
      this.outgoingStockResults.set([]);
      this.resetIncomingSelection();
      this.loadVirmanConversionSuggestion(stock);
      return;
    }

    this.cancelConversionSuggestion();
    this.selectedIncomingStock.set(stock);
    this.incomingStockQuery.setValue(label);
    this.incomingStockResults.set([]);
  }

  protected addVirmanPair(): void {
    this.stockError.set('');

    const outgoingStock = this.selectedOutgoingStock();
    const incomingStock = this.selectedIncomingStock();
    const outgoingQuantity = this.normalizeNumber(this.outgoingQuantity.value);
    const incomingQuantity = this.normalizeNumber(this.incomingQuantity.value);

    if (!outgoingStock || !incomingStock) {
      this.stockError.set('Once parcalanacak ve virman yapilacak urunleri sec.');
      return;
    }

    if (this.getStockKey(outgoingStock) === this.getStockKey(incomingStock)) {
      this.stockError.set('Cikis ve giris urunleri ayni olamaz.');
      return;
    }

    if (!this.isValidVirmanQuantity(outgoingQuantity) || !this.isValidVirmanQuantity(incomingQuantity)) {
      this.stockError.set('Cikis ve giris miktarlari en az 1 olmali.');
      return;
    }

    this.lines.push(this.createLineFormGroup(outgoingStock, 1, outgoingQuantity));
    this.lines.push(this.createLineFormGroup(incomingStock, 0, incomingQuantity));
    this.clearVirmanPairForm();
  }

  protected addManualLine(movementType = 1): void {
    this.lines.push(this.createLineFormGroup(undefined, movementType));
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  protected submit(): void {
    if (this.submitting() || this.safeCreateFailure()?.blocksSubmit) {
      return;
    }

    this.submitError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Virman ust bilgilerini kontrol et.');
      return;
    }

    if (!this.lines.length) {
      this.submitError.set('Virman icin en az bir kalem ekle.');
      return;
    }

    const invalidLine = this.lines.controls.find(
      (line) =>
        !line.controls.stockCode.value.trim() ||
        !this.isValidVirmanQuantity(this.normalizeNumber(line.controls.quantity.value)) ||
        this.normalizeNumber(line.controls.unitPointer.value) <= 0 ||
        this.normalizeNumber(line.controls.movementType.value) < 0
    );

    if (invalidLine) {
      invalidLine.markAllAsTouched();
      this.submitError.set('Kalemlerde stok kodu, hareket tipi, miktar ve birim bilgilerini kontrol et.');
      return;
    }

    this.submitting.set(true);

    this.stokIslemleriService
      .createVirman('StokVirmanCikisFisleri', this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result: unknown) => {
          this.safeCreateRetry.reset();
          this.close({ created: true, result });
        },
        error: (error: HttpErrorResponse) => {
          this.applySafeCreateFailure(error, 'Virman kaydedilemedi.');
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
    this.safeCreateFailure.set(failure);
    this.submitError.set(failure.message);
  }

  protected readonly trackByStock = (
    index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string => stock.stockCode?.trim() || stock.barcode?.trim() || `${index}`;

  protected readonly trackByLine = (
    index: number,
    control: VirmanLineFormGroup
  ): string => control.controls.stockCode.value.trim() || `${index}`;

  protected getStockLabel(stock: VirmanStockSelection | null): string {
    if (!stock) {
      return '';
    }

    const stockName = stock.stockName?.trim();
    return stockName || stock.stockCode?.trim() || '';
  }

  protected getMovementLabel(movementType: number | null): string {
    switch (this.normalizeNumber(movementType)) {
      case 0:
        return 'Giris';
      case 1:
        return 'Cikis';
      case 2:
        return 'Teknik';
      default:
        return 'Bilinmiyor';
    }
  }

  private buildRequest(): IFurpaCreateVirmanRequestApiDto {
    const rawValue = this.form.getRawValue();

    return this.safeCreateRetry.withClientRequestId({
      warehouseNo: this.resolveRequestWarehouseNo(),
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      documentNo: trimToMaxLength(rawValue.documentNo, 25),
      description: trimToMaxLength(rawValue.description, 50),
      lines: rawValue.lines.map((line) => ({
        stockCode: line.stockCode.trim(),
        movementType: this.normalizeNumber(line.movementType),
        quantity: this.normalizeNumber(line.quantity),
        unitPointer: this.normalizeNumber(line.unitPointer),
        description: trimToMaxLength(line.description, 50),
        partyCode: trimToMaxLength(line.partyCode, 25),
        lotNo: this.normalizeNumber(line.lotNo),
        projectCode: trimToMaxLength(line.projectCode, 25)
      }))
    });
  }

  private createLineFormGroup(
    stock?: VirmanStockSelection,
    movementType = 1,
    quantity = 1
  ): VirmanLineFormGroup {
    return new FormGroup({
      stockCode: new FormControl(stock?.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockName: new FormControl(stock?.stockName?.trim() ?? '', { nonNullable: true }),
      movementType: new FormControl(movementType, {
        validators: [Validators.required, Validators.min(0)]
      }),
      unitPointer: new FormControl(1, {
        validators: [Validators.required, Validators.min(1)]
      }),
      quantity: new FormControl(quantity, {
        validators: [Validators.required, Validators.min(1)]
      }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
      partyCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(25)] }),
      lotNo: new FormControl(0),
      projectCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(25)] })
    });
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

  private clearVirmanPairForm(): void {
    this.cancelConversionSuggestion();
    this.selectedOutgoingStock.set(null);
    this.selectedIncomingStock.set(null);
    this.outgoingStockQuery.setValue('');
    this.incomingStockQuery.setValue('');
    this.outgoingQuantity.setValue(1);
    this.incomingQuantity.setValue(1);
    this.outgoingStockResults.set([]);
    this.incomingStockResults.set([]);
  }

  private loadVirmanConversionSuggestion(stock: VirmanStockSelection): void {
    const sourceStockCode = stock.stockCode.trim();
    const sourceQuantity = this.normalizeNumber(this.outgoingQuantity.value);

    this.cancelConversionSuggestion();

    if (!sourceStockCode || !this.isValidVirmanQuantity(sourceQuantity)) {
      this.conversionSuggestionError.set(
        'Otomatik donusum icin cikis miktarini en az 1 gir.'
      );
      return;
    }

    const requestId = ++this.conversionSuggestionRequestId;
    this.conversionSuggestionLoading.set(true);

    this.stokIslemleriService
      .getVirmanConversionSuggestion(sourceStockCode, sourceQuantity)
      .pipe(finalize(() => {
        if (requestId === this.conversionSuggestionRequestId) {
          this.conversionSuggestionLoading.set(false);
        }
      }))
      .subscribe({
        next: (suggestion: VirmanConversionSuggestionDto) => {
          if (requestId !== this.conversionSuggestionRequestId) {
            return;
          }

          this.applyVirmanConversionSuggestion(suggestion);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.conversionSuggestionRequestId) {
            return;
          }

          this.conversionSuggestionError.set(
            this.resolveErrorMessage(
              error,
              'Otomatik donusum onerisi alinamadi. Hedef urunu ve miktari manuel sec.'
            )
          );
        }
      });
  }

  private applyVirmanConversionSuggestion(suggestion: VirmanConversionSuggestionDto): void {
    this.conversionSuggestion.set(suggestion);
    this.conversionSuggestionError.set('');

    const targetStockCode = suggestion.targetStockCode?.trim() ?? '';
    const multiplier = this.normalizeNumber(suggestion.multiplier);

    if (!suggestion.isReliable || !targetStockCode || multiplier <= 0) {
      return;
    }

    const targetStock: VirmanStockSelection = {
      stockCode: targetStockCode,
      stockName: suggestion.targetStockName?.trim() || targetStockCode,
      unitName: suggestion.targetUnitName?.trim() || ''
    };

    this.selectedIncomingStock.set(targetStock);
    this.incomingStockQuery.setValue(this.getStockLabel(targetStock));
    this.incomingStockResults.set([]);
    this.refreshSuggestedTargetQuantity(this.outgoingQuantity.value);
  }

  private refreshSuggestedTargetQuantity(quantity: number | null): void {
    const suggestion = this.conversionSuggestion();
    const multiplier = this.normalizeNumber(suggestion?.multiplier);
    const sourceQuantity = this.normalizeNumber(quantity);

    if (
      !suggestion?.isReliable ||
      multiplier <= 0 ||
      !this.isValidVirmanQuantity(sourceQuantity)
    ) {
      return;
    }

    this.incomingQuantity.setValue(this.roundQuantity(sourceQuantity * multiplier));
  }

  private resetIncomingSelection(): void {
    this.selectedIncomingStock.set(null);
    this.incomingStockQuery.setValue('');
    this.incomingQuantity.setValue(1);
    this.incomingStockResults.set([]);
  }

  private cancelConversionSuggestion(): void {
    this.conversionSuggestionRequestId += 1;
    this.conversionSuggestionLoading.set(false);
    this.conversionSuggestion.set(null);
    this.conversionSuggestionError.set('');
  }

  private getStockKey(stock: VirmanStockSelection): string {
    return (stock.stockCode?.trim() || stock.barcode?.trim() || '').toLocaleUpperCase('tr-TR');
  }

  private roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private normalizeNumber(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 0);
    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
  }

  private isValidVirmanQuantity(value: number): boolean {
    return value >= 1;
  }

  private isExpandedVirmanLine(control: VirmanLineFormGroup): boolean {
    return this.normalizeNumber(control.controls.movementType.value) === 2;
  }

  private resolveRequestWarehouseNo(): number | undefined {
    const adminWarehouseNo = this.isAdminUser()
      ? toPositiveWarehouseNo(this.form.controls.adminWarehouseNo.value)
      : null;

    return adminWarehouseNo
      ?? getCurrentWarehouseNo(this.authService.currentUser())
      ?? undefined;
  }

  private resolveIncludeDelisted(): boolean | undefined {
    return this.hideDelistedProducts ? false : undefined;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return resolveHttpErrorMessage(error, fallback);
  }
}
