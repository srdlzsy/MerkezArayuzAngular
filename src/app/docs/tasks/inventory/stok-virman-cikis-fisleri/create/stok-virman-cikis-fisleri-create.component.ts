import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  IFurpaCreateVirmanRequestApiDto,
  IFurpaProductSearchItemApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import { SafeCreateRetryDraft } from '../../../core/safe-create-retry.helpers';
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
  protected readonly selectedOutgoingStock = signal<IFurpaProductSearchItemApiDto | null>(null);
  protected readonly selectedIncomingStock = signal<IFurpaProductSearchItemApiDto | null>(null);
  protected readonly outgoingStockLoading = signal(false);
  protected readonly incomingStockLoading = signal(false);
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);

  private readonly aramaService = inject(AramaService);
  private readonly stokIslemleriService = inject(StokIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());
  private readonly safeCreateRetry = new SafeCreateRetryDraft<IFurpaCreateVirmanRequestApiDto>();
  private outgoingStockRequestId = 0;
  private incomingStockRequestId = 0;
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
      .searchStock(query)
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
      return;
    }

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

    if (outgoingQuantity <= 0 || incomingQuantity <= 0) {
      this.stockError.set('Cikis ve giris miktarlari sifirdan buyuk olmali.');
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
    if (this.submitting()) {
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
        this.normalizeNumber(line.controls.quantity.value) <= 0 ||
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
        next: (result: unknown) => this.close({ created: true, result }),
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, 'Virman kaydedilemedi.'));
        }
      });
  }

  protected readonly trackByStock = (
    index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string => stock.stockCode?.trim() || stock.barcode?.trim() || `${index}`;

  protected readonly trackByLine = (
    index: number,
    control: VirmanLineFormGroup
  ): string => control.controls.stockCode.value.trim() || `${index}`;

  protected getStockLabel(stock: IFurpaProductSearchItemApiDto | null): string {
    if (!stock) {
      return '';
    }

    const stockCode = stock.stockCode?.trim();
    const stockName = stock.stockName?.trim();
    return [stockCode, stockName].filter(Boolean).join(' - ');
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
    stock?: IFurpaProductSearchItemApiDto,
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
    this.selectedOutgoingStock.set(null);
    this.selectedIncomingStock.set(null);
    this.outgoingStockQuery.setValue('');
    this.incomingStockQuery.setValue('');
    this.outgoingQuantity.setValue(1);
    this.incomingQuantity.setValue(1);
    this.outgoingStockResults.set([]);
    this.incomingStockResults.set([]);
  }

  private getStockKey(stock: IFurpaProductSearchItemApiDto): string {
    return (stock.stockCode?.trim() || stock.barcode?.trim() || '').toLocaleUpperCase('tr-TR');
  }

  private normalizeNumber(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 0);
    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
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

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return resolveHttpErrorMessage(error, fallback);
  }
}
