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
import {
  currentUserIsAdmin,
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
  protected readonly stockQuery = new FormControl('', { nonNullable: true });
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly stockLoading = signal(false);
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);

  private readonly aramaService = inject(AramaService);
  private readonly stokIslemleriService = inject(StokIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());
  private stockRequestId = 0;
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
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
    documentNo: new FormControl('', { nonNullable: true }),
    description: new FormControl('Reyon duzenleme virmani', { nonNullable: true }),
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

  protected searchStock(): void {
    const query = this.stockQuery.value.trim();

    if (this.stockLoading()) {
      return;
    }

    this.stockError.set('');
    this.stockResults.set([]);

    if (query.length < 2) {
      this.stockError.set('Virman stogu aramak icin en az 2 karakter gir.');
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
            this.stockError.set('Aramana uygun virman stogu bulunamadi.');
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

  protected submit(): void {
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

  private buildRequest(): IFurpaCreateVirmanRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      warehouseNo: this.resolveRequestWarehouseNo(),
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

  private createLineFormGroup(stock?: IFurpaProductSearchItemApiDto): VirmanLineFormGroup {
    return new FormGroup({
      stockCode: new FormControl(stock?.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockName: new FormControl(stock?.stockName?.trim() ?? '', { nonNullable: true }),
      movementType: new FormControl(2, {
        validators: [Validators.required, Validators.min(0)]
      }),
      unitPointer: new FormControl(1, {
        validators: [Validators.required, Validators.min(1)]
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
