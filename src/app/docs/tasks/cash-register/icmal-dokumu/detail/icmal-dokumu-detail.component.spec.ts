import { IcmalDokumuDetailComponent } from './icmal-dokumu-detail.component';

describe('IcmalDokumuDetailComponent payment category', () => {
  const onlineTemplate = {
    paymentName: 'Online Odeme',
    paymentTypeId: 10,
    paymentTypeNo: 10,
    paymentGenus: 1,
    terminalId: '',
    accountCode: '0021',
    slipNumber: 0,
    amountValue: 0
  };

  function createSubject(): any {
    return Object.create(IcmalDokumuDetailComponent.prototype);
  }

  it('keeps a legacy online payment in the explicitly selected online category', () => {
    const result = createSubject().createDetailFromTemplate(
      onlineTemplate,
      { source: '', category: '' },
      'onlineSale'
    );

    expect(result.source).toBe('onlineSale');
    expect(result.category).toBe('Online/Vadeli');
    expect(result.paymentTypeNo).toBe(10);
  });

  it('preserves the online category while changing an existing online detail type', () => {
    const result = createSubject().createDetailFromTemplate(onlineTemplate, {
      source: 'onlineSale',
      category: 'Online/Vadeli'
    });

    expect(result.source).toBe('onlineSale');
    expect(result.category).toBe('Online/Vadeli');
  });
});
