import type { SorumlulukGorevVeYetkiResponseModel } from '@interfaces/rol-yetki.dtos';

import {
  buildDocsRegistryValidationResult
} from './docs-registry-validation.service';
import {
  DocsTaskRegistration,
  normalizeDocsAccessKey
} from './docs-menu.config';

describe('docs-registry-validation.service', () => {
  function buildRegistration(
    id: string,
    label: string,
    ...extraKeys: string[]
  ): DocsTaskRegistration {
    return {
      id,
      label,
      summary: 'Test task',
      route: `/docs/api/${id}`,
      pageId: id,
      accessKeys: [id, label, ...extraKeys]
        .map((value) => normalizeDocsAccessKey(value))
        .filter((value, index, items) => !!value && items.indexOf(value) === index)
    };
  }

  it('flags backend tasks that do not have a frontend route mapping', () => {
    const registrations = [
      buildRegistration(
        'verilen-firma-siparisleri',
        'Verilen Firma Siparisleri',
        'VerilenFirmaSiparisleri'
      )
    ];
    const sorumluluklar: SorumlulukGorevVeYetkiResponseModel[] = [
      {
        id: 1,
        isim: 'Siparis Islemleri',
        sebike: 'SiparisIslemleri',
        gorevler: [
          {
            id: 1,
            isim: 'Verilen Firma Siparisleri',
            sebike: 'VerilenFirmaSiparisleri',
            yetkiler: []
          },
          {
            id: 2,
            isim: 'Yeni Deneme Gorevi',
            sebike: 'YeniDenemeGorevi',
            yetkiler: []
          }
        ]
      }
    ];

    const result = buildDocsRegistryValidationResult(sorumluluklar, registrations);

    expect(result.unknownBackendTasks).toEqual(['SiparisIslemleri > YeniDenemeGorevi']);
    expect(result.unmappedFrontendTasks).toEqual([]);
  });

  it('flags frontend routes whose backend key no longer matches', () => {
    const registrations = [
      buildRegistration(
        'verilen-firma-siparisleri',
        'Verilen Firma Siparisleri',
        'VerilenFirmaSiparisleri'
      )
    ];
    const sorumluluklar: SorumlulukGorevVeYetkiResponseModel[] = [
      {
        id: 1,
        isim: 'Siparis Islemleri',
        sebike: 'SiparisIslemleri',
        gorevler: [
          {
            id: 1,
            isim: 'Yeni Verilen Siparisler',
            sebike: 'VerilenSiparislerV2',
            yetkiler: []
          }
        ]
      }
    ];

    const result = buildDocsRegistryValidationResult(sorumluluklar, registrations);

    expect(result.unknownBackendTasks).toEqual(['SiparisIslemleri > VerilenSiparislerV2']);
    expect(result.unmappedFrontendTasks).toEqual([
      'verilen-firma-siparisleri -> /docs/api/verilen-firma-siparisleri'
    ]);
  });

  it('accepts backend tasks that match through explicit alias keys', () => {
    const registrations = [
      buildRegistration(
        'authorization-files',
        'Authorization Files',
        'Operations',
        'dosya-gonderimi',
        'AuthorizationFiles'
      )
    ];
    const sorumluluklar: SorumlulukGorevVeYetkiResponseModel[] = [
      {
        id: 1,
        isim: 'Operasyon Islemleri',
        sebike: 'Operations',
        gorevler: [
          {
            id: 1,
            isim: 'Authorization Files',
            sebike: 'AuthorizationFiles',
            yetkiler: []
          }
        ]
      }
    ];

    const result = buildDocsRegistryValidationResult(sorumluluklar, registrations);

    expect(result.unknownBackendTasks).toEqual([]);
    expect(result.unmappedFrontendTasks).toEqual([]);
  });

  it('accepts Axata synchronization tasks when backend uses the camel-case menu key', () => {
    const registrations = [
      buildRegistration(
        'axata-senkronizasyonu',
        'Axata Senkronizasyonu',
        'axata-sync',
        'AxataSenkronizasyonu'
      )
    ];
    const sorumluluklar: SorumlulukGorevVeYetkiResponseModel[] = [
      {
        id: 1,
        isim: 'Entegrasyon Islemleri',
        sebike: 'EntegrasyonIslemleri',
        gorevler: [
          {
            id: 1,
            isim: 'Axata Senkronizasyonu',
            sebike: 'AxataSenkronizasyonu',
            yetkiler: []
          }
        ]
      }
    ];

    const result = buildDocsRegistryValidationResult(sorumluluklar, registrations);

    expect(result.unknownBackendTasks).toEqual([]);
    expect(result.unmappedFrontendTasks).toEqual([]);
  });

  it('accepts POS accounting tasks when backend uses the camel-case menu key', () => {
    const registrations = [
      buildRegistration(
        'pos-muhasebe-aktarimi',
        'POS Muhasebe Aktarimi',
        'PosMuhasebeAktarimi'
      )
    ];
    const sorumluluklar: SorumlulukGorevVeYetkiResponseModel[] = [
      {
        id: 1,
        isim: 'Entegrasyon Islemleri',
        sebike: 'EntegrasyonIslemleri',
        gorevler: [
          {
            id: 2,
            isim: 'POS Muhasebe Aktarimi',
            sebike: 'PosMuhasebeAktarimi',
            yetkiler: []
          }
        ]
      }
    ];

    const result = buildDocsRegistryValidationResult(sorumluluklar, registrations);

    expect(result.unknownBackendTasks).toEqual([]);
    expect(result.unmappedFrontendTasks).toEqual([]);
  });
});
