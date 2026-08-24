import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  BirlikKartDetayResponse,
  BirlikKartGuncelleResponse,
  BirlikKartSorgulamaGuncelleRequest,
  BirlikKartSorgulamaResponse
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserHasPermission,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';

type BirlikKartAction = 'list' | 'detail' | 'update';

interface PageFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

const TASK_ID = 'birlik-kart-sorgulama';
const PERMISSION_PREFIX = 'kasa-islemleri.birlik-kart-sorgulama';

function trimValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function toDateTimeInputValue(value: string | null | undefined): string {
  const normalizedValue = trimValue(value);

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.length >= 16 ? normalizedValue.slice(0, 16) : normalizedValue;
}

function toNullableNumber(value: string | number | null | undefined): number | null {
  const normalizedValue =
    typeof value === 'string' ? value.trim().replace(',', '.') : value;

  if (normalizedValue === '' || normalizedValue === null || normalizedValue === undefined) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toNullableInteger(value: string | number | null | undefined): number | null {
  const numericValue = toNullableNumber(value);
  return numericValue === null ? null : Math.trunc(numericValue);
}

function formatDecimal(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

@Component({
  selector: 'app-birlik-kart-sorgulama-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './birlik-kart-sorgulama-list.component.html',
  styleUrl: './birlik-kart-sorgulama-list.component.scss'
})
export class BirlikKartSorgulamaListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly authService = inject(AuthService);

  protected readonly page: DocsContentPage | undefined = DOCS_PAGES[TASK_ID];
  protected readonly result = signal<BirlikKartSorgulamaResponse | BirlikKartDetayResponse | null>(null);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly isSearching = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly isUpdating = signal(false);
  protected readonly searched = signal(false);

  protected readonly canList = computed(() => this.hasPermission('list'));
  protected readonly canDetail = computed(() => this.hasPermission('detail'));
  protected readonly canUpdate = computed(() => this.hasPermission('update'));
  protected readonly hasEditableResult = computed(() => {
    const currentResult = this.result();
    return !!currentResult?.isFound && !!trimValue(currentResult.cekNo);
  });

  protected readonly searchForm = new FormGroup({
    kartNo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)]
    })
  });

  protected readonly updateForm = new FormGroup({
    cariKod: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)]
    }),
    tutar: new FormControl('', { nonNullable: true }),
    puan: new FormControl('', { nonNullable: true }),
    baslangic: new FormControl('', { nonNullable: true }),
    bitis: new FormControl('', { nonNullable: true }),
    flag: new FormControl('', { nonNullable: true }),
    subeKodu: new FormControl('', { nonNullable: true }),
    kasaNo: new FormControl('', { nonNullable: true }),
    kartTipi: new FormControl('', { nonNullable: true })
  });

  protected sorgula(): void {
    if (!this.canList()) {
      this.setFeedback('error', 'Yetki Yok', 'Kart sorgulamak icin list yetkisi gerekiyor.');
      return;
    }

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      this.setFeedback('error', 'Kart No Gerekli', 'Kart veya cek numarasini girip tekrar deneyin.');
      return;
    }

    const kartNo = trimValue(this.searchForm.controls.kartNo.value);

    this.searched.set(true);
    this.result.set(null);
    this.feedback.set(null);
    this.isSearching.set(true);
    this.updateForm.disable({ emitEvent: false });

    this.kasaIslemleriService
      .sorgulaBirlikKart({ kartNo })
      .pipe(
        finalize(() => this.isSearching.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: BirlikKartSorgulamaResponse) => this.handleSorguResult(response),
        error: (error: unknown) => {
          this.patchUpdateForm(null);
          this.setFeedback('error', 'Sorgu Yapilamadi', this.resolveErrorMessage(error));
        }
      });
  }

  protected detayYenile(): void {
    const cekNo = trimValue(this.result()?.cekNo);

    if (!cekNo) {
      this.setFeedback('error', 'Cek No Yok', 'Detay icin once kayitli cek no okunmali.');
      return;
    }

    this.loadDetail(cekNo, true);
  }

  protected guncelle(): void {
    const currentResult = this.result();
    const cekNo = trimValue(currentResult?.cekNo);

    if (!this.canUpdate()) {
      this.setFeedback('error', 'Yetki Yok', 'Bu kart veya ceki guncelleme yetkiniz yok.');
      return;
    }

    if (!currentResult?.isFound || !cekNo) {
      this.setFeedback('error', 'Kayit Secili Degil', 'Guncellemek icin once kart veya cek kaydini sorgulayin.');
      return;
    }

    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.setFeedback('error', 'Cari Kod Gerekli', 'Cari kod mevcut kayitla eslesmek zorunda.');
      return;
    }

    const request = this.buildUpdateRequest(cekNo);

    this.updateForm.disable({ emitEvent: false });
    this.isUpdating.set(true);
    this.feedback.set(null);

    this.kasaIslemleriService
      .updateBirlikKart(request)
      .pipe(
        finalize(() => {
          this.isUpdating.set(false);
          this.syncFormState();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: BirlikKartGuncelleResponse) => this.handleUpdateResult(response, cekNo),
        error: (error: unknown) =>
          this.setFeedback('error', 'Guncelleme Yapilamadi', this.resolveErrorMessage(error))
      });
  }

  protected formatAmount(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  protected formatDateTime(value: string | null | undefined): string {
    const normalizedValue = trimValue(value);

    if (!normalizedValue) {
      return '-';
    }

    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
      return normalizedValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected formatFlag(value: boolean | null | undefined): string {
    if (value === true) {
      return 'Evet';
    }

    if (value === false) {
      return 'Hayir';
    }

    return '-';
  }

  private handleSorguResult(response: BirlikKartSorgulamaResponse): void {
    this.result.set(response);
    this.patchUpdateForm(response);

    if (!response.isFound) {
      this.setFeedback(
        'info',
        'Kayit Bulunamadi',
        response.message || 'Kart veya cek kaydi bulunamadi.'
      );
      return;
    }

    const cekNo = trimValue(response.cekNo);

    if (cekNo && this.canDetail()) {
      this.loadDetail(cekNo, false);
      return;
    }

    this.setFeedback('success', 'Kayit Bulundu', 'Sorgu sonucu ekrana getirildi.');
  }

  private loadDetail(cekNo: string, showSuccess: boolean): void {
    if (!this.canDetail()) {
      this.setFeedback('error', 'Yetki Yok', 'Detay goruntulemek icin detail yetkisi gerekiyor.');
      return;
    }

    this.isDetailLoading.set(true);

    this.kasaIslemleriService
      .getBirlikKartDetay({ cekNo })
      .pipe(
        finalize(() => this.isDetailLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: BirlikKartDetayResponse) => {
          this.result.set(response);
          this.patchUpdateForm(response);
          this.setFeedback(
            response.isFound ? 'success' : 'info',
            response.isFound ? (showSuccess ? 'Detay Yenilendi' : 'Kayit Bulundu') : 'Kayit Bulunamadi',
            response.message || (response.isFound ? 'Detay bilgileri guncel.' : 'Kart veya cek kaydi bulunamadi.')
          );
        },
        error: (error: unknown) =>
          this.setFeedback('error', 'Detay Alinamadi', this.resolveErrorMessage(error))
      });
  }

  private handleUpdateResult(response: BirlikKartGuncelleResponse, cekNo: string): void {
    this.setFeedback(
      response.isUpdated ? 'success' : 'error',
      response.isUpdated ? 'Kayit Guncellendi' : 'Kayit Guncellenemedi',
      response.message || (response.isUpdated ? 'Birlik kart kaydi guncellendi.' : 'Backend kaydi guncellemedi.')
    );

    if (response.isUpdated && this.canDetail()) {
      this.loadDetail(cekNo, false);
    }
  }

  private patchUpdateForm(response: BirlikKartSorgulamaResponse | BirlikKartDetayResponse | null): void {
    this.updateForm.reset(
      {
        cariKod: trimValue(response?.cariKod),
        tutar: formatDecimal(response?.tutar),
        puan: formatDecimal(response?.puan),
        baslangic: toDateTimeInputValue(response?.baslangic),
        bitis: toDateTimeInputValue(response?.bitis),
        flag: response?.flag === null || response?.flag === undefined ? '' : String(response.flag),
        subeKodu: trimValue(response?.subeKodu),
        kasaNo: response?.kasaNo === null || response?.kasaNo === undefined ? '' : String(response.kasaNo),
        kartTipi:
          response?.kartTipi === null || response?.kartTipi === undefined ? '' : String(response.kartTipi)
      },
      { emitEvent: false }
    );

    this.syncFormState();
  }

  private syncFormState(): void {
    if (this.canUpdate() && this.hasEditableResult() && !this.isUpdating()) {
      this.updateForm.enable({ emitEvent: false });
      return;
    }

    this.updateForm.disable({ emitEvent: false });
  }

  private buildUpdateRequest(cekNo: string): BirlikKartSorgulamaGuncelleRequest {
    const rawValue = this.updateForm.getRawValue();
    const flagValue = rawValue.flag;

    return {
      cekNo,
      cariKod: trimValue(rawValue.cariKod),
      tutar: toNullableNumber(rawValue.tutar),
      puan: toNullableNumber(rawValue.puan),
      baslangic: trimValue(rawValue.baslangic) || null,
      bitis: trimValue(rawValue.bitis) || null,
      flag: flagValue === '' ? null : flagValue === 'true',
      subeKodu: trimValue(rawValue.subeKodu) || null,
      kasaNo: toNullableInteger(rawValue.kasaNo),
      kartTipi: toNullableInteger(rawValue.kartTipi)
    };
  }

  private hasPermission(action: BirlikKartAction): boolean {
    const user = this.authService.currentUser();

    if (!user) {
      return false;
    }

    const permissionCode = `${PERMISSION_PREFIX}.${action}`;
    const permissionKeys = [
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => normalizePermissionCode(permission));
    const normalizedPermissionCode = normalizePermissionCode(permissionCode);
    const normalizedAction = normalizePermissionCode(action);

    return (
      currentUserHasPermission(user, permissionCode) ||
      permissionKeys.includes(normalizedPermissionCode) ||
      permissionKeys.includes(normalizedAction)
    );
  }

  private setFeedback(tone: PageFeedback['tone'], title: string, message: string): void {
    this.feedback.set({ tone, title, message });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error === 'string'
          ? error.error
          : error.error?.message || error.error?.title || error.message;

      return backendMessage || 'Beklenmeyen API hatasi olustu.';
    }

    return error instanceof Error ? error.message : 'Beklenmeyen hata olustu.';
  }
}
