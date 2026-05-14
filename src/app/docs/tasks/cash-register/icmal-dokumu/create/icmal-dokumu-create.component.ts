import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  paymentName: FormControl<string>;
  paymentTypeNo: FormControl<number | null>;
  accountCode: FormControl<string>;
  terminalId: FormControl<string>;
  slipNumber: FormControl<number | null>;
  amountValue: FormControl<number | null>;
}>;

type StoreExpenseLineFormGroup = FormGroup<{
  storeExpensesType: FormControl<string>;
  description: FormControl<string>;
  amountValue: FormControl<number | null>;
}>;

@Component({
  selector: 'app-icmal-dokumu-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './icmal-dokumu-create.component.html',
  styleUrl: './icmal-dokumu-create.component.scss'
})
export class IcmalDokumuCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly today = this.formatAsInputDate(new Date());

  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-sayimlari'];
  protected readonly endpointPath = '/api/kasa-islemleri/kasa-sayimlari';
  protected readonly payloadName = 'CreateCashSummaryHttpRequest';
  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly currentWarehouseLabel = computed(() => {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return 'JWT deposu okunamadi';
    }

    if (currentUser.depoIsmi && currentUser.depoNo !== null) {
      return `${currentUser.depoIsmi} ${currentUser.depoNo}`;
    }

    return currentUser.depoIsmi || (currentUser.depoNo !== null ? `Depo ${currentUser.depoNo}` : 'JWT deposu okunamadi');
  });
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

  protected readonly paymentTypesTotal = computed(() =>
    this.sumFormArray(this.paymentTypes, (group) => group.controls.amountValue.value)
  );
  protected readonly storeExpensesTotal = computed(() =>
    this.sumFormArray(this.storeExpenses, (group) => group.controls.amountValue.value)
  );
  protected readonly banknoteTotal = computed(() =>
    this.sumFormArray(this.banknoteMovements, (group) => group.controls.total.value)
  );
  protected readonly giftCheckTotal = computed(() =>
    this.sumFormArray(this.giftCheckMovements, (group) => group.controls.total.value)
  );
  protected readonly suggestedSummaryTotal = computed(
    () => this.paymentTypesTotal() + this.storeExpensesTotal()
  );
  protected readonly totalDifference = computed(() => {
    const declaredTotal = this.toSafeNumber(this.controls.total.value);
    const zTotal = this.toSafeNumber(this.controls.zTotalValue.value);

    return this.roundCurrency(declaredTotal - zTotal);
  });
  protected readonly hasRequiredFinancialLines = computed(
    () => this.paymentTypes.length > 0 || this.storeExpenses.length > 0
  );
  protected readonly payloadPreview = computed(() =>
    JSON.stringify(this.buildRequestPreview(), null, 2)
  );

  ngOnInit(): void {
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
        issues.push('JWT deposu okunamadigi icin kasa lookup listesi bos birakildi.');
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

          if (!detail?.cashRegisterNo?.trim()) {
            this.cashRegisterMessage.set(
              'Kasa detayi bulundu ancak banka odeme tiplerini getirmek icin cash register no okunamadi.'
            );
            return;
          }

          this.cashRegisterMessage.set(
            `${detail.cashRegisterNo} icin banka odeme tipleri yukleniyor.`
          );
          this.loadBankPaymentTypes(detail.cashRegisterNo.trim());
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

  protected addEmptyPaymentType(): void {
    this.paymentTypes.push(this.createPaymentTypeGroup());
  }

  protected addPaymentTypeTemplate(template: IFurpaPaymentTypeLookupItemApiDto): void {
    this.paymentTypes.push(this.createPaymentTypeGroup(template));
  }

  protected removePaymentType(index: number): void {
    this.paymentTypes.removeAt(index);
  }

  protected addEmptyStoreExpense(): void {
    this.storeExpenses.push(this.createStoreExpenseGroup());
  }

  protected addStoreExpenseTemplate(template: IFurpaPaymentTypeLookupItemApiDto): void {
    this.storeExpenses.push(
      this.createStoreExpenseGroup({
        storeExpensesType: template.paymentName?.trim() ?? '',
        description: '',
        amountValue: template.amountValue ?? 0
      })
    );
  }

  protected removeStoreExpense(index: number): void {
    this.storeExpenses.removeAt(index);
  }

  protected addEmptyBanknote(): void {
    this.banknoteMovements.push(this.createBanknoteGroup());
  }

  protected addBanknoteTemplate(template: IFurpaBanknoteTypeItemApiDto): void {
    this.banknoteMovements.push(this.createBanknoteGroup(template));
  }

  protected removeBanknote(index: number): void {
    this.banknoteMovements.removeAt(index);
  }

  protected recalculateBanknoteTotal(index: number): void {
    const group = this.banknoteMovements.at(index);
    const quantity = this.toSafeNumber(group.controls.quantity.value);
    const value = this.toSafeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
  }

  protected addEmptyGiftCheck(): void {
    this.giftCheckMovements.push(this.createGiftCheckGroup());
  }

  protected addGiftCheckTemplate(template: IFurpaGiftCheckTypeItemApiDto): void {
    this.giftCheckMovements.push(this.createGiftCheckGroup(template));
  }

  protected removeGiftCheck(index: number): void {
    this.giftCheckMovements.removeAt(index);
  }

  protected recalculateGiftCheckTotal(index: number): void {
    const group = this.giftCheckMovements.at(index);
    const quantity = this.toSafeNumber(group.controls.quantity.value);
    const value = this.toSafeNumber(group.controls.value.value);

    group.controls.total.setValue(this.roundCurrency(quantity * value));
    group.controls.total.markAsDirty();
  }

  protected syncTotalWithSuggestion(): void {
    this.controls.total.setValue(this.suggestedSummaryTotal());
    this.controls.total.markAsDirty();
    this.controls.total.markAsTouched();
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
        'Kaydetmek icin en az bir paymentTypes veya storeExpenses satiri eklemelisin.'
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
          this.submitSuccess.set(
            `${response.documentSerie}/${response.documentOrderNo} basariyla olusturuldu.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.resolveErrorMessage(error, 'Kasa sayimi olusturulurken bir hata olustu.')
          );
        }
      });
  }

  protected readonly trackByIndex = (index: number, _item: unknown): number => index;

  protected getCashRegisterLabel(register: IFurpaCashRegistryItemApiDto): string {
    return `Kasa ${register.cashRegisterNo}`;
  }

  protected getCashierLabel(item: IFurpaCashierSearchItemApiDto): string {
    const parts = [item.cashierCode, item.cashierName].filter(
      (value): value is string | number => value !== null && value !== undefined && `${value}`.trim() !== ''
    );

    return parts.join(' - ');
  }

  private loadBankPaymentTypes(cashRegisterNo: string): void {
    this.kasaIslemleriService.getBankaOdemeTipleri(cashRegisterNo).subscribe({
      next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => {
        this.bankPaymentTypes.set(items ?? []);
        this.cashRegisterMessage.set(
          items.length
            ? `${cashRegisterNo} icin ${items.length} banka odeme tipi hazir.`
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
    template?: Partial<IFurpaPaymentTypeLookupItemApiDto>
  ): PaymentTypeLineFormGroup {
    return new FormGroup({
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
      storeExpensesType: string;
      description: string;
      amountValue: number;
    }>
  ): StoreExpenseLineFormGroup {
    return new FormGroup({
      storeExpensesType: new FormControl(template?.storeExpensesType?.trim() ?? '', {
        nonNullable: true,
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
      warehouseNo: rawValue.warehouseNo ?? undefined,
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
      paymentTypes: rawValue.paymentTypes.map((line) => ({
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
      warehouseNo: rawValue.warehouseNo,
      giftCheckMovements: rawValue.giftCheckMovements,
      banknoteMovements: rawValue.banknoteMovements,
      paymentTypes: rawValue.paymentTypes,
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
