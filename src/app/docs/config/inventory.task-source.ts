import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const INVENTORY_TASK_SOURCE = {
  'masraf-fisleri': singleRouteTask(
    {
      id: 'masraf-fisleri',
      title: 'Masraf Fisleri',
      subtitle: 'Masraf fisleri icin liste, detay ve olusturma akisi.',
      baseRouteOrFile: '/api/stok-islemleri/masraf-fisleri',
      highlights: [
        'warehouseNo body icinden alinmaz; JWT icindeki kullanici deposu kullanilir',
        'sth_isemri_gider_kodu backend tarafinda sabit 0032 yazilir',
        'creator ve acceptor hareket grup kodlarina yazilir',
        'documentSerie backend tarafinda F{loginKullaniciDepoNo} olarak uretilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'SarfDepoCikisFisleriController',
          description: 'Masraf fisleri icin liste, detay ve create endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/stok-islemleri/masraf-fisleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Masraf fislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/stok-islemleri/masraf-fisleri/{seri}/{sira}?warehouseNo=110',
              description: 'Masraf fisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/stok-islemleri/masraf-fisleri',
              description: 'Yeni masraf fisi olusturur',
              payload: 'CreateStockReceiptHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "creator": "VARDIYA-2",
  "acceptor": "SEF-02",
  "movementDate": "2026-04-21",
  "documentDate": "2026-04-21",
  "documentNo": "",
  "description": "Ic tuketim masrafi",
  "lines": [
    {
      "stockCode": "018888",
      "quantity": 5,
      "unitPointer": 1,
      "description": "",
      "partyCode": "",
      "lotNo": 0,
      "projectCode": ""
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/inventory/sarf-depo-cikis-fisleri/list/sarf-depo-cikis-fisleri-list.component'
      ).then((m) => m.SarfDepoCikisFisleriListComponent),
    { accessKeyAliases: ['sarf-depo-cikis-fisleri'] }
  ),
  'zayiat-fisleri': singleRouteTask(
    {
      id: 'zayiat-fisleri',
      title: 'Zayiat Fisleri',
      subtitle: 'Zayiat fisleri icin liste, detay ve olusturma akisi.',
      baseRouteOrFile: '/api/stok-islemleri/zayiat-fisleri',
      highlights: [
        'warehouseNo body icinden alinmaz; JWT icindeki kullanici deposu kullanilir',
        'backend STOK_HAREKETLERI icin sth_cins = 4 olarak kayit yazar',
        'creator ve acceptor hareket grup kodlarina yazilir',
        'documentSerie backend tarafinda F{loginKullaniciDepoNo} olarak uretilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'FireDepoCikisFisleriController',
          description: 'Zayiat fisleri icin liste, detay ve create endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/stok-islemleri/zayiat-fisleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Zayiat fislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/stok-islemleri/zayiat-fisleri/{seri}/{sira}?warehouseNo=110',
              description: 'Zayiat fisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/stok-islemleri/zayiat-fisleri',
              description: 'Yeni zayiat fisi olusturur',
              payload: 'CreateStockReceiptHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "creator": "VARDIYA-1",
  "acceptor": "SEF-01",
  "movementDate": "2026-04-21",
  "documentDate": "2026-04-21",
  "documentNo": "",
  "description": "Gun sonu zayiat",
  "lines": [
    {
      "stockCode": "015792",
      "quantity": 2,
      "unitPointer": 1,
      "description": "",
      "partyCode": "",
      "lotNo": 0,
      "projectCode": ""
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/inventory/fire-depo-cikis-fisleri/list/fire-depo-cikis-fisleri-list.component'
      ).then((m) => m.FireDepoCikisFisleriListComponent),
    { accessKeyAliases: ['fire-depo-cikis-fisleri'] }
  ),
  virmanlar: singleRouteTask(
    {
      id: 'virmanlar',
      title: 'Virmanlar',
      subtitle: 'Virmanlar icin liste, detay ve olusturma akisi.',
      baseRouteOrFile: '/api/stok-islemleri/virmanlar',
      highlights: [
        'warehouseNo body icinden alinmaz; JWT icindeki kullanici deposu kullanilir',
        'movementType satir bazinda sth_tip kolonuna yazilir; 2 gonderilirse backend giris ve cikis olarak iki stok hareketi acar',
        'giris ve cikis depo no eski yapiya uygun olarak kullanici deposuna yazilir',
        'documentSerie backend tarafinda F{loginKullaniciDepoNo} olarak uretilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'StokVirmanCikisFisleriController',
          description: 'Virman fisleri icin liste, detay ve create endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/stok-islemleri/virmanlar?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Virman evraklarini listeler'
            },
            {
              method: 'GET',
              path: '/api/stok-islemleri/virmanlar/{seri}/{sira}?warehouseNo=110',
              description: 'Virman detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/stok-islemleri/virmanlar',
              description: 'Yeni virman evragi olusturur',
              payload: 'CreateVirmanHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "movementDate": "2026-04-21",
  "documentDate": "2026-04-21",
  "documentNo": "",
  "description": "Reyon duzenleme virmani",
  "lines": [
    {
      "stockCode": "015792",
      "movementType": 2,
      "quantity": 3,
      "unitPointer": 1,
      "description": "",
      "partyCode": "",
      "lotNo": 0,
      "projectCode": ""
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/inventory/stok-virman-cikis-fisleri/list/stok-virman-cikis-fisleri-list.component'
      ).then((m) => m.StokVirmanCikisFisleriListComponent),
    { accessKeyAliases: ['stok-virman-cikis-fisleri'] }
  ),
  'sayim-sonuclari': singleRouteTask(
    {
      id: 'sayim-sonuclari',
      title: 'Sayim Sonuclari',
      subtitle: 'Sayim sonuclari icin yeni stok API route’lariyla liste, detay ve create akisi.',
      baseRouteOrFile: '/api/stok-islemleri/sayim-sonuclari',
      highlights: [
        'Detay acarken documentNo ile birlikte documentDate query parametresi zorunludur',
        'Mobil offline pilotta request icin clientRequestId uretilir',
        'Barkod bos gonderilirse backend stok kodundan barkod bulmaya calisabilir'
      ],
      listTitle: 'Islem Adimlari',
      items: [
        {
          name: 'SayimSonuclariController',
          description:
            'Sayim sonucu gecmisini listeler, belge tarihi ile detay verir ve create endpointini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/stok-islemleri/sayim-sonuclari?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Sayim sonuclarini listeler'
            },
            {
              method: 'GET',
              path: '/api/stok-islemleri/sayim-sonuclari/{documentNo}?documentDate=2026-04-21&warehouseNo=110',
              description: 'Belge no ve belge tarihi ile detay getirir'
            },
            {
              method: 'POST',
              path: '/api/stok-islemleri/sayim-sonuclari',
              description: 'Yeni sayim sonucu ekler',
              payload: 'CreateInventoryCountHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "clientRequestId": "7c9b31f6-1ab4-4ed1-b02b-2a90e5e7d3fd",
  "name": "Nisan 2026 Genel Sayim",
  "documentDate": "2026-04-21",
  "lines": [
    {
      "stockCode": "015792",
      "quantity": 24,
      "barcode": "8690000000012",
      "unitPointer": 1
    },
    {
      "stockCode": "018888",
      "quantity": 5,
      "unitPointer": 1
    }
  ]
}`
    },
    () =>
      import('../tasks/counting/sayim-sonuclari/list/sayim-sonuclari-list.component').then(
        (m) => m.SayimSonuclariListComponent
      )
  )
} as const satisfies Record<string, DocsTaskSource>;
