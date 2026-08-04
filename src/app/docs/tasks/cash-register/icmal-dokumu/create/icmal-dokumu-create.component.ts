import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
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
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel
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
  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly generatedSeriePreview = computed(() => {
    const warehouseNo = this.currentWarehouseNo();
    return warehouseNo ? `KS${warehouseNo}` : 'KS{loginDepoNo}';
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
    total: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
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

  protected readonly paymentTypesTotal = computed(() => {
    this.formRevision();
    return this.roundCurrency(
      this.paymentTypes.controls
        .filter((group) => !this.isBackendGeneratedCashPaymentGroup(group))
        .reduce(
          (total, group) => total + this.toSafeNumber(group.controls.amountValue.value),
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
  protected readonly drawerGrandTotal = computed(() =>
    this.roundCurrency(
      this.banknoteTotal() +
        this.paymentTypesTotal() +
        this.storeExpensesTotal() +
        this.giftCheckTotal()
    )
  );
  protected readonly suggestedSummaryTotal = computed(() => this.drawerGrandTotal());
  protected readonly totalDifference = computed(() => {
    this.formRevision();
    const declaredTotal = this.toSafeNumber(this.controls.total.value);
    const zTotal = this.toSafeNumber(this.controls.zTotalValue.value);

    return this.roundCurrency(declaredTotal - zTotal);
  });
  protected readonly hasRequiredFinancialLines = computed(() => {
    this.formRevision();
    return (
      this.hasWritablePaymentTypeLines() ||
      this.storeExpenses.length > 0 ||
      this.banknoteMovements.length > 0
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
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshComputedFormState());
    this.loadLookupData();
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

    const warehouseNo = this.currentWarehouseNo();
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
          this.storeExpenseTemplates.set(items ?? []);
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
          this.controls.cashRegisterFiscalNo.setValue(fiscalMemoryNo, { emitEvent: false });

          if (!fiscalMemoryNo) {
            this.cashRegisterMessage.set(
              'Kasa detayi bulundu ancak banka odeme tiplerini getirmek icin cash register no okunamadi.'
            );
            return;
          }

          this.cashRegisterMessage.set(
            `${fiscalMemoryNo} icin banka odeme tipleri yukleniyor.`
          );
          this.loadBankPaymentTypes(fiscalMemoryNo);
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

  protected applyCashier(item: IFurpaCashierSearchItemApiDto, target: 'cashier' | 'manager'): void {
    const code = this.toSafeNumber(item.cashierCode);

    if (target === 'cashier') {
      this.controls.cashierNo.setValue(code);
      this.controls.cashierNo.markAsDirty();
      this.controls.cashierNo.markAsTouched();
      return;
    }

    this.controls.managerNo.setValue(code);
    this.controls.managerNo.markAsDirty();
    this.controls.managerNo.markAsTouched();
  }

  protected addEmptyPaymentType(source: CashDrawerPaymentSource = 'other'): void {
    this.paymentTypes.push(
      this.createPaymentTypeGroup(
        {
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
    this.storeExpenses.push(this.createStoreExpenseGroup());
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
    this.banknoteMovements.push(this.createBanknoteGroup());
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
    const quantity = this.toSafeNumber(group.controls.quantity.value);
    const value = this.toSafeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
    this.refreshComputedFormState();
  }

  protected addEmptyGiftCheck(): void {
    this.giftCheckMovements.push(this.createGiftCheckGroup());
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
    const quantity = this.toSafeNumber(group.controls.quantity.value);
    const value = this.toSafeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
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

    const warehouseNo = this.currentWarehouseNo() ?? this.controls.warehouseNo.value;
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
      .getZRaporuToplamDeger(this.generatedSeriePreview(), warehouseNo, zReportNo, cashNo)
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
    return `Kasa ${register.cashRegisterNo}`;
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

  protected getPaymentTypeGroupTemplateKey(group: PaymentTypeLineFormGroup): string {
    return this.buildPaymentTypeTemplateKey({
      paymentName: group.controls.paymentName.value,
      paymentTypeNo: group.controls.paymentTypeNo.value,
      terminalId: group.controls.terminalId.value,
      accountCode: group.controls.accountCode.value
    });
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

  protected applyPaymentTypeTemplateSelection(index: number, templateKey: string): void {
    const group = this.paymentTypes.at(index);
    const source = group.controls.source.value;

    if (!templateKey) {
      group.controls.paymentName.setValue(this.getDefaultPaymentName(source));
      group.controls.paymentTypeNo.setValue(0);
      group.controls.terminalId.setValue('');
      group.controls.accountCode.setValue('');
      this.markPaymentTypeLookupControlsTouched(group);
      this.refreshComputedFormState();
      return;
    }

    const template = this.getPaymentTypeTemplates(source).find(
      (item) => this.buildPaymentTypeTemplateKey(item) === templateKey
    );

    if (!template) {
      return;
    }

    group.controls.paymentName.setValue(template.paymentName?.trim() ?? '');
    group.controls.paymentTypeNo.setValue(template.paymentTypeNo ?? null);
    group.controls.terminalId.setValue(template.terminalId?.trim() ?? '');
    group.controls.accountCode.setValue(template.accountCode?.trim() ?? '');
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
        this.addMissingPaymentTypeTemplates(this.bankPaymentTypes(), 'card');
        return;
      }
      case 'foodChecks': {
        if (!this.hasPaymentTypeSourceValue('foodCheck') && this.foodCheckPaymentTypes().length > 0) {
          this.foodCheckPaymentTypes().forEach((item) =>
            this.addPaymentTypeTemplate(item, 'foodCheck')
          );
        }
        return;
      }
      case 'storeExpenses': {
        if (this.storeExpenses.length === 0 && this.storeExpenseTemplates().length > 0) {
          this.storeExpenseTemplates().forEach((item) => this.addStoreExpenseTemplate(item));
        }
        return;
      }
      case 'expenseVouchers': {
        if (
          !this.hasPaymentTypeSourceValue('expenseVoucher') &&
          this.expenseVoucherPaymentTypes().length > 0
        ) {
          this.expenseVoucherPaymentTypes().forEach((item) =>
            this.addPaymentTypeTemplate(item, 'expenseVoucher')
          );
        }
        return;
      }
      case 'giftChecks': {
        if (this.giftCheckMovements.length === 0 && this.giftCheckTypes().length > 0) {
          this.giftCheckTypes().forEach((item) => this.addGiftCheckTemplate(item));
        }
        return;
      }
      case 'deferredSales': {
        if (
          !this.hasPaymentTypeSourceValue('deferredSale') &&
          this.onlinePaymentTypes().length > 0
        ) {
          this.onlinePaymentTypes().forEach((item) =>
            this.addPaymentTypeTemplate(item, 'deferredSale')
          );
        }
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

  private hasPaymentTypeSourceValue(source: CashDrawerPaymentSource): boolean {
    return this.paymentTypes.controls.some(
      (group) =>
        group.controls.source.value === source &&
        !this.isBackendGeneratedCashPaymentGroup(group)
    );
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
          this.buildPaymentTypeTemplateKey({
            paymentName: group.controls.paymentName.value,
            paymentTypeNo: group.controls.paymentTypeNo.value,
            terminalId: group.controls.terminalId.value,
            accountCode: group.controls.accountCode.value
          })
        )
    );
    let hasNewTemplate = false;

    templates.forEach((template) => {
      const key = this.buildPaymentTypeTemplateKey(template);

      if (existingKeys.has(key)) {
        return;
      }

      this.paymentTypes.push(this.createPaymentTypeGroup(template, source));
      existingKeys.add(key);
      hasNewTemplate = true;
    });

    if (hasNewTemplate) {
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
      (group) => !this.isBackendGeneratedCashPaymentGroup(group)
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
          this.addMissingPaymentTypeTemplates(paymentTypes, 'card');
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
      banknoteType: new FormControl<number | null>(template?.banknoteType ?? null, {
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
      giftCheckType: new FormControl<number | null>(template?.giftCheckType ?? null, {
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
      zTotalValue: this.toSafeNumber(rawValue.zTotalValue),
      total: this.toSafeNumber(rawValue.total),
      summaryDate: rawValue.summaryDate,
      warehouseNo: this.isAdminUser() ? rawValue.warehouseNo ?? undefined : undefined,
      giftCheckMovements: rawValue.giftCheckMovements.map((line) => ({
        value: this.toSafeNumber(line.value),
        giftCheckType: this.toSafeNumber(line.giftCheckType),
        quantity: this.toSafeNumber(line.quantity),
        total: this.toSafeNumber(line.total)
      })),
      banknoteMovements: rawValue.banknoteMovements.map((line) => ({
        banknoteType: this.toSafeNumber(line.banknoteType),
        quantity: this.toSafeNumber(line.quantity),
        total: this.toSafeNumber(line.total),
        value: this.toSafeNumber(line.value)
      })),
      paymentTypes: rawValue.paymentTypes
        .filter((line) => !this.isBackendGeneratedCashPaymentLine(line))
        .map((line) => ({
          paymentName: line.paymentName.trim(),
          paymentTypeNo: this.toSafeNumber(line.paymentTypeNo),
          accountCode: line.accountCode.trim(),
          terminalId: line.terminalId.trim(),
          slipNumber: this.toSafeNumber(line.slipNumber),
          amountValue: this.toSafeNumber(line.amountValue)
        })),
      storeExpenses: rawValue.storeExpenses.map((line) => ({
        storeExpensesType: this.toSafeNumber(line.storeExpensesType),
        description: line.description.trim(),
        amountValue: this.toSafeNumber(line.amountValue)
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
      total: rawValue.total,
      summaryDate: rawValue.summaryDate,
      warehouseNo: this.isAdminUser() ? rawValue.warehouseNo : undefined,
      giftCheckMovements: rawValue.giftCheckMovements,
      banknoteMovements: rawValue.banknoteMovements,
      paymentTypes: rawValue.paymentTypes.filter(
        (line) => !this.isBackendGeneratedCashPaymentLine(line)
      ),
      storeExpenses: rawValue.storeExpenses
    };
  }

  private sumFormArray<T extends FormGroup>(
    formArray: FormArray<T>,
    selector: (group: T) => number | null
  ): number {
    return this.roundCurrency(
      formArray.controls.reduce<number>(
        (total, group) => total + this.toSafeNumber(selector(group as T)),
        0
      )
    );
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
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
