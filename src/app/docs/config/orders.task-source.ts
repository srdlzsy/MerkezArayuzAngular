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
  )
} as const satisfies Record<string, DocsTaskSource>;
