import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  IFurpaBanknoteTrackApiDto,
  IFurpaCreateBanknoteTrackRequestApiDto,
  IFurpaCreateBanknoteTrackResponseApiDto
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';

type WarehouseMode = 'current' | 'all' | 'custom';

interface ActionFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

function toDateOnly(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.includes('T') ? normalizedValue.split('T')[0] ?? normalizedValue : normalizedValue;
}

function formatAmount(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(2);
}

function buildWarehouseLabel(track: IFurpaBanknoteTrackApiDto): string {
  const warehouseName = track.warehouseName?.trim() ?? '';

  if (warehouseName && Number.isFinite(track.warehouseNo)) {
    return `${warehouseName} (${track.warehouseNo})`;
  }

  if (warehouseName) {
    return warehouseName;
  }

  return Number.isFinite(track.warehouseNo) ? `Depo ${track.warehouseNo}` : '';
}

const BANKNOTE_TRACK_COLUMNS: readonly ApiListTableColumn<IFurpaBanknoteTrackApiDto>[] = [
  {
    key: 'banknoteTrackId',
    label: 'ID'
  },
  {
    key: 'warehouseName',
    label: 'Depo',
    resolveValue: (track) => buildWarehouseLabel(track)
  },
  {
    key: 'banknoteTrackDate',
    label: 'Tarih',
    type: 'date'
  },
  {
    key: 'totalAmount',
    label: 'Toplam (TL)',
    resolveValue: (track) => formatAmount(track.totalAmount)
  },
  {
    key: 'deliveryTotalAmount',
    label: 'Teslim (TL)',
    resolveValue: (track) => formatAmount(track.deliveryTotalAmount)
  },
  {
    key: 'differenceAmount',
    label: 'Fark (TL)',
    resolveValue: (track) => formatAmount(track.differenceAmount)
  },
  {
    key: 'deliverer',
    label: 'Teslim Eden'
  },
  {
    key: 'receiver',
    label: 'Teslim Alan'
  },
  {
    key: 'createDate',
    label: 'Kayit Tarihi',
    type: 'date'
  }
];

@Component({
  selector: 'app-banknot-takipleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ApiListTableComponent],
  templateUrl: './banknot-takipleri-list.component.html',
  styleUrl: './banknot-takipleri-list.component.scss'
})
export class BanknotTakipleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['banknot-takipleri'];
  protected readonly tableColumns = BANKNOTE_TRACK_COLUMNS;
  protected readonly filtersForm = new FormGroup({
    targetDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    customWarehouseNo: new FormControl<number | null>(null)
  });
  protected readonly createForm = new FormGroup({
    banknoteTrackDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    totalAmount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    deliveryTotalAmount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    deliverer: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)]
    }),
    receiver: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)]
    })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);

  protected readonly warehouseMode = signal<WarehouseMode>('current');
  protected readonly tracks = signal<IFurpaBanknoteTrackApiDto[]>([]);
  protected readonly selectedTrackDetail = signal<IFurpaBanknoteTrackApiDto | null>(null);
  protected readonly createdResponse = signal<IFurpaCreateBanknoteTrackResponseApiDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly detailError = signal<string | null>(null);
  protected readonly isCreatePanelOpen = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly lastLoadedDate = signal(this.getToday());
  protected readonly maxTargetDate = this.getToday();

  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly currentWarehouseLabel = computed(() => {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return 'Depo okunamadi';
    }

    if (currentUser.depoIsmi?.trim() && currentUser.depoNo !== null) {
      return `${currentUser.depoIsmi} (${currentUser.depoNo})`;
    }

    if (currentUser.depoIsmi?.trim()) {
      return currentUser.depoIsmi;
    }

    return currentUser.depoNo !== null ? `Depo ${currentUser.depoNo}` : 'Depo okunamadi';
  });
  protected readonly selectedWarehouseLabel = computed(() => {
    switch (this.warehouseMode()) {
      case 'all':
        return 'Tum Depolar';
      case 'custom': {
        const warehouseNo = this.toOptionalNumber(this.filtersForm.getRawValue().customWarehouseNo);
        return warehouseNo ? `Depo ${warehouseNo}` : 'Ozel Depo';
      }
      case 'current':
      default:
        return this.currentWarehouseLabel();
    }
  });
  protected readonly requestPath = computed(() => {
    const targetDate = this.filtersForm.controls.targetDate.value.trim() || 'YYYY-MM-DD';
    const warehouseNo = this.getRequestedWarehouseNo();
    const params = [`dateToGet=${targetDate}`];

    if (warehouseNo) {
      params.push(`warehouseNo=${warehouseNo}`);
    }

    return `${this.page.baseRouteOrFile}?${params.join('&')}`;
  });
  protected readonly totalCount = computed(() => this.tracks().length);
  protected readonly totalAmount = computed(() =>
    this.tracks().reduce((total, track) => total + this.toSafeNumber(track.totalAmount), 0)
  );
  protected readonly deliveryTotalAmount = computed(() =>
    this.tracks().reduce(
      (total, track) => total + this.toSafeNumber(track.deliveryTotalAmount),
      0
    )
  );
  protected readonly differenceTotalAmount = computed(() =>
    this.tracks().reduce((total, track) => total + this.toSafeNumber(track.differenceAmount), 0)
  );
  protected readonly differenceSummaryLabel = computed(() => {
    const positiveCount = this.tracks().filter(
      (track) => this.toSafeNumber(track.differenceAmount) > 0
    ).length;
    const negativeCount = this.tracks().filter(
      (track) => this.toSafeNumber(track.differenceAmount) < 0
    ).length;

    return `${positiveCount} pozitif / ${negativeCount} negatif`;
  });

  constructor() {
    this.setCustomWarehouseControlState();
    this.loadTracks();
  }

  protected loadTracks(): void {
    const targetDate = this.filtersForm.controls.targetDate.value.trim();

    if (!targetDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: 'Banknot takip kayitlarini getirmek icin once bir gun secin.'
      });
      return;
    }

    if (
      this.warehouseMode() === 'custom' &&
      !this.toOptionalNumber(this.filtersForm.getRawValue().customWarehouseNo)
    ) {
      this.feedback.set({
        tone: 'error',
        title: 'Depo gerekli',
        message: 'Ozel depo sorgusu icin depo numarasi girin.'
      });
      return;
    }

    this.feedback.set(null);
    this.detailError.set(null);
    this.selectedTrackDetail.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService
      .getBanknotTakipleri(targetDate, this.getRequestedWarehouseNo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (tracks: IFurpaBanknoteTrackApiDto[]) => {
          this.tracks.set(this.sortTracks(tracks ?? []));
          this.lastLoadedDate.set(targetDate);

          if (!tracks?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit bulunamadi',
              message: 'Secilen gun ve depo kapsami icin banknot takip kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.tracks.set([]);
          this.selectedTrackDetail.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Liste getirilemedi',
            message: this.getErrorMessage(error, 'Banknot takip listesi alinirken bir hata olustu.')
          });
        }
      });
  }

  protected updateWarehouseMode(value: string): void {
    if (value !== 'current' && value !== 'all' && value !== 'custom') {
      return;
    }

    this.selectWarehouseMode(value);
  }

  protected selectWarehouseMode(mode: WarehouseMode): void {
    if (this.warehouseMode() === mode) {
      return;
    }

    this.warehouseMode.set(mode);
    this.setCustomWarehouseControlState();
  }

  protected openDetail(track: IFurpaBanknoteTrackApiDto): void {
    const banknoteTrackId = this.toSafeNumber(track.banknoteTrackId);

    this.selectedTrackDetail.set(track);
    this.detailError.set(null);

    if (!banknoteTrackId) {
      this.detailError.set('Detay icin banknoteTrackId alani gerekli.');
      return;
    }

    this.isDetailLoading.set(true);

    this.kasaIslemleriService
      .getBanknotTakipDetayi(banknoteTrackId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: IFurpaBanknoteTrackApiDto) => {
          this.selectedTrackDetail.set(detail);
        },
        error: (error: unknown) => {
          this.detailError.set(
            this.getErrorMessage(error, 'Banknot takip detayi alinirken bir hata olustu.')
          );
        }
      });
  }

  protected openCreatePanel(): void {
    const shouldPrepareNewForm = !this.isCreatePanelOpen() || this.createForm.pristine;

    this.isCreatePanelOpen.set(true);

    if (shouldPrepareNewForm) {
      this.resetCreateForm();
    }
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Yeni kayit icin tarih, tutarlar, teslim eden ve teslim alan alanlari zorunludur.'
      });
      return;
    }

    const request = this.buildCreateRequest();

    this.feedback.set(null);
    this.createdResponse.set(null);
    this.isCreating.set(true);

    this.kasaIslemleriService
      .createBanknoteTrack(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isCreating.set(false))
      )
      .subscribe({
        next: (response: IFurpaCreateBanknoteTrackResponseApiDto) => {
          this.createdResponse.set(response);
          this.isCreatePanelOpen.set(true);
          this.filtersForm.controls.targetDate.setValue(
            toDateOnly(response.banknoteTrackDate) || this.getToday()
          );
          this.feedback.set({
            tone: response.created ? 'success' : 'info',
            title: response.created ? 'Kayit olusturuldu' : 'Mevcut kayit kullanildi',
            message: response.created
              ? 'Banknot teslim kaydi basariyla olusturuldu.'
              : 'Ayni depo ve gun icin kayit zaten oldugu icin mevcut kayit dondu.'
          });
          this.createForm.markAsPristine();
          this.loadTracks();
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Kayit olusturulamadi',
            message: this.getErrorMessage(error, 'Banknot teslim kaydi olusturulurken bir hata olustu.')
          });
        }
      });
  }

  protected resetCreateForm(): void {
    this.createForm.reset({
      banknoteTrackDate: this.filtersForm.controls.targetDate.value || this.getToday(),
      totalAmount: null,
      deliveryTotalAmount: null,
      deliverer: '',
      receiver: ''
    });
    this.createdResponse.set(null);
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedDate);
  }

  protected formatCurrency(value: number | null | undefined): string {
    return `${formatAmount(value) || '0.00'} TL`;
  }

  protected getDifferenceTone(value: number | null | undefined): 'negative' | 'positive' | 'neutral' {
    const numericValue = this.toSafeNumber(value);

    if (numericValue < 0) {
      return 'negative';
    }

    if (numericValue > 0) {
      return 'positive';
    }

    return 'neutral';
  }

  private buildCreateRequest(): IFurpaCreateBanknoteTrackRequestApiDto {
    const rawValue = this.createForm.getRawValue();

    return {
      banknoteTrackDate: rawValue.banknoteTrackDate,
      totalAmount: this.toSafeNumber(rawValue.totalAmount),
      deliveryTotalAmount: this.toSafeNumber(rawValue.deliveryTotalAmount),
      deliverer: rawValue.deliverer.trim(),
      receiver: rawValue.receiver.trim()
    };
  }

  private getRequestedWarehouseNo(): number | undefined {
    switch (this.warehouseMode()) {
      case 'all':
        return 1;
      case 'custom':
        return this.toOptionalNumber(this.filtersForm.getRawValue().customWarehouseNo);
      case 'current':
      default:
        return this.currentWarehouseNo() ?? undefined;
    }
  }

  private sortTracks(items: readonly IFurpaBanknoteTrackApiDto[]): IFurpaBanknoteTrackApiDto[] {
    return [...items].sort((left, right) => {
      const rightDate = new Date(right.banknoteTrackDate).getTime();
      const leftDate = new Date(left.banknoteTrackDate).getTime();

      if (rightDate !== leftDate) {
        return rightDate - leftDate;
      }

      return this.toSafeNumber(right.banknoteTrackId) - this.toSafeNumber(left.banknoteTrackId);
    });
  }

  private setCustomWarehouseControlState(): void {
    const control = this.filtersForm.controls.customWarehouseNo;

    if (this.warehouseMode() === 'custom') {
      control.enable({ emitEvent: false });
      return;
    }

    control.disable({ emitEvent: false });
  }

  private toSafeNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return 0;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const numberValue = this.toSafeNumber(value);

    return numberValue > 0 ? numberValue : undefined;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || !error) {
      return fallback;
    }

    const possibleError = error as {
      message?: unknown;
      error?: {
        message?: unknown;
        title?: unknown;
        detail?: unknown;
      };
    };
    const apiMessage =
      possibleError.error?.message ?? possibleError.error?.detail ?? possibleError.error?.title;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }

    if (typeof possibleError.message === 'string' && possibleError.message.trim()) {
      return possibleError.message.trim();
    }

    return fallback;
  }

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
