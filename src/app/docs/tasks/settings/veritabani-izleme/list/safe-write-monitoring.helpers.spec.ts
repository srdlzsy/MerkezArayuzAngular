import type { SafeWriteMonitoringItemDto } from '@interfaces';

import {
  buildSafeWriteMonitoringRequest,
  getSafeWriteStatusPresentation
} from './safe-write-monitoring.helpers';

describe('safe write monitoring helpers', () => {
  const createItem = (
    overrides: Partial<SafeWriteMonitoringItemDto>
  ): SafeWriteMonitoringItemDto => ({
    id: 'safe-write-1',
    operationCode: 'inventory-count.create',
    requestedByUserId: 'user-1',
    warehouseNo: 120,
    clientRequestId: 'client-request-1',
    status: 'Processing',
    errorCode: null,
    retryable: null,
    errorMessage: null,
    createdAtUtc: '2026-10-13T08:00:00Z',
    updatedAtUtc: '2026-10-13T08:01:00Z',
    completedAtUtc: null,
    ageSeconds: 60,
    ...overrides
  });

  it('builds the default incomplete-record request without empty filters', () => {
    expect(buildSafeWriteMonitoringRequest({
      status: '',
      operationCode: '   ',
      warehouseNo: null,
      retryable: 'all',
      includeCompleted: false
    })).toEqual({
      status: undefined,
      operationCode: undefined,
      warehouseNo: undefined,
      retryable: undefined,
      includeCompleted: false,
      take: 100
    });
  });

  it('normalizes explicit filters for the monitoring request', () => {
    expect(buildSafeWriteMonitoringRequest({
      status: 'Completed',
      operationCode: ' inventory-count.create ',
      warehouseNo: 120.8,
      retryable: 'false',
      includeCompleted: true
    })).toEqual({
      status: 'Completed',
      operationCode: 'inventory-count.create',
      warehouseNo: 120,
      retryable: false,
      includeCompleted: true,
      take: 100
    });
  });

  it('distinguishes recent and old processing records by last-update age', () => {
    expect(getSafeWriteStatusPresentation(createItem({ ageSeconds: 300 }))).toEqual({
      label: 'Isleniyor',
      tone: 'info',
      retryLabel: 'Bekle'
    });
    expect(getSafeWriteStatusPresentation(createItem({ ageSeconds: 301 }))).toEqual({
      label: 'Uzlastirma Bekliyor',
      tone: 'warn',
      retryLabel: 'Durumu kontrol et'
    });
  });

  it('maps completed and failed retry decisions to operator-facing labels', () => {
    expect(getSafeWriteStatusPresentation(createItem({ status: 'Completed' }))).toEqual({
      label: 'Tamamlandi',
      tone: 'success',
      retryLabel: 'Gerekmez'
    });
    expect(getSafeWriteStatusPresentation(createItem({
      status: 'Failed',
      retryable: true
    }))).toEqual({
      label: 'Guvenli Tekrar Kontrol Edilebilir',
      tone: 'warn',
      retryLabel: 'Ayni kimlikle'
    });
    expect(getSafeWriteStatusPresentation(createItem({
      status: 'Failed',
      retryable: false
    }))).toEqual({
      label: 'Manuel Inceleme Gerekli',
      tone: 'danger',
      retryLabel: 'Tekrar gonderme'
    });
    expect(getSafeWriteStatusPresentation(createItem({ status: 'Failed' }))).toEqual({
      label: 'Siniflandirilmamis / Eski Hata',
      tone: 'neutral',
      retryLabel: 'Otomatik tekrar yok'
    });
  });
});
