import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  GreenGrocerProductCaseConversionMode,
  GreenGrocerProductCaseInputMode,
  GreenGrocerProductCaseProfileDto,
  GreenGrocerProductCaseProfileListHttpRequest,
  GreenGrocerProductCaseResolutionDto,
  GreenGrocerProductCaseResolutionHttpRequest,
  IFurpaProductSearchItemApiDto,
  SaveGreenGrocerProductCaseProfileHttpRequest
} from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { GreenGrocerService } from '../../../../../core/api/module-services/green-grocer.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { currentUserHasPermission } from '../../../core/admin-warehouse.helpers';

type FeedbackTone = 'error' | 'info' | 'success';

interface PageFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const TASK_ID = 'green-grocer-product-case-profiles';
const LIST_PERMISSION = 'green-grocer.product-case-profiles.list';
const CREATE_PERMISSION = 'green-grocer.product-case-profiles.create';
const UPDATE_PERMISSION = 'green-grocer.product-case-profiles.update';
const DELETE_PERMISSION = 'green-grocer.product-case-profiles.delete';

const INPUT_MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'Case', label: 'Kasa' },
  { value: 'Pack', label: 'Paket' },
  { value: 'Piece', label: 'Adet' },
  { value: 'KgDirect', label: 'Direkt KG' },
  { value: 'Sarf', label: 'Sarf' }
];

const CONVERSION_MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'LabelAverageKgPerCase', label: 'Etiket Ort. KG/Kasa' },
  { value: 'ManualKgPerCase', label: 'Manuel KG/Kasa' },
  { value: 'FixedUnitsPerCase', label: 'Sabit Adet/Kasa' },
  { value: 'DirectQuantity', label: 'Direkt Miktar' },
  { value: 'ManualOnly', label: 'Manuel Onay' },
  { value: 'Blocked', label: 'Bloklu' }
];

const PROFILE_COLUMNS: readonly ApiListTableColumn<GreenGrocerProductCaseProfileDto>[] = [
  {
    key: 'stockCode',
    label: 'Stok Kodu'
  },
  {
    key: 'stockName',
    label: 'Urun'
  },
  {
    key: 'modelCode',
    label: 'Model',
    resolveValue: (profile) => formatModel(profile)
  },
  {
    key: 'inputMode',
    label: 'Giris',
    resolveValue: (profile) => getInputModeLabel(profile.inputMode)
  },
  {
    key: 'conversionMode',
    label: 'Cozum',
    resolveValue: (profile) => getConversionModeLabel(profile.conversionMode)
  },
  {
    key: 'manualKgPerCase',
    label: 'Katsayi',
    resolveValue: (profile) => getProfileRatio(profile)
  },
  {
    key: 'isActive',
    label: 'Durum',
    type: 'status',
    resolveValue: (profile) => (profile.isActive ? 'Aktif' : 'Pasif')
  }
];

@Component({
  selector: 'app-green-grocer-product-case-profiles-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ApiListTableComponent],
  templateUrl: './green-grocer-product-case-profiles-list.component.html',
  styleUrl: './green-grocer-product-case-profiles-list.component.scss'
})
export class GreenGrocerProductCaseProfilesListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly profileColumns = PROFILE_COLUMNS;
  protected readonly inputModeOptions = INPUT_MODE_OPTIONS;
  protected readonly conversionModeOptions = CONVERSION_MODE_OPTIONS;
  protected readonly stockSearchControl = new FormControl('', { nonNullable: true });

  protected readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    includeInactive: new FormControl(false, { nonNullable: true }),
    take: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(500)]
    })
  });

  protected readonly profileForm = new FormGroup({
    stockCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)]
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    inputMode: new FormControl<GreenGrocerProductCaseInputMode>('Case', { nonNullable: true }),
    conversionMode: new FormControl<GreenGrocerProductCaseConversionMode>(
      'LabelAverageKgPerCase',
      { nonNullable: true }
    ),
    manualKgPerCase: new FormControl<number | null>(null, {
      validators: [Validators.min(0.0001)]
    }),
    manualUnitsPerCase: new FormControl<number | null>(null, {
      validators: [Validators.min(0.0001)]
    }),
    minExpectedKgPerCase: new FormControl<number | null>(null, {
      validators: [Validators.min(0)]
    }),
    maxExpectedKgPerCase: new FormControl<number | null>(null, {
      validators: [Validators.min(0)]
    }),
    averageWindowDays: new FormControl<number | null>(30, {
      validators: [Validators.min(1), Validators.max(3650)]
    }),
    minAverageRecordCount: new FormControl<number | null>(5, {
      validators: [Validators.min(0), Validators.max(100000)]
    }),
    minAverageCaseCount: new FormControl<number | null>(20, {
      validators: [Validators.min(0), Validators.max(100000)]
    }),
    maxCoefficientOfVariation: new FormControl<number | null>(0.35, {
      validators: [Validators.min(0), Validators.max(100)]
    }),
    requiresManualApproval: new FormControl(false, { nonNullable: true }),
    allowOrderLinking: new FormControl(false, { nonNullable: true }),
    overDeliveryTolerancePercent: new FormControl<number | null>(20, {
      validators: [Validators.min(0), Validators.max(1000)]
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });

  protected readonly previewForm = new FormGroup({
    stockCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)]
    }),
    inputQuantity: new FormControl<number | null>(1, {
      validators: [Validators.required, Validators.min(0.0001)]
    }),
    sourceWarehouseNo: new FormControl<number | null>(56, {
      validators: [Validators.required, Validators.min(1)]
    }),
    targetWarehouseNo: new FormControl<number | null>(null, {
      validators: [Validators.min(1)]
    }),
    orderDate: new FormControl(this.getToday(), { nonNullable: true })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly aramaService = inject(AramaService);
  private readonly authService = inject(AuthService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private profileListRequestId = 0;
  private profileDetailRequestId = 0;
  private stockSearchRequestId = 0;

  protected readonly profiles = signal<GreenGrocerProductCaseProfileDto[]>([]);
  protected readonly stockResults = signal<IFurpaProductSearchItemApiDto[]>([]);
  protected readonly selectedProfile = signal<GreenGrocerProductCaseProfileDto | null>(null);
  protected readonly selectedStock = signal<IFurpaProductSearchItemApiDto | null>(null);
  protected readonly resolution = signal<GreenGrocerProductCaseResolutionDto | null>(null);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly previewFeedback = signal<PageFeedback | null>(null);
  protected readonly stockSearchError = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isPreviewing = signal(false);
  protected readonly isStockSearching = signal(false);
  protected readonly isProfileDialogOpen = signal(false);
  protected readonly isPreviewDialogOpen = signal(false);
  protected readonly lastLoadedSearch = signal('');

  protected readonly permissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(TASK_ID))
  );
  protected readonly canListProfiles = computed(
    () => this.hasActionPermission(LIST_PERMISSION)
  );
  protected readonly canCreateProfiles = computed(
    () => this.hasActionPermission(CREATE_PERMISSION) || this.hasActionPermission(UPDATE_PERMISSION)
  );
  protected readonly canUpdateProfiles = computed(() =>
    this.hasActionPermission(UPDATE_PERMISSION)
  );
  protected readonly canDeleteProfiles = computed(() =>
    this.hasActionPermission(DELETE_PERMISSION)
  );
  protected readonly profileRows = computed(() =>
    [...this.profiles()].sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return (left.stockName || left.stockCode).localeCompare(right.stockName || right.stockCode, 'tr-TR', {
        numeric: true,
        sensitivity: 'base'
      });
    })
  );
  protected readonly activeProfileCount = computed(
    () => this.profiles().filter((profile) => profile.isActive).length
  );
  protected readonly passiveProfileCount = computed(
    () => this.profiles().filter((profile) => !profile.isActive).length
  );
  protected readonly manualProfileCount = computed(
    () =>
      this.profiles().filter((profile) =>
        ['ManualKgPerCase', 'ManualOnly'].includes(profile.conversionMode)
      ).length
  );
  protected readonly blockedProfileCount = computed(
    () => this.profiles().filter((profile) => profile.conversionMode === 'Blocked').length
  );
  protected readonly selectedProfileTitle = computed(() => {
    const selected = this.selectedProfile();

    if (selected) {
      return selected.stockName?.trim() || selected.stockCode;
    }

    const stockCode = this.profileForm.controls.stockCode.value.trim();
    return stockCode ? stockCode : 'Yeni Profil';
  });
  protected readonly selectedStockLabel = computed(() => {
    const selectedStock = this.selectedStock();

    if (selectedStock) {
      return `${selectedStock.stockCode} - ${selectedStock.stockName || 'Urun'}`;
    }

    const selectedProfile = this.selectedProfile();

    if (selectedProfile) {
      return `${selectedProfile.stockCode} - ${selectedProfile.stockName || 'Urun'}`;
    }

    const stockCode = this.profileForm.controls.stockCode.value.trim();
    return stockCode || 'Stok secilmedi';
  });

  constructor() {
    this.loadProfiles();
  }

  protected loadProfiles(): void {
    if (this.isLoading()) {
      return;
    }

    if (!this.canListProfiles()) {
      this.setFeedback('error', 'Yetki Yok', 'Manav kasa profillerini listeleme yetkiniz yok.');
      return;
    }

    const requestId = ++this.profileListRequestId;
    const request = this.buildListRequest();

    this.isLoading.set(true);
    this.feedback.set(null);
    this.lastLoadedSearch.set(request.search?.trim() ?? '');

    this.greenGrocerService
      .getProductCaseProfiles(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.profileListRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (profiles: GreenGrocerProductCaseProfileDto[]) => {
          if (requestId !== this.profileListRequestId) {
            return;
          }

          this.profiles.set(profiles ?? []);

          if (!profiles?.length) {
            this.setFeedback('info', 'Kayit Yok', 'Filtreye uygun manav kasa profili bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.profileListRequestId) {
            return;
          }

          this.profiles.set([]);
          this.setFeedback(
            'error',
            this.isFeatureDisabledError(error) ? 'Ozellik Kapali' : 'Liste Yuklenemedi',
            this.resolveErrorMessage(error, 'Manav kasa profilleri alinamadi.')
          );
        }
      });
  }

  protected startNewProfile(): void {
    this.selectedProfile.set(null);
    this.selectedStock.set(null);
    this.resolution.set(null);
    this.previewFeedback.set(null);
    this.stockSearchControl.setValue('');
    this.stockResults.set([]);
    this.stockSearchError.set('');
    this.profileForm.reset({
      stockCode: '',
      isActive: true,
      inputMode: 'Case',
      conversionMode: 'LabelAverageKgPerCase',
      manualKgPerCase: null,
      manualUnitsPerCase: null,
      minExpectedKgPerCase: null,
      maxExpectedKgPerCase: null,
      averageWindowDays: 30,
      minAverageRecordCount: 5,
      minAverageCaseCount: 20,
      maxCoefficientOfVariation: 0.35,
      requiresManualApproval: false,
      allowOrderLinking: false,
      overDeliveryTolerancePercent: 20,
      notes: ''
    });
    this.isProfileDialogOpen.set(true);
  }

  protected editProfile(profile: GreenGrocerProductCaseProfileDto): void {
    const stockCode = profile.stockCode?.trim();

    if (!stockCode) {
      this.setFeedback('error', 'Profil Acilamadi', 'Profil stok kodu bos geldi.');
      return;
    }

    this.applyProfile(profile);
    this.selectedStock.set(null);
    this.stockSearchControl.setValue(`${profile.stockCode} ${profile.stockName ?? ''}`.trim());
    this.stockResults.set([]);
    this.stockSearchError.set('');
    this.isProfileDialogOpen.set(true);
    this.previewForm.controls.stockCode.setValue(stockCode);
    this.profileDetailRequestId += 1;
    const requestId = this.profileDetailRequestId;

    this.isDetailLoading.set(true);
    this.feedback.set(null);

    this.greenGrocerService
      .getProductCaseProfile(stockCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.profileDetailRequestId) {
            this.isDetailLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (detail: GreenGrocerProductCaseProfileDto) => {
          if (requestId !== this.profileDetailRequestId) {
            return;
          }

          this.applyProfile(detail);
          this.stockSearchControl.setValue(`${detail.stockCode} ${detail.stockName ?? ''}`.trim());
          this.upsertProfile(detail);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.profileDetailRequestId) {
            return;
          }

          this.setFeedback(
            'error',
            'Detay Yuklenemedi',
            this.resolveErrorMessage(error, 'Profil detayi alinamadi.')
          );
        }
      });
  }

  protected closeProfileDialog(): void {
    if (this.isSaving() || this.isDeleting()) {
      return;
    }

    this.isProfileDialogOpen.set(false);
    this.stockResults.set([]);
    this.stockSearchError.set('');
  }

  protected openPreviewDialog(stockCode = this.profileForm.controls.stockCode.value.trim()): void {
    const normalizedStockCode = stockCode.trim();

    if (normalizedStockCode) {
      this.previewForm.controls.stockCode.setValue(normalizedStockCode);
    }

    this.resolution.set(null);
    this.previewFeedback.set(null);
    this.isPreviewDialogOpen.set(true);
  }

  protected closePreviewDialog(): void {
    if (this.isPreviewing()) {
      return;
    }

    this.isPreviewDialogOpen.set(false);
  }

  protected saveProfile(): void {
    if (this.isSaving()) {
      return;
    }

    const isExistingProfile = !!this.selectedProfile();
    const canSave = isExistingProfile ? this.canUpdateProfiles() : this.canCreateProfiles();

    if (!canSave) {
      this.setFeedback(
        'error',
        'Yetki Yok',
        isExistingProfile
          ? 'Profil guncellemek icin guncelleme yetkisi gerekiyor.'
          : 'Yeni profil eklemek icin ekleme yetkisi gerekiyor.'
      );
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.setFeedback('error', 'Eksik Bilgi', 'Zorunlu alanlari kontrol edin.');
      return;
    }

    const stockCode = this.profileForm.controls.stockCode.value.trim();

    if (!stockCode) {
      this.setFeedback('error', 'Stok Kodu Bos', 'Profil icin stok kodu girilmelidir.');
      return;
    }

    this.isSaving.set(true);
    this.feedback.set(null);

    this.greenGrocerService
      .saveProductCaseProfile(stockCode, this.buildSaveRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (profile: GreenGrocerProductCaseProfileDto) => {
          this.applyProfile(profile);
          this.upsertProfile(profile);
          this.previewForm.controls.stockCode.setValue(profile.stockCode);
          this.isProfileDialogOpen.set(false);
          this.setFeedback('success', 'Kaydedildi', 'Manav kasa profili guncellendi.');
        },
        error: (error: HttpErrorResponse) => {
          this.setFeedback(
            'error',
            this.isFeatureDisabledError(error) ? 'Ozellik Kapali' : 'Kayit Basarisiz',
            this.resolveErrorMessage(error, 'Manav kasa profili kaydedilemedi.')
          );
        }
      });
  }

  protected deleteSelectedProfile(): void {
    if (this.isDeleting()) {
      return;
    }

    if (!this.canDeleteProfiles()) {
      this.setFeedback('error', 'Yetki Yok', 'Profil silmek icin silme yetkisi gerekiyor.');
      return;
    }

    const stockCode = this.profileForm.controls.stockCode.value.trim();

    if (!stockCode) {
      this.setFeedback('error', 'Profil Secilmedi', 'Pasife alinacak profili secin.');
      return;
    }

    if (!confirm(`${stockCode} profili pasife alinsin mi?`)) {
      return;
    }

    this.isDeleting.set(true);
    this.feedback.set(null);

    this.greenGrocerService
      .deleteProductCaseProfile(stockCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDeleting.set(false))
      )
      .subscribe({
        next: () => {
          this.profiles.update((profiles) =>
            profiles.map((profile) =>
              profile.stockCode === stockCode ? { ...profile, isActive: false } : profile
            )
          );
          this.profileForm.controls.isActive.setValue(false);
          this.selectedProfile.update((profile) =>
            profile?.stockCode === stockCode ? { ...profile, isActive: false } : profile
          );
          this.isProfileDialogOpen.set(false);
          this.setFeedback('success', 'Pasife Alindi', 'Profil artik aktif listede gorunmez.');
        },
        error: (error: HttpErrorResponse) => {
          this.setFeedback(
            'error',
            'Silme Basarisiz',
            this.resolveErrorMessage(error, 'Profil pasife alinamadi.')
          );
        }
      });
  }

  protected previewResolution(): void {
    if (this.isPreviewing()) {
      return;
    }

    if (this.previewForm.invalid) {
      this.previewForm.markAllAsTouched();
      this.previewFeedback.set({
        tone: 'error',
        title: 'Eksik Bilgi',
        message: 'Onizleme icin stok kodu, miktar ve kaynak depo girin.'
      });
      return;
    }

    const request = this.buildPreviewRequest();

    if (!request.stockCode || request.inputQuantity <= 0 || !request.sourceWarehouseNo) {
      this.previewFeedback.set({
        tone: 'error',
        title: 'Eksik Bilgi',
        message: 'Onizleme icin stok kodu, miktar ve kaynak depo girin.'
      });
      return;
    }

    this.isPreviewing.set(true);
    this.previewFeedback.set(null);
    this.resolution.set(null);

    this.greenGrocerService
      .previewProductCaseResolution(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isPreviewing.set(false))
      )
      .subscribe({
        next: (resolution: GreenGrocerProductCaseResolutionDto) => {
          this.resolution.set(resolution);

          if (!resolution.isUsable) {
            this.previewFeedback.set({
              tone: 'error',
              title: 'Kullanilamaz',
              message: resolution.errors?.[0] ?? 'Bu urun icin cozumleme kullanilamaz.'
            });
            return;
          }

          if (resolution.confidence === 'Medium' || resolution.warnings?.length) {
            this.previewFeedback.set({
              tone: 'info',
              title: 'Kontrol Gerekebilir',
              message: resolution.warnings?.[0] ?? 'Cozumleme orta guvenle olustu.'
            });
            return;
          }

          this.previewFeedback.set({
            tone: 'success',
            title: 'Hazir',
            message: 'Cozumleme kullanilabilir.'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.previewFeedback.set({
            tone: 'error',
            title: this.isFeatureDisabledError(error) ? 'Ozellik Kapali' : 'Onizleme Basarisiz',
            message: this.resolveErrorMessage(error, 'Cozumleme onizlemesi alinamadi.')
          });
        }
      });
  }

  protected useProfileInPreview(): void {
    const stockCode = this.profileForm.controls.stockCode.value.trim();

    if (!stockCode) {
      return;
    }

    this.previewForm.patchValue({
      stockCode,
      inputQuantity: this.previewForm.controls.inputQuantity.value ?? 1,
      sourceWarehouseNo: this.previewForm.controls.sourceWarehouseNo.value ?? 56
    });
    this.openPreviewDialog(stockCode);
  }

  protected searchStocks(): void {
    const query = this.stockSearchControl.value.trim();

    if (this.isStockSearching()) {
      return;
    }

    this.stockSearchError.set('');
    this.stockResults.set([]);

    if (query.length < 2) {
      this.stockSearchError.set('Stok aramak icin en az 2 karakter girin.');
      return;
    }

    const requestId = ++this.stockSearchRequestId;
    this.isStockSearching.set(true);

    this.aramaService
      .searchStock(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.stockSearchRequestId) {
            this.isStockSearching.set(false);
          }
        })
      )
      .subscribe({
        next: (stocks: IFurpaProductSearchItemApiDto[]) => {
          if (requestId !== this.stockSearchRequestId) {
            return;
          }

          const normalizedStocks = this.normalizeStocks(stocks ?? []);
          this.stockResults.set(normalizedStocks);

          if (!normalizedStocks.length) {
            this.stockSearchError.set('Aramaya uygun stok bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.stockSearchRequestId) {
            return;
          }

          this.stockSearchError.set(this.resolveErrorMessage(error, 'Stok aramasi yapilamadi.'));
        }
      });
  }

  protected selectStock(stock: IFurpaProductSearchItemApiDto): void {
    const stockCode = stock.stockCode?.trim() ?? '';

    if (!stockCode) {
      this.stockSearchError.set('Secilen stok kodu bos geldi.');
      return;
    }

    const existingProfile = this.findProfileByStockCode(stockCode);

    this.stockSearchControl.setValue(`${stockCode} ${stock.stockName ?? ''}`.trim());
    this.stockResults.set([]);
    this.stockSearchError.set('');

    if (existingProfile) {
      this.editProfile(existingProfile);
      return;
    }

    this.selectedProfile.set(null);
    this.selectedStock.set(stock);
    this.profileForm.controls.stockCode.setValue(stockCode);
    this.previewForm.controls.stockCode.setValue(stockCode);
  }

  protected getInputModeDescription(value: string | null | undefined): string {
    switch (value) {
      case 'Case':
        return 'Kullanici sipariste kasa sayisi girer.';
      case 'Pack':
        return 'Koli veya paket sayisi girilir.';
      case 'Piece':
        return 'Girilen deger adet olarak okunur.';
      case 'KgDirect':
        return 'Girilen deger direkt KG kabul edilir.';
      case 'Sarf':
        return 'Kasa veya ambalaj gibi sarf urunleri icindir.';
      default:
        return 'Sipariste kullanicinin girdigi miktar turu.';
    }
  }

  protected getConversionModeDescription(value: string | null | undefined): string {
    switch (value) {
      case 'LabelAverageKgPerCase':
        return 'Etiket gecmisinden ortalama KG/kasa hesaplanir.';
      case 'ManualKgPerCase':
        return 'Profildeki manuel KG/kasa degeri kullanilir.';
      case 'FixedUnitsPerCase':
        return 'Kasa veya koli sabit adet katsayisina cevrilir.';
      case 'DirectQuantity':
        return 'Girilen miktar Mikro ana birimine direkt yazilir.';
      case 'ManualOnly':
        return 'Otomatik hesap yerine manuel kontrol gerekir.';
      case 'Blocked':
        return 'Bu urun kasa siparisinde kullanilamaz.';
      default:
        return 'Girilen miktarin Mikro miktarina nasil cevrilecegi.';
    }
  }

  protected getProfileRuleTitle(
    inputMode: string | null | undefined,
    conversionMode: string | null | undefined
  ): string {
    return `${this.getInputModeLabel(inputMode)} -> ${this.getConversionModeLabel(conversionMode)}`;
  }

  protected getProfileRuleSummary(
    inputMode: string | null | undefined,
    conversionMode: string | null | undefined
  ): string {
    const inputLabel = this.getInputModeLabel(inputMode).toLocaleLowerCase('tr-TR');

    switch (conversionMode) {
      case 'LabelAverageKgPerCase':
        return `Kullanici ${inputLabel} girer; Furpa etiket/tartim gecmisindeki KG/kasa ortalamasi ile Mikro miktari hesaplanir.`;
      case 'ManualKgPerCase':
        return `Kullanici ${inputLabel} girer; giris miktari profilin manuel KG/kasa degeri ile carpilir.`;
      case 'FixedUnitsPerCase':
        return `Kullanici ${inputLabel} girer; sonuc manuel adet/kasa ya da Mikro birim2 katsayisi ile ADET'e cevrilir.`;
      case 'DirectQuantity':
        return `Kullanici ${inputLabel} girer; miktar cevrilmeden Mikro ana birimine yazilir.`;
      case 'ManualOnly':
        return 'Otomatik sonuc uretilmez; kullaniciya manuel karar gerektigi gosterilir.';
      case 'Blocked':
        return 'Bu stok manav kasa siparisinde kullanilamaz; cozumleme satir ekletmez.';
      default:
        return 'Profil, sipariste girilen kasa/koli/adet degerinin Mikro KG/ADET miktarina nasil donusecegini belirler.';
    }
  }

  protected getAverageSourceLabel(value: string | null | undefined): string {
    switch (value) {
      case 'LabelHistory':
        return 'Etiket gecmisi';
      case 'StockUnitFactor':
        return 'Mikro birim2';
      case 'Manual':
      case 'ProfileManual':
        return 'Manuel profil';
      case 'Direct':
      case 'DirectQuantity':
        return 'Direkt';
      case 'Mixed':
        return 'Karma';
      case 'None':
        return 'Yok';
      default:
        return value?.trim() || '-';
    }
  }

  protected getInputModeLabel(value: string | null | undefined): string {
    return getInputModeLabel(value);
  }

  protected getConversionModeLabel(value: string | null | undefined): string {
    return getConversionModeLabel(value);
  }

  protected getConfidenceLabel(value: string | null | undefined): string {
    switch (value) {
      case 'High':
        return 'Yuksek';
      case 'Medium':
        return 'Orta';
      case 'Low':
        return 'Dusuk';
      case 'Blocked':
        return 'Bloklu';
      default:
        return value?.trim() || '-';
    }
  }

  protected getConfidenceClass(value: string | null | undefined): string {
    switch (value) {
      case 'High':
        return 'confidence-high';
      case 'Medium':
        return 'confidence-medium';
      case 'Low':
        return 'confidence-low';
      case 'Blocked':
        return 'confidence-blocked';
      default:
        return 'confidence-neutral';
    }
  }

  protected formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
    return formatNumber(value, maximumFractionDigits);
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected formatResolutionMain(resolution: GreenGrocerProductCaseResolutionDto): string {
    const inputUnit = this.getInputModeLabel(resolution.inputMode).toLocaleLowerCase('tr-TR');
    const outputUnit = resolution.microUnit?.trim() || resolution.unit1?.trim() || '';
    const estimated = this.formatNumber(resolution.estimatedQuantity, 3);

    return `${this.formatNumber(resolution.inputQuantity, 3)} ${inputUnit} ~= ${estimated} ${outputUnit}`.trim();
  }

  protected getResolutionHint(resolution: GreenGrocerProductCaseResolutionDto): string {
    if (!resolution.isUsable) {
      return resolution.errors?.[0] ?? 'Bu sonuc siparis satiri olarak kullanilmamali.';
    }

    const outputUnit = resolution.microUnit?.trim() || resolution.unit1?.trim() || 'miktar';
    const baseMessage =
      `Sipariste Mikro quantity = ${this.formatNumber(resolution.estimatedQuantity, 3)} ${outputUnit}; ` +
      'cozum bilgisi greenGrocerCase snapshot olarak saklanir.';

    if (resolution.isOrderLinkable) {
      return `${baseMessage} Sevkte siparis satir GUID'i tasinabilir.`;
    }

    return `${baseMessage} Siparis baglama kapaliysa sevkte GUID tasinmaz.`;
  }

  protected trackByOption = (_index: number, option: SelectOption): string => option.value;
  protected readonly trackByStock = (
    _index: number,
    stock: IFurpaProductSearchItemApiDto
  ): string => stock.stockCode?.trim() || stock.barcode?.trim() || `${_index}`;

  private buildListRequest(): GreenGrocerProductCaseProfileListHttpRequest {
    const rawValue = this.filtersForm.getRawValue();
    return {
      search: rawValue.search.trim() || null,
      includeInactive: rawValue.includeInactive,
      take: this.clampTake(rawValue.take)
    };
  }

  private buildSaveRequest(): SaveGreenGrocerProductCaseProfileHttpRequest {
    const rawValue = this.profileForm.getRawValue();

    return {
      isActive: rawValue.isActive,
      inputMode: rawValue.inputMode,
      conversionMode: rawValue.conversionMode,
      manualKgPerCase: this.toNullableNumber(rawValue.manualKgPerCase),
      manualUnitsPerCase: this.toNullableNumber(rawValue.manualUnitsPerCase),
      minExpectedKgPerCase: this.toNullableNumber(rawValue.minExpectedKgPerCase),
      maxExpectedKgPerCase: this.toNullableNumber(rawValue.maxExpectedKgPerCase),
      averageWindowDays: this.toNullableInteger(rawValue.averageWindowDays),
      minAverageRecordCount: this.toNullableInteger(rawValue.minAverageRecordCount),
      minAverageCaseCount: this.toNullableInteger(rawValue.minAverageCaseCount),
      maxCoefficientOfVariation: this.toNullableNumber(rawValue.maxCoefficientOfVariation),
      requiresManualApproval: rawValue.requiresManualApproval,
      allowOrderLinking: rawValue.allowOrderLinking,
      overDeliveryTolerancePercent: this.toNullableNumber(rawValue.overDeliveryTolerancePercent),
      notes: rawValue.notes.trim() || null
    };
  }

  private buildPreviewRequest(): GreenGrocerProductCaseResolutionHttpRequest {
    const rawValue = this.previewForm.getRawValue();
    return {
      stockCode: rawValue.stockCode.trim(),
      inputQuantity: Number(rawValue.inputQuantity ?? 0),
      sourceWarehouseNo: this.toNullableInteger(rawValue.sourceWarehouseNo),
      targetWarehouseNo: this.toNullableInteger(rawValue.targetWarehouseNo),
      orderDate: rawValue.orderDate.trim() || null
    };
  }

  private applyProfile(profile: GreenGrocerProductCaseProfileDto): void {
    this.selectedProfile.set(profile);
    this.profileForm.reset({
      stockCode: profile.stockCode ?? '',
      isActive: profile.isActive ?? true,
      inputMode: profile.inputMode ?? 'Case',
      conversionMode: profile.conversionMode ?? 'LabelAverageKgPerCase',
      manualKgPerCase: profile.manualKgPerCase ?? null,
      manualUnitsPerCase: profile.manualUnitsPerCase ?? null,
      minExpectedKgPerCase: profile.minExpectedKgPerCase ?? null,
      maxExpectedKgPerCase: profile.maxExpectedKgPerCase ?? null,
      averageWindowDays: profile.averageWindowDays ?? 30,
      minAverageRecordCount: profile.minAverageRecordCount ?? 5,
      minAverageCaseCount: profile.minAverageCaseCount ?? 20,
      maxCoefficientOfVariation: profile.maxCoefficientOfVariation ?? 0.35,
      requiresManualApproval: profile.requiresManualApproval ?? false,
      allowOrderLinking: profile.allowOrderLinking ?? false,
      overDeliveryTolerancePercent: profile.overDeliveryTolerancePercent ?? 20,
      notes: profile.notes ?? ''
    });
  }

  private upsertProfile(profile: GreenGrocerProductCaseProfileDto): void {
    const stockCode = profile.stockCode?.trim().toLocaleUpperCase('tr-TR');

    if (!stockCode) {
      return;
    }

    this.profiles.update((profiles) => {
      const existingIndex = profiles.findIndex(
        (item) => item.stockCode?.trim().toLocaleUpperCase('tr-TR') === stockCode
      );

      if (existingIndex < 0) {
        return [profile, ...profiles];
      }

      return profiles.map((item, index) => (index === existingIndex ? profile : item));
    });
  }

  private normalizeStocks(stocks: IFurpaProductSearchItemApiDto[]): IFurpaProductSearchItemApiDto[] {
    const uniqueStocks = new Map<string, IFurpaProductSearchItemApiDto>();

    for (const stock of stocks) {
      const key = stock.stockCode?.trim().toLocaleUpperCase('tr-TR');

      if (!key || uniqueStocks.has(key)) {
        continue;
      }

      uniqueStocks.set(key, stock);
    }

    return Array.from(uniqueStocks.values()).sort((left, right) =>
      (left.stockName || left.stockCode).localeCompare(right.stockName || right.stockCode, 'tr-TR', {
        numeric: true,
        sensitivity: 'base'
      })
    );
  }

  private findProfileByStockCode(stockCode: string): GreenGrocerProductCaseProfileDto | null {
    const normalizedStockCode = stockCode.trim().toLocaleUpperCase('tr-TR');

    if (!normalizedStockCode) {
      return null;
    }

    return (
      this.profiles().find(
        (profile) => profile.stockCode?.trim().toLocaleUpperCase('tr-TR') === normalizedStockCode
      ) ?? null
    );
  }

  private setFeedback(tone: FeedbackTone, title: string, message: string): void {
    this.feedback.set({ tone, title, message });
  }

  private hasActionPermission(permissionCode: string): boolean {
    const normalizedPermissionCode = this.normalizeText(permissionCode);
    const user = this.authService.currentUser();

    return (
      this.permissionCodes().includes(normalizedPermissionCode) ||
      currentUserHasPermission(user, permissionCode)
    );
  }

  private uniquePermissionCodes(permissionCodes: readonly string[]): string[] {
    return permissionCodes
      .map((code) => this.normalizeText(code))
      .filter((code, index, list) => !!code && list.indexOf(code) === index);
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private clampTake(value: number | null | undefined): number {
    const parsedValue = Number(value ?? 100);

    if (!Number.isFinite(parsedValue)) {
      return 100;
    }

    return Math.min(500, Math.max(1, Math.trunc(parsedValue)));
  }

  private toNullableInteger(value: number | null | undefined): number | null {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
      return null;
    }

    return Math.trunc(parsedValue);
  }

  private toNullableNumber(value: number | null | undefined): number | null {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private isFeatureDisabledError(error: HttpErrorResponse): boolean {
    return error.status === 409;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.error === 'object' && error.error !== null) {
      const errorBody = error.error as Record<string, unknown>;
      const message = this.readFirstString(errorBody, ['message', 'detail', 'title']);

      if (message) {
        return message;
      }
    }

    return fallback;
  }

  private readFirstString(source: Record<string, unknown>, keys: readonly string[]): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private getToday(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}

function getInputModeLabel(value: string | null | undefined): string {
  switch (value) {
    case 'Case':
      return 'Kasa';
    case 'Pack':
      return 'Paket';
    case 'Piece':
      return 'Adet';
    case 'KgDirect':
      return 'Direkt KG';
    case 'Sarf':
      return 'Sarf';
    default:
      return value?.trim() || '-';
  }
}

function getConversionModeLabel(value: string | null | undefined): string {
  switch (value) {
    case 'LabelAverageKgPerCase':
      return 'Etiket Ort.';
    case 'ManualKgPerCase':
      return 'Manuel KG';
    case 'FixedUnitsPerCase':
      return 'Sabit Adet';
    case 'DirectQuantity':
      return 'Direkt';
    case 'ManualOnly':
      return 'Manuel Onay';
    case 'Blocked':
      return 'Bloklu';
    default:
      return value?.trim() || '-';
  }
}

function getProfileRatio(profile: GreenGrocerProductCaseProfileDto): string {
  if (profile.manualKgPerCase !== null && profile.manualKgPerCase !== undefined) {
    return `${formatNumber(profile.manualKgPerCase, 3)} KG`;
  }

  if (profile.manualUnitsPerCase !== null && profile.manualUnitsPerCase !== undefined) {
    return `${formatNumber(profile.manualUnitsPerCase, 3)} adet`;
  }

  if (profile.unit2Factor !== null && profile.unit2Factor !== undefined) {
    return `${formatNumber(profile.unit2Factor, 3)} ${profile.unit2 || ''}`.trim();
  }

  return '-';
}

function formatModel(profile: GreenGrocerProductCaseProfileDto): string {
  const code = profile.modelCode?.trim() ?? '';
  const name = profile.modelName?.trim() ?? '';

  if (code && name) {
    return `${code} - ${name}`;
  }

  return code || name || '-';
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value);
}

