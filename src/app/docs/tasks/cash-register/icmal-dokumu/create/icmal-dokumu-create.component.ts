import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import type {
  ICashRegisterDetails,
  IFurpaBanknoteTypeItemApiDto,
  IFurpaCashRegistryItemApiDto,
  IFurpaCashierSearchItemApiDto,
  IFurpaCreateCashSummaryResponseApiDto,
  IFurpaGiftCheckTypeItemApiDto,
  IFurpaOnlineCashRegisterDetailApiDto,
  IFurpaPaymentTypeLookupItemApiDto,
  CreateCashSummaryHttpRequest
} from '@interfaces';
import { finalize } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { resolveHttpErrorMessage, trimToMaxLength } from '../../../core/api-error.helpers';
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';

type BanknoteLineFormGroup = FormGroup<{
  banknoteType: FormControl<number | null>;
  quantity: FormControl<number | null>;
  total: FormControl<number | null>;
  value: FormControl<number | null>;
}>;

type GiftCheckLineFormGroup = FormGroup<{
  value: FormControl<number | null>;
  giftCheckType: FormControl<number | null>;
  quantity: FormControl<number | null>;
  total: FormControl<number | null>;
}>;

type PaymentTypeLineFormGroup = FormGroup<{
  source: FormControl<CashDrawerPaymentSource>;
  paymentName: FormControl<string>;
  paymentTypeNo: FormControl<number | null>;
  accountCode: FormControl<string>;
  terminalId: FormControl<string>;
  slipNumber: FormControl<number | null>;
  amountValue: FormControl<number | null>;
}>;

type StoreExpenseLineFormGroup = FormGroup<{
  storeExpensesType: FormControl<number | null>;
  description: FormControl<string>;
  amountValue: FormControl<number | null>;
}>;

type CashDrawerPanelId =
  | 'banknotes'
  | 'cards'
  | 'foodChecks'
  | 'storeExpenses'
  | 'expenseVouchers'
  | 'giftChecks'
  | 'deferredSales';

type CashDrawerPaymentSource = 'card' | 'foodCheck' | 'expenseVoucher' | 'deferredSale' | 'other';

type DrawerNoticeTone = 'warning' | 'error' | 'success';

interface DrawerNotice {
  title: string;
  message: string;
  tone: DrawerNoticeTone;
}

interface CashDrawerCard {
  id: CashDrawerPanelId;
  title: string;
  description: string;
  quantity: number;
  quantityLabel: string;
  total: number;
  tone: string;
}

const BACKEND_CASH_PAYMENT_TYPE_NO = 500;
const TASK_ID = 'icmal-kaydi-girisi';

@Component({
  selector: 'app-icmal-dokumu-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './icmal-dokumu-create.component.html',
  styleUrl: './icmal-dokumu-create.component.scss'
})
export class IcmalDokumuCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly today = this.formatAsInputDate(new Date());
  private readonly formRevision = signal(0);

  protected readonly page: DocsContentPage = DOCS_PAGES['icmal-kaydi-girisi'];
  protected readonly endpointPath = '/api/kasa-islemleri/kasa-sayimlari';
  protected readonly payloadName = 'CreateCashSummaryHttpRequest';
  protected readonly isAdminUser = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    )
  );
  protected readonly canCreate = computed(() => this.hasPermission('create'));
  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly generatedSeriePreview = computed(() => {
    this.formRevision();
    const warehouseNo = this.resolveCreateWarehouseNo();
    const cashNo = this.controls?.cashNo?.value ?? null;
    return this.buildCashSummaryDocumentSerie(warehouseNo, cashNo);
  });

  protected readonly lookupLoading = signal(false);
  protected readonly lookupError = signal('');
  protected readonly cashierLookupLoading = signal(false);
  protected readonly cashierLookupError = signal('');
  protected readonly cashRegisterLoading = signal(false);
  protected readonly cashRegisterMessage = signal('');
  protected readonly zReportLoading = signal(false);
  protected readonly zReportMessage = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');
  protected readonly createdResponse = signal<IFurpaCreateCashSummaryResponseApiDto | null>(null);
  protected readonly activePanel = signal<CashDrawerPanelId | null>(null);
  protected readonly drawerNotice = signal<DrawerNotice | null>(null);

  protected readonly cashierLookupQuery = new FormControl('', { nonNullable: true });
  protected readonly cashierLookupResults = signal<IFurpaCashierSearchItemApiDto[]>([]);
  protected readonly cashierSearchQuery = new FormControl('', { nonNullable: true });
  protected readonly managerSearchQuery = new FormControl('', { nonNullable: true });
  protected readonly cashierSearchLoading = signal(false);
  protected readonly managerSearchLoading = signal(false);
  protected readonly cashierSearchError = signal('');
  protected readonly managerSearchError = signal('');
  protected readonly cashierSearchResults = signal<IFurpaCashierSearchItemApiDto[]>([]);
  protected readonly managerSearchResults = signal<IFurpaCashierSearchItemApiDto[]>([]);
  protected readonly cashRegisters = signal<IFurpaCashRegistryItemApiDto[]>([]);
  protected readonly banknoteTypes = signal<IFurpaBanknoteTypeItemApiDto[]>([]);
  protected readonly giftCheckTypes = signal<IFurpaGiftCheckTypeItemApiDto[]>([]);
  protected readonly bankPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly foodCheckPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly onlinePaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly expenseVoucherPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly storeExpenseTemplates = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly onlineCashRegisterDetails = signal<IFurpaOnlineCashRegisterDetailApiDto[]>([]);
  protected readonly cashRegisterDetail = signal<ICashRegisterDetails | null>(null);

  protected readonly controls = {
    cashNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
    }),
    cashRegisterFiscalNo: new FormControl<string>(
      { value: '', disabled: true },
      { nonNullable: true }
    ),
    zReportNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
    }),
    cashierNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
    }),
    managerNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
    }),
    zTotalValue: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    total: new FormControl<number | null>(0, {
      validators: [Validators.min(0)]
    }),
    summaryDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(this.currentWarehouseNo()),
    giftCheckMovements: new FormArray<GiftCheckLineFormGroup>([]),
    banknoteMovements: new FormArray<BanknoteLineFormGroup>([]),
    paymentTypes: new FormArray<PaymentTypeLineFormGroup>([]),
    storeExpenses: new FormArray<StoreExpenseLineFormGroup>([])
  };
  protected readonly form = new FormGroup(this.controls);
  protected readonly targetWarehouseLabel = computed(() => {
    this.formRevision();

    if (!this.isAdminUser()) {
      return this.currentWarehouseLabel();
    }

    const warehouseNo = this.resolveCreateWarehouseNo();
    return warehouseNo ? `Hedef Sube ${warehouseNo}` : 'Hedef sube secilmedi';
  });
  protected readonly canLoadLookupData = computed(() => {
    this.formRevision();
    return !this.lookupLoading() && !!this.resolveCreateWarehouseNo();
  });
  protected readonly canReadZReport = computed(() => {
    this.formRevision();
    return (
      !this.zReportLoading() &&
      !!this.resolveCreateWarehouseNo() &&
      this.toSafeNumber(this.controls.cashNo.value) > 0 &&
      this.toSafeNumber(this.controls.zReportNo.value) > 0
    );
  });

  protected readonly paymentTypesZDifferenceTotal = computed(() => {
    this.formRevision();
    return this.roundCurrency(
      this.paymentTypes.controls
        .filter((group) => {
          const paymentTypeNo = this.toSafeNumber(group.controls.paymentTypeNo.value);

          return (
            paymentTypeNo > 0 &&
            paymentTypeNo < 100 &&
            !this.isBackendGeneratedCashPaymentGroup(group)
          );
        })
        .reduce(
          (total, group) => total + this.toNonNegativeNumber(group.controls.amountValue.value),
          0
        )
    );
  });
  protected readonly storeExpensesTotal = computed(() => {
    this.formRevision();
    return this.sumFormArray(this.storeExpenses, (group) => group.controls.amountValue.value);
  });
  protected readonly banknoteTotal = computed(() => {
    this.formRevision();
    return this.sumFormArray(this.banknoteMovements, (group) => group.controls.total.value);
  });
  protected readonly giftCheckTotal = computed(() => {
    this.formRevision();
    return this.sumFormArray(this.giftCheckMovements, (group) => group.controls.total.value);
  });
  protected readonly banknoteQuantityTotal = computed(() => {
    this.formRevision();
    return this.sumFormArray(this.banknoteMovements, (group) => group.controls.quantity.value);
  });
  protected readonly giftCheckQuantityTotal = computed(() => {
    this.formRevision();
    return this.sumFormArray(this.giftCheckMovements, (group) => group.controls.quantity.value);
  });
  protected readonly collectionTotal = computed(() =>
    this.roundCurrency(this.banknoteTotal() + this.paymentTypesZDifferenceTotal())
  );
  protected readonly zDifferenceBaseTotal = computed(() =>
    this.roundCurrency(this.collectionTotal() + this.storeExpensesTotal())
  );
  protected readonly suggestedSummaryTotal = computed(() => this.zDifferenceBaseTotal());
  protected readonly totalDifference = computed(() => {
    this.formRevision();
    const zTotal = this.toSafeNumber(this.controls.zTotalValue.value);

    return this.roundCurrency(this.zDifferenceBaseTotal() - zTotal);
  });
  protected readonly hasRequiredFinancialLines = computed(() => {
    this.formRevision();
    return (
      this.hasWritablePaymentTypeLines() ||
      this.hasWritableStoreExpenseLines() ||
      this.hasWritableBanknoteLines() ||
      this.hasWritableGiftCheckLines()
    );
  });
  protected readonly summaryCards = computed<CashDrawerCard[]>(() => {
    this.formRevision();

    return [
      {
        id: 'banknotes',
        title: 'Banknotlar',
        description: 'Nakit adetleri',
        quantity: this.banknoteQuantityTotal(),
        quantityLabel: 'Adet',
        total: this.banknoteTotal(),
        tone: 'cash'
      },
      {
        id: 'cards',
        title: 'Kredi Kartlari',
        description: 'POS slipleri',
        quantity: this.paymentSlipCountBySource('card'),
        quantityLabel: 'Slip',
        total: this.paymentTotalBySource('card'),
        tone: 'card'
      },
      {
        id: 'foodChecks',
        title: 'Yemek Cekleri',
        description: 'Yemek karti ve kupon',
        quantity: this.paymentSlipCountBySource('foodCheck'),
        quantityLabel: 'Adet',
        total: this.paymentTotalBySource('foodCheck'),
        tone: 'food'
      },
      {
        id: 'storeExpenses',
        title: 'Magaza Giderleri',
        description: 'Kasadan odenen gider',
        quantity: this.storeExpenses.length,
        quantityLabel: 'Satir',
        total: this.storeExpensesTotal(),
        tone: 'expense'
      },
      {
        id: 'expenseVouchers',
        title: 'Gider Pusulasi',
        description: 'Pusula ve masraf',
        quantity: this.paymentLineCountBySource('expenseVoucher'),
        quantityLabel: 'Adet',
        total: this.paymentTotalBySource('expenseVoucher'),
        tone: 'voucher'
      },
      {
        id: 'giftChecks',
        title: 'Hediye Cekleri',
        description: 'Hediye ceki sayimi',
        quantity: this.giftCheckQuantityTotal(),
        quantityLabel: 'Adet',
        total: this.giftCheckTotal(),
        tone: 'gift'
      },
      {
        id: 'deferredSales',
        title: 'Vadeli Satislar',
        description: 'Online ve vadeli odeme',
        quantity: this.paymentSlipCountBySource('deferredSale'),
        quantityLabel: 'Adet',
        total: this.paymentTotalBySource('deferredSale'),
        tone: 'deferred'
      }
    ];
  });

  ngOnInit(): void {
    this.configureWarehouseControl();
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshComputedFormState());
    this.loadLookupData();
  }

  @HostListener('wheel', ['$event'])
  protected preventFocusedNumberWheel(event: WheelEvent): void {
    const target = event.target as HTMLInputElement | null;

    if (target?.tagName === 'INPUT' && target.type === 'number' && document.activeElement === target) {
      event.preventDefault();
      target.blur();
    }
  }

  protected get banknoteMovements(): FormArray<BanknoteLineFormGroup> {
    return this.controls.banknoteMovements;
  }

  protected get giftCheckMovements(): FormArray<GiftCheckLineFormGroup> {
    return this.controls.giftCheckMovements;
  }

  protected get paymentTypes(): FormArray<PaymentTypeLineFormGroup> {
    return this.controls.paymentTypes;
  }

  protected get storeExpenses(): FormArray<StoreExpenseLineFormGroup> {
    return this.controls.storeExpenses;
  }

  protected openPanel(panelId: CashDrawerPanelId): void {
    if (panelId === 'cards' && !this.toSafeNumber(this.controls.cashNo.value)) {
      this.drawerNotice.set({
        title: 'Kasa No gerekli',
        message: 'Kredi karti bilgileri icin once kasa numarasini secin.',
        tone: 'warning'
      });
      return;
    }

    this.prefillPanel(panelId);
    this.drawerNotice.set(null);
    this.activePanel.set(panelId);
  }

  protected closePanel(): void {
    this.activePanel.set(null);
  }

  protected dismissDrawerNotice(): void {
    this.drawerNotice.set(null);
  }

  protected getActivePanelTitle(): string {
    const panelId = this.activePanel();

    if (!panelId) {
      return '';
    }

    return this.getPanelTitle(panelId);
  }

  protected getActivePanelDescription(): string {
    const panelId = this.activePanel();

    switch (panelId) {
      case 'banknotes':
        return 'Banknot adetlerini gir, tutarlar otomatik hesaplansin.';
      case 'cards':
        return 'POS slip sayisi ve toplam tutarlari banka bazinda gir.';
      case 'foodChecks':
        return 'Yemek ceki satirlarinda adet ve tutar bilgisini tamamla.';
      case 'storeExpenses':
        return 'Magazadan yapilan giderleri aciklama ve tutar ile kaydet.';
      case 'expenseVouchers':
        return 'Gider pusulasi satirlarinda slip/adet ve tutari gir.';
      case 'giftChecks':
        return 'Hediye ceki adetlerini ve toplamlarini tamamla.';
      case 'deferredSales':
        return 'Vadeli veya online satis satirlarini tek yerden takip et.';
      default:
        return '';
    }
  }

  protected getActivePanelTotal(): number {
    const panelId = this.activePanel();

    switch (panelId) {
      case 'banknotes':
        return this.banknoteTotal();
      case 'cards':
        return this.paymentTotalBySource('card');
      case 'foodChecks':
        return this.paymentTotalBySource('foodCheck');
      case 'storeExpenses':
        return this.storeExpensesTotal();
      case 'expenseVouchers':
        return this.paymentTotalBySource('expenseVoucher');
      case 'giftChecks':
        return this.giftCheckTotal();
      case 'deferredSales':
        return this.paymentTotalBySource('deferredSale');
      default:
        return 0;
    }
  }

  protected isPaymentTypeSource(
    group: PaymentTypeLineFormGroup,
    source: CashDrawerPaymentSource
  ): boolean {
    return group.controls.source.value === source;
  }

  protected hasPaymentTypeSource(source: CashDrawerPaymentSource): boolean {
    this.formRevision();
    return this.paymentTypes.controls.some(
      (group) =>
        group.controls.source.value === source &&
        !this.isBackendGeneratedCashPaymentGroup(group)
    );
  }

  protected loadLookupData(): void {
    if (this.lookupLoading()) {
      return;
    }

    const warehouseNo = this.resolveCreateWarehouseNo();
    const issues: string[] = [];

    this.lookupLoading.set(true);
    this.lookupError.set('');

    let pendingRequests = warehouseNo ? 8 : 7;
    const finalizeRequest = () => {
      pendingRequests -= 1;

      if (pendingRequests > 0) {
        return;
      }

      if (!warehouseNo) {
        issues.push('Kullanici deposu okunamadigi icin kasa lookup listesi bos birakildi.');
      }

      this.lookupLoading.set(false);
      this.lookupError.set(issues.join(' '));
    };

    if (warehouseNo) {
      this.kasaIslemleriService
        .getKasalar(warehouseNo)
        .pipe(finalize(finalizeRequest))
        .subscribe({
          next: (items: IFurpaCashRegistryItemApiDto[]) => {
            this.cashRegisters.set(items ?? []);
          },
          error: () => {
            this.cashRegisters.set([]);
            issues.push('Kasa listesi getirilemedi.');
          }
        });
    } else {
      this.cashRegisters.set([]);
    }

    this.kasaIslemleriService
      .getBanknotTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaBanknoteTypeItemApiDto[]) => {
          this.banknoteTypes.set(items ?? []);
        },
        error: () => {
          this.banknoteTypes.set([]);
          issues.push('Banknot tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getHediyeCekiTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaGiftCheckTypeItemApiDto[]) => {
          this.giftCheckTypes.set(items ?? []);
        },
        error: () => {
          this.giftCheckTypes.set([]);
          issues.push('Hediye ceki tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getYemekCekiOdemeTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
          this.foodCheckPaymentTypes.set(items ?? []);

          if (this.activePanel() === 'foodChecks') {
            this.syncPaymentTypePanelTemplates('foodCheck');
          }
        },
        error: () => {
          this.foodCheckPaymentTypes.set([]);
          issues.push('Yemek ceki odeme tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getOnlineOdemeTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
          this.onlinePaymentTypes.set(items ?? []);

          if (this.activePanel() === 'deferredSales') {
            this.syncPaymentTypePanelTemplates('deferredSale');
          }
        },
        error: () => {
          this.onlinePaymentTypes.set([]);
          issues.push('Online odeme tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getMasrafPusulasiOdemeTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
          this.expenseVoucherPaymentTypes.set(items ?? []);

          if (this.activePanel() === 'expenseVouchers') {
            this.syncPaymentTypePanelTemplates('expenseVoucher');
          }
        },
        error: () => {
          this.expenseVoucherPaymentTypes.set([]);
          issues.push('Masraf pusulasi odeme tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getMagazaMasrafiOdemeTipleri()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
          const templates = items ?? [];

          this.storeExpenseTemplates.set(templates);

          if (this.activePanel() === 'storeExpenses') {
            this.syncStoreExpensePanelTemplates();
          } else {
            this.applyMissingStoreExpenseTypeDefaults(templates);
          }
        },
        error: () => {
          this.storeExpenseTemplates.set([]);
          issues.push('Magaza masrafi tipleri getirilemedi.');
        }
      });

    this.kasaIslemleriService
      .getOnlineKasaDetaylari()
      .pipe(finalize(finalizeRequest))
      .subscribe({
        next: (items: IFurpaOnlineCashRegisterDetailApiDto[]) => {
          this.onlineCashRegisterDetails.set(items ?? []);
        },
        error: () => {
          this.onlineCashRegisterDetails.set([]);
          issues.push('Online kasa detaylari getirilemedi.');
        }
      });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/docs/api/kasa-sayimlari');
  }

  protected onWarehouseNoChanged(): void {
    this.controls.cashNo.setValue(null);
    this.onCashNoChanged();
    this.cashRegisters.set([]);
    this.cashRegisterMessage.set('');
    this.zReportMessage.set('');
    this.loadLookupData();
    this.refreshComputedFormState();
  }

  protected onCashNoChanged(): void {
    const cashNo = this.controls.cashNo.value;

    this.cashRegisterDetail.set(null);
    this.bankPaymentTypes.set([]);
    this.cashRegisterMessage.set('');
    this.controls.cashRegisterFiscalNo.setValue('', { emitEvent: false });
    this.removePaymentTypesBySource('card');
    this.refreshComputedFormState();

    if (cashNo === null || cashNo === undefined || cashNo <= 0) {
      return;
    }

    this.cashRegisterLoading.set(true);

    this.kasaIslemleriService
      .getKasaKayitDetayi(cashNo)
      .pipe(finalize(() => this.cashRegisterLoading.set(false)))
      .subscribe({
        next: (detail: ICashRegisterDetails | null) => {
          this.cashRegisterDetail.set(detail);
          const fiscalMemoryNo = detail?.cashRegisterNo?.trim() ?? '';
          const bankLookupCashRegisterNo =
            detail?.cashFinanceNumber?.trim() || fiscalMemoryNo;
          this.controls.cashRegisterFiscalNo.setValue(fiscalMemoryNo, { emitEvent: false });

          if (!bankLookupCashRegisterNo) {
            this.cashRegisterMessage.set(
              'Kasa detayi bulundu ancak banka odeme tiplerini getirmek icin cash register no okunamadi.'
            );
            return;
          }

          this.cashRegisterMessage.set(
            `${bankLookupCashRegisterNo} icin banka odeme tipleri yukleniyor.`
          );
          this.loadBankPaymentTypes(bankLookupCashRegisterNo);
        },
        error: (error: HttpErrorResponse) => {
          this.cashRegisterMessage.set(
            this.resolveErrorMessage(error, 'Kasa detayi getirilemedi.')
          );
        }
      });
  }

  protected searchCashiers(): void {
    if (this.cashierLookupLoading()) {
      return;
    }

    const query = this.cashierLookupQuery.value.trim();
    this.cashierLookupError.set('');
    this.cashierLookupResults.set([]);

    if (query.length < 2) {
      this.cashierLookupError.set('Kasiyer aramak icin en az 2 karakter gir.');
      return;
    }

    this.cashierLookupLoading.set(true);

    this.kasaIslemleriService
      .searchKasiyerler(query)
      .pipe(finalize(() => this.cashierLookupLoading.set(false)))
      .subscribe({
        next: (results: IFurpaCashierSearchItemApiDto[]) => {
          this.cashierLookupResults.set(results ?? []);

          if ((results ?? []).length === 0) {
            this.cashierLookupError.set('Aramana uygun kasiyer bulunamadi.');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.cashierLookupError.set(
            this.resolveErrorMessage(error, 'Kasiyer aramasi yapilamadi.')
          );
        }
      });
  }

  protected searchCashiersFor(target: 'cashier' | 'manager', autoApplyBestMatch = false): void {
    const loading = target === 'cashier' ? this.cashierSearchLoading : this.managerSearchLoading;
    const error = target === 'cashier' ? this.cashierSearchError : this.managerSearchError;
    const results = target === 'cashier' ? this.cashierSearchResults : this.managerSearchResults;
    const queryControl = target === 'cashier' ? this.cashierSearchQuery : this.managerSearchQuery;
    const query = queryControl.value.trim();

    if (loading()) {
      return;
    }

    error.set('');
    results.set([]);

    if (query.length < 2) {
      error.set('Aramak icin en az 2 karakter gir.');
      return;
    }

    loading.set(true);

    this.kasaIslemleriService
      .searchKasiyerler(query)
      .pipe(finalize(() => loading.set(false)))
      .subscribe({
        next: (items: IFurpaCashierSearchItemApiDto[]) => {
          const normalizedItems = items ?? [];
          const bestMatch = autoApplyBestMatch
            ? this.findCashierBestMatch(normalizedItems, query)
            : null;

          if (bestMatch) {
            this.applyCashier(bestMatch, target);
            return;
          }

          results.set(normalizedItems);

          if (normalizedItems.length === 0) {
            error.set('Kayit bulunamadi.');
          }
        },
        error: (httpError: HttpErrorResponse) => {
          error.set(this.resolveErrorMessage(httpError, 'Arama yapilamadi.'));
        }
      });
  }

  private findCashierBestMatch(
    items: IFurpaCashierSearchItemApiDto[],
    query: string
  ): IFurpaCashierSearchItemApiDto | null {
    if (items.length === 0) {
      return null;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const exactMatch = items.find((item) => {
      const code = `${item.cashierCode ?? ''}`.trim().toLowerCase();
      const name = `${item.cashierName ?? ''}`.trim().toLowerCase();

      return code === normalizedQuery || name === normalizedQuery;
    });

    return exactMatch ?? (items.length === 1 ? items[0] : null);
  }

  protected applyCashier(item: IFurpaCashierSearchItemApiDto, target: 'cashier' | 'manager'): void {
    const code = this.toSafeNumber(item.cashierCode);
    const label = this.getCashierLabel(item);

    if (target === 'cashier') {
      this.controls.cashierNo.setValue(code);
      this.controls.cashierNo.markAsDirty();
      this.controls.cashierNo.markAsTouched();
      this.cashierSearchQuery.setValue(label);
      this.cashierSearchResults.set([]);
      this.cashierSearchError.set('');
      return;
    }

    this.controls.managerNo.setValue(code);
    this.controls.managerNo.markAsDirty();
    this.controls.managerNo.markAsTouched();
    this.managerSearchQuery.setValue(label);
    this.managerSearchResults.set([]);
    this.managerSearchError.set('');
  }

  protected addEmptyPaymentType(source: CashDrawerPaymentSource = 'other'): void {
    const defaultTemplate = this.getPaymentTypeTemplates(source)[0];

    this.paymentTypes.push(
      this.createPaymentTypeGroup(
        defaultTemplate ?? {
          paymentName: this.getDefaultPaymentName(source),
          paymentTypeNo: 0,
          slipNumber: 0,
          amountValue: 0
        },
        source
      )
    );
    this.refreshComputedFormState();
  }

  protected addPaymentTypeTemplate(
    template: IFurpaPaymentTypeLookupItemApiDto,
    source: CashDrawerPaymentSource = 'other'
  ): void {
    this.paymentTypes.push(this.createPaymentTypeGroup(template, source));
    this.refreshComputedFormState();
  }

  protected removePaymentType(index: number): void {
    this.paymentTypes.removeAt(index);
    this.refreshComputedFormState();
  }

  protected addEmptyStoreExpense(): void {
    const defaultTemplate = this.storeExpenseTemplates()[0];

    this.storeExpenses.push(
      this.createStoreExpenseGroup(
        defaultTemplate
          ? {
              storeExpensesType: defaultTemplate.paymentTypeNo ?? null,
              description: '',
              amountValue: defaultTemplate.amountValue ?? 0
            }
          : undefined
      )
    );
    this.refreshComputedFormState();
  }

  protected addStoreExpenseTemplate(template: IFurpaPaymentTypeLookupItemApiDto): void {
    this.storeExpenses.push(
      this.createStoreExpenseGroup({
        storeExpensesType: template.paymentTypeNo ?? null,
        description: '',
        amountValue: template.amountValue ?? 0
      })
    );
    this.refreshComputedFormState();
  }

  protected removeStoreExpense(index: number): void {
    this.storeExpenses.removeAt(index);
    this.refreshComputedFormState();
  }

  protected addEmptyBanknote(): void {
    const defaultTemplate = [...this.banknoteTypes()].sort(
      (left, right) => right.value - left.value
    )[0];

    this.banknoteMovements.push(this.createBanknoteGroup(defaultTemplate));
    this.refreshComputedFormState();
  }

  protected addBanknoteTemplate(template: IFurpaBanknoteTypeItemApiDto): void {
    this.banknoteMovements.push(this.createBanknoteGroup(template));
    this.refreshComputedFormState();
  }

  protected removeBanknote(index: number): void {
    this.banknoteMovements.removeAt(index);
    this.refreshComputedFormState();
  }

  protected recalculateBanknoteTotal(index: number): void {
    const group = this.banknoteMovements.at(index);
    const quantity = this.toNonNegativeNumber(group.controls.quantity.value);
    const value = this.toNonNegativeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
    this.refreshComputedFormState();
  }

  protected addEmptyGiftCheck(): void {
    this.giftCheckMovements.push(this.createGiftCheckGroup(this.giftCheckTypes()[0]));
    this.refreshComputedFormState();
  }

  protected addGiftCheckTemplate(template: IFurpaGiftCheckTypeItemApiDto): void {
    this.giftCheckMovements.push(this.createGiftCheckGroup(template));
    this.refreshComputedFormState();
  }

  protected removeGiftCheck(index: number): void {
    this.giftCheckMovements.removeAt(index);
    this.refreshComputedFormState();
  }

  protected recalculateGiftCheckTotal(index: number): void {
    const group = this.giftCheckMovements.at(index);
    const quantity = this.toNonNegativeNumber(group.controls.quantity.value);
    const value = this.toNonNegativeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
    this.refreshComputedFormState();
  }

  protected normalizeBanknoteLine(index: number): void {
    const group = this.banknoteMovements.at(index);

    this.normalizeIntegerControl(group.controls.banknoteType);
    this.normalizeIntegerControl(group.controls.quantity);
    this.normalizeCurrencyControl(group.controls.value);
    this.recalculateBanknoteTotal(index);
  }

  protected normalizeGiftCheckLine(index: number): void {
    const group = this.giftCheckMovements.at(index);

    this.normalizeIntegerControl(group.controls.giftCheckType);
    this.normalizeIntegerControl(group.controls.quantity);
    this.normalizeCurrencyControl(group.controls.value);
    this.recalculateGiftCheckTotal(index);
  }

  protected normalizePaymentLine(index: number): void {
    const group = this.paymentTypes.at(index);

    this.normalizeIntegerControl(group.controls.paymentTypeNo);
    this.normalizeIntegerControl(group.controls.slipNumber);
    this.normalizeCurrencyControl(group.controls.amountValue);
    this.refreshComputedFormState();
  }

  protected normalizeStoreExpenseLine(index: number): void {
    const group = this.storeExpenses.at(index);

    this.normalizeIntegerControl(group.controls.storeExpensesType);
    this.normalizeCurrencyControl(group.controls.amountValue);
    this.refreshComputedFormState();
  }

  protected normalizeCurrencyInput(control: FormControl<number | null>): void {
    this.normalizeCurrencyControl(control);
    this.refreshComputedFormState();
  }

  protected clearZeroOnFocus(control: FormControl<number | null>): void {
    if (this.toSafeNumber(control.value) !== 0) {
      return;
    }

    control.setValue(null);
    control.markAsTouched();
    this.refreshComputedFormState();
  }

  protected syncTotalWithSuggestion(): void {
    this.controls.total.setValue(this.suggestedSummaryTotal());
    this.controls.total.markAsDirty();
    this.controls.total.markAsTouched();
    this.refreshComputedFormState();
  }

  protected loadZReportTotal(): void {
    if (this.zReportLoading()) {
      return;
    }

    const warehouseNo = this.resolveCreateWarehouseNo();
    const zReportNo = this.controls.zReportNo.value;
    const cashNo = this.controls.cashNo.value;

    this.zReportMessage.set('');

    if (!warehouseNo || !zReportNo || !cashNo) {
      this.zReportMessage.set(
        'Z raporu toplamini okumak icin once depo, kasa no ve Z no alanlarini doldur.'
      );
      return;
    }

    this.zReportLoading.set(true);

    this.kasaIslemleriService
      .getZRaporuToplamDeger(
        this.buildCashSummaryDocumentSerie(warehouseNo, cashNo),
        warehouseNo,
        zReportNo,
        cashNo
      )
      .pipe(finalize(() => this.zReportLoading.set(false)))
      .subscribe({
        next: (value: number | null) => {
          if (value === null) {
            this.zReportMessage.set('Z raporu toplami okunamadi.');
            return;
          }

          this.controls.zTotalValue.setValue(value);
          this.controls.zTotalValue.markAsDirty();
          this.controls.zTotalValue.markAsTouched();
          this.zReportMessage.set('Z raporu toplami forma yazildi.');
        },
        error: (error: HttpErrorResponse) => {
          this.zReportMessage.set(
            this.resolveErrorMessage(error, 'Z raporu toplami getirilemedi.')
          );
        }
      });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.submitError.set('');
    this.submitSuccess.set('');
    this.createdResponse.set(null);

    if (!this.canCreate()) {
      this.submitError.set('Bu icmal kaydini olusturmak icin kaydetme yetkin yok.');
      return;
    }

    if (this.isAdminUser() && !this.resolveCreateWarehouseNo()) {
      this.controls.warehouseNo.markAsTouched();
      this.submitError.set('Tum depo yetkisinde icmal kaydi icin hedef sube secmelisin.');
      return;
    }

    if (!this.hasRequiredFinancialLines()) {
      this.submitError.set(
        'Kaydetmek icin en az bir icmal kartina satir eklemelisin.'
      );
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }

    if (this.form.invalid || !this.hasRequiredFinancialLines()) {
      return;
    }

    this.submitting.set(true);

    this.kasaIslemleriService
      .createCashSummary(this.buildRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: IFurpaCreateCashSummaryResponseApiDto) => {
          this.createdResponse.set(response);
          this.closePanel();
          this.submitSuccess.set(
            `${response.documentSerie}/${response.documentOrderNo} basariyla olusturuldu.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Icmal kaydi olusturulurken bir hata olustu.')
          );
        }
      });
  }

  protected readonly trackByIndex = (index: number, _item: unknown): number => index;
  protected readonly trackByCardId = (_index: number, item: CashDrawerCard): CashDrawerPanelId =>
    item.id;

  protected getCashRegisterLabel(register: IFurpaCashRegistryItemApiDto): string {
    const typeName =
      register.cashRegisterTypeName?.trim() || `Tip ${register.cashRegisterType}`;
    const financeNo = register.cashFinanceNumber?.trim();

    return financeNo
      ? `Kasa ${register.cashRegisterNo} - ${financeNo}`
      : `Kasa ${register.cashRegisterNo} - ${typeName}`;
  }

  protected getCashierLabel(item: IFurpaCashierSearchItemApiDto): string {
    const parts = [item.cashierCode, item.cashierName].filter(
      (value): value is string | number => value !== null && value !== undefined && `${value}`.trim() !== ''
    );

    return parts.join(' - ');
  }

  protected getStoreExpenseTypeLabel(item: IFurpaPaymentTypeLookupItemApiDto): string {
    const name = item.paymentName?.trim();
    const typeNo = this.toSafeNumber(item.paymentTypeNo);

    if (name && typeNo > 0) {
      return `${name} - Tip ${typeNo}`;
    }

    return name || `Tip ${typeNo}`;
  }

  protected getPaymentTypeTemplates(
    source: CashDrawerPaymentSource
  ): IFurpaPaymentTypeLookupItemApiDto[] {
    switch (source) {
      case 'card':
        return this.bankPaymentTypes();
      case 'foodCheck':
        return this.foodCheckPaymentTypes();
      case 'expenseVoucher':
        return this.expenseVoucherPaymentTypes();
      case 'deferredSale':
        return this.onlinePaymentTypes();
      default:
        return [];
    }
  }

  protected getPaymentTypeTemplateKey(template: IFurpaPaymentTypeLookupItemApiDto): string {
    return this.buildPaymentTypeTemplateKey(template);
  }

  protected getPaymentTypeNoSelection(group: PaymentTypeLineFormGroup): string {
    const paymentTypeNo = this.toSafeNumber(group.controls.paymentTypeNo.value);
    return paymentTypeNo > 0 ? `${paymentTypeNo}` : '';
  }

  protected getPaymentTypeGroupTemplateKey(
    source: CashDrawerPaymentSource,
    group: PaymentTypeLineFormGroup
  ): string {
    const template = this.resolvePaymentTypeTemplateForGroup(
      group,
      this.getPaymentTypeTemplates(source)
    );

    if (template) {
      return this.buildPaymentTypeTemplateKey(template);
    }

    const currentTemplate = this.buildPaymentTypeTemplateFromGroup(group);
    return currentTemplate ? this.buildPaymentTypeTemplateKey(currentTemplate) : '';
  }

  protected getPaymentTypeOptionsForGroup(
    source: CashDrawerPaymentSource,
    group: PaymentTypeLineFormGroup
  ): IFurpaPaymentTypeLookupItemApiDto[] {
    const templates = this.getPaymentTypeTemplates(source);
    const currentTemplate = this.buildPaymentTypeTemplateFromGroup(group);

    if (!currentTemplate) {
      return templates;
    }

    const currentKey = this.buildPaymentTypeTemplateKey(currentTemplate);
    const currentTypeNo = this.toSafeNumber(currentTemplate.paymentTypeNo);
    const hasCurrentTemplate = templates.some(
      (template) =>
        (currentTypeNo > 0 && this.toSafeNumber(template.paymentTypeNo) === currentTypeNo) ||
        this.buildPaymentTypeTemplateKey(template) === currentKey
    );

    return hasCurrentTemplate ? templates : [currentTemplate, ...templates];
  }

  protected getPaymentTypeTemplateLabel(template: IFurpaPaymentTypeLookupItemApiDto): string {
    const name = template.paymentName?.trim();
    const typeNo = this.toSafeNumber(template.paymentTypeNo);
    const parts = [
      typeNo > 0 ? `Tip ${typeNo}` : '',
      template.terminalId?.trim() ?? ''
    ].filter(Boolean);

    if (name && parts.length > 0) {
      return `${name} - ${parts.join(' / ')}`;
    }

    return name || parts.join(' / ') || 'Odeme tipi';
  }

  protected applyPaymentTypeNoSelection(index: number, rawPaymentTypeNo: string): void {
    const group = this.paymentTypes.at(index);
    const source = group.controls.source.value;
    const paymentTypeNo = this.toSafeNumber(rawPaymentTypeNo);

    const template = this.getPaymentTypeOptionsForGroup(source, group).find(
      (item) => this.toSafeNumber(item.paymentTypeNo) === paymentTypeNo
    );

    if (template) {
      this.applyPaymentTypeTemplateToGroup(group, template);
    } else {
      group.controls.paymentTypeNo.setValue(paymentTypeNo > 0 ? paymentTypeNo : null);
    }

    this.markPaymentTypeLookupControlsTouched(group);
    this.refreshComputedFormState();
  }

  protected applyPaymentTypeTemplateSelection(index: number, templateKey: string): void {
    const group = this.paymentTypes.at(index);
    const source = group.controls.source.value;

    const template = this.getPaymentTypeOptionsForGroup(source, group).find(
      (item) => this.buildPaymentTypeTemplateKey(item) === templateKey
    );

    if (!template) {
      return;
    }

    this.applyPaymentTypeTemplateToGroup(group, template);
    this.markPaymentTypeLookupControlsTouched(group);
    this.refreshComputedFormState();
  }

  private prefillPanel(panelId: CashDrawerPanelId): void {
    switch (panelId) {
      case 'banknotes': {
        if (this.banknoteMovements.length === 0 && this.banknoteTypes().length > 0) {
          [...this.banknoteTypes()]
            .sort((left, right) => right.value - left.value)
            .forEach((item) => this.addBanknoteTemplate(item));
        }
        return;
      }
      case 'cards': {
        this.syncPaymentTypePanelTemplates('card');
        return;
      }
      case 'foodChecks': {
        this.syncPaymentTypePanelTemplates('foodCheck');
        return;
      }
      case 'storeExpenses': {
        this.syncStoreExpensePanelTemplates();
        return;
      }
      case 'expenseVouchers': {
        this.syncPaymentTypePanelTemplates('expenseVoucher');
        return;
      }
      case 'giftChecks': {
        if (this.giftCheckMovements.length === 0 && this.giftCheckTypes().length > 0) {
          this.giftCheckTypes().forEach((item) => this.addGiftCheckTemplate(item));
        }
        return;
      }
      case 'deferredSales': {
        this.syncPaymentTypePanelTemplates('deferredSale');
        return;
      }
    }
  }

  private getPanelTitle(panelId: CashDrawerPanelId): string {
    switch (panelId) {
      case 'banknotes':
        return 'Banknotlar';
      case 'cards':
        return 'Kredi Kartlari';
      case 'foodChecks':
        return 'Yemek Cekleri';
      case 'storeExpenses':
        return 'Magaza Giderleri';
      case 'expenseVouchers':
        return 'Gider Pusulasi';
      case 'giftChecks':
        return 'Hediye Cekleri';
      case 'deferredSales':
        return 'Vadeli Satislar';
    }
  }

  private getDefaultPaymentName(source: CashDrawerPaymentSource): string {
    switch (source) {
      case 'card':
        return 'Kredi Karti';
      case 'foodCheck':
        return 'Yemek Ceki';
      case 'expenseVoucher':
        return 'Gider Pusulasi';
      case 'deferredSale':
        return 'Vadeli Satis';
      case 'other':
        return 'Odeme';
    }
  }

  private syncPaymentTypePanelTemplates(source: CashDrawerPaymentSource): void {
    const templates = this.getPaymentTypeTemplates(source);

    if (!templates.length) {
      return;
    }

    this.addMissingPaymentTypeTemplates(templates, source);
    this.applyMissingPaymentTypeTemplateSelections(source, templates);
  }

  private syncStoreExpensePanelTemplates(): void {
    const templates = this.storeExpenseTemplates();

    if (!templates.length) {
      return;
    }

    if (this.storeExpenses.length === 0) {
      templates.forEach((item) => this.addStoreExpenseTemplate(item));
      return;
    }

    this.applyMissingStoreExpenseTypeDefaults(templates);
  }

  private addMissingPaymentTypeTemplates(
    templates: IFurpaPaymentTypeLookupItemApiDto[],
    source: CashDrawerPaymentSource
  ): void {
    if (templates.length === 0) {
      return;
    }

    const existingKeys = new Set(
      this.paymentTypes.controls
        .filter(
          (group) =>
            group.controls.source.value === source &&
            !this.isBackendGeneratedCashPaymentGroup(group)
        )
        .map((group) =>
          this.buildPaymentTypeTemplateMatchKey({
            paymentName: group.controls.paymentName.value,
            paymentTypeNo: group.controls.paymentTypeNo.value,
            terminalId: group.controls.terminalId.value,
            accountCode: group.controls.accountCode.value
          })
        )
    );
    let hasNewTemplate = false;

    templates.forEach((template) => {
      const key = this.buildPaymentTypeTemplateMatchKey(template);

      if (existingKeys.has(key)) {
        return;
      }

      const reusableGroup = this.findReusablePaymentTypePlaceholder(source);

      if (reusableGroup) {
        this.applyPaymentTypeTemplateToGroup(reusableGroup, template);
      } else {
        this.paymentTypes.push(this.createPaymentTypeGroup(template, source));
      }

      existingKeys.add(key);
      hasNewTemplate = true;
    });

    if (hasNewTemplate) {
      this.refreshComputedFormState();
    }
  }

  private applyMissingPaymentTypeTemplateSelections(
    source: CashDrawerPaymentSource,
    templates: IFurpaPaymentTypeLookupItemApiDto[]
  ): void {
    let hasChanged = false;

    this.paymentTypes.controls.forEach((group) => {
      if (
        group.controls.source.value !== source ||
        this.isBackendGeneratedCashPaymentGroup(group)
      ) {
        return;
      }

      const template = this.resolvePaymentTypeTemplateForGroup(group, templates);

      if (!template) {
        return;
      }

      const currentKey = this.buildPaymentTypeTemplateKey({
        paymentName: group.controls.paymentName.value,
        paymentTypeNo: group.controls.paymentTypeNo.value,
        terminalId: group.controls.terminalId.value,
        accountCode: group.controls.accountCode.value
      });
      const templateKey = this.buildPaymentTypeTemplateKey(template);

      if (currentKey === templateKey) {
        return;
      }

      this.applyPaymentTypeTemplateToGroup(group, template);
      hasChanged = true;
    });

    if (hasChanged) {
      this.refreshComputedFormState();
    }
  }

  private removePaymentTypesBySource(source: CashDrawerPaymentSource): void {
    for (let index = this.paymentTypes.length - 1; index >= 0; index -= 1) {
      if (this.paymentTypes.at(index).controls.source.value === source) {
        this.paymentTypes.removeAt(index);
      }
    }
  }

  private applyMissingStoreExpenseTypeDefaults(
    templates: IFurpaPaymentTypeLookupItemApiDto[]
  ): void {
    const defaultTemplate = templates[0];

    if (!defaultTemplate) {
      return;
    }

    let hasChanged = false;

    this.storeExpenses.controls.forEach((group) => {
      if (this.toSafeNumber(group.controls.storeExpensesType.value) > 0) {
        return;
      }

      group.controls.storeExpensesType.setValue(defaultTemplate.paymentTypeNo ?? null);
      hasChanged = true;
    });

    if (hasChanged) {
      this.refreshComputedFormState();
    }
  }

  private findReusablePaymentTypePlaceholder(
    source: CashDrawerPaymentSource
  ): PaymentTypeLineFormGroup | null {
    const defaultPaymentName = this.normalizePaymentName(this.getDefaultPaymentName(source));

    return (
      this.paymentTypes.controls.find((group) => {
        const paymentName = this.normalizePaymentName(group.controls.paymentName.value);

        return (
          group.controls.source.value === source &&
          !this.isBackendGeneratedCashPaymentGroup(group) &&
          this.toSafeNumber(group.controls.paymentTypeNo.value) === 0 &&
          this.toSafeNumber(group.controls.slipNumber.value) === 0 &&
          this.toSafeNumber(group.controls.amountValue.value) === 0 &&
          !group.controls.terminalId.value.trim() &&
          !group.controls.accountCode.value.trim() &&
          (!paymentName || paymentName === defaultPaymentName)
        );
      }) ?? null
    );
  }

  private applyPaymentTypeTemplateToGroup(
    group: PaymentTypeLineFormGroup,
    template: IFurpaPaymentTypeLookupItemApiDto
  ): void {
    group.controls.paymentName.setValue(template.paymentName?.trim() ?? '');
    group.controls.paymentTypeNo.setValue(template.paymentTypeNo ?? null);
    group.controls.terminalId.setValue(template.terminalId?.trim() ?? '');
    group.controls.accountCode.setValue(template.accountCode?.trim() ?? '');
  }

  private buildPaymentTypeTemplateFromGroup(
    group: PaymentTypeLineFormGroup
  ): IFurpaPaymentTypeLookupItemApiDto | null {
    const paymentTypeNo = this.toSafeNumber(group.controls.paymentTypeNo.value);
    const paymentName = group.controls.paymentName.value.trim();
    const terminalId = group.controls.terminalId.value.trim();
    const accountCode = group.controls.accountCode.value.trim();

    if (paymentTypeNo <= 0 && !paymentName && !terminalId && !accountCode) {
      return null;
    }

    return {
      paymentName: paymentName || this.getDefaultPaymentName(group.controls.source.value),
      paymentTypeNo,
      terminalId,
      accountCode,
      slipNumber: this.toSafeNumber(group.controls.slipNumber.value),
      amountValue: this.toSafeNumber(group.controls.amountValue.value)
    };
  }

  private resolvePaymentTypeTemplateForGroup(
    group: PaymentTypeLineFormGroup,
    templates: IFurpaPaymentTypeLookupItemApiDto[]
  ): IFurpaPaymentTypeLookupItemApiDto | null {
    if (!templates.length) {
      return null;
    }

    const exactKey = this.buildPaymentTypeTemplateKey({
      paymentName: group.controls.paymentName.value,
      paymentTypeNo: group.controls.paymentTypeNo.value,
      terminalId: group.controls.terminalId.value,
      accountCode: group.controls.accountCode.value
    });
    const exactTemplate = templates.find(
      (template) => this.buildPaymentTypeTemplateKey(template) === exactKey
    );

    if (exactTemplate) {
      return exactTemplate;
    }

    const paymentTypeNo = this.toSafeNumber(group.controls.paymentTypeNo.value);
    const terminalId = this.normalizeLookupKeyText(group.controls.terminalId.value);
    const accountCode = this.normalizeLookupKeyText(group.controls.accountCode.value);
    const samePaymentTypeTemplates = templates.filter(
      (template) => this.toSafeNumber(template.paymentTypeNo) === paymentTypeNo
    );

    if (samePaymentTypeTemplates.length > 0) {
      const matchedTemplate = samePaymentTypeTemplates.find(
        (template) =>
          (!terminalId || this.normalizeLookupKeyText(template.terminalId) === terminalId) &&
          (!accountCode || this.normalizeLookupKeyText(template.accountCode) === accountCode)
      );

      if (matchedTemplate) {
        return matchedTemplate;
      }

      if (!terminalId && !accountCode && samePaymentTypeTemplates.length === 1) {
        return samePaymentTypeTemplates[0];
      }
    }

    const contextTemplates = templates.filter(
      (template) =>
        (!!terminalId && this.normalizeLookupKeyText(template.terminalId) === terminalId) ||
        (!!accountCode && this.normalizeLookupKeyText(template.accountCode) === accountCode)
    );

    return contextTemplates.length === 1 ? contextTemplates[0] : null;
  }

  private markPaymentTypeLookupControlsTouched(group: PaymentTypeLineFormGroup): void {
    group.controls.paymentName.markAsDirty();
    group.controls.paymentName.markAsTouched();
    group.controls.paymentTypeNo.markAsDirty();
    group.controls.paymentTypeNo.markAsTouched();
    group.controls.terminalId.markAsDirty();
    group.controls.terminalId.markAsTouched();
    group.controls.accountCode.markAsDirty();
    group.controls.accountCode.markAsTouched();
  }

  private buildPaymentTypeTemplateKey(
    template: Partial<{
      paymentName: string | null;
      paymentTypeNo: number | string | null;
      terminalId: string | null;
      accountCode: string | null;
    }>
  ): string {
    return [
      this.normalizePaymentName(template.paymentName),
      this.toSafeNumber(template.paymentTypeNo),
      this.normalizeLookupKeyText(template.terminalId),
      this.normalizeLookupKeyText(template.accountCode)
    ].join('|');
  }

  private buildPaymentTypeTemplateMatchKey(
    template: Partial<{
      paymentName: string | null;
      paymentTypeNo: number | string | null;
      terminalId: string | null;
      accountCode: string | null;
    }>
  ): string {
    return this.buildPaymentTypeTemplateKey(template);
  }

  private paymentTotalBySource(source: CashDrawerPaymentSource): number {
    this.formRevision();
    return this.roundCurrency(
      this.paymentTypes.controls
        .filter(
          (group) =>
            group.controls.source.value === source &&
            !this.isBackendGeneratedCashPaymentGroup(group)
        )
        .reduce(
          (total, group) => total + this.toSafeNumber(group.controls.amountValue.value),
          0
        )
    );
  }

  private paymentSlipCountBySource(source: CashDrawerPaymentSource): number {
    this.formRevision();
    const sourceControls = this.paymentTypes.controls.filter(
      (group) =>
        group.controls.source.value === source &&
        !this.isBackendGeneratedCashPaymentGroup(group)
    );
    const slipTotal = sourceControls.reduce(
      (total, group) => total + this.toSafeNumber(group.controls.slipNumber.value),
      0
    );

    if (slipTotal > 0) {
      return slipTotal;
    }

    return sourceControls.filter(
      (group) =>
        this.toSafeNumber(group.controls.amountValue.value) > 0 ||
        group.controls.paymentName.value.trim().length > 0
    ).length;
  }

  private paymentLineCountBySource(source: CashDrawerPaymentSource): number {
    this.formRevision();
    return this.paymentTypes.controls.filter(
      (group) =>
        group.controls.source.value === source &&
        !this.isBackendGeneratedCashPaymentGroup(group)
    ).length;
  }

  private hasWritablePaymentTypeLines(): boolean {
    return this.paymentTypes.controls.some(
      (group) => this.isWritablePaymentTypeLine(group.getRawValue())
    );
  }

  private hasWritableStoreExpenseLines(): boolean {
    return this.storeExpenses.controls.some((group) =>
      this.isWritableStoreExpenseLine(group.getRawValue())
    );
  }

  private hasWritableBanknoteLines(): boolean {
    return this.banknoteMovements.controls.some((group) =>
      this.isWritableBanknoteLine(group.getRawValue())
    );
  }

  private hasWritableGiftCheckLines(): boolean {
    return this.giftCheckMovements.controls.some((group) =>
      this.isWritableGiftCheckLine(group.getRawValue())
    );
  }

  private isWritablePaymentTypeLine(line: {
    paymentName?: string | null;
    paymentTypeNo?: number | string | null;
    amountValue?: number | string | null;
  }): boolean {
    return (
      !this.isBackendGeneratedCashPaymentLine(line) &&
      this.toNonNegativeNumber(line.paymentTypeNo) > 0 &&
      this.toNonNegativeNumber(line.amountValue) > 0
    );
  }

  private isWritableStoreExpenseLine(line: {
    storeExpensesType?: number | string | null;
    amountValue?: number | string | null;
  }): boolean {
    return (
      this.toNonNegativeNumber(line.storeExpensesType) > 0 &&
      this.toNonNegativeNumber(line.amountValue) > 0
    );
  }

  private isWritableBanknoteLine(line: {
    banknoteType?: number | string | null;
    quantity?: number | string | null;
    total?: number | string | null;
  }): boolean {
    return (
      this.toNonNegativeNumber(line.banknoteType) > 0 &&
      this.toNonNegativeNumber(line.quantity) > 0 &&
      this.toNonNegativeNumber(line.total) > 0
    );
  }

  private isWritableGiftCheckLine(line: {
    giftCheckType?: number | string | null;
    quantity?: number | string | null;
    total?: number | string | null;
  }): boolean {
    return (
      this.toNonNegativeNumber(line.giftCheckType) > 0 &&
      this.toNonNegativeNumber(line.quantity) > 0 &&
      this.toNonNegativeNumber(line.total) > 0
    );
  }

  private isBackendGeneratedCashPaymentGroup(group: PaymentTypeLineFormGroup): boolean {
    return this.isBackendGeneratedCashPaymentLine(group.getRawValue());
  }

  private isBackendGeneratedCashPaymentLine(line: {
    paymentName?: string | null;
    paymentTypeNo?: number | string | null;
  }): boolean {
    const paymentTypeNo = this.toSafeNumber(line.paymentTypeNo);
    const paymentName = this.normalizePaymentName(line.paymentName);

    return (
      paymentTypeNo === BACKEND_CASH_PAYMENT_TYPE_NO ||
      paymentName === 'nakit' ||
      paymentName === 'nakit-toplam'
    );
  }

  private normalizePaymentName(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizeLookupKeyText(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private refreshComputedFormState(): void {
    this.formRevision.update((value) => value + 1);
  }

  private loadBankPaymentTypes(cashRegisterNo: string): void {
    this.kasaIslemleriService.getBankaOdemeTipleri(cashRegisterNo).subscribe({
      next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
        const paymentTypes = items ?? [];

        this.bankPaymentTypes.set(paymentTypes);

        if (this.activePanel() === 'cards') {
          this.syncPaymentTypePanelTemplates('card');
        }

        this.cashRegisterMessage.set(
          paymentTypes.length
            ? `${cashRegisterNo} icin ${paymentTypes.length} banka odeme tipi hazir.`
            : `${cashRegisterNo} icin banka odeme tipi bulunamadi.`
        );
      },
      error: (error: HttpErrorResponse) => {
        this.bankPaymentTypes.set([]);
        this.cashRegisterMessage.set(
          this.resolveErrorMessage(error, 'Banka odeme tipleri getirilemedi.')
        );
      }
    });
  }

  private createBanknoteGroup(
    template?: Partial<IFurpaBanknoteTypeItemApiDto>
  ): BanknoteLineFormGroup {
    return new FormGroup({
      banknoteType: new FormControl<number | null>(template?.banknoteType ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      quantity: new FormControl<number | null>(template?.quantity ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      total: new FormControl<number | null>(template?.total ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      value: new FormControl<number | null>(template?.value ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      })
    });
  }

  private createGiftCheckGroup(
    template?: Partial<IFurpaGiftCheckTypeItemApiDto>
  ): GiftCheckLineFormGroup {
    return new FormGroup({
      value: new FormControl<number | null>(template?.value ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      giftCheckType: new FormControl<number | null>(template?.giftCheckType ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      quantity: new FormControl<number | null>(template?.quantity ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      total: new FormControl<number | null>(template?.total ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      })
    });
  }

  private createPaymentTypeGroup(
    template?: Partial<IFurpaPaymentTypeLookupItemApiDto>,
    source: CashDrawerPaymentSource = 'other'
  ): PaymentTypeLineFormGroup {
    return new FormGroup({
      source: new FormControl(source, { nonNullable: true }),
      paymentName: new FormControl(template?.paymentName?.trim() ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      paymentTypeNo: new FormControl<number | null>(template?.paymentTypeNo ?? null, {
        validators: [Validators.required, Validators.min(0)]
      }),
      accountCode: new FormControl(template?.accountCode?.trim() ?? '', {
        nonNullable: true
      }),
      terminalId: new FormControl(template?.terminalId?.trim() ?? '', {
        nonNullable: true
      }),
      slipNumber: new FormControl<number | null>(template?.slipNumber ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      }),
      amountValue: new FormControl<number | null>(template?.amountValue ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      })
    });
  }

  private createStoreExpenseGroup(
    template?: Partial<{
      storeExpensesType: number | null;
      description: string;
      amountValue: number;
    }>
  ): StoreExpenseLineFormGroup {
    return new FormGroup({
      storeExpensesType: new FormControl<number | null>(template?.storeExpensesType ?? null, {
        validators: [Validators.required]
      }),
      description: new FormControl(template?.description?.trim() ?? '', {
        nonNullable: true
      }),
      amountValue: new FormControl<number | null>(template?.amountValue ?? 0, {
        validators: [Validators.required, Validators.min(0)]
      })
    });
  }

  private buildRequest(): CreateCashSummaryHttpRequest {
    const rawValue = this.form.getRawValue();

    return {
      cashNo: this.toSafeNumber(rawValue.cashNo),
      zReportNo: this.toSafeNumber(rawValue.zReportNo),
      cashierNo: this.toSafeNumber(rawValue.cashierNo),
      managerNo: this.toSafeNumber(rawValue.managerNo),
      zTotalValue: this.toNonNegativeNumber(rawValue.zTotalValue),
      total: 0,
      summaryDate: rawValue.summaryDate,
      warehouseNo: this.isAdminUser() ? this.resolveCreateWarehouseNo() ?? undefined : undefined,
      giftCheckMovements: rawValue.giftCheckMovements
        .filter((line) => this.isWritableGiftCheckLine(line))
        .map((line) => ({
          value: this.toNonNegativeNumber(line.value),
          giftCheckType: this.toNonNegativeNumber(line.giftCheckType),
          quantity: this.toNonNegativeNumber(line.quantity),
          total: this.toNonNegativeNumber(line.total)
        })),
      banknoteMovements: rawValue.banknoteMovements
        .filter((line) => this.isWritableBanknoteLine(line))
        .map((line) => ({
          banknoteType: this.toNonNegativeNumber(line.banknoteType),
          quantity: this.toNonNegativeNumber(line.quantity),
          total: this.toNonNegativeNumber(line.total),
          value: this.toNonNegativeNumber(line.value)
        })),
      paymentTypes: rawValue.paymentTypes
        .filter((line) => this.isWritablePaymentTypeLine(line))
        .map((line) => ({
          paymentName: line.paymentName.trim(),
          paymentTypeNo: this.toNonNegativeNumber(line.paymentTypeNo),
          accountCode: line.accountCode.trim(),
          terminalId: line.terminalId.trim(),
          slipNumber: this.toNonNegativeNumber(line.slipNumber),
          amountValue: this.toNonNegativeNumber(line.amountValue)
        })),
      storeExpenses: rawValue.storeExpenses
        .filter((line) => this.isWritableStoreExpenseLine(line))
        .map((line) => ({
          storeExpensesType: this.toNonNegativeNumber(line.storeExpensesType),
          description: trimToMaxLength(line.description, 50),
          amountValue: this.toNonNegativeNumber(line.amountValue)
        }))
    };
  }

  private buildRequestPreview(): Record<string, unknown> {
    const rawValue = this.form.getRawValue();

    return {
      cashNo: rawValue.cashNo,
      zReportNo: rawValue.zReportNo,
      cashierNo: rawValue.cashierNo,
      managerNo: rawValue.managerNo,
      zTotalValue: rawValue.zTotalValue,
      total: 0,
      summaryDate: rawValue.summaryDate,
      warehouseNo: this.isAdminUser() ? this.resolveCreateWarehouseNo() : undefined,
      giftCheckMovements: rawValue.giftCheckMovements.filter((line) =>
        this.isWritableGiftCheckLine(line)
      ),
      banknoteMovements: rawValue.banknoteMovements.filter((line) =>
        this.isWritableBanknoteLine(line)
      ),
      paymentTypes: rawValue.paymentTypes.filter((line) => this.isWritablePaymentTypeLine(line)),
      storeExpenses: rawValue.storeExpenses.filter((line) =>
        this.isWritableStoreExpenseLine(line)
      )
    };
  }

  private buildCashSummaryDocumentSerie(
    warehouseNo: number | null | undefined,
    cashNo: number | null | undefined
  ): string {
    const warehousePart = warehouseNo ? String(warehouseNo) : '{loginDepoNo}';
    const cashPart = cashNo ? String(cashNo) : '{kasaNo}';
    return `F${warehousePart}.${cashPart}`;
  }

  private configureWarehouseControl(): void {
    if (this.isAdminUser()) {
      this.controls.warehouseNo.addValidators([Validators.required, Validators.min(1)]);
    } else {
      this.controls.warehouseNo.clearValidators();
      this.controls.warehouseNo.setValue(this.currentWarehouseNo(), { emitEvent: false });
    }

    this.controls.warehouseNo.updateValueAndValidity({ emitEvent: false });
  }

  private resolveCreateWarehouseNo(): number | null {
    if (this.isAdminUser()) {
      const warehouseNo = this.toSafeNumber(this.controls?.warehouseNo?.value ?? null);
      return warehouseNo > 0 ? warehouseNo : null;
    }

    const currentWarehouseNo = this.toSafeNumber(this.currentWarehouseNo());
    return currentWarehouseNo > 0 ? currentWarehouseNo : null;
  }

  private hasPermission(action: 'create'): boolean {
    const user = this.authService.currentUser();

    if (!user) {
      return false;
    }

    const permissionCode = `kasa-islemleri.icmal-kaydi-girisi.${action}`;
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

  private sumFormArray<T extends FormGroup>(
    formArray: FormArray<T>,
    selector: (group: T) => number | null
  ): number {
    return this.roundCurrency(
      formArray.controls.reduce<number>(
        (total, group) => total + this.toNonNegativeNumber(selector(group as T)),
        0
      )
    );
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private normalizeIntegerControl(control: FormControl<number | null>): void {
    const normalizedValue = Math.trunc(this.toNonNegativeNumber(control.value));

    if (control.value !== normalizedValue) {
      control.setValue(normalizedValue);
      control.markAsDirty();
    }
  }

  private normalizeCurrencyControl(control: FormControl<number | null>): void {
    const normalizedValue = this.roundCurrency(this.toNonNegativeNumber(control.value));

    if (control.value !== normalizedValue) {
      control.setValue(normalizedValue);
      control.markAsDirty();
    }
  }

  private toNonNegativeNumber(value: number | string | null | undefined): number {
    return Math.max(0, this.toSafeNumber(value));
  }

  private toSafeNumber(value: number | string | null | undefined): number {
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

  private formatAsInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return resolveHttpErrorMessage(error, fallback);
  }
}
