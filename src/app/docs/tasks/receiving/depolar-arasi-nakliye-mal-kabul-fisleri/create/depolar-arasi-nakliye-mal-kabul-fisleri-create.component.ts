import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import type {
  IFurpaWarehouseReceiptAcceptanceRequestApiDto,
  IFurpaWarehouseReceiptAcceptanceResponseApiDto,
  IFurpaWarehouseReceiptDetailApiDto,
  IFurpaWarehouseReceiptItemApiDto
} from '@interfaces';
import { Observable, finalize } from 'rxjs';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

interface MalKabulDialogData {
  seri?: string;
  sira?: number;
}

type FarkTipi = 'none' | 'missing' | 'excess';

type KabulKalemFormGroup = FormGroup<{
  movementGuid: FormControl<string>;
  stockCode: FormControl<string>;
  stockName: FormControl<string>;
  unitName: FormControl<string>;
  shippedQuantity: FormControl<number | null>;
  receivedQuantity: FormControl<number | null>;
  description: FormControl<string>;
  warehouseOrderNo: FormControl<string>;
}>;

@Component({
  selector: 'app-depolar-arasi-nakliye-mal-kabul-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './depolar-arasi-nakliye-mal-kabul-fisleri-create.component.html',
  styleUrl: './depolar-arasi-nakliye-mal-kabul-fisleri-create.component.scss'
})
export class DepolarArasiNakliyeMalKabulFisleriCreateComponent extends DocsTaskDialogBase<MalKabulDialogData> {
  protected readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected readonly page: DocsContentPage = DOCS_PAGES['depo-mal-kabulleri'];
  protected readonly loadingDetail = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal('');
  protected readonly submitError = signal('');
  protected readonly activeReceipt = signal<IFurpaWarehouseReceiptDetailApiDto | null>(null);

  protected readonly controls = {
    seri: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    sira: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    allowDiscrepancy: new FormControl(false, { nonNullable: true }),
    lines: new FormArray<KabulKalemFormGroup>([])
  };
  protected readonly form = new FormGroup(this.controls);

  private detailRequestId = 0;
  private submitRequestId = 0;

  constructor() {
    super();

    const seri = this.data?.seri;
    const sira = this.data?.sira;

    if (typeof seri === 'string' && seri.trim()) {
      this.controls.seri.setValue(this.normalizeSerie(seri));
    }

    if (typeof sira === 'number' && Number.isFinite(sira)) {
      this.controls.sira.setValue(sira);
    }
  }

  protected get lines(): FormArray<KabulKalemFormGroup> {
    return this.controls.lines;
  }

  protected loadReceiptDetail(): void {
    if (this.loadingDetail()) {
      return;
    }

    this.loadError.set('');
    this.submitError.set('');
    this.activeReceipt.set(null);
    this.lines.clear();

    if (this.controls.seri.invalid || this.controls.sira.invalid) {
      this.controls.seri.markAsTouched();
      this.controls.sira.markAsTouched();
      return;
    }

    const seri = this.normalizeSerie(this.controls.seri.value);
    const sira = Number(this.controls.sira.value ?? Number.NaN);

    if (!seri || !Number.isFinite(sira)) {
      return;
    }

    this.controls.seri.setValue(seri, { emitEvent: false });

    const requestId = ++this.detailRequestId;
    this.loadingDetail.set(true);

    this.loadReceiptDetailRequest(seri, sira)
      .pipe(finalize(() => requestId === this.detailRequestId && this.loadingDetail.set(false)))
      .subscribe({
        next: (receipt: IFurpaWarehouseReceiptDetailApiDto) => {
          if (requestId !== this.detailRequestId) {
            return;
          }

          this.activeReceipt.set(receipt);
          this.controls.allowDiscrepancy.setValue(false, { emitEvent: false });
          this.populateLines(receipt.items ?? []);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.detailRequestId) {
            return;
          }

          this.loadError.set(
            this.resolveErrorMessage(error, 'Evrak detayi getirilemedi. Seri ve sira bilgisini kontrol edin.')
          );
        }
      });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.submitError.set('');

    const receipt = this.activeReceipt();

    if (!receipt) {
      this.submitError.set('Once kabul edecegin evraki getir.');
      return;
    }

    if (!this.isLoadedReferenceCurrent(receipt)) {
      this.submitError.set('Seri veya sira degisti. Evraki yeniden getirip tekrar deneyin.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.lines.length) {
      this.submitError.set('Kabul edilecek en az bir satir bulunmali.');
      return;
    }

    if (this.hasDiscrepancy() && !this.controls.allowDiscrepancy.value) {
      this.submitError.set(
        'Eksik veya fazla kabul edilen satirlar var. Devam etmek icin farki kaydetmeye izin ver secenegini ac.'
      );
      return;
    }

    const requestId = ++this.submitRequestId;
    this.submitting.set(true);

    this.acceptReceiptRequest(
      receipt.header.documentSerie,
      receipt.header.documentOrderNo,
      this.buildRequest()
    )
      .pipe(finalize(() => requestId === this.submitRequestId && this.submitting.set(false)))
      .subscribe({
        next: (result: IFurpaWarehouseReceiptAcceptanceResponseApiDto) => {
          if (requestId !== this.submitRequestId) {
            return;
          }

          this.close({ created: true, accepted: true, result });
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.submitRequestId) {
            return;
          }

          this.submitError.set(
            this.resolveErrorMessage(error, 'Mal kabul islemi tamamlanirken bir hata olustu.')
          );
        }
      });
  }

  protected kalemCount(): number {
    return this.lines.length;
  }

  protected toplamSevkMiktari(): number {
    return this.lines.controls.reduce(
      (total, control) => total + this.normalizeNumber(control.controls.shippedQuantity.value),
      0
    );
  }

  protected toplamKabulMiktari(): number {
    return this.lines.controls.reduce(
      (total, control) => total + this.normalizeNumber(control.controls.receivedQuantity.value),
      0
    );
  }

  protected hasDiscrepancy(): boolean {
    return this.lines.controls.some((control) => this.getDifferenceType(control) !== 'none');
  }

  protected getDifferenceType(control: KabulKalemFormGroup): FarkTipi {
    const difference = this.getDifferenceQuantity(control);

    if (difference === 0) {
      return 'none';
    }

    return difference < 0 ? 'missing' : 'excess';
  }

  protected getDifferenceLabel(control: KabulKalemFormGroup): string {
    const type = this.getDifferenceType(control);

    if (type === 'missing') {
      return 'Eksik';
    }

    if (type === 'excess') {
      return 'Fazla';
    }

    return 'Tam';
  }

  protected getDifferenceQuantity(control: KabulKalemFormGroup): number {
    const shippedQuantity = this.normalizeNumber(control.controls.shippedQuantity.value);
    const receivedQuantity = this.normalizeNumber(control.controls.receivedQuantity.value);

    return this.roundQuantity(receivedQuantity - shippedQuantity);
  }

  protected readonly trackByLine = (index: number, control: KabulKalemFormGroup): string =>
    control.controls.movementGuid.value.trim() ||
    control.controls.stockCode.value.trim() ||
    `${index}`;

  protected loadReceiptDetailRequest(
    seri: string,
    sira: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto> {
    return this.malKabulIslemleriService.getDepolarArasiNakliyeMalKabulFisDetayApi(seri, sira);
  }

  protected acceptReceiptRequest(
    seri: string,
    sira: number,
    dto: IFurpaWarehouseReceiptAcceptanceRequestApiDto
  ): Observable<IFurpaWarehouseReceiptAcceptanceResponseApiDto> {
    return this.malKabulIslemleriService.kabulEtDepolarArasiNakliyeMalKabulFisi(seri, sira, dto);
  }

  private populateLines(kalemler: IFurpaWarehouseReceiptItemApiDto[]): void {
    this.lines.clear();

    for (const kalem of kalemler) {
      this.lines.push(this.createLineFormGroup(kalem));
    }
  }

  private createLineFormGroup(kalem: IFurpaWarehouseReceiptItemApiDto): KabulKalemFormGroup {
    const shippedQuantity = this.normalizeNumber(kalem.quantity);

    return new FormGroup({
      movementGuid: new FormControl(kalem.movementGuid?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      stockCode: new FormControl(kalem.stockCode?.trim() ?? '', { nonNullable: true }),
      stockName: new FormControl(kalem.stockName?.trim() ?? '', { nonNullable: true }),
      unitName: new FormControl(kalem.unitName?.trim() ?? '', { nonNullable: true }),
      shippedQuantity: new FormControl(shippedQuantity),
      receivedQuantity: new FormControl(shippedQuantity, {
        validators: [Validators.required, Validators.min(0)]
      }),
      description: new FormControl(kalem.description?.trim() ?? '', { nonNullable: true }),
      warehouseOrderNo: new FormControl(kalem.warehouseOrderNo?.trim() ?? '', { nonNullable: true })
    });
  }

  private buildRequest(): IFurpaWarehouseReceiptAcceptanceRequestApiDto {
    const rawValue = this.form.getRawValue();

    return {
      allowDiscrepancy: rawValue.allowDiscrepancy,
      lines: rawValue.lines.map((line) => ({
        movementGuid: line.movementGuid.trim(),
        receivedQuantity: this.normalizeNumber(line.receivedQuantity)
      }))
    };
  }

  private isLoadedReferenceCurrent(receipt: IFurpaWarehouseReceiptDetailApiDto): boolean {
    return (
      this.normalizeSerie(this.controls.seri.value) === this.normalizeSerie(receipt.header.documentSerie) &&
      Number(this.controls.sira.value ?? Number.NaN) === receipt.header.documentOrderNo
    );
  }

  private normalizeSerie(value: string): string {
    return value.trim().toLocaleUpperCase('tr-TR');
  }

  private normalizeNumber(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 0);
    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
  }

  private roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
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

