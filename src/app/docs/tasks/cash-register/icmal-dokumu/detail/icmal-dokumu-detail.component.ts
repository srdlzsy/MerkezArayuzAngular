import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import type {
  IBanknoteMovementsCT,
  ICashier,
  ICashRegisterDetails,
  IFurpaBanknoteTypeItemApiDto,
  IFurpaGiftCheckTypeItemApiDto,
  IFurpaPaymentTypeLookupItemApiDto,
  IGiftCheckMovementsCT,
  ISummariesCT,
  ISummariesDetailsCT,
  UpdateCashSummaryBanknoteLineHttpRequest,
  UpdateCashSummaryDetailLineHttpRequest,
  UpdateCashSummaryGiftCheckLineHttpRequest
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';
import {
  currentUserHasPermission,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';
import {
  IcmalSummaryPrintModel,
  SummaryPrintComponent
} from './summary-print/summary-print.component';

interface DetailFeedback {
  tone: 'info' | 'error';
  title: string;
  message: string;
}

type IcmalActionPermission = 'update' | 'delete';
type EditableDetailField = keyof ISummariesDetailsCT;
type EditableBanknoteField = keyof IBanknoteMovementsCT;
type EditableGiftCheckField = keyof IGiftCheckMovementsCT;
type EditablePaymentCategory =
  | 'card'
  | 'foodCheck'
  | 'expenseVoucher'
  | 'storeExpense'
  | 'onlineSale';
type EditableDetailCategory = EditablePaymentCategory | 'unknown';

const TASK_ID = 'kasa-sayimlari';
const PERMISSION_PREFIX = 'kasa-islemleri.kasa-sayimlari';

@Component({
  selector: 'app-icmal-dokumu-detail',
  standalone: true,
  imports: [CommonModule, SummaryPrintComponent],
  templateUrl: './icmal-dokumu-detail.component.html',
  styleUrl: './icmal-dokumu-detail.component.scss'
})
export class IcmalDokumuDetailComponent
  extends DocsTaskDialogBase<ISummariesCT>
  implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-sayimlari'];
  protected readonly summary = this.data;

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);

  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<DetailFeedback | null>(null);
  protected readonly loadIssues = signal<string[]>([]);
  protected readonly summariesDetails = signal<ISummariesDetailsCT[]>([]);
  protected readonly banknoteMovements = signal<IBanknoteMovementsCT[]>([]);
  protected readonly giftCheckMovements = signal<IGiftCheckMovementsCT[]>([]);
  protected readonly cashierAndManagerList = signal<ICashier[]>([]);
  protected readonly zTotalValue = signal<number | null>(null);
  protected readonly cashRegisterDetail = signal<ICashRegisterDetails | null>(null);
  protected readonly isEditing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly editableDetails = signal<ISummariesDetailsCT[]>([]);
  protected readonly editableBanknoteMovements = signal<IBanknoteMovementsCT[]>([]);
  protected readonly editableGiftCheckMovements = signal<IGiftCheckMovementsCT[]>([]);
  protected readonly editLookupLoading = signal(false);
  protected readonly banknoteTypes = signal<IFurpaBanknoteTypeItemApiDto[]>([]);
  protected readonly giftCheckTypes = signal<IFurpaGiftCheckTypeItemApiDto[]>([]);
  protected readonly bankPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly foodCheckPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly onlinePaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly expenseVoucherPaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly storeExpensePaymentTypes = signal<IFurpaPaymentTypeLookupItemApiDto[]>([]);
  protected readonly canUpdate = computed(() => this.hasPermission('update'));
  protected readonly canDelete = computed(() => this.hasPermission('delete'));
  private editLookupCashRegisterNo: string | null = null;

  protected readonly warehouseNo = computed(() => {
    const summary = this.summary;
    const documentWarehouseNo = this.extractFirstNumber(summary?.documentSerie);

    if (documentWarehouseNo && documentWarehouseNo > 0) {
      return documentWarehouseNo;
    }

    const summaryWarehouseNo = this.extractFirstNumber(summary?.warehouse);

    if (summaryWarehouseNo && summaryWarehouseNo > 0) {
      return summaryWarehouseNo;
    }

    return this.authService.currentUser()?.depoNo ?? 0;
  });
  protected readonly warehouseName = computed(
    () => this.summary?.warehouse || this.authService.currentUser()?.depoIsmi?.trim() || '-'
  );
  protected readonly cashierName = computed(() =>
    this.resolveCashierName(this.summary?.cashierNo ?? 0)
  );
  protected readonly managerName = computed(() =>
    this.resolveCashierName(this.summary?.managerNo ?? 0)
  );
  protected readonly creditCards = computed(() =>
    this.summariesDetails().filter((item) => this.getEditableDetailCategory(item) === 'card')
  );
  protected readonly foodChecks = computed(() =>
    this.summariesDetails().filter((item) => this.getEditableDetailCategory(item) === 'foodCheck')
  );
  protected readonly expenseCompass = computed(() =>
    this.summariesDetails().filter((item) => this.getEditableDetailCategory(item) === 'expenseVoucher')
  );
  protected readonly storeExpenses = computed(() =>
    this.summariesDetails().filter((item) => this.getEditableDetailCategory(item) === 'storeExpense')
  );
  protected readonly onlineSales = computed(() =>
    this.summariesDetails().filter((item) => this.getEditableDetailCategory(item) === 'onlineSale')
  );
  protected readonly banknoteTotal = computed(() =>
    this.sumBy(this.banknoteMovements(), (item) => item.total)
  );
  protected readonly banknoteQuantity = computed(() =>
    this.sumBy(this.banknoteMovements(), (item) => item.quantity)
  );
  protected readonly giftCheckTotal = computed(() =>
    this.sumBy(this.giftCheckMovements(), (item) => item.total)
  );
  protected readonly giftCheckQuantity = computed(() =>
    this.sumBy(this.giftCheckMovements(), (item) => item.quantity)
  );
  protected readonly creditCardsTotal = computed(() =>
    this.sumBy(this.creditCards(), (item) => item.amount)
  );
  protected readonly creditCardsQuantity = computed(() =>
    this.sumBy(this.creditCards(), (item) => item.slipNumber)
  );
  protected readonly foodChecksTotal = computed(() =>
    this.sumBy(this.foodChecks(), (item) => item.amount)
  );
  protected readonly foodChecksQuantity = computed(() =>
    this.sumBy(this.foodChecks(), (item) => item.slipNumber)
  );
  protected readonly onlineSalesTotal = computed(() =>
    this.sumBy(this.onlineSales(), (item) => item.amount)
  );
  protected readonly onlineSalesQuantity = computed(() =>
    this.sumBy(this.onlineSales(), (item) => item.slipNumber)
  );
  protected readonly expenseCompassTotal = computed(() =>
    this.sumBy(this.expenseCompass(), (item) => item.amount)
  );
  protected readonly expenseCompassQuantity = computed(() =>
    this.sumBy(this.expenseCompass(), (item) => item.slipNumber)
  );
  protected readonly storeExpensesTotal = computed(() =>
    this.sumBy(this.storeExpenses(), (item) => item.amount)
  );
  protected readonly generalTotal = computed(
    () =>
      this.banknoteTotal() +
      this.creditCardsTotal() +
      this.foodChecksTotal() +
      this.storeExpensesTotal() +
      this.onlineSalesTotal()
  );
  protected readonly differenceTotal = computed(
    () => this.generalTotal() - (this.zTotalValue() ?? 0)
  );
  protected readonly printModel = computed<IcmalSummaryPrintModel | null>(() => {
    const summary = this.summary;

    if (!summary) {
      return null;
    }

    return {
      summary,
      banknoteMovements: this.banknoteMovements(),
      giftCheckMovements: this.giftCheckMovements(),
      creditCards: this.creditCards(),
      foodChecks: this.foodChecks(),
      expenseCompass: this.expenseCompass(),
      storeExpenses: this.storeExpenses(),
      onlineSales: this.onlineSales(),
      banknoteTotal: this.banknoteTotal(),
      banknoteQuantity: this.banknoteQuantity(),
      giftCheckTotal: this.giftCheckTotal(),
      giftCheckQuantity: this.giftCheckQuantity(),
      creditCardsTotal: this.creditCardsTotal(),
      creditCardsQuantity: this.creditCardsQuantity(),
      foodChecksTotal: this.foodChecksTotal(),
      foodChecksQuantity: this.foodChecksQuantity(),
      onlineSalesTotal: this.onlineSalesTotal(),
      onlineSalesQuantity: this.onlineSalesQuantity(),
      expenseCompassTotal: this.expenseCompassTotal(),
      expenseCompassQuantity: this.expenseCompassQuantity(),
      storeExpensesTotal: this.storeExpensesTotal(),
      generalTotal: this.generalTotal(),
      differenceTotal: this.differenceTotal(),
      cashierName: this.cashierName(),
      managerName: this.managerName(),
      zTotalValue: this.zTotalValue(),
      warehouseNo: this.warehouseNo(),
      warehouseName: this.warehouseName(),
      cashRegisterDetail: this.cashRegisterDetail()
    };
  });

  ngOnInit(): void {
    if (!this.summary) {
      this.feedback.set({
        tone: 'error',
        title: 'Icmal verisi bulunamadi',
        message: 'Detay ekrani acilirken gerekli kayit bilgisi tasinamadi.'
      });
      return;
    }

    this.loadDetailData();
  }

  protected printSummary(): void {
    if (!this.printModel()) {
      return;
    }

    this.printWithStylesheet('/assets/summaryPrint.css');
  }

  protected startEdit(): void {
    if (!this.canUpdate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki yok',
        message: 'Bu icmal kaydini guncellemek icin gerekli yetkin yok.'
      });
      return;
    }

    this.feedback.set(null);
    this.loadEditLookups();
    this.editableDetails.set(this.summariesDetails().map((item) => ({ ...item })));
    this.editableBanknoteMovements.set(this.banknoteMovements().map((item) => ({ ...item })));
    this.editableGiftCheckMovements.set(this.giftCheckMovements().map((item) => ({ ...item })));
    this.isEditing.set(true);
  }

  protected cancelEdit(): void {
    if (this.isSaving()) {
      return;
    }

    this.isEditing.set(false);
    this.editableDetails.set([]);
    this.editableBanknoteMovements.set([]);
    this.editableGiftCheckMovements.set([]);
  }

  protected canAddEditableDetail(category: EditablePaymentCategory): boolean {
    return this.getDetailTypeTemplates(category).length > 0;
  }

  protected getEditableDetailCategory(item: ISummariesDetailsCT): EditableDetailCategory {
    const sourceCategory = this.getEditableDetailCategoryFromSource(item.source);

    if (sourceCategory) {
      return sourceCategory;
    }

    const paymentTypeId = this.toSafeNumber(item.paymentTypeID);

    if (paymentTypeId >= 0 && paymentTypeId < 50) {
      return 'card';
    }

    if (paymentTypeId >= 50 && paymentTypeId < 100) {
      return 'foodCheck';
    }

    if (paymentTypeId === 100) {
      return 'expenseVoucher';
    }

    if (paymentTypeId >= 110 && paymentTypeId < 500) {
      return 'storeExpense';
    }

    if (paymentTypeId >= 600) {
      return 'onlineSale';
    }

    return 'unknown';
  }

  protected getEditableDetailCategoryLabel(item: ISummariesDetailsCT): string {
    const category = this.toSafeString(item.category).trim();

    if (category) {
      return category;
    }

    switch (this.getEditableDetailCategory(item)) {
      case 'card':
        return 'Kredi Karti';
      case 'foodCheck':
        return 'Yemek Ceki/Karti';
      case 'expenseVoucher':
        return 'Gider Pusulasi';
      case 'storeExpense':
        return 'Magaza Gideri';
      case 'onlineSale':
        return 'Online/Vadeli';
      case 'unknown':
        return 'Diger';
    }
  }

  protected getEditableDetailCategoryClass(item: ISummariesDetailsCT): string {
    return `category-${this.getEditableDetailCategory(item)}`;
  }

  protected getPaymentDisplayName(item: ISummariesDetailsCT): string {
    return (
      this.toSafeString(item.typeName).trim() ||
      this.toSafeString(item.paymentName).trim() ||
      'Tip bulunamadi'
    );
  }

  protected getEditableDetailTypeOptions(item: ISummariesDetailsCT): IFurpaPaymentTypeLookupItemApiDto[] {
    const category = this.getEditableDetailCategory(item);
    const options = category === 'unknown' ? [] : this.getDetailTypeTemplates(category);
    const currentTemplate = this.buildPaymentTemplateFromDetail(item);
    const currentKey = this.getPaymentTypeTemplateKey(currentTemplate);
    const currentExists = options.some((option) => this.getPaymentTypeTemplateKey(option) === currentKey);
    const lookupMatch = this.findPaymentTemplateMatch(item, options);

    if (lookupMatch || currentExists || !this.hasDetailPaymentIdentity(item)) {
      return options;
    }

    return [currentTemplate, ...options];
  }

  protected getEditableDetailTypeSelection(item: ISummariesDetailsCT): string {
    const template = this.resolveEditableDetailTypeTemplate(item);
    return template ? this.getPaymentTypeTemplateKey(template) : '';
  }

  protected getPaymentTypeTemplateLabel(template: IFurpaPaymentTypeLookupItemApiDto): string {
    const name = this.toSafeString(template.paymentName).trim();

    if (name) {
      return name;
    }

    return this.getPaymentTemplateFallbackName(template);
  }

  protected getPaymentTypeTemplateKey(template: IFurpaPaymentTypeLookupItemApiDto): string {
    return [
      this.normalizePaymentTemplateText(template.paymentName),
      this.toSafeNumber(template.paymentTypeNo),
      this.normalizePaymentTemplateText(template.terminalId),
      this.normalizePaymentTemplateText(template.accountCode)
    ].join('|');
  }

  protected applyEditableDetailTypeSelection(index: number, templateKey: string): void {
    const currentItem = this.editableDetails()[index];

    if (!currentItem) {
      return;
    }

    const template = this.getEditableDetailTypeOptions(currentItem).find(
      (item) => this.getPaymentTypeTemplateKey(item) === templateKey
    );

    if (!template) {
      return;
    }

    this.editableDetails.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? this.createDetailFromTemplate(template, item) : item
      )
    );
  }

  protected updateEditableDetail(
    index: number,
    field: EditableDetailField,
    value: string
  ): void {
    this.editableDetails.update((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === 'paymentTypeID' || field === 'slipNumber' || field === 'amount') {
          return { ...item, [field]: this.toSafeNumber(value) };
        }

        return { ...item, [field]: value };
      })
    );
  }

  protected addEditableDetail(category: EditablePaymentCategory): void {
    const template = this.getDetailTypeTemplates(category)[0];

    if (!template) {
      this.feedback.set({
        tone: 'error',
        title: 'Tip listesi yok',
        message: `${this.getEditablePaymentCategoryLabel(category)} icin secilebilir tip bulunamadi.`
      });
      return;
    }

    this.feedback.set(null);
    this.editableDetails.update((items) => [
      ...items,
      this.createDetailFromTemplate(template, this.createEmptyDetail())
    ]);
  }

  protected removeEditableDetail(index: number): void {
    this.editableDetails.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  protected canAddEditableBanknote(): boolean {
    return this.getBanknoteTypeOptions().length > 0;
  }

  protected getBanknoteTypeOptions(): IFurpaBanknoteTypeItemApiDto[] {
    return [...this.banknoteTypes()].sort((left, right) => right.value - left.value);
  }

  protected getEditableBanknoteTypeOptions(item: IBanknoteMovementsCT): IFurpaBanknoteTypeItemApiDto[] {
    const options = this.getBanknoteTypeOptions();
    const banknoteType = this.toSafeNumber(item.banknoteTypeID);
    const currentExists = options.some(
      (option) => this.toSafeNumber(option.banknoteType) === banknoteType
    );

    if (currentExists || banknoteType <= 0) {
      return options;
    }

    return [
      {
        value: this.toSafeNumber(item.value),
        banknoteType,
        quantity: 0,
        total: 0
      },
      ...options
    ];
  }

  protected getBanknoteTypeLabel(item: IFurpaBanknoteTypeItemApiDto): string {
    return `${this.toSafeNumber(item.value).toLocaleString('tr-TR')} TL - Tip ${this.toSafeNumber(item.banknoteType)}`;
  }

  protected getEditableBanknoteTypeSelection(item: IBanknoteMovementsCT): string {
    const banknoteType = this.toSafeNumber(item.banknoteTypeID);
    return banknoteType > 0 ? `${banknoteType}` : '';
  }

  protected applyEditableBanknoteTypeSelection(index: number, rawBanknoteType: string): void {
    const currentItem = this.editableBanknoteMovements()[index];

    if (!currentItem) {
      return;
    }

    const banknoteType = this.toSafeNumber(rawBanknoteType);
    const template = this.getEditableBanknoteTypeOptions(currentItem).find(
      (item) => this.toSafeNumber(item.banknoteType) === banknoteType
    );

    if (!template) {
      return;
    }

    this.editableBanknoteMovements.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              value: this.toSafeNumber(template.value),
              banknoteTypeID: this.toSafeNumber(template.banknoteType),
              total: this.toSafeNumber(template.value) * this.toSafeNumber(item.quantity)
            }
          : item
      )
    );
  }

  protected updateEditableBanknote(
    index: number,
    field: EditableBanknoteField,
    value: string
  ): void {
    this.editableBanknoteMovements.update((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = { ...item, [field]: this.toSafeNumber(value) };

        if (field === 'value' || field === 'quantity') {
          nextItem.total = this.toSafeNumber(nextItem.value) * this.toSafeNumber(nextItem.quantity);
        }

        return nextItem;
      })
    );
  }

  protected addEditableBanknote(): void {
    const template = this.getBanknoteTypeOptions()[0];

    if (!template) {
      this.feedback.set({
        tone: 'error',
        title: 'Banknot tipi yok',
        message: 'Yeni banknot satiri eklemek icin banknot tipleri yuklenmelidir.'
      });
      return;
    }

    this.feedback.set(null);
    this.editableBanknoteMovements.update((items) => [
      ...items,
      {
        value: this.toSafeNumber(template.value),
        banknoteTypeID: this.toSafeNumber(template.banknoteType),
        quantity: 0,
        total: 0
      }
    ]);
  }

  protected removeEditableBanknote(index: number): void {
    this.editableBanknoteMovements.update((items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  protected canAddEditableGiftCheck(): boolean {
    return this.giftCheckTypes().length > 0;
  }

  protected getEditableGiftCheckTypeOptions(item: IGiftCheckMovementsCT): IFurpaGiftCheckTypeItemApiDto[] {
    const options = this.giftCheckTypes();
    const giftCheckType = this.toSafeNumber(item.giftCheckTypeID);
    const currentExists = options.some(
      (option) => this.toSafeNumber(option.giftCheckType) === giftCheckType
    );

    if (currentExists || giftCheckType <= 0) {
      return options;
    }

    return [
      {
        value: this.toSafeNumber(item.value),
        giftCheckType,
        quantity: 0,
        total: 0
      },
      ...options
    ];
  }

  protected getGiftCheckTypeLabel(item: IFurpaGiftCheckTypeItemApiDto): string {
    return `${this.toSafeNumber(item.value).toLocaleString('tr-TR')} TL - Tip ${this.toSafeNumber(item.giftCheckType)}`;
  }

  protected getEditableGiftCheckTypeSelection(item: IGiftCheckMovementsCT): string {
    const giftCheckType = this.toSafeNumber(item.giftCheckTypeID);
    return giftCheckType > 0 ? `${giftCheckType}` : '';
  }

  protected applyEditableGiftCheckTypeSelection(index: number, rawGiftCheckType: string): void {
    const currentItem = this.editableGiftCheckMovements()[index];

    if (!currentItem) {
      return;
    }

    const giftCheckType = this.toSafeNumber(rawGiftCheckType);
    const template = this.getEditableGiftCheckTypeOptions(currentItem).find(
      (item) => this.toSafeNumber(item.giftCheckType) === giftCheckType
    );

    if (!template) {
      return;
    }

    this.editableGiftCheckMovements.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              value: this.toSafeNumber(template.value),
              giftCheckTypeID: this.toSafeNumber(template.giftCheckType),
              total: this.toSafeNumber(template.value) * this.toSafeNumber(item.quantity)
            }
          : item
      )
    );
  }

  protected updateEditableGiftCheck(
    index: number,
    field: EditableGiftCheckField,
    value: string
  ): void {
    this.editableGiftCheckMovements.update((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = { ...item, [field]: this.toSafeNumber(value) };

        if (field === 'value' || field === 'quantity') {
          nextItem.total = this.toSafeNumber(nextItem.value) * this.toSafeNumber(nextItem.quantity);
        }

        return nextItem;
      })
    );
  }

  protected addEditableGiftCheck(): void {
    const template = this.giftCheckTypes()[0];

    if (!template) {
      this.feedback.set({
        tone: 'error',
        title: 'Hediye ceki tipi yok',
        message: 'Yeni hediye ceki satiri eklemek icin hediye ceki tipleri yuklenmelidir.'
      });
      return;
    }

    this.feedback.set(null);
    this.editableGiftCheckMovements.update((items) => [
      ...items,
      {
        value: this.toSafeNumber(template.value),
        giftCheckTypeID: this.toSafeNumber(template.giftCheckType),
        quantity: 0,
        total: 0
      }
    ]);
  }

  protected removeEditableGiftCheck(index: number): void {
    this.editableGiftCheckMovements.update((items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  protected saveEdit(): void {
    const summary = this.summary;

    if (!summary || this.isSaving()) {
      return;
    }

    if (!this.canUpdate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki yok',
        message: 'Bu icmal kaydini guncellemek icin gerekli yetkin yok.'
      });
      return;
    }

    const warehouseNo = this.resolveRequestWarehouseNo();
    const validationMessage = this.validateEditableRows();

    if (validationMessage) {
      this.feedback.set({
        tone: 'error',
        title: 'Eksik satir var',
        message: validationMessage
      });
      return;
    }

    this.feedback.set(null);
    this.isSaving.set(true);

    this.kasaIslemleriService
      .updateCashSummaryDetails(
        summary.documentSerie,
        summary.documentOrderNo,
        {
          warehouseNo,
          details: this.buildEditableDetailsRequest()
        }
      )
      .pipe(
        switchMap(() =>
          this.kasaIslemleriService.updateCashSummaryBanknotes(
            summary.documentSerie,
            summary.documentOrderNo,
            {
              warehouseNo,
              banknoteMovements: this.buildEditableBanknotesRequest()
            }
          )
        ),
        switchMap(() =>
          this.kasaIslemleriService.updateCashSummaryGiftChecks(
            summary.documentSerie,
            summary.documentOrderNo,
            {
              warehouseNo,
              giftCheckMovements: this.buildEditableGiftChecksRequest()
            }
          )
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.isEditing.set(false);
          this.feedback.set({
            tone: 'info',
            title: 'Icmal guncellendi',
            message: 'Odeme, banknot ve hediye ceki satirlari yeni degerlerle kaydedildi.'
          });
          this.loadDetailData();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Guncelleme tamamlanamadi',
            message: 'Icmal satirlari kaydedilirken bir hata olustu.'
          });
        }
      });
  }

  protected async deleteSummary(): Promise<void> {
    const summary = this.summary;

    if (!summary || this.isDeleting()) {
      return;
    }

    if (!this.canDelete()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki yok',
        message: 'Bu icmal kaydini silmek icin gerekli yetkin yok.'
      });
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Icmal kaydi silinsin mi?',
      message: `${summary.documentSerie}/${summary.documentOrderNo} icmal kaydi silinecek.`,
      confirmText: 'Sil',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.feedback.set(null);
    this.isDeleting.set(true);

    this.kasaIslemleriService
      .deleteCashSummary(
        summary.documentSerie,
        summary.documentOrderNo,
        this.resolveRequestWarehouseNo()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDeleting.set(false))
      )
      .subscribe({
        next: () => this.close({ deleted: true }),
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Silme tamamlanamadi',
            message: 'Icmal kaydi silinirken bir hata olustu.'
          });
        }
      });
  }

  protected formatSummaryDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return typeof value === 'string' ? value : '-';
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedDate);
  }

  private loadDetailData(): void {
    const summary = this.summary;

    if (!summary) {
      return;
    }

    const warehouseNo = this.warehouseNo();
    const canRequestZTotal = warehouseNo > 0;

    this.feedback.set(null);
    this.loadIssues.set([]);
    this.isLoading.set(true);
    const issues: string[] = [];
    let pendingRequests = canRequestZTotal ? 6 : 5;

    const finalizeRequest = () => {
      pendingRequests -= 1;

      if (pendingRequests > 0) {
        return;
      }

      this.isLoading.set(false);
      this.loadIssues.set(issues);

      if (issues.length) {
        this.feedback.set({
          tone: 'info',
          title: 'Bazi alanlar eksik geldi',
          message: issues.join(' ')
        });
      }
    };

    this.kasaIslemleriService
      .getIcmalDetaylari(summary.documentSerie, summary.documentOrderNo, this.resolveRequestWarehouseNo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: ISummariesDetailsCT[]) => {
          this.summariesDetails.set(items);
          finalizeRequest();
        },
        error: () => {
          this.summariesDetails.set([]);
          issues.push('Odeme detaylari getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getNakitHareketDetayi(summary.documentSerie, summary.documentOrderNo, this.resolveRequestWarehouseNo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IBanknoteMovementsCT[]) => {
          this.banknoteMovements.set(
            items.filter((item) => this.toSafeNumber(item.quantity) !== 0)
          );
          finalizeRequest();
        },
        error: () => {
          this.banknoteMovements.set([]);
          issues.push('Nakit hareket detayi getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getHediyeCekiHareketDetaylari(summary.documentSerie, summary.documentOrderNo, this.resolveRequestWarehouseNo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IGiftCheckMovementsCT[]) => {
          this.giftCheckMovements.set(
            items.filter((item) => this.toSafeNumber(item.quantity) !== 0)
          );
          finalizeRequest();
        },
        error: () => {
          this.giftCheckMovements.set([]);
          issues.push('Hediye ceki hareketleri getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getKasiyerVeMudur(String(summary.cashierNo), String(summary.managerNo))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: ICashier[]) => {
          this.cashierAndManagerList.set(items);
          finalizeRequest();
        },
        error: () => {
          this.cashierAndManagerList.set([]);
          issues.push('Kasiyer ve duzenleyen bilgileri getirilemedi.');
          finalizeRequest();
        }
      });

    this.kasaIslemleriService
      .getKasaKayitDetayi(summary.cashNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail: ICashRegisterDetails | null) => {
          this.cashRegisterDetail.set(detail);

          if (this.isEditing()) {
            this.loadEditLookups();
          }

          if (!detail) {
            issues.push('Kasa kayit detayi getirilemedi.');
          }

          finalizeRequest();
        },
        error: () => {
          this.cashRegisterDetail.set(null);
          issues.push('Kasa kayit detayi getirilemedi.');
          finalizeRequest();
        }
      });

    if (!canRequestZTotal) {
      this.zTotalValue.set(null);
      issues.push('Depo numarasi bulunamadigi icin Z raporu tutari alinmadi.');
      finalizeRequest();
      return;
    }

    this.kasaIslemleriService
      .getZRaporuToplamDeger(summary.documentSerie, warehouseNo, summary.zReportNo, summary.cashNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value: number | null) => {
          this.zTotalValue.set(value);

          if (value === null) {
            issues.push('Z raporu toplami getirilemedi.');
          }

          finalizeRequest();
        },
        error: () => {
          this.zTotalValue.set(null);
          issues.push('Z raporu toplami getirilemedi.');
          finalizeRequest();
        }
      });
  }

  private resolveCashierName(code: number): string {
    if (!code) {
      return '-';
    }

    const cashier = this.cashierAndManagerList().find(
      (item) => this.toSafeNumber(item.kasiyerKodu) === code
    );

    if (!cashier) {
      return `${code} - Bulunamadi`;
    }

    return [code, cashier.kasiyerAdi, cashier.kasiyerSoyadi]
      .map((value) => this.toSafeString(value))
      .filter((value) => !!value.trim())
      .join(' ')
      .trim();
  }

  private extractFirstNumber(value: string | null | undefined): number | null {
    if (!value?.trim()) {
      return null;
    }

    const match = value.match(/\d+/);

    if (!match) {
      return null;
    }

    const parsedValue = Number(match[0]);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private sumBy<T>(
    items: readonly T[],
    selector: (item: T) => unknown
  ): number {
    return items.reduce((total, item) => total + this.toSafeNumber(selector(item)), 0);
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

  private toSafeString(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private loadEditLookups(): void {
    const cashRegisterNo = this.cashRegisterDetail()?.cashRegisterNo?.trim() ?? '';

    if (this.editLookupLoading() || this.editLookupCashRegisterNo === cashRegisterNo) {
      return;
    }

    this.editLookupLoading.set(true);
    const totalRequests = cashRegisterNo ? 7 : 6;
    let completedRequests = 0;
    const finalizeRequest = () => {
      completedRequests += 1;

      if (completedRequests < totalRequests) {
        return;
      }

      const latestCashRegisterNo = this.cashRegisterDetail()?.cashRegisterNo?.trim() ?? '';
      this.editLookupCashRegisterNo = cashRegisterNo;
      this.editLookupLoading.set(false);

      if (this.isEditing() && latestCashRegisterNo && latestCashRegisterNo !== cashRegisterNo) {
        this.loadEditLookups();
      }
    };

    this.kasaIslemleriService
      .getBanknotTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaBanknoteTypeItemApiDto[]) => this.banknoteTypes.set(items ?? []),
        error: () => {
          this.banknoteTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });

    this.kasaIslemleriService
      .getHediyeCekiTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaGiftCheckTypeItemApiDto[]) => this.giftCheckTypes.set(items ?? []),
        error: () => {
          this.giftCheckTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });

    if (cashRegisterNo) {
      this.kasaIslemleriService
        .getBankaOdemeTipleri(cashRegisterNo)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => this.bankPaymentTypes.set(items ?? []),
          error: () => {
            this.bankPaymentTypes.set([]);
            finalizeRequest();
          },
          complete: finalizeRequest
        });
    } else {
      this.bankPaymentTypes.set([]);
    }

    this.kasaIslemleriService
      .getYemekCekiOdemeTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => this.foodCheckPaymentTypes.set(items ?? []),
        error: () => {
          this.foodCheckPaymentTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });

    this.kasaIslemleriService
      .getOnlineOdemeTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => this.onlinePaymentTypes.set(items ?? []),
        error: () => {
          this.onlinePaymentTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });

    this.kasaIslemleriService
      .getMasrafPusulasiOdemeTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => this.expenseVoucherPaymentTypes.set(items ?? []),
        error: () => {
          this.expenseVoucherPaymentTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });

    this.kasaIslemleriService
      .getMagazaMasrafiOdemeTipleri()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IFurpaPaymentTypeLookupItemApiDto[]) => this.storeExpensePaymentTypes.set(items ?? []),
        error: () => {
          this.storeExpensePaymentTypes.set([]);
          finalizeRequest();
        },
        complete: finalizeRequest
      });
  }

  private getEditablePaymentCategoryLabel(category: EditablePaymentCategory): string {
    switch (category) {
      case 'card':
        return 'Kredi Karti';
      case 'foodCheck':
        return 'Yemek Ceki/Karti';
      case 'expenseVoucher':
        return 'Gider Pusulasi';
      case 'storeExpense':
        return 'Magaza Gideri';
      case 'onlineSale':
        return 'Online/Vadeli';
    }
  }

  private getDetailTypeTemplates(category: EditablePaymentCategory): IFurpaPaymentTypeLookupItemApiDto[] {
    switch (category) {
      case 'card':
        return this.bankPaymentTypes();
      case 'foodCheck':
        return this.foodCheckPaymentTypes();
      case 'expenseVoucher':
        return this.expenseVoucherPaymentTypes();
      case 'storeExpense':
        return this.storeExpensePaymentTypes();
      case 'onlineSale':
        return this.onlinePaymentTypes();
    }
  }

  private createDetailFromTemplate(
    template: IFurpaPaymentTypeLookupItemApiDto,
    base: ISummariesDetailsCT
  ): ISummariesDetailsCT {
    return {
      ...base,
      typeName: this.toSafeString(template.paymentName).trim(),
      paymentTypeID: this.toSafeNumber(template.paymentTypeNo),
      accountCode: this.toSafeString(template.accountCode).trim(),
      terminalId: this.toSafeString(template.terminalId).trim()
    };
  }

  private buildPaymentTemplateFromDetail(item: ISummariesDetailsCT): IFurpaPaymentTypeLookupItemApiDto {
    return {
      paymentName: this.getPaymentDisplayName(item) || this.getEditableDetailCategoryLabel(item),
      paymentTypeNo: this.toSafeNumber(item.paymentTypeNo) || this.toSafeNumber(item.paymentTypeID),
      terminalId: this.toSafeString(item.terminalId).trim(),
      accountCode: this.toSafeString(item.accountCode).trim(),
      slipNumber: this.toSafeNumber(item.slipNumber),
      amountValue: this.toSafeNumber(item.amount)
    };
  }

  private resolveEditableDetailTypeTemplate(item: ISummariesDetailsCT): IFurpaPaymentTypeLookupItemApiDto | null {
    const options = this.getEditableDetailTypeOptions(item);

    if (options.length === 0) {
      return null;
    }

    const lookupMatch = this.findPaymentTemplateMatch(item, options);

    if (lookupMatch) {
      return lookupMatch;
    }

    const currentTemplate = this.buildPaymentTemplateFromDetail(item);
    const currentKey = this.getPaymentTypeTemplateKey(currentTemplate);
    const exactMatch = options.find((option) => this.getPaymentTypeTemplateKey(option) === currentKey);

    if (exactMatch) {
      return exactMatch;
    }

    return currentTemplate;
  }

  private findPaymentTemplateMatch(
    item: ISummariesDetailsCT,
    options: IFurpaPaymentTypeLookupItemApiDto[]
  ): IFurpaPaymentTypeLookupItemApiDto | null {
    const paymentTypeNo = this.toSafeNumber(item.paymentTypeNo) || this.toSafeNumber(item.paymentTypeID);

    if (paymentTypeNo <= 0) {
      return null;
    }

    const terminalId = this.normalizePaymentTemplateText(item.terminalId);
    const accountCode = this.normalizePaymentTemplateText(item.accountCode);
    const typeName = this.normalizePaymentTemplateText(this.getPaymentDisplayName(item));
    const samePaymentTypeOptions = options.filter(
      (option) => this.toSafeNumber(option.paymentTypeNo) === paymentTypeNo
    );

    if (samePaymentTypeOptions.length === 0) {
      return null;
    }

    const exactContextMatch = samePaymentTypeOptions.find((option) =>
      (!typeName || this.normalizePaymentTemplateText(option.paymentName) === typeName) &&
      (!terminalId || this.normalizePaymentTemplateText(option.terminalId) === terminalId) &&
      (!accountCode || this.normalizePaymentTemplateText(option.accountCode) === accountCode)
    );

    if (exactContextMatch) {
      return exactContextMatch;
    }

    const accountOrTerminalMatch = samePaymentTypeOptions.find((option) =>
      (!terminalId || this.normalizePaymentTemplateText(option.terminalId) === terminalId) &&
      (!accountCode || this.normalizePaymentTemplateText(option.accountCode) === accountCode)
    );

    if (accountOrTerminalMatch) {
      return accountOrTerminalMatch;
    }

    if (!terminalId && !accountCode && samePaymentTypeOptions.length === 1) {
      return samePaymentTypeOptions[0];
    }

    return null;
  }

  private hasDetailPaymentIdentity(item: ISummariesDetailsCT): boolean {
    return (
      this.toSafeNumber(item.paymentTypeID) > 0 ||
      this.toSafeNumber(item.paymentTypeNo) > 0 ||
      !!this.normalizePaymentTemplateText(item.typeName) ||
      !!this.normalizePaymentTemplateText(item.paymentName) ||
      !!this.normalizePaymentTemplateText(item.terminalId) ||
      !!this.normalizePaymentTemplateText(item.accountCode)
    );
  }

  private getEditableDetailCategoryFromSource(
    source: string | null | undefined
  ): EditableDetailCategory | null {
    const normalizedSource = this.toSafeString(source)
      .trim()
      .replace(/[-_\s]+/g, '')
      .toLocaleLowerCase('tr-TR');

    switch (normalizedSource) {
      case 'card':
      case 'creditcard':
      case 'creditcards':
        return 'card';
      case 'foodcheck':
      case 'mealcard':
      case 'giftcard':
        return 'foodCheck';
      case 'expensevoucher':
      case 'expensecompass':
        return 'expenseVoucher';
      case 'storeexpense':
        return 'storeExpense';
      case 'onlinesale':
      case 'deferredsale':
        return 'onlineSale';
      case 'cash':
      case 'other':
      case '':
        return null;
      default:
        return null;
    }
  }

  private normalizePaymentTemplateText(value: unknown): string {
    return this.toSafeString(value).trim().toLocaleLowerCase('tr-TR');
  }

  private getPaymentTemplateFallbackName(template: IFurpaPaymentTypeLookupItemApiDto): string {
    const paymentTypeNo = this.toSafeNumber(template.paymentTypeNo);

    if (paymentTypeNo >= 0 && paymentTypeNo < 50) {
      return 'Kredi Karti';
    }

    if (paymentTypeNo >= 50 && paymentTypeNo < 100) {
      return 'Yemek Ceki/Karti';
    }

    if (paymentTypeNo === 100) {
      return 'Gider Pusulasi';
    }

    if (paymentTypeNo >= 110 && paymentTypeNo < 500) {
      return 'Magaza Gideri';
    }

    if (paymentTypeNo >= 600) {
      return 'Online/Vadeli';
    }

    return 'Odeme tipi';
  }

  private createEmptyDetail(): ISummariesDetailsCT {
    return {
      typeName: '',
      paymentName: '',
      paymentTypeID: 0,
      paymentTypeNo: null,
      accountCode: '',
      slipNumber: 0,
      amount: 0,
      terminalId: '',
      source: '',
      category: '',
      description: ''
    };
  }

  private createEmptyBanknote(): IBanknoteMovementsCT {
    return {
      value: 0,
      banknoteTypeID: 0,
      quantity: 0,
      total: 0
    };
  }

  private createEmptyGiftCheck(): IGiftCheckMovementsCT {
    return {
      value: 0,
      giftCheckTypeID: 0,
      quantity: 0,
      total: 0
    };
  }

  private isEmptyDetailRow(item: ISummariesDetailsCT): boolean {
    return (
      !this.toSafeString(item.typeName).trim() &&
      !this.toSafeString(item.paymentName).trim() &&
      this.toSafeNumber(item.paymentTypeID) === 0 &&
      this.toSafeNumber(item.paymentTypeNo) === 0 &&
      !this.toSafeString(item.accountCode).trim() &&
      this.toSafeNumber(item.slipNumber) === 0 &&
      this.toSafeNumber(item.amount) === 0 &&
      !this.toSafeString(item.terminalId).trim() &&
      !this.toSafeString(item.source).trim() &&
      !this.toSafeString(item.category).trim() &&
      !this.toSafeString(item.description).trim()
    );
  }

  private isEmptyBanknoteRow(item: IBanknoteMovementsCT): boolean {
    return (
      this.toSafeNumber(item.value) === 0 &&
      this.toSafeNumber(item.banknoteTypeID) === 0 &&
      this.toSafeNumber(item.quantity) === 0 &&
      this.toSafeNumber(item.total) === 0
    );
  }

  private isEmptyGiftCheckRow(item: IGiftCheckMovementsCT): boolean {
    return (
      this.toSafeNumber(item.value) === 0 &&
      this.toSafeNumber(item.giftCheckTypeID) === 0 &&
      this.toSafeNumber(item.quantity) === 0 &&
      this.toSafeNumber(item.total) === 0
    );
  }

  private validateEditableRows(): string | null {
    const invalidDetail = this.editableDetails().find((item) => {
      if (this.isEmptyDetailRow(item)) {
        return false;
      }

      return this.toSafeNumber(item.paymentTypeID) < 0 ||
        this.toSafeNumber(item.slipNumber) < 0 ||
        this.toSafeNumber(item.amount) < 0;
    });

    if (invalidDetail) {
      return 'Odeme satirlarinda tip no, slip ve tutar eksi olamaz.';
    }

    const invalidBanknote = this.editableBanknoteMovements().find((item) => {
      if (this.isEmptyBanknoteRow(item)) {
        return false;
      }

      return this.toSafeNumber(item.value) <= 0 ||
        this.toSafeNumber(item.banknoteTypeID) <= 0 ||
        this.toSafeNumber(item.quantity) <= 0 ||
        this.toSafeNumber(item.total) < 0;
    });

    if (invalidBanknote) {
      return 'Banknot satiri icin deger, tip no ve adet dolu olmalidir. Satiri kullanmayacaksan kaldir.';
    }

    const invalidGiftCheck = this.editableGiftCheckMovements().find((item) => {
      if (this.isEmptyGiftCheckRow(item)) {
        return false;
      }

      return this.toSafeNumber(item.value) <= 0 ||
        this.toSafeNumber(item.giftCheckTypeID) <= 0 ||
        this.toSafeNumber(item.quantity) <= 0 ||
        this.toSafeNumber(item.total) < 0;
    });

    if (invalidGiftCheck) {
      return 'Hediye ceki satiri icin deger, tip no ve adet dolu olmalidir. Satiri kullanmayacaksan kaldir.';
    }

    return null;
  }

  private buildEditableDetailsRequest(): UpdateCashSummaryDetailLineHttpRequest[] {
    return this.editableDetails()
      .filter((item) => !this.isEmptyDetailRow(item))
      .filter((item) => this.toSafeNumber(item.paymentTypeID) !== 500)
      .map((item) => ({
        typeName: this.getPaymentDisplayName(item),
        paymentTypeId: this.toSafeNumber(item.paymentTypeID),
        accountCode: this.toSafeString(item.accountCode),
        slipNumber: this.toSafeNumber(item.slipNumber),
        amount: this.toSafeNumber(item.amount),
        terminalId: this.toSafeString(item.terminalId),
        description: this.toSafeString(item.description)
      }));
  }

  private buildEditableBanknotesRequest(): UpdateCashSummaryBanknoteLineHttpRequest[] {
    return this.editableBanknoteMovements()
      .filter((item) => !this.isEmptyBanknoteRow(item))
      .map((item) => ({
        value: this.toSafeNumber(item.value),
        banknoteType: this.toSafeNumber(item.banknoteTypeID),
        quantity: this.toSafeNumber(item.quantity),
        total: this.toSafeNumber(item.total)
      }));
  }

  private buildEditableGiftChecksRequest(): UpdateCashSummaryGiftCheckLineHttpRequest[] {
    return this.editableGiftCheckMovements()
      .filter((item) => !this.isEmptyGiftCheckRow(item))
      .map((item) => ({
        value: this.toSafeNumber(item.value),
        giftCheckType: this.toSafeNumber(item.giftCheckTypeID),
        quantity: this.toSafeNumber(item.quantity),
        total: this.toSafeNumber(item.total)
      }));
  }

  private resolveRequestWarehouseNo(): number | undefined {
    const warehouseNo = this.warehouseNo();

    return warehouseNo > 0 ? warehouseNo : undefined;
  }

  private hasPermission(action: IcmalActionPermission): boolean {
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

  private printWithStylesheet(stylesheetHref: string): void {
    const existingLink = document.getElementById('icmal-dokumu-print-style');
    const existingStyle = document.getElementById('icmal-dokumu-print-shell');

    existingLink?.remove();
    existingStyle?.remove();

    const link = document.createElement('link');
    link.id = 'icmal-dokumu-print-style';
    link.rel = 'stylesheet';
    link.href = stylesheetHref;

    const shellStyle = document.createElement('style');
    shellStyle.id = 'icmal-dokumu-print-shell';
    shellStyle.textContent = `
      @media print {
        body * {
          visibility: hidden !important;
        }

        .cdk-overlay-container,
        .cdk-overlay-container * {
          visibility: visible !important;
        }

        .cdk-overlay-backdrop,
        .icmal-print-hidden {
          display: none !important;
        }

        .docs-task-dialog-panel,
        .cdk-dialog-container,
        .dialog-page,
        .dialog-body {
          width: 100% !important;
          max-width: none !important;
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .icmal-print-root,
        .icmal-print-root * {
          visibility: visible !important;
        }

        .icmal-print-root {
          display: block !important;
        }
      }
    `;

    const cleanup = () => {
      link.remove();
      shellStyle.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(link);
    document.head.appendChild(shellStyle);
    window.addEventListener('afterprint', cleanup);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }
}

