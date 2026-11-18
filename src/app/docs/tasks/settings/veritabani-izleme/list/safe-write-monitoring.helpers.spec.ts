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
      searchText: '',
      status: '',
      operationCode: '   ',
      warehouseNo: null,
      retryable: 'all',
      includeCompleted: false,
      startDate: '',
      endDate: '',
      take: 100
    })).toEqual({
      searchText: undefined,
      status: undefined,
      operationCode: undefined,
      warehouseNo: undefined,
      retryable: undefined,
      includeCompleted: false,
      createdFromUtc: undefined,
      createdToUtc: undefined,
      take: 100
    });
  });

  it('normalizes explicit filters for the monitoring request', () => {
    expect(buildSafeWriteMonitoringRequest({
      searchText: ' ff2ede2d ',
      status: 'Completed',
      operationCode: ' inventory-count.create ',
      warehouseNo: 120.8,
      retryable: 'false',
      includeCompleted: true,
      startDate: '',
      endDate: '',
      take: 750
    })).toEqual({
      searchText: 'ff2ede2d',
      status: 'Completed',
      operationCode: 'inventory-count.create',
      warehouseNo: 120,
      retryable: false,
      includeCompleted: true,
      createdFromUtc: undefined,
      createdToUtc: undefined,
      take: 500
    });
  });

  it('distinguishes recent and old processing records by last-update age', () => {
    expect(getSafeWriteStatusPresentation(createItem({ ageSeconds: 720 }))).toEqual({
      label: 'Isleniyor',
      tone: 'info',
      retryLabel: 'Bekle'
    });
    expect(getSafeWriteStatusPresentation(createItem({ ageSeconds: 721 }))).toEqual({
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
      label: 'Sonuc Kontrol Edilebilir',
      tone: 'warn',
      retryLabel: 'Durumu kontrol et'
    });
    expect(getSafeWriteStatusPresentation(createItem({
      status: 'Failed',
      errorCode: 'SAFE_WRITE_RETRY_ALLOWED',
      retryable: true
    }))).toEqual({
      label: 'Yeniden Gonderime Hazir',
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
    expect(getSafeWriteStatusPresentation(createItem({
      status: 'Failed',
      errorCode: 'SAFE_WRITE_VALIDATION_REJECTED',
      retryable: false
    }))).toEqual({
      label: 'Veri Dogrulamasinda Reddedildi',
      tone: 'neutral',
      retryLabel: 'Kaydi duzelt'
    });
    expect(getSafeWriteStatusPresentation(createItem({ status: 'Failed' }))).toEqual({
      label: 'Siniflandirilmamis / Eski Hata',
      tone: 'neutral',
      retryLabel: 'Otomatik tekrar yok'
    });
    expect(getSafeWriteStatusPresentation(createItem({ status: 'Cancelled' }))).toEqual({
      label: 'Yetkili Tarafindan Iptal Edildi',
      tone: 'neutral',
      retryLabel: 'Yerel kaydi temizle'
    });
  });
});
