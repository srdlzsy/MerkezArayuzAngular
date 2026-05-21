import { Route, Routes } from '@angular/router';

import { DocsContentPage } from '../models/docs.models';

type DocsTaskLoadComponent = NonNullable<Route['loadComponent']>;
type DocsTaskRouteData = Readonly<Record<string, unknown>>;

export interface DocsTaskRouteSource {
  path: string;
  loadComponent: DocsTaskLoadComponent;
  data?: DocsTaskRouteData;
  isPrimary?: boolean;
}

export interface DocsTaskSource {
  page: DocsContentPage;
  routes: readonly DocsTaskRouteSource[];
  accessKeyAliases?: readonly string[];
}

function route(
  path: string,
  loadComponent: DocsTaskLoadComponent,
  options?: { data?: DocsTaskRouteData; isPrimary?: boolean }
): DocsTaskRouteSource {
  return {
    path,
    loadComponent,
    data: options?.data,
    isPrimary: options?.isPrimary ?? false
  };
}

function singleRouteTask(
  page: DocsContentPage,
  loadComponent: DocsTaskLoadComponent,
  options?: { accessKeyAliases?: readonly string[]; data?: DocsTaskRouteData; path?: string }
): DocsTaskSource {
  return {
    page,
    accessKeyAliases: options?.accessKeyAliases,
    routes: [
      route(options?.path ?? `docs/api/${page.id}`, loadComponent, {
        data: options?.data,
        isPrimary: true
      })
    ]
  };
}

function multiRouteTask(
  page: DocsContentPage,
  routes: readonly DocsTaskRouteSource[],
  accessKeyAliases?: readonly string[]
): DocsTaskSource {
  return {
    page,
    routes,
    accessKeyAliases
  };
}

function referenceTask(
  page: DocsContentPage,
  options?: { accessKeyAliases?: readonly string[]; data?: DocsTaskRouteData; path?: string }
): DocsTaskSource {
  return singleRouteTask(
    page,
    () =>
      import('../tasks/core/docs-reference-page/docs-reference-page.component').then(
        (m) => m.DocsReferencePageComponent
      ),
    options
  );
}

export const DOCS_TASK_SOURCE: Record<string, DocsTaskSource> = {
  'verilen-firma-siparisleri': singleRouteTask(
    {
      id: 'verilen-firma-siparisleri',
      title: 'Verilen Firma Siparisleri',
      subtitle:
        'Verilen firma siparisleri icin liste, detay ve olusturma akislarini yeni API uzerinden sunar.',
      baseRouteOrFile: '/api/siparis-islemleri/verilen-firma-siparisleri',
      highlights: ['Liste ekranina uygun', 'Detay ekranina uygun', 'Create endpointi aktif'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'VerilenFirmaSiparisleriController',
          description: 'Verilen firma siparisleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/verilen-firma-siparisleri?StartDate=...&EndDate=...',
              description: 'Verilen firma siparislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/verilen-firma-siparisleri/{seri}/{sira}',
              description: 'Verilen firma siparisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/verilen-firma-siparisleri',
              description: 'Yeni verilen firma siparisi olusturur',
              payload: 'CreateIssuedCompanyOrderHttpRequest'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/orders/verilen-siparisler/list/verilen-siparisler-list.component').then(
        (m) => m.VerilenSiparislerListComponent
      ),
    { accessKeyAliases: ['verilen-siparisler'] }
  ),
  'alinan-firma-siparisleri': singleRouteTask(
    {
      id: 'alinan-firma-siparisleri',
      title: 'Alinan Firma Siparisleri',
      subtitle: 'Alinan firma siparisleri icin liste, detay ve scaffold create akisi.',
      baseRouteOrFile: '/api/siparis-islemleri/alinan-firma-siparisleri',
      highlights: ['Liste', 'Detay', 'Ekleme'],
      listTitle: 'Controller',
      items: [
        {
          name: 'AlinanSiparislerController',
          description: 'Alinan siparisler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-firma-siparisleri?StartDate=...&EndDate=...',
              description: 'Alinan firma siparislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-firma-siparisleri/{seri}/{sira}',
              description: 'Alinan firma siparisi detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-firma-siparisleri/key/{documentKey}',
              description: 'Document key ile alinan firma siparisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/alinan-firma-siparisleri',
              description: 'Create aksiyonu backend tarafinda scaffold olarak gorunur',
              payload: 'CreateIssuedCompanyOrderHttpRequest'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/orders/alinan-siparisler/list/alinan-siparisler-list.component').then(
        (m) => m.AlinanSiparislerListComponent
      ),
    { accessKeyAliases: ['alinan-siparisler'] }
  ),
  'verilen-depo-siparisleri': singleRouteTask(
    {
      id: 'verilen-depo-siparisleri',
      title: 'Verilen Depo Siparisleri',
      subtitle: 'Verilen depo siparisleri yeni API route’lariyla liste, detay ve create akisini sunar.',
      baseRouteOrFile: '/api/siparis-islemleri/verilen-depo-siparisleri',
      highlights: ['Depo gorevi', 'Liste odakli', 'Create endpointi aktif'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'VerilenDepoSiparisleriController',
          description: 'Depo verilen siparisler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/verilen-depo-siparisleri?StartDate=...&EndDate=...',
              description: 'Verilen depo siparislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/verilen-depo-siparisleri/{seri}/{sira}',
              description: 'Verilen depo siparisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/verilen-depo-siparisleri',
              description: 'Yeni verilen depo siparisi olusturur',
              payload: 'CreateIssuedWarehouseOrderHttpRequest'
            }
          ]
        }
      ]
    },
    () =>
      import(
        '../tasks/orders/verilen-depo-siparisleri/list/verilen-depo-siparisleri-list.component'
      ).then((m) => m.VerilenDepoSiparisleriListComponent)
  ),
  'alinan-depo-siparisleri': singleRouteTask(
    {
      id: 'alinan-depo-siparisleri',
      title: 'Alinan Depo Siparisleri',
      subtitle: 'AlinanDepoSiparisleriController gorevi.',
      baseRouteOrFile: '/api/siparis-islemleri/alinan-depo-siparisleri',
      highlights: ['Depo alis gorevi', 'Liste odakli', 'Islem ekrani'],
      listTitle: 'Controller',
      items: [
        {
          name: 'AlinanDepoSiparisleriController',
          description: 'Depo alinan siparisler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-depo-siparisleri?StartDate=...&EndDate=...',
              description: 'Alinan depo siparislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-depo-siparisleri/{seri}/{sira}',
              description: 'Alinan depo siparisi detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/siparis-islemleri/alinan-depo-siparisleri/key/{documentKey}',
              description: 'Document key ile alinan depo siparisi detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/alinan-depo-siparisleri',
              description: 'Create aksiyonu backend tarafinda scaffold olarak gorunur',
              payload: 'CreateIssuedWarehouseOrderHttpRequest'
            }
          ]
        }
      ]
    },
    () =>
      import(
        '../tasks/orders/alinan-depo-siparisleri/list/alinan-depo-siparisleri-list.component'
      ).then((m) => m.AlinanDepoSiparisleriListComponent)
  ),
  'firma-mal-kabulleri': singleRouteTask(
    {
      id: 'firma-mal-kabulleri',
      title: 'Firma Mal Kabulleri',
      subtitle:
        'Firma mal kabul gecmisi, ETTN ile on-dolum ve siparis baglama create akisini kapsar.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/firma-mal-kabulleri',
      highlights: [
        'DocumentNo bos, prefix veya seri + 9 haneli sira formatinda olabilir',
        'Yeni create akisi dispatchQuantity ve acceptedQuantity alanlarini ayri gonderir',
        'Eksik kabul farki icin varsayilan olarak otomatik firma iadesi olusturulur',
        'ETTN endpointi create ekrani icin ust bilgi ve kalem on-dolumu saglar',
        'Siparisli ve siparissiz kalemler ayni fis icinde birlikte gonderilebilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'ToptanGirisIrsaliyeleriController',
          description:
            'Firma mal kabul gecmisi, detay, ETTN cozumleme ve create akisini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Yapilmis firma mal kabul fislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/{seri}/{sira}?warehouseNo=110',
              description: 'Secilen firma mal kabul fisinin salt-okunur detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/e-irsaliye/ettn/{ettn}?warehouseNo=110',
              description: 'ETTN ile resmi e-irsaliye ust bilgi, stok eslesmeleri ve cari onerilerini getirir'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri',
              description: 'Yeni firma mal kabul fisini olusturur',
              payload: 'CreateCompanyReceivingHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/mal-kabuller/firma',
              description: 'Firma mal kabul create endpoint aliasi',
              payload: 'CreateCompanyReceivingHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/offline-sync/{clientRequestId}',
              description: 'Offline retry icin create sonucunu sorgular'
            }
          ]
        }
      ],
      codeSample: `{
  "clientRequestId": "d8d0f3d6-5c62-4c67-b6b7-0f5d76b81b6f",
  "customerCode": "120.01.03106",
  "movementDate": "2026-04-20",
  "documentDate": "2026-04-20",
  "documentNo": "ST12026000002395",
  "deliverer": "Teslim Eden",
  "receiver": "Teslim Alan",
  "description": "",
  "allowOrderOverReceiving": false,
  "autoCreateReturnForPartialAcceptance": true,
  "lines": [
    {
      "stockCode": "015792",
      "dispatchQuantity": 10,
      "acceptedQuantity": 8,
      "unitPrice": 0,
      "unitPointer": 1,
      "lastConsumingDate": "2026-12-31",
      "orderGuid": "1bb2b4fe-b722-4e67-9d4b-050b6d87e800"
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/receiving/toptan-giris-irsaliyeleri/list/toptan-giris-irsaliyeleri-list.component'
      ).then((m) => m.ToptanGirisIrsaliyeleriListComponent),
    { accessKeyAliases: ['toptan-giris-irsaliyeleri'] }
  ),
  'depo-mal-kabulleri': singleRouteTask(
    {
      id: 'depo-mal-kabulleri',
      title: 'Depo Mal Kabulleri',
      subtitle:
        'Bekleyen gelen depo sevklerini ve depo iadelerini listeler, movementGuid bazli kabul yapar ve ETTN ile resmi e-irsaliye karsilastirmasini destekler.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/depo-mal-kabulleri',
      highlights: [
        'Bu ekran bos fis acmaz; bekleyen gelen sevklerden ve iadelerden create benzeri kabul akisi uretir',
        'isReturn false normal gelen depo sevkini, true gelen depo iadesini ifade eder',
        'Satir eslestirmesi movementGuid ile yapilmalidir',
        'ETTN endpointi resmi gelen e-irsaliye satirlarini on-karsilastirma icin kullanilir',
        'allowDiscrepancy false iken eksik/fazla kabul 409 Conflict ile engellenir',
        'allowDiscrepancy true iken fark sth_FormulMiktar uzerinde recorded-on-formula-quantity olarak izlenir',
        'Kabul islemi mevcut sevk satirlarini gunceller, yeni ana hareket acmaz'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DepolarArasiNakliyeMalKabulFisleriController',
          description:
            'Bekleyen gelen depo sevklerini ve depo iadelerini listeler, detay ve kabul komutlarini movementGuid bazli calistirir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Bekleyen gelen depo sevklerini ve iadelerini mal kabul listesi olarak getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/{seri}/{sira}?warehouseNo=110',
              description: 'Secilen bekleyen gelen sevk veya iade detayini ve kabul icin movementGuid satirlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/e-irsaliye/ettn/{ettn}?warehouseNo=110',
              description: 'Gelen e-irsaliye ust bilgi ve satirlarini depo kabul baglaminda karsilastirma icin getirir'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/{seri}/{sira}/kabul',
              description: 'Sayilan miktarlari movementGuid bazli kabul eder; fark varsa allowDiscrepancy kurali uygulanir',
              payload: 'AcceptWarehouseReceivingHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "allowDiscrepancy": false,
  "lines": [
    {
      "movementGuid": "8d4a5a77-1b3f-4f2a-93a1-b90a1b7d3c11",
      "receivedQuantity": 10
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/receiving/depolar-arasi-nakliye-mal-kabul-fisleri/list/depolar-arasi-nakliye-mal-kabul-fisleri-list.component'
      ).then((m) => m.DepolarArasiNakliyeMalKabulFisleriListComponent),
    { accessKeyAliases: ['depolar-arasi-nakliye-mal-kabul-fisleri'] }
  ),
  'mal-kabul-farklari': singleRouteTask(
    {
      id: 'mal-kabul-farklari',
      title: 'Mal Kabul Farklari',
      subtitle:
        'Kabul edilmis depo sevki veya depo iadesi satirlarinda sevk miktari ile kabul miktari farklarini listeler.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/mal-kabul-farklari',
      highlights: [
        'scope=accepted kullanicinin deposunun kabul ettigi evraklari listeler',
        'scope=created kullanicinin deposunun olusturdugu veya gonderdigi evraklari listeler',
        'Normal sevk ve depo iadesi ayni response icinde isReturn alanina gore ayrilir',
        'differenceQuantity = receivedQuantity - quantity mantigiyla hesaplanir',
        'Sadece kabul edilmis satirlar doner'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'MalKabulFarklariController',
          description:
            'Mal kabulde eksik veya fazla kabul edilen depo sevki/iadesi satirlarini tarih ve kapsam filtresiyle listeler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30&scope=accepted',
              description: 'Mal kabul farklarini accepted veya created kapsaminda listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/accepted?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Kullanicinin deposunun kabul ettigi evraklardaki farklari listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/created?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Kullanicinin deposunun olusturdugu veya gonderdigi evraklardaki farklari listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/kabul-ettigim?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'accepted kapsami icin Turkce alias'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/olusturdugum?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'created kapsami icin Turkce alias'
            }
          ]
        }
      ],
      codeSample: `[
  {
    "documentDate": "2026-04-10T00:00:00",
    "movementDate": "2026-04-10T00:00:00",
    "documentNo": "FRM2026600065140",
    "documentSerie": "F50",
    "documentOrderNo": 192188,
    "lineNo": 28,
    "movementGuid": "8d4a5a77-1b3f-4f2a-93a1-b90a1b7d3c11",
    "isReturn": false,
    "sourceWarehouseNo": 50,
    "sourceWarehouse": "PANAYIR PREMIUM",
    "targetWarehouseNo": 135,
    "targetWarehouse": "ALICI DEPO",
    "productCode": "019042",
    "productName": "COOK EKO BUYUK BUZDOLABI POS.30x42CM 80 YAP.*15",
    "unitName": "ADET",
    "unitPointer": 1,
    "quantity": 45,
    "receivedQuantity": 25,
    "differenceQuantity": -20,
    "differenceType": "missing",
    "description": ""
  }
]`
    },
    () =>
      import(
        '../tasks/receiving/mal-kabul-farklari/list/mal-kabul-farklari-list.component'
      ).then((m) => m.MalKabulFarklariListComponent),
    {
      accessKeyAliases: [
        'MalKabulFarklari',
        'kabul-ettigim',
        'olusturdugum',
        'mal-kabul-islemleri-mal-kabul-farklari'
      ]
    }
  ),
  'giden-firma-sevkleri': singleRouteTask(
    {
      id: 'giden-firma-sevkleri',
      title: 'Giden Firma Sevkleri',
      subtitle: 'Giden firma sevkleri icin liste, detay ve olusturma akisi.',
      baseRouteOrFile: '/api/sevk-islemleri/firma-sevkleri/giden',
      highlights: ['Sevk', 'Liste', 'Detay'],
      listTitle: 'Controller',
      items: [
        {
          name: 'ToptanCikisIrsaliyeleriController',
          description: 'Toptan cikis irsaliyeleri.'
        }
      ]
    },
    () =>
      import(
        '../tasks/shipment/toptan-cikis-irsaliyeleri/list/toptan-cikis-irsaliyeleri-list.component'
      ).then((m) => m.ToptanCikisIrsaliyeleriListComponent),
    { accessKeyAliases: ['toptan-cikis-irsaliyeleri'] }
  ),
  'gelen-firma-sevkleri': singleRouteTask(
    {
      id: 'gelen-firma-sevkleri',
      title: 'Gelen Firma Sevkleri',
      subtitle: 'Gelen firma sevkleri icin liste ve detay akisi.',
      baseRouteOrFile: '/api/sevk-islemleri/firma-sevkleri/gelen',
      highlights: ['Sevk', 'Liste', 'Detay'],
      listTitle: 'Controller',
      items: [
        {
          name: 'ToptanCikisFaturalariController',
          description: 'Toptan cikis faturalari.'
        }
      ]
    },
    () =>
      import(
        '../tasks/shipment/toptan-cikis-faturalari/list/toptan-cikis-faturalari-list.component'
      ).then((m) => m.ToptanCikisFaturalariListComponent),
    { accessKeyAliases: ['toptan-cikis-faturalari'] }
  ),
  'gelen-depolar-arasi-sevkler': singleRouteTask(
    {
      id: 'gelen-depolar-arasi-sevkler',
      title: 'Gelen Depolar Arasi Sevkler',
      subtitle: 'Hedef depo perspektifinden depolar arasi gelen sevk liste ve detay akisi.',
      baseRouteOrFile: '/api/sevk-islemleri/depolar-arasi-sevkler/gelen',
      highlights: ['Dagitim', 'Sevk', 'Depo operasyonu'],
      listTitle: 'Controller',
      items: [
        {
          name: 'DepoDagitimSevkFisleriController',
          description: 'Depo dagitim sevk fisleri.'
        }
      ]
    },
    () =>
      import(
        '../tasks/shipment/depo-dagitim-sevk-fisleri/list/depo-dagitim-sevk-fisleri-list.component'
      ).then((m) => m.DepoDagitimSevkFisleriListComponent),
    { accessKeyAliases: ['depo-dagitim-sevk-fisleri'] }
  ),
  'giden-depolar-arasi-sevkler': singleRouteTask(
    {
      id: 'giden-depolar-arasi-sevkler',
      title: 'Giden Depolar Arasi Sevkler',
      subtitle: 'Kaynak depo perspektifinden depolar arasi giden sevk liste, detay ve olusturma akisi.',
      baseRouteOrFile: '/api/sevk-islemleri/depolar-arasi-sevkler/giden',
      highlights: ['Nakliye', 'Depolar arasi', 'Sevk'],
      listTitle: 'Controller',
      items: [
        {
          name: 'DepolarArasiNakliyeSevkFisleriController',
          description: 'Depolar arasi nakliye sevk fisleri.'
        }
      ]
    },
    () =>
      import(
        '../tasks/shipment/depolar-arasi-nakliye-sevk-fisleri/list/depolar-arasi-nakliye-sevk-fisleri-list.component'
      ).then((m) => m.DepolarArasiNakliyeSevkFisleriListComponent),
    { accessKeyAliases: ['depolar-arasi-nakliye-sevk-fisleri'] }
  ),
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
        'movementType satir bazinda sth_tip kolonuna yazilir',
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
  'firma-iadeleri': singleRouteTask(
    {
      id: 'firma-iadeleri',
      title: 'Firma Iadeleri',
      subtitle: 'Firma iadeleri icin yeni iade API route’lariyla liste, detay ve create akisi sunulur.',
      baseRouteOrFile: '/api/iade-islemleri/firma-iadeleri',
      highlights: ['Iade', 'Firma', 'Liste ve detay', 'Create endpointi aktif'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'FirmaIadeleriController',
          description: 'Firma iadelerini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/iade-islemleri/firma-iadeleri?StartDate=...&EndDate=...',
              description: 'Firma iadelerini listeler'
            },
            {
              method: 'GET',
              path: '/api/iade-islemleri/firma-iadeleri/{seri}/{sira}',
              description: 'Firma iade detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/iade-islemleri/firma-iadeleri',
              description: 'Yeni firma iadesi olusturur'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/returns/firma-iade/list/firma-iade-list.component').then(
        (m) => m.FirmaIadeListComponent
      ),
    { accessKeyAliases: ['firma-iade'] }
  ),
  'giden-depo-iadeleri': singleRouteTask(
    {
      id: 'giden-depo-iadeleri',
      title: 'Giden Depo Iadeleri',
      subtitle: 'Kaynak sube perspektifinden depo iade listesi, detay ve olusturma ekrani.',
      baseRouteOrFile: '/api/iade-islemleri/depo-iadeleri/giden',
      highlights: ['Iade', 'Depo', 'Giden yon'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DepoIadeleriController',
          description: 'Giden depo iade islemleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/iade-islemleri/depo-iadeleri/giden?StartDate=...&EndDate=...',
              description: 'Giden depo iadelerini listeler'
            },
            {
              method: 'GET',
              path: '/api/iade-islemleri/depo-iadeleri/giden/{seri}/{sira}',
              description: 'Giden depo iade detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/iade-islemleri/depo-iadeleri/giden',
              description: 'Yeni giden depo iadesi olusturur'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/returns/depo-iade/list/depo-iade-list.component').then(
        (m) => m.DepoIadeListComponent
      ),
    { path: 'docs/api/giden-depo-iadeleri' }
  ),
  'gelen-depo-iadeleri': singleRouteTask(
    {
      id: 'gelen-depo-iadeleri',
      title: 'Gelen Depo Iadeleri',
      subtitle: 'Alici sube perspektifinden gelen depo iade listesi ve detay ekrani.',
      baseRouteOrFile: '/api/iade-islemleri/depo-iadeleri/gelen',
      highlights: ['Iade', 'Depo', 'Gelen yon'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DepoIadeleriController',
          description: 'Gelen depo iadeleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/iade-islemleri/depo-iadeleri/gelen?StartDate=...&EndDate=...',
              description: 'Gelen depo iadelerini listeler'
            },
            {
              method: 'GET',
              path: '/api/iade-islemleri/depo-iadeleri/gelen/{seri}/{sira}',
              description: 'Gelen depo iade detayini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/returns/depo-iade/list/depo-iade-list.component').then(
        (m) => m.DepoIadeListComponent
      ),
    { path: 'docs/api/gelen-depo-iadeleri' }
  ),
  'authorization-files': singleRouteTask(
    {
      id: 'authorization-files',
      title: 'Authorization Files',
      subtitle:
        'Operasyon export joblarini tetikler, durumlarini izler ve authorization file kayitlarini toplu gunceller.',
      baseRouteOrFile: '/api/operations',
      highlights: [
        'Queue tabanli export',
        'Job polling',
        'Authorization file grid',
        'Promofile queue/polling destegi'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'OperationsController',
          description:
            'Terazi, urun/barcode/PLU, kasiyer ve promosyon exportlerini job olarak baslatir; authorization file kayitlarini da ayni modulden yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/operations/scalesfile',
              description: 'Terazi export isini kuyruga alir'
            },
            {
              method: 'GET',
              path: '/api/operations/productbarcodeplunofile',
              description: 'Urun/barcode/PLU export isini kuyruga alir'
            },
            {
              method: 'GET',
              path: '/api/operations/cashierfile',
              description: 'Kasiyer export isini kuyruga alir'
            },
            {
              method: 'GET',
              path: '/api/operations/promofile',
              description: 'Promosyon ve yardimci POS dosyalari isini kuyruga alir'
            },
            {
              method: 'GET',
              path: '/api/operations/jobs/{jobId}',
              description: 'Job durumunu getirir'
            },
            {
              method: 'GET',
              path: '/api/operations/authorization-files',
              description: 'Authorization file kayitlarini listeler'
            },
            {
              method: 'POST',
              path: '/api/operations/authorization-files',
              description: 'Authorization file kayitlarini toplu kaydeder',
              payload: 'SaveAuthorizationFileHttpRequest[]'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/dosya-gonderimi/list/dosya-gonderimi-list.component').then(
        (m) => m.DosyaGonderimiListComponent
      ),
    { accessKeyAliases: ['operations', 'dosya-gonderimi'] }
  ),

  'axata-senkronizasyonu': singleRouteTask(
      {
        id: 'axata-senkronizasyonu',
        title: 'Axata Senkronizasyonu',
        subtitle:
          'Overview, fetch profile, live dispatch, AXATA native bridge ve manuel kurtarma akislarini tek panelde toplar.',
        baseRouteOrFile: '/api/integrations/axata-sync',
        highlights: [
          'Task overview + health probe',
          'Fetch profile explorer',
          'Preview, route-based execute ve POST /jobs',
          'Job polling',
          'Document bazli batch kurtarma',
          'Live dispatch',
          'AXATA native outbound/inbound bridge',
          'Manual incoming single ve batch recovery'
        ],
        listTitle: 'Endpointler ve Akislar',
        items: [
          {
            name: 'AxataSynchronizationController',
          description:
            'AXATA task katalogunu, preview akisini, execute joblarini ve manuel kurtarma endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/integrations/axata-sync',
              description: 'Task listesi, scheduler durumu ve son joblari getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/health',
              description: 'Kaynak SQL ve endpoint probe durumlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/fetch-profiles',
              description: 'Eski worker parity icin planlanan AXATA fetch/import profillerini listeler'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/tasks/{taskCode}/preview?warehouseNo=...&take=10',
              description: 'Secili task icin canli veriden preview payload olusturur'
            },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/tasks/{taskCode}/execute',
                description: 'Secili task icin DryRun veya Outbox job baslatir',
                payload: 'AxataSynchronizationExecuteTaskHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/jobs',
                description: 'Task kodunu body ile alip genel execute job baslatir',
                payload: 'AxataSynchronizationExecuteHttpRequest'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/jobs/{jobId}',
                description: 'Kuyruga alinan entegrasyon job detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/candidates?...',
              description: 'Manuel kurtarma icin evrak adaylarini listeler'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/preview',
              description: 'Tek evrak icin manuel preview payload dondurur',
              payload: 'AxataSynchronizationManualDocumentHttpRequest'
            },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/execute',
                description: 'Tek evrak icin manuel DryRun veya Outbox calistirir',
                payload: 'AxataSynchronizationManualDocumentExecuteHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/preview-batch',
                description: 'Birden fazla secili evrak icin toplu preview payload dondurur',
                payload: 'AxataSynchronizationManualDocumentBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/execute-batch',
                description: 'Birden fazla secili evrak icin toplu DryRun veya Outbox calistirir',
                payload: 'AxataSynchronizationManualDocumentBatchExecuteHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/dispatch',
                description: 'Secili tek evraki eski AXATA worker kontratina uygun canli SOAP dispatch ile gonderir',
                payload: 'AxataSynchronizationManualDocumentHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/dispatch-batch',
                description: 'Birden fazla secili evraki canli SOAP dispatch ile toplu gonderir',
                payload: 'AxataSynchronizationManualDocumentBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments',
                description: 'AXATA outbound delivery verisini Mikro depolar arasi sevke cevirir',
                payload: 'AxataOutboundDeliveryHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments/batch',
                description: 'Coklu AXATA outbound delivery kaydini toplu Mikro sevkine cevirir',
                payload: 'AxataOutboundDeliveryBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/inbound-atf/company-receivings',
                description: 'AXATA inbound ATF verisini Mikro firma mal kabule cevirir; native quantity kismi kabul farki olusturmaz',
                payload: 'AxataInboundAtfCompanyReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/inbound-atf/company-receivings/batch',
                description: 'Coklu AXATA inbound ATF kaydini toplu firma mal kabule cevirir; native quantity kismi kabul farki olusturmaz',
                payload: 'AxataInboundAtfCompanyReceivingBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/company-receivings',
                description: 'dispatchQuantity ve acceptedQuantity ayrimiyla kismi kabul destekleyen firma mal kabul payloadini Mikroya yazar',
                payload: 'CreateCompanyReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/company-receivings/batch',
                description: 'Kismi kabul destekleyen coklu firma mal kabul payloadlarini toplu yazar',
                payload: 'AxataManualIncomingCompanyReceivingBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/inventory-counts',
                description: 'AXATA kaynakli tekil sayim sonucunu Mikroya yazar',
                payload: 'CreateInventoryCountHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/inventory-counts/batch',
                description: 'AXATA kaynakli coklu sayim payloadlarini toplu yazar',
                payload: 'AxataManualIncomingInventoryCountBatchHttpRequest'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings?warehouseNo=...&startDate=...&endDate=...',
                description: 'Bekleyen depo mal kabullerini manuel kurtarma icin listeler'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/{documentSerie}/{documentOrderNo}?warehouseNo=...',
                description: 'Secili depo kabul evraginin satir detayini getirir'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/{documentSerie}/{documentOrderNo}/accept',
                description: 'Tek bekleyen depo mal kabul evragini manuel kabul eder',
                payload: 'AcceptWarehouseReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/accept-batch',
                description: 'Birden fazla bekleyen depo mal kabul evragini toplu kabul eder',
                payload: 'AxataManualIncomingWarehouseReceivingBatchHttpRequest'
              }
            ]
          }
        ],
      codeSample: `{
  "executionMode": "DryRun",
  "warehouseNo": 1
}`
    },
    () =>
      import(
        '../tasks/integration/axata-senkronizasyonu/list/axata-senkronizasyonu-list.component'
      ).then((m) => m.AxataSenkronizasyonuListComponent),
    {
      accessKeyAliases: [
        'axata-sync',
        'AxataSync',
        'AxataSenkronizasyonu',
        'integrations',
        'entegrasyon-islemleri'
      ]
    }
  ),
  'pos-muhasebe-aktarimi': singleRouteTask(
    {
      id: 'pos-muhasebe-aktarimi',
      title: 'POS Muhasebe Aktarimi',
      subtitle:
        'Z raporlari, POS faturalar, gider pusulalari ve kasa eslemeleri icin scaffold tabanli web omurgasi.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
      highlights: [
        'Tek menu, 4 tab',
        'Scaffold response odakli',
        '501 Not Implemented uyumlu UI',
        'Liste / detay / toplu islem ayrimi',
        'Staging ve ERP kavramlarini ayri tutar'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'PosMuhasebeAktarimiController',
          description:
            'POS muhasebe aktarimi ailesinin route ve request contractlarini acik tutar; business implementasyon sonraki fazda baglanacaktir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
              description: 'Menu overview scaffold response dondurur'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Z raporlari listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/{reportId}',
              description: 'Z raporu detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar',
              description: 'Z raporlarini staginge alma akisinin contracti hazirdir',
              payload: 'ImportZReportsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder',
              description: 'Z raporlarini ERPye gonderme akisinin contracti hazirdir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Z raporu staging temizleme akisinin contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
              description: 'POS faturalar listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
              description: 'POS fatura detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/ice-aktar',
              description: 'POS faturalarini staginge alma akisinin contracti hazirdir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/erpye-gonder',
              description: 'POS faturalarini ERPye gonderme akisinin contracti hazirdir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
              description: 'POS fatura header update contracti hazirdir',
              payload: 'UpdatePosAccountingDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
              description: 'POS fatura staging temizleme contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
              description: 'Gider pusulalari listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
              description: 'Gider pusulasi detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/ice-aktar',
              description: 'Gider pusulasi import contracti hazirdir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/erpye-gonder',
              description: 'Gider pusulasi ERP transfer contracti hazirdir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
              description: 'Gider pusulasi header update contracti hazirdir',
              payload: 'UpdatePosAccountingDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
              description: 'Gider pusulasi staging temizleme contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
              description: 'Kasa eslemeleri listesi icin scaffold response dondurur',
              payload: 'CashRegisterBranchMappingListHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
              description: 'Kasa eslemesi create contracti hazirdir',
              payload: 'CashRegisterBranchMappingHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri/{mappingId}',
              description: 'Kasa eslemesi update contracti hazirdir',
              payload: 'CashRegisterBranchMappingHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "moduleCode": "entegrasyon-islemleri",
  "menuCode": "pos-muhasebe-aktarimi",
  "actionCode": "list",
  "isImplemented": false,
  "message": "Bu endpoint iskelet olarak acildi. Is kurali ve Mikro veritabani entegrasyonu sonraki adimda baglanacak."
}`
    },
    () =>
      import(
        '../tasks/integration/pos-muhasebe-aktarimi/list/pos-muhasebe-aktarimi-list.component'
      ).then((m) => m.PosMuhasebeAktarimiListComponent),
    {
      accessKeyAliases: [
        'pos-muhasebe-aktarimi',
        'PosMuhasebeAktarimi',
        'entegrasyon-islemleri'
      ]
    }
  ),
  'fatura-goruntuleme': singleRouteTask(
    {
      id: 'fatura-goruntuleme',
      title: 'Fatura Goruntuleme',
      subtitle:
        'Manuel inbox senkronizasyonu, cache listeleme, documentId ile PDF acma, HTML detay/render ve yazdirildi durumunu ayri komutla guncelleme akislarini yeni API uzerinden sunar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-goruntuleme',
      highlights: [
        'POST senkronize ile cache guncelleme',
        'invoiceDate bazli liste',
        'documentId ile resmi PDF',
        'HTML detay /detail endpointinden alinir',
        'POST render override',
        'Yazdirildi komutu ayri endpoint',
        'Varsayilan belge acma Uyumsoft GetInboxInvoicePdf kullanir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceViewingController',
          description:
            'Uyumsoft inbox kayitlarini lokal cachee senkronize eder, cache listesini dondurur, belgeyi documentId ile PDF veya HTML detay olarak getirir ve printed guncellemesini ayri komutla yapar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme?StartDate=2026-05-01&EndDate=2026-05-05&isProcessed=-1&isPrinted=-1&SearchField=InvoiceId&SearchText=INV-2026&page=1&PageSize=50',
              description: 'Lokal cache uzerinden invoiceDate bazli, arama destekli sayfali fatura listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/senkronize',
              description: 'Secili tarih araligini Uyumsoft GetInboxInvoiceList ile cache tabloya senkronize eder'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}',
              description: 'Secili evragin resmi PDF datasini Uyumsoft GetInboxInvoicePdf ile getirir'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/pdf',
              description: 'PDF acma endpoint aliasi'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/detail',
              description: 'Secili evragin summary ve HTML render detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/render',
              description: 'Profil, embedded XSLT tercihi ve fallback davranisi ile belgeyi yeniden render eder',
              payload: 'InvoiceViewingRenderRequest'
            },
            {
              method: 'PATCH',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/printed',
              description: 'Secili belgeyi yazdirildi say veya printed durumunu geri al'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component').then(
        (m) => m.FaturaIslemleriListComponent
      ),
    {
      data: {
        workspace: 'viewing'
      }
    }
  ),
  'fatura-gonderimi': singleRouteTask(
    {
      id: 'fatura-gonderimi',
      title: 'Fatura Gonderimi',
      subtitle:
        'Bekleyen Mikro faturalarini listeleme, UBL onizleme, canli gonderim, outbox arama ve XML preview akislarini tek modulde toplar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-gonderimi',
      highlights: [
        'Bekleyen fatura listesi',
        'UBL onizleme ve POST render override',
        'Canli SendInvoice gonderimi',
        'Outbox arama',
        'Tekil outbox belge render',
        'XML preview'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceSendingController',
          description:
            'Mikro bekleyen faturalarini listeler, secili belgeyi render eder, Uyumsofta gonderir; ayrica outbox ve manuel preview araclarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi?StartDate=2026-05-01&EndDate=2026-05-05&Scenario=EFatura&isSent=0',
              description: 'Mikro tarafindaki bekleyen veya gonderilmis faturalari senaryo ve gonderim durumuna gore listeler'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}?scenario=EFatura',
              description: 'Secili bekleyen fatura icin UBL ve HTML onizleme detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/render',
              description: 'Secili bekleyen fatura icin senaryo ve XSLT ayarlarini override ederek belgeyi yeniden render eder',
              payload: 'InvoiceSendingRenderRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/send',
              description: 'Secili bekleyen faturalarni Uyumsoft SendInvoice ile canli ortama gonderir',
              payload: 'SendInvoiceDocumentsRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/outbox/search',
              description: 'Uyumsoft GetOutboxInvoices operasyonunu payloadXml ve parameters ile cagirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/outbox/{invoiceId}?profile=Auto&preferEmbeddedXslt=true',
              description: 'Secili outbox faturasini render edilmis belge olarak getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/preview',
              description: 'Ham xmlContent uzerinden html preview sonucu uretir',
              payload: 'InvoicePreviewHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "scenario": "EFatura",
  "documents": [
    {
      "documentSerie": "FAT",
      "documentOrderNo": 12345
    },
    {
      "documentSerie": "FAT",
      "documentOrderNo": 12346
    }
  ]
}`
    },
    () =>
      import('../tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component').then(
        (m) => m.FaturaIslemleriListComponent
      ),
    {
      data: {
        workspace: 'sending'
      }
    }
  ),
  'uyumsoft-e-fatura': singleRouteTask(
    {
      id: 'uyumsoft-e-fatura',
      title: 'Uyumsoft E Fatura',
      subtitle:
        'Uyumsoft BasicIntegration query modulu icin servis ozeti, operasyon listesi ve whitelist GET cagrilarini dokumante eder.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/uyumsoft/e-fatura',
      highlights: [
        'Servis ozet karti',
        'Operasyon explorer',
        'Scalar parameter + payloadXml',
        'Whitelist Get* operasyonlari'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UyumsoftEInvoiceController',
          description:
            'Uyumsoft e-fatura connected-service query ekraninin backend kaynak endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura',
              description: 'Servis ozeti ve desteklenen GET operasyonlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/operations',
              description: 'Sadece operasyon listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu query string ile calistirir'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu calistirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/system/date',
              description: 'Sik kullanilan sistem tarihi alias routeunu operationName secmeden cagirir'
            }
          ]
        }
      ],
      codeSample: `{
  "parameters": [
    {
      "name": "format",
      "value": "yyyy-MM-dd HH:mm:ss"
    }
  ]
}`
    },
    () =>
      import('../tasks/integration/uyumsoft-query/list/uyumsoft-query-list.component').then(
        (m) => m.UyumsoftQueryListComponent
      ),
    {
      accessKeyAliases: [
        'uyumsoftefatura',
        'UyumsoftEFatura',
        'uyumsoft-e-fatura',
        'uyumsoft-fatura-query'
      ]
    }
  ),
  'uyumsoft-e-irsaliye': singleRouteTask(
    {
      id: 'uyumsoft-e-irsaliye',
      title: 'Uyumsoft E Irsaliye',
      subtitle:
        'Uyumsoft BasicDespatchIntegration query modulu icin servis ozeti, operasyon listesi ve whitelist GET cagrilarini dokumante eder.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye',
      highlights: [
        'Servis ozet karti',
        'Despatch operasyon explorer',
        'Scalar parameter + payloadXml',
        'Whitelist Get* operasyonlari'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UyumsoftEDespatchController',
          description:
            'Uyumsoft e-irsaliye connected-service query ekraninin backend kaynak endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye',
              description: 'Servis ozeti ve desteklenen GET operasyonlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/operations',
              description: 'Sadece operasyon listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu query string ile calistirir'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu calistirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/system/date',
              description: 'Sik kullanilan sistem tarihi alias routeunu operationName secmeden cagirir'
            }
          ]
        }
      ],
      codeSample: `{
  "payloadXml": "<query><PageIndex>1</PageIndex><PageSize>20</PageSize><IsArchived>false</IsArchived></query>"
}`
    },
    () =>
      import('../tasks/integration/uyumsoft-query/list/uyumsoft-query-list.component').then(
        (m) => m.UyumsoftQueryListComponent
      ),
    {
      accessKeyAliases: [
        'uyumsofteirsaliye',
        'UyumsoftEIrsaliye',
        'uyumsoft-e-irsaliye',
        'uyumsoft-irsaliye-query'
      ]
    }
  ),
  'etiket-belgeleri': singleRouteTask(
    {
      id: 'etiket-belgeleri',
      title: 'Etiket Belgeleri',
      subtitle:
        'Tarih, belge ve manuel urun ekleme kaynaklarini kullanarak etiket onizleme ve baski alma gorevi.',
      baseRouteOrFile: '/api/kasa-islemleri/etiket-belgeleri',
      highlights: ['Tarihe gore urun etiketi', 'Belge bazli yukleme', 'Baski onizleme ve yazdirma'],
      listTitle: 'Etiket Basim Islem Akisi',
      items: [
        {
          name: 'EtiketBasimController',
          description:
            'Etiket verisi toplama, son belge listesi ve promosyon tabanli baski akisi.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/fiyati-degisen-urunler?dateTimeFilter=...',
              description: 'Belirli zamandan sonra fiyati degisen urunleri getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/{documentId}',
              description: 'Belge numarasina gore etiket satirlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/son?warehouseNo=...&take=10',
              description: 'Depoya ait son 10 belgeyi listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/etiketler?dateToGet=...',
              description: 'Secilen gun icin kunye/tag kayitlarini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/etiket-basimi/list/etiket-basimi-list.component').then(
        (m) => m.EtiketBasimiListComponent
      ),
    { accessKeyAliases: ['etiket-basimi', 'EtiketBasim', 'EtiketBasimi'] }
  ),
  'kunye-etiket-yazdirma': singleRouteTask(
    {
      id: 'kunye-etiket-yazdirma',
      title: 'Kunye Etiket Yazdirma',
      subtitle:
        'Kasa Islemleri altindaki tarih bazli kunye etiket onizleme ve yazdirma gorevi.',
      baseRouteOrFile: '/api/kasa-islemleri/kunye-etiket-yazdirma',
      highlights: [
        'JWT deposuna gore kunye etiket kayitlari',
        'Onizleme ve yazdirma',
        'LabelTagDto response modeli'
      ],
      listTitle: 'Kunye Etiket Yazdirma Akisi',
      items: [
        {
          name: 'KunyeEtiketYazdirmaController',
          description:
            'Kunye bazli etiket verisi toplama, onizleme ve yazdirma endpointini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kunye-etiket-yazdirma?dateToGet=...',
              description: 'Secilen gun icin kullanici deposuna ait kunye etiket kayitlarini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/kunye-etiket-yazdirma/list/kunye-etiket-basimi-list.component').then(
        (m) => m.KunyeEtiketBasimiListComponent
      ),
    { accessKeyAliases: ['kunye-etiket-yazdirma', 'KunyeEtiketYazdirma'] }
  ),
  'kasa-sayimlari': multiRouteTask(
    {
      id: 'kasa-sayimlari',
      title: 'Kasa Sayimlari',
      subtitle:
        'Kasa sayimi listesi, lookup yardimcilari ve CreateCashSummaryHttpRequest tabanli olusturma akisi.',
      baseRouteOrFile: '/api/kasa-islemleri/kasa-sayimlari | /api/kasa-islemleri/kasa-sayimlari/rapor',
      highlights: [
        'WarehouseNo body icinde opsiyoneldir ve JWT deposuyla ayni olmali',
        'En az bir paymentTypes veya storeExpenses satiri zorunludur',
        'Belge serisi backend tarafinda KS{loginDepoNo} olarak uretilir'
      ],
      listTitle: 'Olusturma ve Liste Endpointleri',
      items: [
        {
          name: 'KasaSayimlariController',
          description: 'Gunluk kasa icmal kayitlarini, raporunu, detaylarini ve create akislarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari?dateToGet=...',
              description: 'Secilen gunun kasa sayim satirlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/rapor?dateToGet=...',
              description: 'Gunluk depo bazli icmal raporunu getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/detaylar',
              description: 'Icmal odeme detaylarini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-sayimlari',
              description: 'Yeni kasa sayimi olusturur',
              payload: 'CreateCashSummaryHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/detaylar',
              description: 'Icmal odeme satirlarini gunceller',
              payload: 'UpdateCashSummaryDetailsHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/banknot-hareketleri',
              description: 'Banknot satirlarini gunceller',
              payload: 'UpdateCashSummaryBanknotesHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}',
              description: 'Kasa sayimi kaydini siler'
            }
          ]
        },
        {
          name: 'Lookup Endpointleri',
          description: 'Create ekraninda kasiyer, kasa, banknot ve odeme tipi yardimcilari icin kullanilir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/kasiyerler?filterString=mehmet',
              description: 'Kasiyer arama yardimcisini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/kasalar?branchNo=110',
              description: 'Secili depoya ait kasa listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/banknot-tipleri',
              description: 'Banknot tiplerini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/hediye-ceki-tipleri',
              description: 'Hediye ceki tiplerini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/odeme-tipleri/banka?cashRegisterNo=CR-01',
              description: 'Banka odeme tipi lookup kayitlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/z-rapor-toplam?documentSerie=KS110&warehouseNo=110&zReportNo=125&cashNo=1',
              description: 'Paylasim klasorundeki Z raporundan NET CIRO degerini okumaya calisir'
            }
          ]
        }
      ],
      codeSample: `{
  "cashNo": 1,
  "zReportNo": 125,
  "cashierNo": 1001,
  "managerNo": 1002,
  "zTotalValue": 15340.5,
  "total": 15340.5,
  "summaryDate": "2026-04-24",
  "giftCheckMovements": [],
  "banknoteMovements": [
    {
      "banknoteType": 1,
      "quantity": 20,
      "total": 4000,
      "value": 200
    }
  ],
  "paymentTypes": [
    {
      "paymentName": "Nakit",
      "paymentTypeNo": 1,
      "accountCode": "",
      "terminalId": "",
      "slipNumber": 0,
      "amountValue": 11340.5
    }
  ],
  "storeExpenses": []
}`
    },
    [
      route(
        'docs/api/kasa-sayimlari/ekle',
        () =>
          import('../tasks/cash-register/icmal-dokumu/create/icmal-dokumu-create.component').then(
            (m) => m.IcmalDokumuCreateComponent
          ),
        {
          data: { title: 'Kasa Sayimi Olustur' }
        }
      ),
      route(
        'docs/api/kasa-sayimlari',
        () =>
          import('../tasks/cash-register/icmal-dokumu/list/icmal-dokumu-list.component').then(
            (m) => m.IcmalDokumuListComponent
          ),
        {
          isPrimary: true
        }
      )
    ],
    ['icmal-dokumu']
  ),
  'banknot-takipleri': singleRouteTask(
    {
      id: 'banknot-takipleri',
      title: 'Banknot Takipleri',
      subtitle:
        'Gunluk fiziksel para teslim kayitlarini liste, detay ve create rotalariyla ayri Kasa gorevi olarak sunar.',
      baseRouteOrFile: '/api/kasa-islemleri/banknot-takipleri',
      highlights: [
        'Kasa sayimlari altindan ayrilan yeni route ailesidir',
        'warehouseNo = 1 tum depolari listeler',
        'differenceAmount deliveryTotalAmount - totalAmount olarak gelir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'BanknotTakipleriController',
          description: 'Gunluk banknot teslim ve toplam kayitlarini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/banknot-takipleri?dateToGet=2026-04-24&warehouseNo=110',
              description: 'Secilen gun icin banknot takip kayitlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/banknot-takipleri/{banknoteTrackId}',
              description: 'Banknot takip kaydinin detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/banknot-takipleri',
              description: 'Gunluk banknot teslim kaydi olusturur',
              payload: 'CreateBanknoteTrackHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "banknoteTrackDate": "2026-04-24",
  "totalAmount": 12000,
  "deliveryTotalAmount": 11850,
  "deliverer": "Teslim Eden",
  "receiver": "Teslim Alan"
}`
    },
    () =>
      import('../tasks/cash-register/banknot-takipleri/list/banknot-takipleri-list.component').then(
        (m) => m.BanknotTakipleriListComponent
      ),
    { accessKeyAliases: ['banknot-takip', 'BanknotTakipleri'] }
  ),
  'kasa-cirolari': singleRouteTask(
    {
      id: 'kasa-cirolari',
      title: 'Kasa Cirolari',
      subtitle:
        'Yeni, eski ve toplam kasa ciro rotalarini liste, sube bazli ozet ve detay gorunumleriyle sunar.',
      baseRouteOrFile:
        '/api/kasa-islemleri/kasa-cirolari | /api/kasa-islemleri/kasa-cirolari/yeni | /api/kasa-islemleri/kasa-cirolari/eski | /api/kasa-islemleri/kasa-cirolari/toplam | /api/kasa-islemleri/kasa-cirolari/ozet',
      highlights: [
        'Liste request modeli WarehouseOrderDateRangeHttpRequest yapisindadir',
        'Liste tarafinda warehouseNo verilmezse JWT icindeki kullanici deposu kullanilir',
        'Ozet tarafinda warehouseNo verilmezse tum subeler, verilirse tek sube doner',
        'Yeni kasa rotalari ShopigoCiroConnection ile SHOPIGO kaynagindan okunur',
        'Eski kasa rotalari Summaries ve ozet tarafinda TurnoverTotals/TurnoverDetails kaynaklarini kullanir',
        'source alani satirin new veya old kaynagini gosterir',
        'netCollectionAmount backend tarafinda hesaplanir ve detay kaydi yoksa 404 doner'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'KasaCirolariController',
          description:
            'Kasa cirolarini vardiya ve kasiyer bazinda aggregate eder; yeni, eski ve toplam rotalarda ayni response modelini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Ana rota yeni kasa cirolarini vardiya ve kasiyer bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Yeni kasa cirolarini vardiya ve kasiyer bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Klasik Mikro Summaries kaynagindaki eski kasa cirolarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Yeni ve eski kasa cirolarini ayni response modelinde birlikte listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Ana rota yeni kasa verisini sube bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Yeni kasa cirolarini sube bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Eski kasa cirolarini TurnoverTotals ve TurnoverDetails kaynagindan ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Yeni ve eski kasa verilerini sube bazinda birlestirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Ana detay rotasi yeni kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Yeni kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Eski kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Toplam akista secilen kaydin odeme tipi ve kasa-banka kirilimini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "header": {
    "businessDate": "2026-05-01T00:00:00",
    "warehouseNo": 110,
    "warehouseName": "KESTEL 1",
    "shiftNo": 1,
    "cashierCode": "1001",
    "cashierName": "MEHMET YILMAZ",
    "productLineCount": 124,
    "totalSalesQuantity": 187.5,
    "totalSalesAmount": 25640.75,
    "paymentLineCount": 18,
    "totalCollectionAmount": 25640.75,
    "totalCustomerCommission": 142.3,
    "netCollectionAmount": 25498.45,
    "source": "new"
  },
  "payments": [
    {
      "paymentTypeNo": 1,
      "paymentTypeName": "Nakit",
      "cashBankCode": "KASA-01",
      "cashBankName": "MAGAZA KASA 1",
      "paymentLineCount": 5,
      "amount": 14320.5,
      "customerCommission": 0,
      "netAmount": 14320.5,
      "source": "new"
    }
  ]
}`
    },
    () =>
      import('../tasks/cash-register/kasa-cirolari/list/kasa-cirolari-list.component').then(
        (m) => m.KasaCirolariListComponent
      )
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
  ),
  kullanicilar: multiRouteTask(
    {
      id: 'kullanicilar',
      title: 'Kullanicilar',
      subtitle: 'Kullanici listeleme, detay, guncelleme ve rol atama akisi yeni auth/users API modeliyle ilerler.',
      baseRouteOrFile: '/api/auth/register | /api/users',
      highlights: ['Kullanici', 'Yonetim', 'Rol atama', 'Update endpointi aktif'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UsersController',
          description: 'Kullanici listeleme, detay ve guncelleme endpointleri.',
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/register',
              description: 'Yeni kullanici ekler',
              payload: 'RegisterUserRequest'
            },
            {
              method: 'GET',
              path: '/api/users',
              description: 'Tum kullanicilari listeler'
            },
            {
              method: 'GET',
              path: '/api/users/{id}',
              description: 'Secilen kullanicinin detayini getirir'
            },
            {
              method: 'PUT',
              path: '/api/users/{id}',
              description: 'Kullaniciyi gunceller',
              payload: 'UpdateUserBody'
            },
            {
              method: 'POST',
              path: '/api/users/{id}/roles',
              description: 'Kullaniciya rol atar'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/kullanicilar/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Kullanici Detay ve Rol Atama' }
        }
      ),
      route(
        'docs/api/kullanicilar/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Kullanici Ekle' }
        }
      ),
      route(
        'docs/api/kullanicilar',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ],
    ['kullanici']
  ),
  roller: multiRouteTask(
    {
      id: 'roller',
      title: 'Roller',
      subtitle: 'Rol listesi, metadata guncelleme ve permission atama akisi roles API modeliyle calisir.',
      baseRouteOrFile: '/api/roles | /api/roles/{id}/permissions',
      highlights: ['Rol yonetimi', 'Create', 'Update', 'Permission atama'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'RolesController',
          description: 'Rol listeleme ve role permission atama endpointleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/roles',
              description: 'Tum rolleri listeler'
            },
            {
              method: 'POST',
              path: '/api/roles',
              description: 'Yeni rol olusturur',
              payload: 'SaveRoleBody'
            },
            {
              method: 'PUT',
              path: '/api/roles/{id}',
              description: 'Rolu gunceller',
              payload: 'SaveRoleBody'
            },
            {
              method: 'POST',
              path: '/api/roles/{id}/permissions',
              description: 'Role permission atar'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/roller/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Rol Detay ve Permission Atama' }
        }
      ),
      route(
        'docs/api/roller/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Rol Olustur' }
        }
      ),
      route(
        'docs/api/roller',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ]
  ),
  yetkiler: multiRouteTask(
    {
      id: 'yetkiler',
      title: 'Yetkiler',
      subtitle: 'Permission listesi, katalog gorunumu ve metadata guncelleme akisi permissions API modeliyle calisir.',
      baseRouteOrFile: '/api/permissions | /api/permissions/catalog',
      highlights: ['Permission katalogu', 'Create', 'Update', 'Module > menu > action'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'PermissionsController',
          description: 'Permission katalogu ve permission listeleme endpointleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/permissions/catalog',
              description: 'Tum module-menu-action agacini getirir'
            },
            {
              method: 'GET',
              path: '/api/permissions',
              description: 'Permission listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/permissions',
              description: 'Yeni permission olusturur',
              payload: 'SavePermissionBody'
            },
            {
              method: 'PUT',
              path: '/api/permissions/{id}',
              description: 'Permission kaydini gunceller',
              payload: 'SavePermissionBody'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/yetkiler/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Permission Detay ve Katalog' }
        }
      ),
      route(
        'docs/api/yetkiler/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Permission Olustur' }
        }
      ),
      route(
        'docs/api/yetkiler',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ]
  ),
  'cari-bul': singleRouteTask(
    {
      id: 'cari-bul',
      title: 'Cari Bul',
      subtitle: 'Barkoddan cari/firma bulma ve oneriler; arama islemleri altinda hizli arama ekrani.',
      baseRouteOrFile: '/api/arama-islemleri/cari-bul',
      highlights: [
        'Barkod bazli cari arama',
        'Varsayilan tedarikci bilgisi',
        'Yakin gecmis stok hareketleri',
        'Firma onerileri'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AramaIslemleriController',
          description: 'Cari/firma arama ve bulma islemleri. Barkoddan stok eslestirip varsayilan tedarikci ve onerilen firmalar dondurur.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/arama-islemleri/cari-bul?barcode=8690000000000&warehouseNo=110&take=10',
              description: 'Barkod ile cari/firma bulur ve varsayilan tedarikci ile yakin gecmis onerilerini dondurur'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/barkodlar/8690000000000/cariler?warehouseNo=110&take=10',
              description: 'Barkod odakli alias; ayni islevle cari onerileri getirir'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/urunler/015550/cari-onerileri?take=10',
              description: 'Stok kodundan cari onerilerini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "isProductFound": true,
  "stockCode": "015550",
  "stockName": "Stok Adi",
  "defaultSupplierCode": "120.01.03106",
  "defaultSupplierName": "ORNEK TEDARIKCI",
  "suggestions": [
    {
      "customerCode": "120.01.03106",
      "customerName": "ORNEK TEDARIKCI",
      "isDefaultSupplier": true,
      "movementCount": 8,
      "lastMovementDate": "2026-05-01T00:00:00"
    }
  ]
}`
    },
    () =>
      import('../tasks/arama-islemleri/cari-bul/list/cari-bul-list.component').then(
        (m) => m.CariBulListComponent
      ),
    { accessKeyAliases: ['arama-islemleri-cari-bul', 'cari-ara', 'firma-bul'] }
  ),
  'fiyat-gor': singleRouteTask(
    {
      id: 'fiyat-gor',
      title: 'Fiyat Gor',
      subtitle: 'Hizli fiyat sorgu ekrani; barkod, stok kodu veya urun adi ile fiyat aramasi yapabilir.',
      baseRouteOrFile: '/api/arama-islemleri/fiyat-gor',
      highlights: [
        'Barkod ile fiyat sorgusu',
        'Stok kodu ile fiyat arama',
        'Urun adi ile arama',
        'Mikro fiyat proseduru'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AramaIslemleriController',
          description: 'Fiyat arama ve goruntuleme islemleri. Ayni Mikro fiyat arama prosedurunu kullanir ve urun/fiyat bilgisini dondurur.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/arama-islemleri/fiyat-gor?warehouseNo=110&barcode=8690000000000',
              description: 'Barkod uzerinden fiyat sorgusu yapar'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/fiyat-gor?warehouseNo=110&stockCode=015550',
              description: 'Stok kodu uzerinden fiyat sorgusu yapar'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/fiyat-gor?warehouseNo=110&stockName=sut&take=20',
              description: 'Urun adinda contains arama ile fiyat listesi getirir'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/barkodlar/8690000000000/fiyat?warehouseNo=110&take=20',
              description: 'Barkod odakli alias; fiyat bilgisini dondurur'
            }
          ]
        }
      ],
      codeSample: `{
  "warehouseNo": 110,
  "barcode": "8690000000000",
  "stockCode": "015550",
  "stockName": "Stok Adi",
  "price": 125.5,
  "priceTypeCode": 1,
  "unitName": "AD",
  "unitMultiplier": 1,
  "secondaryUnitName": "KOLI",
  "secondaryUnitMultiplier": 12,
  "isSalesBlocked": false,
  "isOrderBlocked": false,
  "isGoodsAcceptanceBlocked": false
}`
    },
    () =>
      import('../tasks/arama-islemleri/fiyat-gor/list/fiyat-gor-list.component').then(
        (m) => m.FiyatGorListComponent
      ),
    { accessKeyAliases: ['arama-islemleri-fiyat-gor', 'fiyat-ara', 'fiyat-sorgula'] }
  )
};

export function getDocsTaskSourceEntries(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Array<[string, DocsTaskSource]> {
  return Object.entries(source);
}

export function buildDocsPagesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Record<string, DocsContentPage> {
  return Object.fromEntries(
    getDocsTaskSourceEntries(source).map(([taskId, definition]) => [taskId, definition.page])
  ) as Record<string, DocsContentPage>;
}

export function buildTaskRoutesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Routes {
  return getDocsTaskSourceEntries(source).flatMap(([taskId, definition]) =>
    definition.routes.map((taskRoute) => ({
      path: taskRoute.path,
      loadComponent: taskRoute.loadComponent,
      data: {
        taskId,
        ...(taskRoute.data ?? {})
      }
    }))
  );
}

export function getPrimaryTaskRoutePath(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): string {
  const task = source[taskId];
  const primaryRoute = task?.routes.find((route) => route.isPrimary) ?? task?.routes[0];

  return primaryRoute?.path ?? `docs/api/${taskId}`;
}

export function getTaskAccessKeyAliases(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): readonly string[] {
  return source[taskId]?.accessKeyAliases ?? [];
}
