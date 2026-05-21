import type { Sorumluluk } from '../../core/auth/models/auth.models';
import { buildDocsMenuForUser, getDocsTask, getDocsTaskContext, getDocsTaskPermissions, hasDocsTaskAccess } from './docs-menu.config';

describe('docs-menu.config', () => {
  it('builds the menu directly from the current user permission tree order', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Siparis Islemleri',
        sebike: 'SiparisIslemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Verilen Firma Siparisleri',
            sebike: 'VerilenFirmaSiparisleri',
            yetkiler: []
          }
        ]
      },
      {
        id: 2,
        isim: 'Kullanici Islemleri',
        sebike: 'KullaniciIslemleri',
        gorevler: [
          {
            id: 21,
            isim: 'Kullanicilar',
            sebike: 'Kullanicilar',
            yetkiler: []
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);
    const sectionIds = menu.map((section) => section.id);
    const orderSection = menu.find((section) => section.id === 'siparis-islemleri');
    const userSection = menu.find((section) => section.id === 'kullanici-islemleri');

    expect(sectionIds).toEqual(['siparis-islemleri', 'kullanici-islemleri']);
    expect(orderSection?.label).toBe('Siparis Islemleri');
    expect(orderSection?.children.map((item) => item.id)).toEqual(['verilen-firma-siparisleri']);
    expect(userSection?.children.map((item) => item.id)).toEqual(['kullanicilar']);
  });

  it('matches Turkish characters in incoming task names to menu ids', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Sipari\u015f \u0130\u015flemleri',
        sebike: 'SiparisIslemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Verilen Firma Sipari\u015fleri',
            sebike: 'VerilenFirmaSiparisleri',
            yetkiler: []
          }
        ]
      }
    ];

    expect(hasDocsTaskAccess('verilen-firma-siparisleri', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('alinan-firma-siparisleri', sorumluluklar)).toBeFalse();
  });

  it('builds stable section ids from Turkish responsibility names and sebike values', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Sipariş İşlemleri',
        sebike: 'SiparisIslemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Verilen Siparişler',
            sebike: 'VerilenSiparisler',
            yetkiler: []
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(menu.map((section) => section.id)).toEqual(['siparis-islemleri']);
  });

  it('uses backend sebike keys when menu label and task name are not identical', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Kasa Islemleri',
        sebike: 'KasaIslemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Etiket Basim',
            sebike: 'EtiketBasim',
            yetkiler: []
          }
        ]
      }
    ];

    expect(hasDocsTaskAccess('etiket-belgeleri', sorumluluklar)).toBeTrue();
  });

  it('shows authorization files when backend returns an alias key', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Operasyon Islemleri',
        sebike: 'Operations',
        gorevler: [
          {
            id: 1,
            isim: 'Authorization Files',
            sebike: 'AuthorizationFiles',
            yetkiler: [{ id: 1, isim: 'Listeleme', sebike: 'liste' }]
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(hasDocsTaskAccess('authorization-files', sorumluluklar)).toBeTrue();
    expect(menu[0]?.children.map((item) => item.id)).toEqual(['authorization-files']);
  });

  it('matches Axata synchronization task ids from backend menu codes and aliases', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Entegrasyon Islemleri',
        sebike: 'EntegrasyonIslemleri',
        gorevler: [
          {
            id: 1,
            isim: 'Axata Senkronizasyonu',
            sebike: 'AxataSenkronizasyonu',
            yetkiler: [{ id: 1, isim: 'Listele', sebike: 'entegrasyon-islemleri.axata-senkronizasyonu.list' }]
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(hasDocsTaskAccess('axata-senkronizasyonu', sorumluluklar)).toBeTrue();
    expect(menu[0]?.children.map((item) => item.id)).toEqual(['axata-senkronizasyonu']);
  });

  it('matches POS accounting task ids from backend menu codes and aliases', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Entegrasyon Islemleri',
        sebike: 'EntegrasyonIslemleri',
        gorevler: [
          {
            id: 2,
            isim: 'POS Muhasebe Aktarimi',
            sebike: 'PosMuhasebeAktarimi',
            yetkiler: [
              {
                id: 2,
                isim: 'Listele',
                sebike: 'entegrasyon-islemleri.pos-muhasebe-aktarimi.list'
              }
            ]
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(hasDocsTaskAccess('pos-muhasebe-aktarimi', sorumluluklar)).toBeTrue();
    expect(menu[0]?.children.map((item) => item.id)).toEqual(['pos-muhasebe-aktarimi']);
  });

  it('does not grant task access from responsibility name alone when gorev is missing', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Operasyon Islemleri',
        sebike: 'Operations',
        gorevler: []
      }
    ];

    expect(hasDocsTaskAccess('authorization-files', sorumluluklar)).toBeFalse();
  });

  it('drops backend tasks that do not have a frontend route registration', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Deneme Islemleri',
        sebike: 'DenemeIslemleri',
        gorevler: [
          {
            id: 1,
            isim: 'Yeni Gorev',
            sebike: 'YeniGorev',
            yetkiler: []
          }
        ]
      }
    ];

    expect(buildDocsMenuForUser(sorumluluklar)).toEqual([]);
  });

  it('returns backend permissions for the matched task', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Insan Kaynaklari',
        sebike: 'InsanKaynaklari',
        gorevler: [
          {
            id: 1,
            isim: 'insan kaynaklari',
            sebike: 'insan kaynaklari',
            yetkiler: [
              { id: 17, isim: 'Listeleme', sebike: 'liste' },
              { id: 18, isim: 'Detay', sebike: 'ayrinti' },
              { id: 19, isim: 'Ekleme', sebike: 'ekle' },
              { id: 20, isim: 'Guncelleme', sebike: 'guncelle' }
            ]
          }
        ]
      }
    ];

    const permissions = getDocsTaskPermissions('insan-kaynaklari', sorumluluklar, [
      {
        id: 'insan-kaynaklari',
        label: 'Insan Kaynaklari',
        summary: 'Test task',
        route: '/docs/api/insan-kaynaklari',
        pageId: 'insan-kaynaklari',
        accessKeys: ['insan-kaynaklari']
      }
    ]);

    expect(permissions.map((permission) => permission.sebike)).toEqual([
      'liste',
      'ayrinti',
      'ekle',
      'guncelle'
    ]);
  });

  it('returns the matched backend task and responsibility context', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Insan Kaynaklari',
        sebike: 'InsanKaynaklari',
        gorevler: [
          {
            id: 13,
            isim: 'Firma Mal Kabulleri',
            sebike: 'FirmaMalKabulleri',
            yetkiler: [
              { id: 13, isim: 'Listeleme', sebike: 'liste' },
              { id: 14, isim: 'Detay', sebike: 'ayrinti' }
            ]
          }
        ]
      }
    ];

    const task = getDocsTask('firma-mal-kabulleri', sorumluluklar);
    const taskContext = getDocsTaskContext('firma-mal-kabulleri', sorumluluklar);

    expect(task).toEqual(
      jasmine.objectContaining({
        id: 13,
        isim: 'Firma Mal Kabulleri',
        sebike: 'FirmaMalKabulleri'
      })
    );
    expect(taskContext?.sorumluluk.sebike).toBe('InsanKaynaklari');
    expect(taskContext?.gorev.id).toBe(13);
  });

  it('matches backend kebab-case menu codes to existing task routes', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Siparis Islemleri',
        sebike: 'siparis-islemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Verilen Firma Siparisleri',
            sebike: 'verilen-firma-siparisleri',
            yetkiler: []
          }
        ]
      },
      {
        id: 2,
        isim: 'Mal Kabul Islemleri',
        sebike: 'mal-kabul-islemleri',
        gorevler: [
          {
            id: 21,
            isim: 'Firma Mal Kabulleri',
            sebike: 'firma-mal-kabulleri',
            yetkiler: []
          },
          {
            id: 22,
            isim: 'Mal Kabul Farklari',
            sebike: 'mal-kabul-farklari',
            yetkiler: []
          }
        ]
      },
      {
        id: 3,
        isim: 'Sevk Islemleri',
        sebike: 'sevk-islemleri',
        gorevler: [
          {
            id: 31,
            isim: 'Giden Firma Sevkleri',
            sebike: 'giden-firma-sevkleri',
            yetkiler: []
          }
        ]
      },
      {
        id: 4,
        isim: 'Stok Islemleri',
        sebike: 'stok-islemleri',
        gorevler: [
          {
            id: 41,
            isim: 'Masraf Fisleri',
            sebike: 'masraf-fisleri',
            yetkiler: []
          },
          {
            id: 42,
            isim: 'Virmanlar',
            sebike: 'virmanlar',
            yetkiler: []
          }
        ]
      },
      {
        id: 5,
        isim: 'Kullanici Islemleri',
        sebike: 'kullanici-islemleri',
        gorevler: [
          {
            id: 51,
            isim: 'Kullanicilar',
            sebike: 'kullanicilar',
            yetkiler: []
          }
        ]
      }
    ];

    expect(hasDocsTaskAccess('verilen-firma-siparisleri', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('firma-mal-kabulleri', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('mal-kabul-farklari', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('giden-firma-sevkleri', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('masraf-fisleri', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('virmanlar', sorumluluklar)).toBeTrue();
    expect(hasDocsTaskAccess('kullanicilar', sorumluluklar)).toBeTrue();
  });

  it('keeps banknote track task visible when the backend menu sends it', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Kasa Islemleri',
        sebike: 'kasa-islemleri',
        gorevler: [
          {
            id: 11,
            isim: 'Banknot Takipleri',
            sebike: 'banknot-takipleri',
            yetkiler: []
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(hasDocsTaskAccess('banknot-takipleri', sorumluluklar)).toBeTrue();
    expect(menu.map((section) => section.children.map((item) => item.id))).toEqual([
      ['banknot-takipleri']
    ]);
  });

  it('keeps kunye label print task visible when the backend menu sends it', () => {
    const sorumluluklar: Sorumluluk[] = [
      {
        id: 1,
        isim: 'Kasa Islemleri',
        sebike: 'kasa-islemleri',
        gorevler: [
          {
            id: 12,
            isim: 'Kunye Etiket Yazdirma',
            sebike: 'kunye-etiket-yazdirma',
            yetkiler: []
          }
        ]
      }
    ];

    const menu = buildDocsMenuForUser(sorumluluklar);

    expect(hasDocsTaskAccess('kunye-etiket-yazdirma', sorumluluklar)).toBeTrue();
    expect(menu.map((section) => section.children.map((item) => item.id))).toEqual([
      ['kunye-etiket-yazdirma']
    ]);
  });
});
