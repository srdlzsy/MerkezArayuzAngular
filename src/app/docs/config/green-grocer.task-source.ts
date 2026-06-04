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
  )
} as const satisfies Record<string, DocsTaskSource>;
