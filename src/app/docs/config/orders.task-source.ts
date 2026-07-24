import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const ORDERS_TASK_SOURCE = {
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
  'onerilen-depo-siparisleri': singleRouteTask(
    {
      id: 'onerilen-depo-siparisleri',
      title: 'Onerilen Depo Siparisleri',
      subtitle:
        'Kaynak depodaki stok ve satis gecmisine gore onerilen depo siparisi satirlarini listeler ve secilenleri siparise cevirir.',
      baseRouteOrFile: '/api/siparis-islemleri/onerilen-depo-siparisleri',
      highlights: [
        'Kaynak depo zorunludur',
        'Hedef depo verilmezse JWT deposu kullanilir',
        'Acik gelen depo siparisleri sadece ayar acik ve kaynak depo guvenilir listedeyse ihtiyactan dusulur',
        'Koli katsayisi listede gosterilir; onerilen miktar backend tarafinda koli katina gore hesaplanir',
        'Secilen satirlar convert-to-order endpointiyle siparise cevrilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'OnerilenDepoSiparisleriController',
          description: 'Depo siparisi icin kaynak depo bazli read-only oneriler ve convert akisi.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/onerilen-depo-siparisleri?SourceWarehouseNo=...',
              description: 'Kaynak depo stok durumuna gore onerilen depo siparisi satirlarini listeler'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/onerilen-depo-siparisleri/convert-to-order',
              description: 'Secili onerileri verilen depo siparisine cevirir',
              payload: 'ConvertSuggestedWarehouseOrderHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "sourceWarehouseNo": 50,
  "orderDate": "2026-07-01",
  "deliveryDate": "2026-07-01",
  "description": "Onerilen siparisten olustu",
  "lines": []
}`
    },
    () =>
      import(
        '../tasks/orders/onerilen-depo-siparisleri/list/onerilen-depo-siparisleri-list.component'
      ).then((m) => m.OnerilenDepoSiparisleriListComponent),
    { accessKeyAliases: ['siparis-islemleri.onerilen-depo-siparisleri'] }
  ),
  'onerilen-firma-siparisleri': singleRouteTask(
    {
      id: 'onerilen-firma-siparisleri',
      title: 'Onerilen Firma Siparisleri',
      subtitle:
        'Tedarikci ve depo kapsaminda onerilen firma siparisi satirlarini listeler, miktar duzenleyerek siparise cevirir.',
      baseRouteOrFile: '/api/siparis-islemleri/onerilen-firma-siparisleri',
      highlights: [
        'Tedarikci secimi zorunludur',
        'Depo backend tarafinda JWT deposundan alinir',
        'Acik verilen firma siparisleri sadece ayar acik ve tedarikci guvenilir listedeyse ihtiyactan dusulur',
        'Koli katsayisi listede gosterilir; onerilen miktar backend tarafinda koli katina gore hesaplanir',
        'Secilen satirlar tek tedarikciye aitse siparise cevrilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'OnerilenFirmaSiparisleriController',
          description: 'Firma siparisi icin tedarikci bazli read-only oneriler ve convert akisi.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/siparis-islemleri/onerilen-firma-siparisleri?SupplierCode=...',
              description: 'Tedarikci ve depo kapsaminda onerilen firma siparisi satirlarini listeler'
            },
            {
              method: 'POST',
              path: '/api/siparis-islemleri/onerilen-firma-siparisleri/convert-to-order',
              description: 'Secili onerileri verilen firma siparisine cevirir',
              payload: 'ConvertSuggestedCompanyOrderHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "supplierCode": "32000999",
  "orderDate": "2026-07-01",
  "deliveryDate": "2026-07-02",
  "description1": "Onerilen siparisten olustu",
  "lines": []
}`
    },
    () =>
      import(
        '../tasks/orders/onerilen-firma-siparisleri/list/onerilen-firma-siparisleri-list.component'
      ).then((m) => m.OnerilenFirmaSiparisleriListComponent),
    { accessKeyAliases: ['siparis-islemleri.onerilen-firma-siparisleri'] }
  )
} as const satisfies Record<string, DocsTaskSource>;
