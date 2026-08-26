import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Directive, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import type {
  IFurpaProductSearchItemApiDto,
  IFurpaUpdateWarehouseShippingRequestApiDto,
  IFurpaUpdateWarehouseShippingResponseApiDto,
  IFurpaWarehouseShippingDetailApiDto,
  IFurpaWarehouseShippingItemApiDto
} from '@interfaces';
import { Observable, finalize } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AramaService } from '../../../../core/api/module-services/arama.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { DocsContentPage } from '../../../models/docs.models';
import { resolveHttpErrorMessage } from '../api-error.helpers';
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
  toPositiveWarehouseNo
} from '../admin-warehouse.helpers';
import { KalemliTaskDetailBase } from './kalemli-task-detail.base';

type EditableWarehouseMovementDetail = IFurpaWarehouseShippingDetailApiDto;
type UpdateWarehouseMovementRequest = IFurpaUpdateWarehouseShippingRequestApiDto;
type UpdateWarehouseMovementResponse = IFurpaUpdateWarehouseShippingResponseApiDto;

type EditableWarehouseLineFormGroup = FormGroup<{
  movementGuid: FormControl<string>;
  lineNo: FormControl<number | null>;
  stockCode: FormControl<string>;
  stockName: FormControl<string>;
  unitName: FormControl<string>;
  unitPointer: FormControl<number | null>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  description: FormControl<string>;
}>;

interface SeriSiraPayload {
  seri?: string;
  sira?: number;
  warehouseNo?: number;
}

@Directive()
export abstract class EditableWarehouseMovementDetailBase
  extends KalemliTaskDetailBase<EditableWarehouseMovementDetail>
{
  protected abstract override readonly page: DocsContentPage;
  protected abstract readonly updatePermissionCode: string;

  private readonly authService = inject(AuthService);
  private readonly aramaService = inject(AramaService);
  private readonly editableDestroyRef = inject(DestroyRef);
  private stockRequestId = 0;

  protected readonly isEditing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly deletedMovementGuids = signal<string[]>([]);
  protected readonly editableStockQuery = new FormControl('', { nonNullable: true });
  protected readonly editableStockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly editableStockError = signal('');
  protected readonly editableStockLoading = signal(false);

  protected readonly editControls = {
    movementDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    targetWarehouseNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
    }),
    transitWarehouseNo: new FormControl<number | null>(null, {
      validators: [Validators.min(1)]
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)]
    }),
    lines: new FormArray<EditableWarehouseLineFormGroup>([])
  };
  protected readonly editForm = new FormGroup(this.editControls);

  protected readonly editableLines = this.editControls.lines;
  protected readonly showUpdateButton = computed(() =>
    this.canUseUpdateEndpoint() && this.hasUpdatePermission()
  );
  protected readonly canUpdateDocument = computed(() => {
    const header = this.header();

    return (
      !!header &&
      this.showUpdateButton() &&
      !this.isEDespatchSent(header) &&
      !this.isWarehouseAccepted(header) &&
      this.kalemler().every((line) => !!this.getLineText(line, 'movementGuid'))
    );
  });
  protected readonly updateBlockedReason = computed(() => {
    const header = this.header();

    if (!header || !this.showUpdateButton()) {
      return '';
    }

    if (this.isEDespatchSent(header)) {
      return 'E-irsaliye gonderilmis evrak guncellenemez.';
    }

    if (this.isWarehouseAccepted(header)) {
      return 'Karsi depo kabul ettigi icin evrak guncellenemez.';
    }

    if (this.kalemler().some((line) => !this.getLineText(line, 'movementGuid'))) {
      return 'Satir GUID bilgisi olmayan evrak guncellenemez.';
    }

    return '';
  });

  protected abstract updateDetailRequest(
    seri: string,
    sira: number,
    request: UpdateWarehouseMovementRequest,
    warehouseNo?: number
  ): Observable<UpdateWarehouseMovementResponse>;

  protected loadEditableDetailRequest(
    requestFactory: (
      seri: string,
      sira: number,
      warehouseNo?: number
    ) => Observable<EditableWarehouseMovementDetail>,
    missingKeyMessage: string,
    loadErrorMessage: string
  ): void {
    this.isEditing.set(false);
    this.saveError.set(null);
    this.clearEditableStockSearch();
    this.editableLines.clear();
    this.deletedMovementGuids.set([]);
    this.runDetailRequest({
      validatePayload: (payload: SeriSiraPayload | null): payload is Required<Pick<SeriSiraPayload, 'seri' | 'sira'>> & SeriSiraPayload =>
        !!payload?.seri && payload.sira !== null && payload.sira !== undefined,
      requestFactory: (payload: Required<Pick<SeriSiraPayload, 'seri' | 'sira'>> & SeriSiraPayload) =>
        requestFactory(payload.seri, payload.sira, payload.warehouseNo).pipe(
          tap((detail: EditableWarehouseMovementDetail) => this.populateEditForm(detail))
        ),
      missingKeyMessage,
      loadErrorMessage
    });
  }

  protected startEdit(): void {
    const detail = this.detail();

    if (!detail || !this.canUpdateDocument()) {
      this.saveError.set(this.updateBlockedReason() || 'Bu evrak su anda guncellenemez.');
      return;
    }

    this.populateEditForm(detail);
    this.saveError.set(null);
    this.clearEditableStockSearch();
    this.isEditing.set(true);
  }

  protected cancelEdit(): void {
    const detail = this.detail();

    if (detail) {
      this.populateEditForm(detail);
    }

    this.saveError.set(null);
    this.clearEditableStockSearch();
    this.isEditing.set(false);
  }

  protected saveEdit(): void {
    if (this.isSaving()) {
      return;
    }

    this.saveError.set(null);

    if (!this.canUpdateDocument()) {
      this.saveError.set(this.updateBlockedReason() || 'Bu evrak su anda guncellenemez.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    if (!this.editableLines.length && this.deletedMovementGuids().length === 0) {
      this.saveError.set('Guncellenecek en az bir satir bulunmali.');
      return;
    }

    const header = this.header();
    const seri = this.getHeaderText(header, 'documentSerie');
    const sira = this.getHeaderNumber(header, 'documentOrderNo');

    if (!seri || sira === null) {
      this.saveError.set('Evrak seri ve sira bilgisi bulunamadi.');
      return;
    }

    this.isSaving.set(true);
    this.updateDetailRequest(seri, sira, this.buildUpdateRequest(), this.resolveUpdateWarehouseNo())
      .pipe(
        takeUntilDestroyed(this.editableDestroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (result: UpdateWarehouseMovementResponse) => {
          this.close({ updated: true, result });
        },
        error: (error: HttpErrorResponse) => {
          this.saveError.set(
            resolveHttpErrorMessage(error, 'Evrak guncellenemedi. Bilgileri kontrol edip tekrar deneyin.')
          );
        }
      });
  }

  protected readonly trackByEditableLine = (
    index: number,
    control: EditableWarehouseLineFormGroup
  ): string =>
    control.controls.movementGuid.value.trim() ||
    control.controls.stockCode.value.trim() ||
    `${index}`;

  protected addEditableLine(): void {
    this.editableLines.push(
      this.createLineFormGroup({
        movementGuid: '',
        stockCode: '',
        stockName: '',
        unitName: '',
        unitPointer: 1,
        quantity: 1,
        unitPrice: 0,
        description: ''
      })
    );
    this.editForm.markAsDirty();
  }

  protected searchEditableStock(): void {
    const query = this.editableStockQuery.value.trim();

    if (this.editableStockLoading()) {
      return;
    }

    this.editableStockError.set('');
    this.editableStockResults.set([]);

    if (query.length < 2) {
      this.editableStockError.set('Kalem aramak icin en az 2 karakter gir.');
      return;
    }

    const requestId = ++this.stockRequestId;
    this.editableStockLoading.set(true);

    this.aramaService
      .searchStock(query, 12)
      .pipe(
        takeUntilDestroyed(this.editableDestroyRef),
        finalize(() => {
          if (requestId === this.stockRequestId) {
            this.editableStockLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (results: IFurpaProductSearchItemApiDto[]) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          const normalizedResults = this.normalizeStockResults(results ?? []);
          this.editableStockResults.set(normalizedResults);

          if (!normalizedResults.length) {
            this.editableStockError.set('Aramana uygun kalem bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.stockRequestId) {
            return;
          }

          this.editableStockError.set(
            resolveHttpErrorMessage(error, 'Kalem aramasi yapilamadi. Lutfen tekrar deneyin.')
          );
        }
      });
  }

  protected addEditableStockLine(stock: IFurpaProductSearchItemApiDto): void {
    const stockCode = stock.stockCode?.trim();

    if (!stockCode) {
      this.editableStockError.set('Secilen kalemin stok kodu bulunamadi.');
      return;
    }

    const normalizedStockCode = stockCode.toLocaleUpperCase('tr-TR');
    const existingNewLine = this.editableLines.controls.find(
      (control) =>
        !control.controls.movementGuid.value.trim() &&
        control.controls.stockCode.value.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode
    );
    const unitPointer = this.toPositiveNumber(stock.unitMultiplier, 1);
    const quantityStep = unitPointer > 0 ? unitPointer : 1;

    if (existingNewLine) {
      const currentQuantity = this.toPositiveNumber(existingNewLine.controls.quantity.value, 0);
      existingNewLine.controls.quantity.setValue(currentQuantity + quantityStep);
      existingNewLine.controls.quantity.markAsDirty();
      this.editForm.markAsDirty();
      this.clearEditableStockSearch();
      return;
    }

    this.editableLines.push(
      this.createLineFormGroup({
        movementGuid: '',
        stockCode,
        stockName: stock.stockName?.trim() ?? '',
        unitName: stock.unitName?.trim() ?? '',
        unitPointer,
        quantity: quantityStep,
        unitPrice: 0,
        description: ''
      })
    );
    this.editForm.markAsDirty();
    this.clearEditableStockSearch();
  }

  protected readonly trackByEditableStock = (
    index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string =>
    [
      stock.stockCode?.trim(),
      stock.barcode?.trim(),
      `${index}`
    ]
      .filter((value): value is string => !!value)
      .join('-');

  protected removeEditableLine(index: number): void {
    const control = this.editableLines.at(index);

    if (!control) {
      return;
    }

    const movementGuid = control.controls.movementGuid.value.trim();

    if (movementGuid) {
      this.deletedMovementGuids.update((movementGuids) =>
        movementGuids.includes(movementGuid) ? movementGuids : [...movementGuids, movementGuid]
      );
    }

    this.editableLines.removeAt(index);
    this.editForm.markAsDirty();
  }

  protected canUseUpdateEndpoint(): boolean {
    return true;
  }

  protected formatInputNumber(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private populateEditForm(detail: EditableWarehouseMovementDetail): void {
    const header = detail.header;

    this.editControls.movementDate.setValue(
      this.toDateInput(header.movementDate || header.documentDate)
    );
    this.editControls.documentDate.setValue(
      this.toDateInput(header.documentDate || header.movementDate)
    );
    this.editControls.targetWarehouseNo.setValue(
      this.formatInputNumber(header.targetWarehouseNo)
    );
    this.editControls.transitWarehouseNo.setValue(
      this.formatInputNumber(header.shippingWarehouseNo)
    );
    this.editControls.description.setValue((header.description ?? '').trim());

    this.editableLines.clear();
    this.deletedMovementGuids.set([]);
    for (const line of detail.items ?? []) {
      this.editableLines.push(this.createLineFormGroup(line));
    }

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  private createLineFormGroup(
    line: Partial<IFurpaWarehouseShippingItemApiDto>
  ): EditableWarehouseLineFormGroup {
    return new FormGroup({
      movementGuid: new FormControl(line.movementGuid?.trim() ?? '', {
        nonNullable: true
      }),
      lineNo: new FormControl(this.formatInputNumber(line.lineNo)),
      stockCode: new FormControl(line.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockName: new FormControl(line.stockName?.trim() ?? '', { nonNullable: true }),
      unitName: new FormControl(line.unitName?.trim() ?? '', { nonNullable: true }),
      unitPointer: new FormControl(this.formatInputNumber(line.unitPointer), {
        validators: [Validators.required, Validators.min(1)]
      }),
      quantity: new FormControl(this.formatInputNumber(line.quantity), {
        validators: [Validators.required, Validators.min(0.001)]
      }),
      unitPrice: new FormControl(this.formatInputNumber(line.unitPrice), {
        validators: [Validators.required, Validators.min(0)]
      }),
      description: new FormControl(line.description?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(50)]
      })
    });
  }

  private buildUpdateRequest(): UpdateWarehouseMovementRequest {
    const rawValue = this.editForm.getRawValue();

    return {
      movementDate: rawValue.movementDate,
      documentDate: rawValue.documentDate,
      targetWarehouseNo: this.normalizeNumber(rawValue.targetWarehouseNo),
      transitWarehouseNo: this.toOptionalPositiveNumber(rawValue.transitWarehouseNo),
      description: rawValue.description.trim(),
      lines: [
        ...rawValue.lines.map((line) => {
          const movementGuid = line.movementGuid.trim();
          const commonLineFields = {
            quantity: this.normalizeNumber(line.quantity),
            unitPrice: this.normalizeNumber(line.unitPrice),
            unitPointer: this.normalizeNumber(line.unitPointer),
            description: line.description.trim()
          };

          if (movementGuid) {
            return {
              action: 'update' as const,
              movementGuid,
              ...commonLineFields
            };
          }

          return {
            action: 'add' as const,
            stockCode: line.stockCode.trim(),
            ...commonLineFields
          };
        }),
        ...this.deletedMovementGuids().map((movementGuid) => ({
          action: 'delete' as const,
          movementGuid
        }))
      ]
    };
  }

  private resolveUpdateWarehouseNo(): number | undefined {
    if (!this.canUseAllWarehouses()) {
      return undefined;
    }

    return toPositiveWarehouseNo((this.data as SeriSiraPayload | null)?.warehouseNo) ?? undefined;
  }

  private canUseAllWarehouses(): boolean {
    return currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    );
  }

  private hasUpdatePermission(): boolean {
    const normalizedTarget = this.normalizePermission(this.updatePermissionCode);
    const taskPermissionCodes = [
      ...this.authService.getTaskPermissionCodes(this.page.id),
      ...this.authService.getTaskPermissionKeys(this.page.id)
    ];
    const currentUserPermissionCodes = this.authService.currentUser()?.permissions ?? [];

    return [...taskPermissionCodes, ...currentUserPermissionCodes]
      .map((permission) => this.normalizePermission(permission))
      .some((permission) => permission === normalizedTarget);
  }

  private isEDespatchSent(header: unknown): boolean {
    const documentNo = this.getHeaderText(header, 'documentNo', 'eDespatchDocumentNo');
    const ettn = this.getHeaderText(header, 'descriptionEttn', 'eDespatchUuid');

    return !!ettn || /^FRM/i.test(documentNo);
  }

  private isWarehouseAccepted(header: unknown): boolean {
    return this.getHeaderNumber(header, 'shippingState') === 1;
  }

  private toDateInput(value: string | null | undefined): string {
    const trimmed = value?.trim();

    if (!trimmed) {
      return this.formatDateOnly(new Date());
    }

    const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}/.exec(trimmed);
    if (dateOnlyMatch) {
      return dateOnlyMatch[0];
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? trimmed : this.formatDateOnly(date);
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeNumber(value: number | string | null | undefined): number {
    const normalizedValue = Number(value ?? 0);

    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
  }

  private toOptionalPositiveNumber(value: number | string | null | undefined): number | undefined {
    const normalizedValue = this.normalizeNumber(value);

    return normalizedValue > 0 ? normalizedValue : undefined;
  }

  private normalizePermission(permission: string | null | undefined): string {
    return (permission ?? '').trim().toLocaleLowerCase('en-US');
  }

  private clearEditableStockSearch(): void {
    this.stockRequestId += 1;
    this.editableStockQuery.setValue('');
    this.editableStockResults.set([]);
    this.editableStockError.set('');
    this.editableStockLoading.set(false);
  }

  private normalizeStockResults(
    results: readonly IFurpaProductSearchItemApiDto[]
  ): IFurpaProductSearchItemApiDto[] {
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

  private toPositiveNumber(value: number | string | null | undefined, fallback: number): number {
    const normalizedValue = Number(value ?? fallback);

    return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : fallback;
  }
}
