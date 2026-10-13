import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import type {
  IFurpaBanknoteTypeItemApiDto,
  IFurpaCashierSearchItemApiDto,
  IFurpaGiftCheckTypeItemApiDto,
  IFurpaPaymentTypeLookupItemApiDto
} from '@interfaces';

export type CashDrawerPaymentSource =
  | 'card'
  | 'foodCheck'
  | 'expenseVoucher'
  | 'deferredSale'
  | 'other';

export type BanknoteLineFormGroup = FormGroup<{
  banknoteType: FormControl<number | null>;
  quantity: FormControl<number | null>;
  total: FormControl<number | null>;
  value: FormControl<number | null>;
}>;

export type GiftCheckLineFormGroup = FormGroup<{
  giftCheckTypeName: FormControl<string>;
  value: FormControl<number | null>;
  giftCheckType: FormControl<number | null>;
  quantity: FormControl<number | null>;
  total: FormControl<number | null>;
}>;

export type PaymentTypeLineFormGroup = FormGroup<{
  source: FormControl<CashDrawerPaymentSource>;
  paymentName: FormControl<string>;
  paymentTypeNo: FormControl<number | null>;
  accountCode: FormControl<string>;
  terminalId: FormControl<string>;
  slipNumber: FormControl<number | null>;
  amountValue: FormControl<number | null>;
}>;

export type StoreExpenseLineFormGroup = FormGroup<{
  storeExpensesType: FormControl<number | null>;
  description: FormControl<string>;
  amountValue: FormControl<number | null>;
}>;

export interface IcmalCreateControls {
  cashNo: FormControl<number | null>;
  cashRegisterFiscalNo: FormControl<string>;
  zReportNo: FormControl<number | null>;
  cashierNo: FormControl<number | null>;
  managerNo: FormControl<number | null>;
  zTotalValue: FormControl<number | null>;
  total: FormControl<number | null>;
  summaryDate: FormControl<string>;
  warehouseNo: FormControl<number | null>;
  giftCheckMovements: FormArray<GiftCheckLineFormGroup>;
  banknoteMovements: FormArray<BanknoteLineFormGroup>;
  paymentTypes: FormArray<PaymentTypeLineFormGroup>;
  storeExpenses: FormArray<StoreExpenseLineFormGroup>;
}

type IcmalCreateForm = FormGroup<IcmalCreateControls>;
type IcmalCreateFormValue = ReturnType<IcmalCreateForm['getRawValue']>;

interface IcmalDraftPerson {
  cashierCode: number;
  cashierName: string;
}

export interface IcmalCreateDraftPayload {
  form: IcmalCreateFormValue;
  cashier: IcmalDraftPerson | null;
  manager: IcmalDraftPerson | null;
}

export interface RestoredIcmalDraftPeople {
  cashier: IFurpaCashierSearchItemApiDto | null;
  manager: IFurpaCashierSearchItemApiDto | null;
}

interface BanknoteGroupInput {
  banknoteType?: number | null;
  quantity?: number | null;
  total?: number | null;
  value?: number | null;
}

interface GiftCheckGroupInput {
  giftCheckTypeName?: string | null;
  value?: number | null;
  giftCheckType?: number | null;
  quantity?: number | null;
  total?: number | null;
}

interface PaymentTypeGroupInput {
  paymentName?: string | null;
  paymentTypeNo?: number | null;
  accountCode?: string | null;
  terminalId?: string | null;
  slipNumber?: number | null;
  amountValue?: number | null;
}

export function createIcmalDraftPayload(
  form: IcmalCreateForm,
  cashier: IFurpaCashierSearchItemApiDto | null,
  manager: IFurpaCashierSearchItemApiDto | null
): IcmalCreateDraftPayload {
  return {
    form: form.getRawValue(),
    cashier: toDraftPerson(cashier),
    manager: toDraftPerson(manager)
  };
}

export function restoreIcmalDraftForm(
  form: IcmalCreateForm,
  payload: IcmalCreateDraftPayload
): RestoredIcmalDraftPeople {
  if (!payload?.form) {
    throw new Error('Invalid cash summary draft.');
  }

  const value = payload.form;
  replaceFormArray(form.controls.banknoteMovements, value.banknoteMovements, createBanknoteGroup);
  replaceFormArray(form.controls.giftCheckMovements, value.giftCheckMovements, createGiftCheckGroup);
  replaceFormArray(form.controls.paymentTypes, value.paymentTypes, (line) =>
    createPaymentTypeGroup(line, line.source)
  );
  replaceFormArray(form.controls.storeExpenses, value.storeExpenses, createStoreExpenseGroup);

  form.patchValue(
    {
      cashNo: value.cashNo,
      cashRegisterFiscalNo: value.cashRegisterFiscalNo,
      zReportNo: value.zReportNo,
      cashierNo: value.cashierNo,
      managerNo: value.managerNo,
      zTotalValue: value.zTotalValue,
      total: value.total,
      summaryDate: value.summaryDate,
      warehouseNo: value.warehouseNo
    },
    { emitEvent: false }
  );
  form.markAsPristine();
  form.markAsUntouched();

  return {
    cashier: fromDraftPerson(payload.cashier),
    manager: fromDraftPerson(payload.manager)
  };
}

export function resetIcmalDraftForm(
  form: IcmalCreateForm,
  today: string,
  warehouseNo: number | null
): void {
  form.controls.banknoteMovements.clear({ emitEvent: false });
  form.controls.giftCheckMovements.clear({ emitEvent: false });
  form.controls.paymentTypes.clear({ emitEvent: false });
  form.controls.storeExpenses.clear({ emitEvent: false });
  form.reset(
    {
      cashNo: null,
      cashRegisterFiscalNo: '',
      zReportNo: null,
      cashierNo: null,
      managerNo: null,
      zTotalValue: null,
      total: 0,
      summaryDate: today,
      warehouseNo
    },
    { emitEvent: false }
  );
}

export function isIcmalDraftMeaningful(payload: IcmalCreateDraftPayload): boolean {
  const value = payload.form;
  return (
    positive(value.cashNo)
    || positive(value.zReportNo)
    || positive(value.cashierNo)
    || positive(value.managerNo)
    || positive(value.zTotalValue)
    || getIcmalDraftLineCount(payload) > 0
  );
}

export function getIcmalDraftTitle(payload: IcmalCreateDraftPayload): string {
  const cashNo = positive(payload.form.cashNo) ? `Kasa ${payload.form.cashNo}` : 'Yeni icmal';
  const cashier = payload.cashier?.cashierName?.trim();
  return cashier ? `${cashNo} - ${cashier}` : cashNo;
}

export function getIcmalDraftLineCount(payload: IcmalCreateDraftPayload): number {
  const value = payload.form;
  return (
    value.banknoteMovements.filter((line) => positive(line.quantity) || positive(line.total)).length
    + value.giftCheckMovements.filter((line) => positive(line.quantity) || positive(line.total)).length
    + value.paymentTypes.filter((line) => positive(line.slipNumber) || positive(line.amountValue)).length
    + value.storeExpenses.filter(
      (line) => positive(line.amountValue) || !!line.description.trim()
    ).length
  );
}

export function createBanknoteGroup(
  template?: BanknoteGroupInput | IFurpaBanknoteTypeItemApiDto
): BanknoteLineFormGroup {
  return new FormGroup({
    banknoteType: numericControl(template?.banknoteType ?? 0),
    quantity: numericControl(template?.quantity ?? 0),
    total: numericControl(template?.total ?? 0),
    value: numericControl(template?.value ?? 0)
  });
}

export function createGiftCheckGroup(
  template?: GiftCheckGroupInput | IFurpaGiftCheckTypeItemApiDto
): GiftCheckLineFormGroup {
  return new FormGroup({
    giftCheckTypeName: new FormControl(template?.giftCheckTypeName?.trim() ?? '', {
      nonNullable: true
    }),
    value: numericControl(template?.value ?? 0),
    giftCheckType: numericControl(template?.giftCheckType ?? 0),
    quantity: numericControl(template?.quantity ?? 0),
    total: numericControl(template?.total ?? 0)
  });
}

export function createPaymentTypeGroup(
  template?: PaymentTypeGroupInput | IFurpaPaymentTypeLookupItemApiDto,
  source: CashDrawerPaymentSource = 'other'
): PaymentTypeLineFormGroup {
  return new FormGroup({
    source: new FormControl(source, { nonNullable: true }),
    paymentName: new FormControl(template?.paymentName?.trim() ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    paymentTypeNo: numericControl(template?.paymentTypeNo ?? null),
    accountCode: new FormControl(template?.accountCode?.trim() ?? '', { nonNullable: true }),
    terminalId: new FormControl(template?.terminalId?.trim() ?? '', { nonNullable: true }),
    slipNumber: numericControl(template?.slipNumber ?? 0),
    amountValue: numericControl(template?.amountValue ?? 0)
  });
}

export function createStoreExpenseGroup(
  template?: Partial<{
    storeExpensesType: number | null;
    description: string;
    amountValue: number | null;
  }>
): StoreExpenseLineFormGroup {
  return new FormGroup({
    storeExpensesType: new FormControl<number | null>(template?.storeExpensesType ?? null, {
      validators: [Validators.required]
    }),
    description: new FormControl(template?.description?.trim() ?? '', { nonNullable: true }),
    amountValue: numericControl(template?.amountValue ?? 0)
  });
}

function numericControl(value: number | null): FormControl<number | null> {
  return new FormControl<number | null>(value, {
    validators: [Validators.required, Validators.min(0)]
  });
}

function replaceFormArray<TValue, TGroup extends FormGroup>(
  formArray: FormArray<TGroup>,
  values: TValue[],
  factory: (value: TValue) => TGroup
): void {
  formArray.clear({ emitEvent: false });
  (Array.isArray(values) ? values : []).forEach((value) =>
    formArray.push(factory(value), { emitEvent: false })
  );
}

function toDraftPerson(item: IFurpaCashierSearchItemApiDto | null): IcmalDraftPerson | null {
  if (!item) {
    return null;
  }

  return {
    cashierCode: Number(item.cashierCode) || 0,
    cashierName: item.cashierName?.trim() ?? ''
  };
}

function fromDraftPerson(item: IcmalDraftPerson | null): IFurpaCashierSearchItemApiDto | null {
  if (!item) {
    return null;
  }

  return {
    cashierCode: item.cashierCode,
    cashierName: item.cashierName,
    cashierPassword: '',
    cashierAuthorization: '',
    cashierState: true
  };
}

function positive(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
