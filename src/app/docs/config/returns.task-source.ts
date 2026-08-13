import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const RETURNS_TASK_SOURCE = {
  'firma-iadeleri': singleRouteTask(
    {
      id: 'firma-iadeleri',
      title: 'Firma Iadeleri',
      subtitle: 'Firma iadeleri icin yeni iade API route’lariyla liste, detay ve create akisi sunulur.',
      baseRouteOrFile: '/api/iade-islemleri/firma-iadeleri',
      highlights: [
        'Iade',
        'Firma',
        'Liste ve detay',
        'Create endpointi aktif',
        'Create requestinde guvenli retry icin clientRequestId uretilir',
        'Retry sonucu ayri durum endpointi olmadan ayni clientRequestId ile tekrar POST edilerek toparlanir',
        'E-irsaliye gonderim ve PDF route aktif'
      ],
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
            },
            {
              method: 'POST',
              path: '/api/iade-islemleri/firma-iadeleri/{seri}/{sira}/e-irsaliye',
              description: 'Firma iadesi e-irsaliye gonderimini baslatir'
            },
            {
              method: 'GET',
              path: '/api/iade-islemleri/firma-iadeleri/{seri}/{sira}/e-irsaliye/pdf',
              description: 'Firma iadesi e-irsaliye PDF dosyasini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "clientRequestId": "527c6a79-f98b-438d-92f7-9f1cfc16cd64",
  "customerCode": "120.01.001",
  "movementDate": "2026-04-17",
  "documentDate": "2026-04-17",
  "documentNo": "",
  "description": "Firma iadesi",
  "lines": [
    {
      "stockCode": "015792",
      "quantity": 5,
      "unitPointer": 1
    }
  ]
}`
    },
    () =>
      import('../tasks/returns/firma-iadeleri/list/firma-iadeleri-list.component').then(
        (m) => m.FirmaIadeleriListComponent
      ),
    { accessKeyAliases: ['firma-iade'] }
  ),
  'giden-depo-iadeleri': singleRouteTask(
    {
      id: 'giden-depo-iadeleri',
      title: 'Giden Depo Iadeleri',
      subtitle: 'Kaynak sube perspektifinden depo iade listesi, detay ve olusturma ekrani.',
      baseRouteOrFile: '/api/iade-islemleri/depo-iadeleri/giden',
      highlights: [
        'Iade',
        'Depo',
        'Giden yon',
        'Yazma yolu MikroWriteRouting:WarehouseReturn ile Database veya MikroApi olur',
        'Create requestinde guvenli retry icin clientRequestId uretilir',
        'Retry sonucu ayri durum endpointi olmadan ayni clientRequestId ile tekrar POST edilerek toparlanir',
        'Otomatik depo siparisi aciksa backend iade satirini olusan siparis GUIDine baglar',
        'Giden depo iadesi guncelleme sadece e-irsaliye gonderilmemis ve karsi depo kabul etmemis evraklarda calisir',
        'Guncelleme satir eslestirmesini stockCode ile degil movementGuid ile yapar; satir ekleme/silme yoktur',
        'Canonical ve giden alias route uzerinden e-irsaliye PDF alinabilir'
      ],
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
            },
            {
              method: 'PUT',
              path: '/api/iade-islemleri/depo-iadeleri/giden/{seri}/{sira}?warehouseNo=110',
              description: 'Giden depo iadesini movementGuid bazli mevcut satirlarla gunceller'
            },
            {
              method: 'POST',
              path: '/api/iade-islemleri/depo-iadeleri/giden/{seri}/{sira}/e-irsaliye',
              description: 'Giden depo iadesi e-irsaliye gonderimini baslatir'
            },
            {
              method: 'GET',
              path: '/api/iade-islemleri/depo-iadeleri/giden/{seri}/{sira}/e-irsaliye/pdf',
              description: 'Giden depo iadesi e-irsaliye PDF dosyasini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "clientRequestId": "622208d6-f427-48ef-b9fb-bd4e6e1844eb",
  "targetWarehouseNo": 50,
  "transitWarehouseNo": 60,
  "movementDate": "2026-04-17",
  "documentDate": "2026-04-17",
  "documentNo": "",
  "description": "Depo iadesi",
  "lines": [
    {
      "stockCode": "015792",
      "quantity": 5,
      "unitPointer": 1
    }
  ]
}`
    },
    () =>
      import('../tasks/returns/depo-iadeleri/list/depo-iadeleri-list.component').then(
        (m) => m.DepoIadeleriListComponent
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
      import('../tasks/returns/depo-iadeleri/list/depo-iadeleri-list.component').then(
        (m) => m.DepoIadeleriListComponent
      ),
    { path: 'docs/api/gelen-depo-iadeleri' }
  )
} as const satisfies Record<string, DocsTaskSource>;
