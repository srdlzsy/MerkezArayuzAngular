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
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaProductSearchItemApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { SayimIslemleriService } from '../../../../../core/api/module-services/sayim-islemleri.service';
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

type SayimLineFormGroup = FormGroup<{
  stockCode: FormControl<string>;
  stockName: FormControl<string>;
  barcode: FormControl<string>;
  unitPointer: FormControl<number | null>;
  quantity: FormControl<number | null>;
}>;

@Component({
  selector: 'app-sayim-sonuclari-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sayim-sonuclari-create.component.html',
  styleUrl: './sayim-sonuclari-create.component.scss'
})
export class SayimSonuclariCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['sayim-sonuclari'];
  protected readonly stockQuery = new FormControl('', { nonNullable: true });
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly stockLoading = signal(false);
  protected readonly stockError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);

  private readonly aramaService = inject(AramaService);
  private readonly sayimIslemleriService = inject(SayimIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly today = formatDateOnly(new Date());
  private stockRequestId = 0;
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    adminWarehouseNo: new FormControl<number | null>(null),
    lines: new FormArray<SayimLineFormGroup>([])
  });

  protected get lines(): FormArray<SayimLineFormGroup> {
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

  protected searchStock(): void {
    const query = this.stockQuery.value.trim();

    if (this.stockLoading()) {
      return;
    }

    this.stockError.set('');
    this.stockResults.set([]);

    if (query.length < 2) {
      this.stockError.set('Sayilan stok aramak icin en az 2 karakter gir.');
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
            this.stockError.set('Aramana uygun sayim stogu bulunamadi.');
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
      this.submitError.set('Sayim adi ve tarihini kontrol et.');
      return;
    }

    if (!this.lines.length) {
      this.submitError.set('Sayim sonucu icin en az bir kalem ekle.');
      return;
    }

    const invalidLine = this.lines.controls.find(
      (line) =>
        !line.controls.stockCode.value.trim() ||
        this.normalizeNumber(line.controls.quantity.value) <= 0 ||
        this.normalizeNumber(line.controls.unitPointer.value) <= 0
    );

    if (invalidLine) {
      invalidLine.markAllAsTouched();
      this.submitError.set('Kalemlerde stok kodu, miktar ve birim bilgilerini kontrol et.');
      return;
    }

    this.submitting.set(true);

    this.sayimIslemleriService
      .createSayimSonucu(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result: unknown) => this.close({ created: true, result }),
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, 'Sayim sonucu kaydedilemedi.'));
        }
      });
  }

  protected readonly trackByStock = (
    index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string => stock.stockCode?.trim() || stock.barcode?.trim() || `${index}`;

  protected readonly trackByLine = (
    index: number,
    control: SayimLineFormGroup
  ): string => control.controls.stockCode.value.trim() || `${index}`;

  private buildRequest(): IFurpaCreateInventoryCountRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      warehouseNo: this.resolveRequestWarehouseNo(),
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

  private createLineFormGroup(stock?: IFurpaProductSearchItemApiDto): SayimLineFormGroup {
    return new FormGroup({
      stockCode: new FormControl(stock?.stockCode?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockName: new FormControl(stock?.stockName?.trim() ?? '', { nonNullable: true }),
      barcode: new FormControl(stock?.barcode?.trim() ?? '', { nonNullable: true }),
      unitPointer: new FormControl(1, {
        validators: [Validators.required, Validators.min(1)]
      }),
      quantity: new FormControl(1, {
        validators: [Validators.required, Validators.min(0.001)]
      })
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
