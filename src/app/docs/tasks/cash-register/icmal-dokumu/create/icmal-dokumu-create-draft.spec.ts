import { FormArray, FormControl, FormGroup } from '@angular/forms';
import type { IFurpaCashierSearchItemApiDto } from '@interfaces';

import {
  createBanknoteGroup,
  createGiftCheckGroup,
  createIcmalDraftPayload,
  createPaymentTypeGroup,
  createStoreExpenseGroup,
  getIcmalDraftLineCount,
  isIcmalDraftMeaningful,
  resetIcmalDraftForm,
  restoreIcmalDraftForm,
  type BanknoteLineFormGroup,
  type GiftCheckLineFormGroup,
  type IcmalCreateControls,
  type PaymentTypeLineFormGroup,
  type StoreExpenseLineFormGroup
} from './icmal-dokumu-create-draft';

describe('icmal create browser draft', () => {
  const cashier: IFurpaCashierSearchItemApiDto = {
    cashierCode: 42,
    cashierName: 'Test Kasiyer',
    cashierPassword: 'must-not-be-saved',
    cashierAuthorization: 'admin',
    cashierState: true
  };

  it('stores only the safe cashier identity fields', () => {
    const payload = createIcmalDraftPayload(createForm(), cashier, null);
    const serialized = JSON.stringify(payload);

    expect(payload.cashier).toEqual({ cashierCode: 42, cashierName: 'Test Kasiyer' });
    expect(serialized).not.toContain('must-not-be-saved');
    expect(serialized).not.toContain('cashierAuthorization');
  });

  it('does not count empty lookup template rows as meaningful data', () => {
    const form = createForm();
    form.controls.banknoteMovements.push(createBanknoteGroup({ banknoteType: 1, value: 200 }));
    form.controls.paymentTypes.push(
      createPaymentTypeGroup({ paymentName: 'Kart', paymentTypeNo: 10 }, 'card')
    );
    const payload = createIcmalDraftPayload(form, null, null);

    expect(isIcmalDraftMeaningful(payload)).toBeFalse();
    expect(getIcmalDraftLineCount(payload)).toBe(0);
  });

  it('restores every form array and the safe person summary', () => {
    const source = createForm();
    source.controls.cashNo.setValue(4);
    source.controls.banknoteMovements.push(
      createBanknoteGroup({ banknoteType: 1, value: 200, quantity: 3, total: 600 })
    );
    source.controls.storeExpenses.push(
      createStoreExpenseGroup({ storeExpensesType: 7, description: 'Temizlik', amountValue: 125 })
    );
    const payload = createIcmalDraftPayload(source, cashier, cashier);
    const target = createForm();

    const restoredPeople = restoreIcmalDraftForm(target, payload);

    expect(target.controls.cashNo.value).toBe(4);
    expect(target.controls.banknoteMovements.getRawValue()).toEqual(
      source.controls.banknoteMovements.getRawValue()
    );
    expect(target.controls.storeExpenses.getRawValue()).toEqual(
      source.controls.storeExpenses.getRawValue()
    );
    expect(restoredPeople.cashier?.cashierName).toBe('Test Kasiyer');
    expect(restoredPeople.cashier?.cashierPassword).toBe('');
  });

  it('resets the draft to a clean form without leaving old rows', () => {
    const form = createForm();
    form.controls.cashNo.setValue(8);
    form.controls.giftCheckMovements.push(
      createGiftCheckGroup({ giftCheckType: 2, quantity: 1, total: 50 })
    );

    resetIcmalDraftForm(form, '2026-10-13', 120);

    expect(form.controls.cashNo.value).toBeNull();
    expect(form.controls.summaryDate.value).toBe('2026-10-13');
    expect(form.controls.warehouseNo.value).toBe(120);
    expect(form.controls.giftCheckMovements.length).toBe(0);
  });
});

function createForm(): FormGroup<IcmalCreateControls> {
  return new FormGroup<IcmalCreateControls>({
    cashNo: new FormControl<number | null>(null),
    cashRegisterFiscalNo: new FormControl('', { nonNullable: true }),
    zReportNo: new FormControl<number | null>(null),
    cashierNo: new FormControl<number | null>(null),
    managerNo: new FormControl<number | null>(null),
    zTotalValue: new FormControl<number | null>(null),
    total: new FormControl<number | null>(0),
    summaryDate: new FormControl('2026-10-13', { nonNullable: true }),
    warehouseNo: new FormControl<number | null>(120),
    giftCheckMovements: new FormArray<GiftCheckLineFormGroup>([]),
    banknoteMovements: new FormArray<BanknoteLineFormGroup>([]),
    paymentTypes: new FormArray<PaymentTypeLineFormGroup>([]),
    storeExpenses: new FormArray<StoreExpenseLineFormGroup>([])
  });
}
