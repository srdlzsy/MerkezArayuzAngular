import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import type {
  YeniKasaAppSettingsDto,
  UpdateYeniKasaAppSettingsRequest,
  TestFtpConnectionRequest,
  TestFtpConnectionResultDto,
  SyncPushResultDto,
  YeniKasaPaymentMethodDto,
  UpdateYeniKasaPaymentMethodRequest,
  PaymentMethodOrderUpdateItem,
  YeniKasaPaymentMethodLookupsDto,
  YeniKasaRoleDto,
  YeniKasaPermissionDto,
  YeniKasaRolePermissionMatrixDto,
  YeniKasaDisplaySettingsDto,
  YeniKasaDisplayContentDto,
  DisplayContentOrderUpdateItem,
  YeniKasaFastAccessCategoryDto,
  YeniKasaFastAccessItemDto,
  YeniKasaStockLookupDto,
} from '@interfaces';

import { API_BASE_URL } from '../../../../../core/api/api-base-url.token';
import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ActionFeedback, getErrorMessage, hasSettingsPermission } from '../../settings-task.helpers';

type ActiveTab = 'general' | 'payment-methods' | 'role-matrix' | 'display' | 'fast-access';
type ActionType = 'load' | 'save-settings' | 'test-ftp' | 'sync-push' | 'save-payment' | 'save-roles' | 'save-display' | 'save-display-order' | 'save-category' | 'save-item' | 'search-stock';

@Component({
  selector: 'app-yeni-kasa-yonetimi-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './yeni-kasa-yonetimi-list.component.html',
  styleUrl: './yeni-kasa-yonetimi-list.component.scss'
})
export class YeniKasaYonetimiListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['yeni-kasa-yonetimi'];
  protected readonly activeTab = signal<ActiveTab>('general');
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingActions = signal<readonly ActionType[]>([]);

  private readonly authService = inject(AuthService);
  private readonly ayarService = inject(AyarIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiBaseUrl = inject(API_BASE_URL, { optional: true }) || '';
  private categoryItemsRequestRevision = 0;

  protected resolveImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const apiBase = (this.apiBaseUrl || '').replace(/\/api\/?$/, '');
    if (apiBase) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${apiBase}${cleanPath}`;
    }
    return path;
  }

  protected readonly defaultDisplayImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1920 1080"><rect fill="%23f1f5f9" width="1920" height="1080"/><text fill="%2394a3b8" font-family="sans-serif" font-size="48" font-weight="bold" x="50%" y="50%" text-anchor="middle">1920x1080 Müşteri Ekranı</text></svg>';

  protected readonly defaultProductImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 283 283"><rect fill="%23f1f5f9" width="283" height="283"/><text fill="%2394a3b8" font-family="sans-serif" font-size="20" font-weight="bold" x="50%" y="50%" text-anchor="middle">283x283</text></svg>';

  // Yetkiler
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(this.authService, 'yeni-kasa-yonetimi', 'ayar-islemleri.yeni-kasa-yonetimi.update')
  );
  protected readonly canCreate = computed(() =>
    hasSettingsPermission(this.authService, 'yeni-kasa-yonetimi', 'ayar-islemleri.yeni-kasa-yonetimi.create')
  );
  protected readonly canDelete = computed(() =>
    hasSettingsPermission(this.authService, 'yeni-kasa-yonetimi', 'ayar-islemleri.yeni-kasa-yonetimi.delete')
  );

  // 1. Genel Ayarlar Formu & FTP Testi
  protected readonly generalSettingsForm = new FormGroup({
    fisFaturaLimit: new FormControl<number | null>(null, [Validators.min(0)]),
    nakitLimit: new FormControl<number | null>(null, [Validators.min(0)]),
    fisGenislik: new FormControl<string>('80mm', { nonNullable: true }),
    printerDotsPerLine: new FormControl<number | null>(576, [Validators.min(100)]),
    pavoFis: new FormControl<boolean>(true, { nonNullable: true }),
    ftpHost: new FormControl<string>('', { nonNullable: true }),
    ftpPort: new FormControl<number | null>(21),
    ftpUsername: new FormControl<string>('', { nonNullable: true }),
    ftpPassword: new FormControl<string>('', { nonNullable: true }),
    ftpFolderPath: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly ftpTestResult = signal<TestFtpConnectionResultDto | null>(null);

  // 2. Ödeme Yöntemleri
  protected readonly paymentMethods = signal<YeniKasaPaymentMethodDto[]>([]);
  protected readonly paymentLookups = signal<YeniKasaPaymentMethodLookupsDto>({
    groups: ['ana', 'banka', 'yemek', 'online', 'diger'],
    brands: [
      { code: '0', label: '0 - Standart / Tanımsız' },
      { code: '6', label: '6 - Multinet' },
      { code: '7', label: '7 - Metropol' },
      { code: '8', label: '8 - Pluxee' },
      { code: '9', label: '9 - TicketRestaurant' },
      { code: '10', label: '10 - Setcard' },
      { code: '11', label: '11 - TokenFlex' },
      { code: '12', label: '12 - Paye' },
      { code: '200', label: '200 - Yemek Sepeti Online' },
      { code: '201', label: '201 - Getir Online' },
      { code: '202', label: '202 - Trendyol Online' },
      { code: '203', label: '203 - Migros Yemek Online' },
      { code: '204', label: '204 - Web Sitesi Online' }
    ]
  });
  protected readonly paymentFilter = signal<string>('');
  protected readonly editingPayment = signal<YeniKasaPaymentMethodDto | null>(null);
  protected readonly filteredPaymentMethods = computed(() => {
    const q = this.paymentFilter().trim().toLowerCase();
    const list = this.paymentMethods();
    if (!q) return list;
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.pavoType && m.pavoType.toLowerCase().includes(q)) ||
      (m.brand && m.brand.toLowerCase().includes(q)) ||
      (m.group && m.group.toLowerCase().includes(q))
    );
  });

  protected hasBrandCode(code: string | null | undefined): boolean {
    if (!code) return true;
    return this.paymentLookups().brands.some(b => b.code === String(code));
  }

  // 3. Yetki Matrisi
  protected readonly roles = signal<YeniKasaRoleDto[]>([]);
  protected readonly permissions = signal<YeniKasaPermissionDto[]>([]);
  protected readonly rolePermissionSet = signal<Set<string>>(new Set<string>());
  protected readonly permissionSearch = signal<string>('');
  protected readonly filteredPermissions = computed(() => {
    const q = this.permissionSearch().trim().toLowerCase();
    const list = this.permissions();
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  // 4. Müşteri Ekranı & Sıralama
  protected readonly displaySettings = signal<YeniKasaDisplaySettingsDto[]>([]);
  protected readonly displayContents = signal<YeniKasaDisplayContentDto[]>([]);
  protected readonly isNewDisplayModalOpen = signal<boolean>(false);
  protected readonly newDisplayForm = new FormGroup({
    type: new FormControl<string>('image', { nonNullable: true }),
    name: new FormControl<string>('', { nonNullable: true }),
    sirano: new FormControl<number>(1, { nonNullable: true }),
    pageType: new FormControl<string>('sale_page', { nonNullable: true }),
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null),
    base64Data: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly displayPreviewUrl = signal<string | null>(null);

  // 5. Hızlı Tuş Grupları & Mikro Stok Arama
  protected readonly categories = signal<YeniKasaFastAccessCategoryDto[]>([]);
  protected readonly selectedCategory = signal<YeniKasaFastAccessCategoryDto | null>(null);
  protected readonly categoryItems = signal<YeniKasaFastAccessItemDto[]>([]);
  protected readonly isNewCategoryModalOpen = signal<boolean>(false);
  protected readonly isNewItemModalOpen = signal<boolean>(false);
  protected readonly newCategoryForm = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly newItemForm = new FormGroup({
    inventoryCode: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    barcode: new FormControl<string>('', { nonNullable: true }),
    base64Data: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly stockSearchControl = new FormControl<string>('');
  protected readonly stockSearchResults = signal<YeniKasaStockLookupDto[]>([]);
  protected readonly itemPreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAllData();
    this.setupStockSearch();
  }

  protected setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.feedback.set(null);
  }

  protected isLoading(action: ActionType): boolean {
    return this.loadingActions().includes(action);
  }

  private startLoading(action: ActionType): void {
    this.loadingActions.update(actions => [...actions, action]);
  }

  private stopLoading(action: ActionType): void {
    this.loadingActions.update(actions => actions.filter(a => a !== action));
  }

  protected onImageError(event: Event, type: 'display' | 'product'): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = type === 'display' ? this.defaultDisplayImage : this.defaultProductImage;
    }
  }

  // --- Genel Veri Yükleme ---
  protected loadAllData(): void {
    this.startLoading('load');
    this.ayarService.getYeniKasaAppSettings()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('load'))
      )
      .subscribe({
        next: (settings: YeniKasaAppSettingsDto | null) => {
          if (settings) {
            this.generalSettingsForm.patchValue({
              fisFaturaLimit: settings.fisFaturaLimit,
              nakitLimit: settings.nakitLimit,
              fisGenislik: settings.fisGenislik ?? '80mm',
              printerDotsPerLine: settings.printerDotsPerLine ?? 576,
              pavoFis: settings.pavoFis === 1,
              ftpHost: settings.ftpHost ?? '',
              ftpPort: settings.ftpPort ?? 21,
              ftpUsername: settings.ftpUsername ?? '',
              ftpPassword: '',
              ftpFolderPath: settings.ftpFolderPath ?? ''
            });
          }
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Ayarlar Yüklenemedi',
          message: getErrorMessage(err, 'Genel ayarlar yüklenirken bir hata oluştu.')
        })
      });

    this.loadPaymentMethods();
    this.loadRoleMatrix();
    this.loadDisplayData();
    this.loadFastAccessCategories();
  }

  // --- 1. Genel Ayarlar & FTP Testi & Canlı Dağıtım ---
  protected saveGeneralSettings(): void {
    if (this.generalSettingsForm.invalid) return;
    this.startLoading('save-settings');

    const v = this.generalSettingsForm.getRawValue();
    const req: UpdateYeniKasaAppSettingsRequest = {
      pavoFis: v.pavoFis ? 1 : 0,
      fisGenislik: v.fisGenislik,
      printerDotsPerLine: v.printerDotsPerLine,
      fisFaturaLimit: v.fisFaturaLimit,
      nakitLimit: v.nakitLimit,
      ftpHost: v.ftpHost,
      ftpUsername: v.ftpUsername,
      ftpPassword: v.ftpPassword || null
    };

    this.ayarService.updateYeniKasaAppSettings(req)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-settings'))
      )
      .subscribe({
        next: () => {
          this.feedback.set({
            tone: 'success',
            title: 'Başarılı',
            message: 'Kasa genel ayarları başarıyla güncellendi.'
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Genel ayarlar kaydedilemedi.')
        })
      });
  }

  protected testFtpConnection(): void {
    const v = this.generalSettingsForm.getRawValue();
    this.startLoading('test-ftp');
    this.ftpTestResult.set(null);

    const req: TestFtpConnectionRequest = {
      ftpHost: v.ftpHost,
      ftpPort: v.ftpPort,
      ftpUsername: v.ftpUsername,
      ftpPassword: v.ftpPassword,
      ftpFolderPath: v.ftpFolderPath
    };

    this.ayarService.testYeniKasaFtpConnection(req)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('test-ftp'))
      )
      .subscribe({
        next: (res: TestFtpConnectionResultDto) => {
          this.ftpTestResult.set(res);
          this.feedback.set({
            tone: res.isSuccess ? 'success' : 'error',
            title: res.isSuccess ? 'FTP Bağlantı Testi Başarılı' : 'FTP Bağlantı Testi Başarısız',
            message: res.message
          });
        },
        error: (err: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Test Sırasında Hata Oluştu',
            message: getErrorMessage(err, 'FTP bağlantı testi gerçekleştirilemedi.')
          });
        }
      });
  }

  protected triggerSyncPush(): void {
    this.confirmDialog.confirm({
      title: 'Kasalara Canlı Dağıtım Tetikle',
      message: 'Yapılan parametre, görsel ve hızlı tuş değişikliklerini aktif kasalara anında iletmek için sinyal gönderilsin mi?',
      confirmText: 'Evet, Tetikle',
      cancelText: 'Vazgeç',
      tone: 'info'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;

      this.startLoading('sync-push');
      this.ayarService.triggerYeniKasaSyncPush()
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.stopLoading('sync-push'))
        )
        .subscribe({
          next: (res: SyncPushResultDto) => {
            this.feedback.set({
              tone: res.isSuccess ? 'success' : 'error',
              title: res.isSuccess ? 'Canlı Dağıtım Sinyali Gönderildi' : 'Sinyal Gönderilemedi',
              message: res.message
            });
          },
          error: (err: unknown) => this.feedback.set({
            tone: 'error',
            title: 'Hata',
            message: getErrorMessage(err, 'Senkronizasyon tetiklenemedi.')
          })
        });
    });
  }

  // --- 2. Ödeme Yöntemleri ---
  private loadPaymentMethods(): void {
    this.ayarService.getYeniKasaPaymentMethods()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: YeniKasaPaymentMethodDto[]) => this.paymentMethods.set(res ?? []),
        error: (err: unknown) => console.error('Ödeme yöntemleri yüklenemedi:', err)
      });

    this.ayarService.getYeniKasaPaymentMethodLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lookups: YeniKasaPaymentMethodLookupsDto) => {
          if (lookups) {
            this.paymentLookups.set(lookups);
          }
        },
        error: (err: unknown) => console.error('Ödeme yöntemleri lookups yüklenemedi:', err)
      });
  }

  protected togglePaymentStatus(item: YeniKasaPaymentMethodDto): void {
    const updated = this.paymentMethods().map(p => {
      if (p.id === item.id) {
        return { ...p, status: p.status === 1 ? 0 : 1 };
      }
      return p;
    });
    this.paymentMethods.set(updated);
  }

  protected savePaymentMethodsOrder(): void {
    this.startLoading('save-payment');
    const items: PaymentMethodOrderUpdateItem[] = this.paymentMethods().map(p => ({
      id: p.id,
      sirano: p.sirano,
      status: p.status
    }));

    this.ayarService.updateYeniKasaPaymentMethodsOrder({ items })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-payment'))
      )
      .subscribe({
        next: () => {
          this.feedback.set({
            tone: 'success',
            title: 'Başarılı',
            message: 'Ödeme yöntemleri sıralama ve durumları güncellendi.'
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Ödeme yöntemleri güncellenemedi.')
        })
      });
  }

  protected editPaymentMethod(item: YeniKasaPaymentMethodDto): void {
    this.editingPayment.set({ ...item });
  }

  protected closeEditPaymentModal(): void {
    this.editingPayment.set(null);
  }

  protected saveSinglePaymentMethod(): void {
    const p = this.editingPayment();
    if (!p) return;
    this.startLoading('save-payment');

    const req: UpdateYeniKasaPaymentMethodRequest = {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      sirano: p.sirano,
      pavoIsActive: p.pavoIsActive,
      pavoType: p.pavoType,
      pavoMediator: p.pavoMediator,
      brand: p.brand,
      group: p.group
    };

    this.ayarService.updateYeniKasaPaymentMethod(req)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-payment'))
      )
      .subscribe({
        next: () => {
          this.closeEditPaymentModal();
          this.loadPaymentMethods();
          this.feedback.set({
            tone: 'success',
            title: 'Başarılı',
            message: `"${p.name}" ödeme yöntemi güncellendi.`
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Ödeme yöntemi güncellenemedi.')
        })
      });
  }

  // --- 3. Yetki Matrisi & Rol Kopyalama ---
  private loadRoleMatrix(): void {
    this.ayarService.getYeniKasaRolePermissionMatrix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (matrix: YeniKasaRolePermissionMatrixDto) => {
          this.roles.set(matrix.roles ?? []);
          this.permissions.set(matrix.permissions ?? []);

          const set = new Set<string>();
          for (const rp of matrix.rolePermissions ?? []) {
            set.add(`${rp.roleId}-${rp.permissionId}`);
          }
          this.rolePermissionSet.set(set);
        },
        error: (err: unknown) => console.error('Yetki matrisi yüklenemedi:', err)
      });
  }

  protected hasRolePermission(roleId: number, permissionId: number): boolean {
    return this.rolePermissionSet().has(`${roleId}-${permissionId}`);
  }

  protected toggleRolePermission(roleId: number, permissionId: number): void {
    const key = `${roleId}-${permissionId}`;
    const nextSet = new Set(this.rolePermissionSet());
    if (nextSet.has(key)) {
      nextSet.delete(key);
    } else {
      nextSet.add(key);
    }
    this.rolePermissionSet.set(nextSet);
  }

  protected toggleAllForRole(roleId: number, enable: boolean): void {
    const nextSet = new Set(this.rolePermissionSet());
    for (const p of this.permissions()) {
      const key = `${roleId}-${p.id}`;
      if (enable) {
        nextSet.add(key);
      } else {
        nextSet.delete(key);
      }
    }
    this.rolePermissionSet.set(nextSet);
  }

  protected saveRolePermissions(roleId: number): void {
    this.startLoading('save-roles');
    const selectedPermIds: number[] = [];

    for (const p of this.permissions()) {
      if (this.rolePermissionSet().has(`${roleId}-${p.id}`)) {
        selectedPermIds.push(p.id);
      }
    }

    this.ayarService.updateYeniKasaRolePermissions({ roleId, permissionIds: selectedPermIds })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-roles'))
      )
      .subscribe({
        next: () => {
          const roleName = this.roles().find(r => r.id === roleId)?.name ?? 'Rol';
          this.feedback.set({
            tone: 'success',
            title: 'Yetkiler Güncellendi',
            message: `${roleName} rolüne ait yetkiler başarıyla kaydedildi.`
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Rol yetkileri güncellenemedi.')
        })
      });
  }

  protected saveAllRolePermissions(): void {
    const rolesList = this.roles();
    if (!rolesList || rolesList.length === 0) return;

    this.startLoading('save-roles');
    const bulkRoles = rolesList.map(role => {
      const selectedPermIds: number[] = [];
      for (const p of this.permissions()) {
        if (this.rolePermissionSet().has(`${role.id}-${p.id}`)) {
          selectedPermIds.push(p.id);
        }
      }
      return { roleId: role.id, permissionIds: selectedPermIds };
    });

    this.ayarService.bulkUpdateYeniKasaRolePermissions({ roles: bulkRoles })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-roles'))
      )
      .subscribe({
        next: () => {
          this.feedback.set({
            tone: 'success',
            title: 'Yetkiler Tek Seferde Kaydedildi',
            message: 'Tüm rollerin (Personel, Mağaza Yöneticisi, Müdür vb.) kasa işlem yetkileri tek seferde başarıyla kaydedildi.'
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Rol yetkileri güncellenirken hata oluştu.')
        })
      });
  }

  // --- 4. Müşteri Ekranı & Sıralama ---
  private loadDisplayData(): void {
    this.ayarService.getYeniKasaDisplaySettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings: YeniKasaDisplaySettingsDto[]) => this.displaySettings.set(settings ?? []),
        error: (err: unknown) => console.error('Display ayarları yüklenemedi:', err)
      });

    this.ayarService.getYeniKasaDisplayContents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contents: YeniKasaDisplayContentDto[]) => this.displayContents.set(contents ?? []),
        error: (err: unknown) => console.error('Display içerikleri yüklenemedi:', err)
      });
  }

  protected toggleTwoSlider(setting: YeniKasaDisplaySettingsDto): void {
    const nextVal = setting.isTwoSlider === 1 ? 0 : 1;
    this.ayarService.updateYeniKasaDisplaySettings({ id: setting.id, isTwoSlider: nextVal })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.displaySettings.update(list =>
            list.map(s => s.id === setting.id ? { ...s, isTwoSlider: nextVal } : s)
          );
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Slider ayarı güncellenemedi.')
        })
      });
  }

  protected saveDisplayContentsOrder(): void {
    this.startLoading('save-display-order');
    const items: DisplayContentOrderUpdateItem[] = this.displayContents().map(c => ({
      id: c.id,
      sirano: c.sirano
    }));

    this.ayarService.updateYeniKasaDisplayContentsOrder({ items })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-display-order'))
      )
      .subscribe({
        next: () => {
          this.feedback.set({
            tone: 'success',
            title: 'Sıralama Kaydedildi',
            message: 'Müşteri ekranı slayt dönüş sıralaması güncellendi.'
          });
          this.loadDisplayData();
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Slayt sıralaması kaydedilemedi.')
        })
      });
  }

  protected updateDisplaySirano(item: YeniKasaDisplayContentDto, value: string | number): void {
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    const list = [...this.displayContents()];
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], sirano: isNaN(parsed) ? 0 : parsed };
      this.displayContents.set(list);
    }
  }

  protected isVideoContent(item: { type?: string | null; name?: string | null } | null | undefined): boolean {
    if (!item) return false;
    if (item.type?.toLowerCase() === 'video') return true;
    const name = (item.name ?? '').toLowerCase();
    return name.endsWith('.mp4') || name.endsWith('.webm');
  }

  protected setDisplayType(type: 'image' | 'video'): void {
    this.newDisplayForm.patchValue({ type, base64Data: '', name: '' });
    this.displayPreviewUrl.set(null);
  }

  protected openNewDisplayModal(): void {
    this.newDisplayForm.reset({
      type: 'image',
      name: '',
      sirano: (this.displayContents().length + 1),
      pageType: 'sale_page',
      startDate: null,
      endDate: null,
      base64Data: ''
    });
    this.displayPreviewUrl.set(null);
    this.isNewDisplayModalOpen.set(true);
  }

  protected closeNewDisplayModal(): void {
    this.isNewDisplayModalOpen.set(false);
  }

  protected onDisplayFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
    const autoType = isVideo ? 'video' : 'image';

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.displayPreviewUrl.set(base64);
      this.newDisplayForm.patchValue({
        base64Data: base64,
        name: file.name,
        type: autoType
      });
    };
    reader.readAsDataURL(file);
  }

  protected submitNewDisplayContent(): void {
    const v = this.newDisplayForm.getRawValue();
    if (!v.base64Data) {
      this.feedback.set({
        tone: 'error',
        title: 'Dosya Seçilmedi',
        message: 'Lütfen yüklenecek bir müşteri görseli (JPG/PNG) veya videosu (MP4/WebM) seçiniz.'
      });
      return;
    }

    const isVideo = v.type === 'video' || v.name.endsWith('.mp4') || v.name.endsWith('.webm');

    this.startLoading('save-display');
    this.ayarService.createYeniKasaDisplayContent({
      type: isVideo ? 'video' : 'image',
      name: v.name,
      sirano: v.sirano,
      pageType: v.pageType,
      startDate: v.startDate,
      endDate: v.endDate,
      base64Data: v.base64Data
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-display'))
      )
      .subscribe({
        next: () => {
          this.closeNewDisplayModal();
          this.loadDisplayData();
          this.feedback.set({
            tone: 'success',
            title: isVideo ? 'Video Yüklendi' : 'Görsel Yüklendi',
            message: isVideo
              ? 'Müşteri ekranı videosu (MP4/WebM) başarıyla yüklendi.'
              : 'Müşteri ekranı görseli başarıyla yüklendi (1920x1080 JPEG optimize edildi).'
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'İçerik yüklenemedi.')
        })
      });
  }

  protected deleteDisplayContent(item: YeniKasaDisplayContentDto): void {
    const isVid = this.isVideoContent(item);
    this.confirmDialog.confirm({
      title: isVid ? 'Videoyu Sil' : 'Görseli Sil',
      message: `"${item.name}" ${isVid ? 'videosunu' : 'görselini'} müşteri ekranından silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      tone: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;

      this.ayarService.deleteYeniKasaDisplayContent(item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loadDisplayData();
            this.feedback.set({
              tone: 'info',
              title: 'Silindi',
              message: isVid ? 'Video müşteri ekranından kaldırıldı.' : 'Görsel müşteri ekranından kaldırıldı.'
            });
          },
          error: (err: unknown) => this.feedback.set({
            tone: 'error',
            title: 'Hata',
            message: getErrorMessage(err, 'İçerik silinemedi.')
          })
        });
    });
  }

  // --- 5. Hızlı Tuş Grupları & Mikro Stok Arama ---
  private setupStockSearch(): void {
    this.stockSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string | null) => {
          if (!query || query.trim().length < 2) {
            this.stockSearchResults.set([]);
            return of([] as YeniKasaStockLookupDto[]);
          }

          this.startLoading('search-stock');
          return this.ayarService.searchYeniKasaStocks(query.trim(), 15).pipe(
            catchError((err: unknown) => {
              this.feedback.set({
                tone: 'error',
                title: 'Stok araması yapılamadı',
                message: getErrorMessage(err, 'Mikro stok servisine ulaşılamadı. Bağlantıyı kontrol edip yeniden deneyin.')
              });
              return of([] as YeniKasaStockLookupDto[]);
            }),
            finalize(() => this.stopLoading('search-stock'))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results: YeniKasaStockLookupDto[]) => this.stockSearchResults.set(results ?? []));
  }

  protected selectStockItem(stock: YeniKasaStockLookupDto): void {
    this.newItemForm.patchValue({
      inventoryCode: stock.stockCode,
      barcode: stock.barcode ?? ''
    });
    this.stockSearchResults.set([]);
    this.stockSearchControl.setValue(`${stock.stockCode} - ${stock.stockName}`, { emitEvent: false });
  }

  private loadFastAccessCategories(): void {
    this.ayarService.getYeniKasaFastAccessCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats: YeniKasaFastAccessCategoryDto[]) => {
          this.categories.set(cats ?? []);
          if (cats && cats.length > 0 && !this.selectedCategory()) {
            this.selectCategory(cats[0]);
          }
        },
        error: (err: unknown) => console.error('Kategoriler yüklenemedi:', err)
      });
  }

  protected selectCategory(cat: YeniKasaFastAccessCategoryDto): void {
    this.selectedCategory.set(cat);
    this.loadCategoryItems(cat.categoryKey);
  }

  private loadCategoryItems(categoryKey: string): void {
    const requestRevision = ++this.categoryItemsRequestRevision;
    this.ayarService.getYeniKasaFastAccessItems(categoryKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: YeniKasaFastAccessItemDto[]) => {
          if (requestRevision === this.categoryItemsRequestRevision) {
            this.categoryItems.set(items ?? []);
          }
        },
        error: (err: unknown) => {
          if (requestRevision === this.categoryItemsRequestRevision) {
            this.categoryItems.set([]);
            this.feedback.set({
              tone: 'error',
              title: 'Ürünler Yüklenemedi',
              message: getErrorMessage(err, 'Hızlı tuş ürünleri yüklenemedi.')
            });
          }
        }
      });
  }

  protected openNewCategoryModal(): void {
    this.newCategoryForm.reset({ name: '', description: '' });
    this.isNewCategoryModalOpen.set(true);
  }

  protected closeNewCategoryModal(): void {
    this.isNewCategoryModalOpen.set(false);
  }

  protected submitNewCategory(): void {
    if (this.newCategoryForm.invalid) return;
    this.startLoading('save-category');

    const v = this.newCategoryForm.getRawValue();
    this.ayarService.createYeniKasaFastAccessCategory({ name: v.name, description: v.description })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-category'))
      )
      .subscribe({
        next: (newCat: YeniKasaFastAccessCategoryDto) => {
          this.closeNewCategoryModal();
          this.loadFastAccessCategories();
          this.selectCategory(newCat);
          this.feedback.set({
            tone: 'success',
            title: 'Kategori Eklendi',
            message: `"${newCat.name}" kategorisi 20 karakterlik key (${newCat.categoryKey}) ile oluşturuldu.`
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Kategori oluşturulamadı.')
        })
      });
  }

  protected deleteCategory(cat: YeniKasaFastAccessCategoryDto, event: MouseEvent): void {
    event.stopPropagation();

    if (cat.itemCount > 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Kategori Silinemez',
        message: `"${cat.name}" kategorisi içinde ${cat.itemCount} adet ürün/buton bulunmaktadır. Kategoriyi silmek için önce içerisindeki ürünleri silmeli veya başka bir gruba taşımalısınız.`
      });
      return;
    }

    this.confirmDialog.confirm({
      title: 'Kategoriyi Sil',
      message: `"${cat.name}" hızlı tuş kategorisini silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      tone: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;

      this.ayarService.deleteYeniKasaFastAccessCategory(cat.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (this.selectedCategory()?.id === cat.id) {
              this.selectedCategory.set(null);
              this.categoryItems.set([]);
            }
            this.loadFastAccessCategories();
            this.feedback.set({
              tone: 'info',
              title: 'Silindi',
              message: 'Hızlı tuş kategorisi silindi.'
            });
          },
          error: (err: unknown) => this.feedback.set({
            tone: 'error',
            title: 'Hata',
            message: getErrorMessage(err, 'Kategori silinemedi.')
          })
        });
    });
  }

  protected openNewItemModal(): void {
    this.newItemForm.reset({ inventoryCode: '', barcode: '', base64Data: '' });
    this.stockSearchControl.setValue('', { emitEvent: false });
    this.stockSearchResults.set([]);
    this.itemPreviewUrl.set(null);
    this.isNewItemModalOpen.set(true);
  }

  protected closeNewItemModal(): void {
    this.isNewItemModalOpen.set(false);
  }

  protected onItemImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.itemPreviewUrl.set(base64);
      this.newItemForm.patchValue({ base64Data: base64 });
    };
    reader.readAsDataURL(file);
  }

  protected submitNewItem(): void {
    const cat = this.selectedCategory();
    if (!cat) return;
    if (this.newItemForm.invalid) return;

    this.startLoading('save-item');
    const v = this.newItemForm.getRawValue();

    this.ayarService.createYeniKasaFastAccessItem({
      categoryKey: cat.categoryKey,
      inventoryCode: (v.inventoryCode ?? '').trim(),
      barcode: (v.barcode ?? '').trim() || undefined,
      base64Data: v.base64Data || undefined
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stopLoading('save-item'))
      )
      .subscribe({
        next: () => {
          this.closeNewItemModal();
          this.loadCategoryItems(cat.categoryKey);
          this.loadFastAccessCategories();
          this.feedback.set({
            tone: 'success',
            title: 'Ürün Eklendi',
            message: `${v.inventoryCode} ürünü ${cat.name} grubuna eklendi (Görsel 283x283 optimize edildi).`
          });
        },
        error: (err: unknown) => this.feedback.set({
          tone: 'error',
          title: 'Hata',
          message: getErrorMessage(err, 'Ürün eklenemedi.')
        })
      });
  }

  protected deleteItem(item: YeniKasaFastAccessItemDto): void {
    const cat = this.selectedCategory();
    this.confirmDialog.confirm({
      title: 'Ürünü Butondan Kaldır',
      message: `${item.inventoryCode} kodlu ürünü hızlı tuş grubundan kaldırmak istediğinize emin misiniz?`,
      confirmText: 'Evet, Kaldır',
      cancelText: 'İptal',
      tone: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;

      this.ayarService.deleteYeniKasaFastAccessItem(item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (cat) {
              this.loadCategoryItems(cat.categoryKey);
              this.loadFastAccessCategories();
            }
            this.feedback.set({
              tone: 'info',
              title: 'Kaldırıldı',
              message: 'Ürün hızlı tuş grubundan kaldırıldı.'
            });
          },
          error: (err: unknown) => this.feedback.set({
            tone: 'error',
            title: 'Hata',
            message: getErrorMessage(err, 'Ürün kaldırılamadı.')
          })
        });
    });
  }

  protected trackPaymentById(_: number, item: YeniKasaPaymentMethodDto): number { return item.id; }
  protected trackRoleById(_: number, role: YeniKasaRoleDto): number { return role.id; }
  protected trackPermissionById(_: number, perm: YeniKasaPermissionDto): number { return perm.id; }
  protected trackDisplaySettingById(_: number, s: YeniKasaDisplaySettingsDto): number { return s.id; }
  protected trackDisplayContentById(_: number, c: YeniKasaDisplayContentDto): number { return c.id; }
  protected trackCategoryById(_: number, c: YeniKasaFastAccessCategoryDto): number { return c.id; }
  protected trackItemById(_: number, i: YeniKasaFastAccessItemDto): number { return i.id; }
}
