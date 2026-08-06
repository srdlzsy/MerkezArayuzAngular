import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const GREEN_GROCER_TASK_SOURCE = {
  'green-grocer-reports': singleRouteTask(
    {
      id: 'green-grocer-reports',
      title: 'Manav Yesillik Raporlari',
      subtitle:
        'Manav ve yesillik siparislerini genel, sube/evrak, urun ve yesillik kirilimlariyla yeni GreenGrocer API uzerinden listeler.',
      baseRouteOrFile: '/api/green-grocer/reports',
      highlights: [
        'Genel manav raporu typeCode ve urun bazinda toplar',
        'Sube/evrak raporu tembel subeleri lazyBranches ile ayri gosterir',
        'Urun raporu toplam miktar ve evrak kirilimini birlikte sunar',
        'Yesillik raporu yalnizca sto_model_kodu 12 olan satirlari listeler',
        'Update yetkisi olan kullanici son 24 saat icindeki manav siparislerini silebilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'GreenGrocerReportsController',
          description:
            'Eski Furpa.GreenGrocerWebUI manav/yesillik raporlarini yeni API kontratlariyla sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/green-grocer/reports/summary?date=2026-06-04',
              description: 'Genel manav raporunu urun/tip bazinda listeler'
            },
            {
              method: 'GET',
              path: '/api/green-grocer/reports?date=2026-06-04',
              description: 'Genel manav raporu alias rotasi'
            },
            {
              method: 'GET',
              path: '/api/green-grocer/reports/by-branch?date=2026-06-04',
              description: 'Manav raporunu sube ve evrak bazinda listeler'
            },
            {
              method: 'GET',
              path: '/api/green-grocer/reports/by-product?date=2026-06-04',
              description: 'Urunleri toplam miktar ve sube/evrak kirilimiyla listeler'
            },
            {
              method: 'GET',
              path: '/api/green-grocer/reports/greens?date=2026-06-04',
              description: 'Yalnizca yesillik satirlarini sube ve evrak bilgisiyle listeler'
            },
            {
              method: 'DELETE',
              path: '/api/green-grocer/orders?documentSerie=F110&documentOrderNo=1234&warehouseNo=110',
              description: 'Son 24 saat icindeki manav siparisi evrakini siler'
            }
          ]
        }
      ],
      codeSample: `{
  "items": [
    {
      "orderDate": "2026-06-04T00:00:00",
      "branchNo": 110,
      "branchName": "KESTEL 1",
      "documentSerie": "F110",
      "documentOrderNo": 1234,
      "typeCode": "10",
      "productCode": "016201",
      "productName": "ELMA",
      "quantity": 12
    }
  ],
  "lazyBranches": [
    {
      "branchNo": 120,
      "branchName": "ORNEK SUBE",
      "regionCode": "1"
    }
  ]
}`
    },
    () =>
      import('../tasks/green-grocer/manav-raporlari/list/manav-raporlari-list.component').then(
        (m) => m.ManavRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'green-grocer',
        'green-grocer.reports',
        'green-grocer.reports.list',
        'green-grocer-reports-list',
        'manav-yesillik-raporlari',
        'manav-raporlari',
        'yesillik-raporlari'
      ]
    }
  ),
  'green-grocer-product-case-profiles': singleRouteTask(
    {
      id: 'green-grocer-product-case-profiles',
      title: 'Manav Kasa Profilleri',
      subtitle:
        'Manav kasa/koli girislerini Mikro miktarina ceviren urun profillerini ve cozumleme onizlemesini yonetir.',
      baseRouteOrFile: '/api/green-grocer/product-case-profiles',
      highlights: [
        'Kasa, paket, adet, direkt KG ve sarf giris modlari desteklenir',
        'Etiket ortalamasi, manuel KG/kasa, sabit adet/kasa ve direkt miktar cevrimi yapar',
        'Feature kapaliysa profil ekrani kullaniciya blok durumunu gosterir',
        'Manav depo 56 icin varsayilan akista siparis satir GUID baglantisi kullanilmaz',
        'Cozumleme onizlemesi estimatedQuantity, guven ve hata/uyari bilgisini dondurur'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'GreenGrocerProductCaseProfilesController',
          description:
            'Manav urun kasa profillerini listeler, kaydeder, pasife alir ve sevk/siparis cozumleme onizlemesini verir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/green-grocer/product-case-profiles?search=KARPUZ&includeInactive=false&take=100',
              description: 'Manav kasa profillerini arama, aktiflik ve limit filtresiyle listeler'
            },
            {
              method: 'GET',
              path: '/api/green-grocer/product-case-profiles/{stockCode}',
              description: 'Tek urun icin profil detayini getirir'
            },
            {
              method: 'PUT',
              path: '/api/green-grocer/product-case-profiles/{stockCode}',
              description: 'Urunun manav kasa profilini olusturur veya gunceller'
            },
            {
              method: 'DELETE',
              path: '/api/green-grocer/product-case-profiles/{stockCode}',
              description: 'Profil kaydini pasife alir'
            },
            {
              method: 'POST',
              path: '/api/green-grocer/product-case-profiles/resolution-preview',
              description: 'Kasa/koli girisinin Mikro siparis miktarina nasil donusecegini onizler'
            },
            {
              method: 'POST',
              path: '/api/green-grocer/product-case-profiles/cozumleme-onizleme',
              description: 'Cozumleme onizleme alias rotasi'
            }
          ]
        }
      ],
      codeSample: `{
  "stockCode": "016201",
  "stockName": "KARPUZ",
  "inputQuantity": 3,
  "inputMode": "Case",
  "conversionMode": "LabelAverageKgPerCase",
  "microUnit": "KG",
  "estimatedQuantity": 11.25,
  "confidence": "High",
  "isUsable": true,
  "isOrderLinkable": false,
  "warnings": [],
  "errors": []
}`
    },
    () =>
      import(
        '../tasks/green-grocer/manav-kasa-profilleri/list/manav-kasa-profilleri-list.component'
      ).then((m) => m.ManavKasaProfilleriListComponent),
    {
      accessKeyAliases: [
        'green-grocer.product-case-profiles',
        'green-grocer.product-case-profiles.manage',
        'green-grocer-product-case-profiles',
        'manav-kasa-profilleri',
        'manav-kasa-cozumleme'
      ],
      requiredPermissionCodes: ['green-grocer.product-case-profiles.manage']
    }
  ),
  'green-grocer-operations': singleRouteTask(
    {
      id: 'green-grocer-operations',
      title: 'Manav Operasyon Paneli',
      subtitle:
        'Manav depo alis, MNV fark, sube talep, gercek sevk, son sayim ve guncel stok durumunu tek ekranda izler.',
      baseRouteOrFile: '/api/green-grocer/operations',
      highlights: [
        'Son 7 gun manav operasyon ozetiyle acilir',
        'Stok kodu, urun adi, tip ve depo kapsamiyla filtrelenir',
        'Satir detayi dialog icinde alis, sevk, sayim ve farklari gosterir',
        'MNV duzeltme yazimi once preview, sonra kaydet akisiyle ilerler',
        'Create yetkisi olmayan kullanicida duzeltme butonu acilmaz'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'GreenGrocerOperationsController',
          description:
            'Manav operasyon ozetini listeler ve yetkili kullanicida kontrollu MNV stok duzeltmesi yazar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/green-grocer/operations/overview?warehouseNo=56&startDate=2026-08-01&endDate=2026-08-04',
              description: 'Manav operasyon ozetini stok satiri bazinda getirir'
            },
            {
              method: 'POST',
              path: '/api/green-grocer/operations/adjustments/preview',
              description: 'MNV duzeltme yazmadan once hareket tipini ve toplam miktari onizler'
            },
            {
              method: 'POST',
              path: '/api/green-grocer/operations/adjustments',
              description: 'Ayni clientRequestId ile kontrollu MNV duzeltme evragini yazar'
            }
          ]
        }
      ],
      codeSample: `{
  "warehouseNo": 56,
  "warehouseName": "MANAV DEPO",
  "productCount": 1,
  "totalCurrentStockQuantity": 184.35,
  "totalPurchaseQuantity": 300,
  "totalAdjustmentNetQuantity": 9.3,
  "totalOrderEstimatedQuantity": 225,
  "totalShipmentQuantity": 210.75,
  "items": [
    {
      "stockCode": "001082",
      "stockName": "MNV SEFTALI KG",
      "currentStockQuantity": 184.35,
      "purchaseQuantity": 300,
      "adjustmentNetQuantity": 9.3,
      "orderInputQuantity": 18,
      "orderEstimatedQuantity": 225,
      "shipmentQuantity": 210.75,
      "lastCountQuantity": 180,
      "primaryStatusName": "Dengeli"
    }
  ]
}`
    },
    () =>
      import('../tasks/green-grocer/manav-operasyon-paneli/list/manav-operasyon-paneli-list.component').then(
        (m) => m.ManavOperasyonPaneliListComponent
      ),
    {
      accessKeyAliases: [
        'green-grocer.operations',
        'green-grocer.operations.page',
        'green-grocer-operations',
        'operations',
        'manav-operasyon-paneli',
        'manav-operasyonlari',
        'manav-duzeltmeleri'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
