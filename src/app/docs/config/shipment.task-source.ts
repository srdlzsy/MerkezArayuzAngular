import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const SHIPMENT_TASK_SOURCE = {
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
  )
} as const satisfies Record<string, DocsTaskSource>;
