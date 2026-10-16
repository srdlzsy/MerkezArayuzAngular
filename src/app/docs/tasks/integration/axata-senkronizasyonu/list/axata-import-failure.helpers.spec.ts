import { buildAxataImportFailureViews } from './axata-import-failure.helpers';

describe('buildAxataImportFailureViews', () => {
  it('marks cancelled AXATA deliveries as skipped without retry guidance', () => {
    const [failure] = buildAxataImportFailureViews({
      failures: [
        {
          axataSequenceNo: 12,
          axataDeliveryNo: 'SEV-12',
          errorMessage: 'AXATA sevki iptal/zero-quantity olarak gorunuyor; Mikro sevk fisi beklenmez.'
        }
      ]
    });

    expect(failure.state).toBe("Atlandi - AXATA'da iptal");
    expect(failure.tone).toBe('neutral');
    expect(failure.guidance).toContain('tekrar gerekmiyor');
  });

  it('does not ask the UI to add a missing backend user identity', () => {
    const [failure] = buildAxataImportFailureViews({
      failures: [
        {
          documentSerie: 'F120',
          documentOrderNo: 42,
          correlationId: 'trace-42',
          errorMessage: 'Requested by user id is required when clientRequestId is provided.'
        }
      ]
    });

    expect(failure.state).toBe('Sunucu kontrolu gerekli');
    expect(failure.reference).toContain('F120.42');
    expect(failure.reference).toContain('trace-42');
    expect(failure.guidance).toContain('UI istegini degistirmeyin');
  });

  it('requires review when Mikro order lines cannot be matched safely', () => {
    const [failure] = buildAxataImportFailureViews({
      failures: [
        {
          errorMessage: 'AXATA teslimat satirlari Mikro siparis satirlariyla guvenli eslesmedi.'
        }
      ]
    });

    expect(failure.state).toBe('Satir farki incelemesi gerekli');
    expect(failure.tone).toBe('warning');
  });
});
