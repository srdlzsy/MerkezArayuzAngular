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
      import('../tasks/green-grocer/reports/list/green-grocer-reports-list.component').then(
        (m) => m.GreenGrocerReportsListComponent
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
        '../tasks/green-grocer/product-case-profiles/list/green-grocer-product-case-profiles-list.component'
      ).then((m) => m.GreenGrocerProductCaseProfilesListComponent),
    {
      accessKeyAliases: [
        'green-grocer.product-case-profiles',
        'green-grocer.product-case-profiles.list',
        'green-grocer.product-case-profiles.detail',
        'green-grocer.product-case-profiles.update',
        'green-grocer.product-case-profiles.delete',
        'green-grocer-product-case-profiles',
        'manav-kasa-profilleri',
        'manav-kasa-cozumleme'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
