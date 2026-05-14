import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  IFurpaSendEDespatchRequestApiDto,
  IFurpaSendEDespatchResponseApiDto
} from '@interfaces';
import { Observable, finalize } from 'rxjs';

import { IadeIslemleriService } from '../../../../core/api/module-services/iade-islemleri.service';
import { SevkIslemleriService } from '../../../../core/api/module-services/sevk-islemleri.service';
import { DocsTaskDialogBase } from '../task-dialog.base';

export type EDespatchDialogKind =
  | 'company-shipment'
  | 'warehouse-shipment'
  | 'company-return'
  | 'warehouse-return';

export interface EDespatchDialogRowSummary {
  seri: string;
  sira: number;
  belgeNo: string;
  muhatap: string;
  tarih: string;
  durumu: string;
  ettn?: string | null;
}

export interface EDespatchDialogData {
  kind: EDespatchDialogKind;
  pageTitle: string;
  row: EDespatchDialogRowSummary;
}

@Component({
  selector: 'app-e-irsaliye-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './e-irsaliye-dialog.component.html',
  styleUrl: './e-irsaliye-dialog.component.scss'
})
export class EDespatchDialogComponent extends DocsTaskDialogBase<EDespatchDialogData> {
  private readonly sevkIslemleriService = inject(SevkIslemleriService);
  private readonly iadeIslemleriService = inject(IadeIslemleriService);
  private readonly dialogData: EDespatchDialogData = this.data ?? {
    kind: 'company-shipment',
    pageTitle: 'E-Irsaliye',
    row: {
      seri: '',
      sira: 0,
      belgeNo: '',
      muhatap: '',
      tarih: '',
      durumu: '',
      ettn: null
    }
  };

  protected readonly submitting = signal(false);
  protected readonly pdfLoading = signal(false);
  protected readonly submitError = signal('');
  protected readonly pdfError = signal('');
  protected readonly response = signal<IFurpaSendEDespatchResponseApiDto | null>(null);
  protected readonly pageTitle = this.dialogData.pageTitle;
  protected readonly row = this.dialogData.row;
  protected readonly headline = computed(() => this.resolveHeadline(this.dialogData.kind));
  protected readonly operationLabel = computed(() => this.resolveOperationLabel(this.dialogData.kind));
  protected readonly endpointPath = computed(() => this.resolveEndpointPath(this.dialogData.kind));
  protected readonly pdfEndpointPath = computed(() => this.resolvePdfEndpointPath(this.dialogData.kind));
  protected readonly hasMissingDocumentNo = computed(() => !this.row.belgeNo?.trim());

  protected readonly controls = {
    plaque: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    driverNameSurname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    driverTckn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{11}$/)]
    })
  };
  protected readonly form = new FormGroup(this.controls);

  protected submit(): void {
    if (this.submitting() || this.response()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as IFurpaSendEDespatchRequestApiDto;
    this.submitting.set(true);
    this.submitError.set('');
    this.pdfError.set('');

    this.resolveSendRequest(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: IFurpaSendEDespatchResponseApiDto) => {
          this.response.set(response);
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveError(
              error,
              'E-irsaliye gonderimi basarisiz oldu. Bilgileri kontrol edip tekrar deneyin.'
            )
          );
        }
      });
  }

  protected openPdf(): void {
    if (!this.response() || this.pdfLoading()) {
      return;
    }

    this.pdfLoading.set(true);
    this.pdfError.set('');

    this.resolvePdfRequest()
      .pipe(finalize(() => this.pdfLoading.set(false)))
      .subscribe({
        next: (blob: Blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const openedWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

          if (!openedWindow) {
            this.pdfError.set('PDF yeni sekmede acilamadi. Tarayici popup engelliyor olabilir.');
          }

          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: (error: HttpErrorResponse) => {
          this.pdfError.set(
            this.resolveError(
              error,
              'PDF gosterilemedi. Evrak henuz e-irsaliye olarak gonderilmemis olabilir.'
            )
          );
        }
      });
  }

  protected closeDialog(): void {
    this.close(!!this.response());
  }

  protected getRequestPreview(): string {
    const request = this.form.getRawValue() as IFurpaSendEDespatchRequestApiDto;
    return JSON.stringify(request, null, 2);
  }

  protected getDocumentTypeLabel(documentType: number): string {
    switch (documentType) {
      case 1:
        return 'Giden Firma Sevki';
      case 2:
        return 'Firma Iadesi';
      case 3:
        return 'Depolar Arasi Giden Sevk';
      case 4:
        return 'Depo Iadesi';
      default:
        return 'Bilinmeyen Dokuman Tipi';
    }
  }

  private resolveSendRequest(
    request: IFurpaSendEDespatchRequestApiDto
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    switch (this.dialogData.kind) {
      case 'warehouse-shipment':
        return this.sevkIslemleriService.sendGidenDepolarArasiSevkEirsaliye(
          this.row.seri,
          this.row.sira,
          request
        );
      case 'company-return':
        return this.iadeIslemleriService.sendFirmaIadeEirsaliye(
          this.row.seri,
          this.row.sira,
          request
        );
      case 'warehouse-return':
        return this.iadeIslemleriService.sendDepoIadeEirsaliye(
          this.row.seri,
          this.row.sira,
          request
        );
      default:
        return this.sevkIslemleriService.sendGidenFirmaSevkEirsaliye(
          this.row.seri,
          this.row.sira,
          request
        );
    }
  }

  private resolvePdfRequest(): Observable<Blob> {
    switch (this.dialogData.kind) {
      case 'warehouse-shipment':
        return this.sevkIslemleriService.getGidenDepolarArasiSevkEirsaliyePdf(
          this.row.seri,
          this.row.sira
        );
      case 'company-return':
        return this.iadeIslemleriService.getFirmaIadeEirsaliyePdf(this.row.seri, this.row.sira);
      case 'warehouse-return':
        return this.iadeIslemleriService.getDepoIadeEirsaliyePdf(this.row.seri, this.row.sira);
      default:
        return this.sevkIslemleriService.getGidenFirmaSevkEirsaliyePdf(
          this.row.seri,
          this.row.sira
        );
    }
  }

  private resolveHeadline(kind: EDespatchDialogKind): string {
    switch (kind) {
      case 'warehouse-shipment':
        return 'Depolar Arasi Giden Sevki E-Irsaliyeye Donustur';
      case 'company-return':
        return 'Firma Iadesini E-Irsaliyeye Donustur';
      case 'warehouse-return':
        return 'Depo Iadesini E-Irsaliyeye Donustur';
      default:
        return 'Giden Firma Sevkini E-Irsaliyeye Donustur';
    }
  }

  private resolveOperationLabel(kind: EDespatchDialogKind): string {
    switch (kind) {
      case 'warehouse-shipment':
        return 'Depolar Arasi Giden Sevk';
      case 'company-return':
        return 'Firma Iadesi';
      case 'warehouse-return':
        return 'Giden Depo Iadesi';
      default:
        return 'Giden Firma Sevki';
    }
  }

  private resolveEndpointPath(kind: EDespatchDialogKind): string {
    const identity = `${encodeURIComponent(this.row.seri)}/${this.row.sira}`;

    switch (kind) {
      case 'warehouse-shipment':
        return `/api/sevk-islemleri/depolar-arasi-sevkler/giden/${identity}/e-irsaliye`;
      case 'company-return':
        return `/api/iade-islemleri/firma-iadeleri/${identity}/e-irsaliye`;
      case 'warehouse-return':
        return `/api/iade-islemleri/depo-iadeleri/giden/${identity}/e-irsaliye`;
      default:
        return `/api/sevk-islemleri/firma-sevkleri/giden/${identity}/e-irsaliye`;
    }
  }

  private resolvePdfEndpointPath(kind: EDespatchDialogKind): string {
    const identity = `${encodeURIComponent(this.row.seri)}/${this.row.sira}`;

    switch (kind) {
      case 'warehouse-shipment':
        return `/api/sevk-islemleri/depolar-arasi-sevkler/giden/${identity}/e-irsaliye/pdf`;
      case 'company-return':
        return `/api/iade-islemleri/firma-iadeleri/${identity}/e-irsaliye/pdf`;
      case 'warehouse-return':
        return `/api/iade-islemleri/depo-iadeleri/giden/${identity}/e-irsaliye/pdf`;
      default:
        return `/api/sevk-islemleri/firma-sevkleri/giden/${identity}/e-irsaliye/pdf`;
    }
  }

  private resolveError(error: HttpErrorResponse, fallback: string): string {
    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'detail' in error.error &&
      typeof error.error.detail === 'string' &&
      error.error.detail.trim()
    ) {
      return error.error.detail;
    }

    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string' &&
      error.error.message.trim()
    ) {
      return error.error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return fallback;
  }
}
