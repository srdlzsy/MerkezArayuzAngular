import type { InvoiceSendingListItemDto } from '../../../../../core/api/module-services/fatura-islemleri.service';
import {
  filterSendingItemsByStatus,
  getInvoiceScenario,
  getSendingGrossTotal,
  getSendingPayableTotal,
  isSendingDatePresetMatch,
  resolveSendingDatePreset,
  resolveSendingScenario,
  sortSendingItems,
  sumSendingPayableTotal,
  sumSendingTaxTotal
} from './fatura-islemleri-sending.helpers';

describe('fatura-islemleri-sending.helpers', () => {
  const dummyItem = (id: string, isSent: boolean, hasAddr: boolean, total = 100): InvoiceSendingListItemDto => ({
    documentSerie: 'A',
    documentOrderNo: 1,
    invoiceId: id,
    customerTitle: 'Musteri ' + id,
    documentDate: '2026-11-17T00:00:00',
    isSent,
    scenario: 'EFatura',
    payableTotal: total,
    targetAlias: hasAddr ? 'urn:mail:defaultpk@test.com' : null
  } as InvoiceSendingListItemDto);

  it('resolves date presets correctly', () => {
    const fixedNow = new Date(2026, 10, 17); // Tuesday Nov 17, 2026
    const todayPreset = resolveSendingDatePreset('today', fixedNow);
    expect(todayPreset.startDate).toBe('2026-11-17');
    expect(todayPreset.endDate).toBe('2026-11-17');

    const yesterdayPreset = resolveSendingDatePreset('yesterday', fixedNow);
    expect(yesterdayPreset.startDate).toBe('2026-11-16');
    expect(yesterdayPreset.endDate).toBe('2026-11-16');

    const monthPreset = resolveSendingDatePreset('thisMonth', fixedNow);
    expect(monthPreset.startDate).toBe('2026-11-01');
    expect(monthPreset.endDate).toBe('2026-11-17');
  });

  it('filters sending items by status (all, unsent, sent, attention)', () => {
    const items = [
      dummyItem('INV-1', false, true),
      dummyItem('INV-2', true, true),
      dummyItem('INV-3', false, false)
    ];
    const hasAddress = (item: InvoiceSendingListItemDto) => !!item.targetAlias;

    expect(filterSendingItemsByStatus(items, 'all', hasAddress).length).toBe(3);
    expect(filterSendingItemsByStatus(items, 'unsent', hasAddress).map((i) => i.invoiceId)).toEqual(['INV-1', 'INV-3']);
    expect(filterSendingItemsByStatus(items, 'sent', hasAddress).map((i) => i.invoiceId)).toEqual(['INV-2']);
    expect(filterSendingItemsByStatus(items, 'attention', hasAddress).map((i) => i.invoiceId)).toEqual(['INV-3']);
  });

  it('sorts sending items ascending and descending by payableTotal and invoiceId', () => {
    const items = [
      dummyItem('INV-B', false, true, 200),
      dummyItem('INV-A', false, true, 50),
      dummyItem('INV-C', false, true, 500)
    ];

    const sortedAsc = sortSendingItems(
      items,
      { key: 'payableTotal', direction: 'asc' },
      () => 'EFatura',
      (i) => i.payableTotal ?? 0
    );
    expect(sortedAsc.map((i) => i.invoiceId)).toEqual(['INV-A', 'INV-B', 'INV-C']);

    const sortedDesc = sortSendingItems(
      items,
      { key: 'payableTotal', direction: 'desc' },
      () => 'EFatura',
      (i) => i.payableTotal ?? 0
    );
    expect(sortedDesc.map((i) => i.invoiceId)).toEqual(['INV-C', 'INV-B', 'INV-A']);
  });

  it('resolves invoice scenario correctly', () => {
    expect(getInvoiceScenario('EFatura')).toBe('EFatura');
    expect(getInvoiceScenario('EArsiv')).toBe('EArsiv');
    expect(getInvoiceScenario(0)).toBe('EFatura');
    expect(getInvoiceScenario(1)).toBe('EArsiv');
    expect(getInvoiceScenario('unknown')).toBeNull();
    expect(resolveSendingScenario('unknown')).toBe('EFatura');
  });

  it('calculates totals with fallback logic', () => {
    const item = {
      grossTotal: null,
      lineExtensionTotal: 100,
      discountTotal: 10,
      taxTotal: 18,
      payableTotal: null,
      chargeTotal: 2
    } as unknown as InvoiceSendingListItemDto;

    expect(getSendingGrossTotal(item)).toBe(110);
    expect(getSendingPayableTotal(item)).toBe(120);
    expect(sumSendingPayableTotal([item])).toBe(120);
    expect(sumSendingTaxTotal([item])).toBe(18);
  });

  it('checks date preset match accurately', () => {
    const fixedNow = new Date(2026, 10, 17);
    expect(isSendingDatePresetMatch('today', '2026-11-17', '2026-11-17', fixedNow)).toBeTrue();
    expect(isSendingDatePresetMatch('today', '2026-11-16', '2026-11-17', fixedNow)).toBeFalse();
  });
});
