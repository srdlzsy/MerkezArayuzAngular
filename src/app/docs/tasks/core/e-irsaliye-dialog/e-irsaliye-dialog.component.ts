import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  DespatchDriverDto,
  IFurpaSendEDespatchRequestApiDto,
  IFurpaSendEDespatchResponseApiDto
} from '@interfaces';
import { Observable, finalize } from 'rxjs';

import { AyarIslemleriService } from '../../../../core/api/module-services/ayar-islemleri.service';
import { IadeIslemleriService } from '../../../../core/api/module-services/iade-islemleri.service';
import { SevkIslemleriService } from '../../../../core/api/module-services/sevk-islemleri.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { DocsTaskDialogBase } from '../task-dialog.base';
import { PdfPreviewDialogComponent } from '../pdf-preview-dialog/pdf-preview-dialog.component';

export type EDespatchDialogKind =
  | 'company-shipment'
  | 'warehouse-shipment'
  | 'company-return'
  | 'warehouse-return';

export interface EDespatchDialogRowSummary {
  seri: string;
  sira: number;
  warehouseNo?: number;
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
  onSuccess?: (response: IFurpaSendEDespatchResponseApiDto) => void;
}

const DRIVER_LIST_PERMISSION = 'ayar-islemleri.soforler.list';
const DRIVER_NAME_PATTERN = /^\s*\S+(?:\s+\S+)+\s*$/;
const DRIVER_TCKN_PATTERN = /^\d{11}$/;

@Component({
  selector: 'app-e-irsaliye-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PdfPreviewDialogComponent],
  templateUrl: './e-irsaliye-dialog.component.html',
  styleUrl: './e-irsaliye-dialog.component.scss'
})
export class EDespatchDialogComponent extends DocsTaskDialogBase<EDespatchDialogData> {
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly sevkIslemleriService = inject(SevkIslemleriService);
  private readonly iadeIslemleriService = inject(IadeIslemleriService);
  private readonly destroyRef = inject(DestroyRef);
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
  protected readonly pdfPreviewBlob = signal<Blob | null>(null);
  protected readonly response = signal<IFurpaSendEDespatchResponseApiDto | null>(null);
  protected readonly driverResults = signal<DespatchDriverDto[]>([]);
  protected readonly selectedDriver = signal<DespatchDriverDto | null>(null);
  protected readonly driverSearchLoading = signal(false);
  protected readonly driverSearchError = signal('');
  protected readonly pageTitle = this.dialogData.pageTitle;
  protected readonly row = this.dialogData.row;
  protected readonly headline = computed(() => this.resolveHeadline(this.dialogData.kind));
  protected readonly operationLabel = computed(() => this.resolveOperationLabel(this.dialogData.kind));
  protected readonly hasMissingDocumentNo = computed(() => !this.row.belgeNo?.trim());
  protected readonly canListDrivers = computed(() => this.hasDriverListPermission());
  protected readonly driverSearchControl = new FormControl('', { nonNullable: true });

  protected readonly controls = {
    driverId: new FormControl('', { nonNullable: true }),
    plaque: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    driverNameSurname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(DRIVER_NAME_PATTERN)]
    }),
    driverTckn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(DRIVER_TCKN_PATTERN)]
    })
  };
  protected readonly form = new FormGroup(this.controls);
  private driverSearchRequestId = 0;
  private driverSearchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    this.controls.driverId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateTransportValidators());

    this.driverSearchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string) => this.scheduleDriverSearch(value));

    this.destroyRef.onDestroy(() => this.clearDriverSearchTimer());

    this.updateTransportValidators();

    if (this.canListDrivers()) {
      this.searchDrivers('', false);
    }
  }

  protected submit(): void {
    if (this.submitting() || this.response()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.buildSendRequest();
    this.submitting.set(true);
    this.submitError.set('');
    this.pdfError.set('');

    this.resolveSendRequest(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: IFurpaSendEDespatchResponseApiDto) => {
          this.response.set(response);
          this.dialogData.onSuccess?.(response);
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
          this.pdfPreviewBlob.set(blob);
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

  protected closePdfPreview(): void {
    this.pdfPreviewBlob.set(null);
  }

  protected closeDialog(): void {
    this.close(!!this.response());
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

  protected searchDrivers(
    search = this.driverSearchControl.value,
    showEmptyMessage = true
  ): void {
    if (!this.canListDrivers()) {
      this.driverResults.set([]);
      this.driverSearchError.set('Kayitli sofor listesi icin yetki yok.');
      return;
    }

    const requestId = ++this.driverSearchRequestId;
    const normalizedSearch = search.trim();

    this.clearDriverSearchTimer();
    this.driverSearchLoading.set(true);
    this.driverSearchError.set('');

    this.ayarIslemleriService
      .getDespatchDrivers({
        search: normalizedSearch || null,
        includeInactive: false,
        take: 20
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.driverSearchRequestId) {
            this.driverSearchLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (drivers: DespatchDriverDto[]) => {
          if (requestId !== this.driverSearchRequestId) {
            return;
          }

          this.driverResults.set(drivers ?? []);

          if (showEmptyMessage && !drivers?.length) {
            this.driverSearchError.set('Aktif sofor bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.driverSearchRequestId) {
            return;
          }

          this.driverResults.set([]);
          this.driverSearchError.set(
            this.resolveError(error, 'Kayitli sofor listesi alinamadi.')
          );
        }
      });
  }

  protected selectDriver(driver: DespatchDriverDto): void {
    this.selectedDriver.set(driver);
    this.controls.driverId.setValue(driver.id);
    this.controls.plaque.setValue(driver.plateNumber ?? '');
    this.controls.driverNameSurname.setValue(this.getDriverName(driver));
    this.controls.driverTckn.setValue(driver.tckn ?? '');
    this.form.markAsDirty();
    this.updateTransportValidators();
  }

  protected clearSelectedDriver(): void {
    this.selectedDriver.set(null);
    this.controls.driverId.setValue('');
    this.updateTransportValidators();
  }

  protected getDriverName(driver: DespatchDriverDto): string {
    return driver.fullName?.trim() || `${driver.firstName} ${driver.lastName}`.trim() || '-';
  }

  protected readonly trackByDriver = (_index: number, driver: DespatchDriverDto): string =>
    driver.id;

  private resolveSendRequest(
    request: IFurpaSendEDespatchRequestApiDto
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    switch (this.dialogData.kind) {
      case 'warehouse-shipment':
        return this.sevkIslemleriService.sendGidenDepolarArasiSevkEirsaliye(
          this.row.seri,
          this.row.sira,
          request,
          this.row.warehouseNo
        );
      case 'company-return':
        return this.iadeIslemleriService.sendFirmaIadeEirsaliye(
          this.row.seri,
          this.row.sira,
          request,
          this.row.warehouseNo
        );
      case 'warehouse-return':
        return this.iadeIslemleriService.sendDepoIadeEirsaliye(
          this.row.seri,
          this.row.sira,
          request,
          this.row.warehouseNo
        );
      default:
        return this.sevkIslemleriService.sendGidenFirmaSevkEirsaliye(
          this.row.seri,
          this.row.sira,
          request,
          this.row.warehouseNo
        );
    }
  }

  private buildSendRequest(): IFurpaSendEDespatchRequestApiDto {
    const rawValue = this.form.getRawValue();
    const request: IFurpaSendEDespatchRequestApiDto = {};
    const driverId = rawValue.driverId.trim();
    const plaque = rawValue.plaque.trim().toLocaleUpperCase('tr-TR');
    const driverNameSurname = rawValue.driverNameSurname.trim().replace(/\s+/g, ' ');
    const driverTckn = rawValue.driverTckn.trim();

    if (driverId) {
      request.driverId = driverId;
    }

    if (plaque) {
      request.plaque = plaque;
    }

    if (driverNameSurname) {
      request.driverNameSurname = driverNameSurname;
    }

    if (driverTckn) {
      request.driverTckn = driverTckn;
    }

    return request;
  }

  private updateTransportValidators(): void {
    const hasSelectedDriver = !!this.controls.driverId.value.trim();

    this.controls.plaque.setValidators(hasSelectedDriver ? [] : [Validators.required]);
    this.controls.driverNameSurname.setValidators(
      hasSelectedDriver
        ? [Validators.pattern(DRIVER_NAME_PATTERN)]
        : [Validators.required, Validators.pattern(DRIVER_NAME_PATTERN)]
    );
    this.controls.driverTckn.setValidators(
      hasSelectedDriver
        ? [Validators.pattern(DRIVER_TCKN_PATTERN)]
        : [Validators.required, Validators.pattern(DRIVER_TCKN_PATTERN)]
    );

    this.controls.plaque.updateValueAndValidity({ emitEvent: false });
    this.controls.driverNameSurname.updateValueAndValidity({ emitEvent: false });
    this.controls.driverTckn.updateValueAndValidity({ emitEvent: false });
  }

  private hasDriverListPermission(): boolean {
    const currentUser = this.authService.currentUser();

    return (
      (currentUser?.permissions ?? []).includes(DRIVER_LIST_PERMISSION) ||
      this.authService.getTaskPermissionCodes('soforler').includes(DRIVER_LIST_PERMISSION)
    );
  }

  private scheduleDriverSearch(search: string): void {
    if (!this.canListDrivers()) {
      return;
    }

    this.clearDriverSearchTimer();
    this.driverSearchTimer = setTimeout(() => {
      this.driverSearchTimer = null;
      this.searchDrivers(search, false);
    }, 320);
  }

  private clearDriverSearchTimer(): void {
    if (!this.driverSearchTimer) {
      return;
    }

    clearTimeout(this.driverSearchTimer);
    this.driverSearchTimer = null;
  }

  private resolvePdfRequest(): Observable<Blob> {
    switch (this.dialogData.kind) {
      case 'warehouse-shipment':
        return this.sevkIslemleriService.getGidenDepolarArasiSevkEirsaliyePdf(
          this.row.seri,
          this.row.sira,
          this.row.warehouseNo
        );
      case 'company-return':
        return this.iadeIslemleriService.getFirmaIadeEirsaliyePdf(
          this.row.seri,
          this.row.sira,
          this.row.warehouseNo
        );
      case 'warehouse-return':
        return this.iadeIslemleriService.getDepoIadeEirsaliyePdf(
          this.row.seri,
          this.row.sira,
          this.row.warehouseNo
        );
      default:
        return this.sevkIslemleriService.getGidenFirmaSevkEirsaliyePdf(
          this.row.seri,
          this.row.sira,
          this.row.warehouseNo
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
