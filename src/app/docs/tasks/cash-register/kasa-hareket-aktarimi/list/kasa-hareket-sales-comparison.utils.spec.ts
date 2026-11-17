import type { KasaHareketSalesComparisonRowDto } from '@interfaces';

import {
  getSalesComparisonStatus,
  hasSalesComparisonTransferProblem,
  hasSalesComparisonWarning
} from './kasa-hareket-sales-comparison.utils';

describe('kasa hareket satis karsilastirma durumlari', () => {
  const createRow = (
    overrides: Partial<KasaHareketSalesComparisonRowDto> = {}
  ): KasaHareketSalesComparisonRowDto => ({
    hasDifference: false,
    pendingInvoiceAmount: 0,
    hasReceiptTotalMismatch: false,
    hasZReportMismatch: false,
    ...overrides
  } as KasaHareketSalesComparisonRowDto);

  it('eksiksiz aktarimi yesil durum olarak siniflandirir', () => {
    const row = createRow();

    expect(getSalesComparisonStatus(row)).toBe('Aktarim tam');
    expect(hasSalesComparisonTransferProblem(row)).toBeFalse();
    expect(hasSalesComparisonWarning(row)).toBeFalse();
  });

  it('fis baslik satir farkini aktarim hatasi yerine uyari olarak siniflandirir', () => {
    const row = createRow({ hasReceiptTotalMismatch: true });

    expect(getSalesComparisonStatus(row)).toBe('Kaynak fisi kontrol');
    expect(hasSalesComparisonTransferProblem(row)).toBeFalse();
    expect(hasSalesComparisonWarning(row)).toBeTrue();
  });

  it('Z farkini kaynak fis farkindan ayri siniflandirir', () => {
    const row = createRow({ hasZReportMismatch: true });

    expect(getSalesComparisonStatus(row)).toBe('Z raporu kontrol');
    expect(hasSalesComparisonWarning(row)).toBeTrue();
  });

  it('gercek aktarim farkini kirmizi durum olarak siniflandirir', () => {
    const row = createRow({ hasDifference: true });

    expect(getSalesComparisonStatus(row)).toBe('Aktarim eksik/fazla');
    expect(hasSalesComparisonTransferProblem(row)).toBeTrue();
    expect(hasSalesComparisonWarning(row)).toBeFalse();
  });

  it('bekleyen faturaya aktarim farkindan once oncelik verir', () => {
    const row = createRow({ hasDifference: true, pendingInvoiceAmount: 25 });

    expect(getSalesComparisonStatus(row)).toBe('Fatura bekliyor');
    expect(hasSalesComparisonTransferProblem(row)).toBeTrue();
  });
});
