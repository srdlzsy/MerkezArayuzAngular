import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const DUZELTME_ISLEMLERI_TASK_SOURCE = {
  'mikro-evrak-duzenleme': singleRouteTask(
    {
      id: 'mikro-evrak-duzenleme',
      title: 'Mikro Evrak Duzenleme',
      subtitle:
        'Mikro stok kartlarini, depo bazli stok ayarlarini, satis fiyatlarini, stok ve cari hareket evraklarini kontrollu olarak duzeltir.',
      baseRouteOrFile: '/api/duzeltme-islemleri/mikro-evrak-duzenleme',
      highlights: [
        'Stok karti arama, detay ve alan bazli guncelleme',
        'Global karti etkilemeden depo bazli satis, siparis ve kabul bloklari',
        'Depo bazli stok satis fiyatlarini listeleme ve upsert etme',
        'Seri-sira ile stok ve cari hareket evraki bulma',
        'Stok hareketinde sevk deposu ve mal kabul tarihi duzenleme',
        'movementGuid korumali satir guncelleme',
        'Yalniz degisen alanlari gonderen patch semantigi',
        '409 Conflict durumunda filtre daraltma rehberi'
      ],
      listTitle: 'Duzenleme Endpointleri',
      items: [
        {
          name: 'MikroEvrakDuzenlemeController',
          description:
            'STOKLAR, STOK_DEPO_DETAYLARI, STOK_HAREKETLERI ve CARI_HESAP_HAREKETLERI kayitlarinin whitelist alanlarini gunceller.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari',
              description: 'Stok kartlarini kod, ad veya kisa ada gore arar'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}',
              description: 'Stok karti detayini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}',
              description: 'Stok kartinin degisen whitelist alanlarini gunceller',
              payload: 'StockCardPatchHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}/depolar',
              description: 'Stok kartinin aktif depolardaki global ve nihai ayarlarini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}/depolar/{warehouseNo}',
              description: 'Yalniz secili deponun stok karti blok/pasif/iskonto ayarlarini gunceller',
              payload: 'StockCardWarehousePatchHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}/satis-fiyatlari',
              description: 'Stok kartinin aktif depo satis fiyatlarini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-kartlari/{stockCode}/satis-fiyatlari/{warehouseNo}',
              description: 'Secili depoda stok satis fiyatini olusturur veya gunceller',
              payload: 'StockSalesPriceUpsertHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-hareketleri',
              description: 'Seri-sira ve opsiyonel filtrelerle stok hareket evrakini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/stok-hareketleri',
              description: 'Stok hareket evraki header ve satirlarini gunceller',
              payload: 'UpdateStockMovementDocumentHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/cari-hareketleri',
              description: 'Seri-sira ve opsiyonel filtrelerle cari hareket evrakini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/cari-hareketleri',
              description: 'Cari hareket evraki header ve satirlarini gunceller',
              payload: 'UpdateCustomerMovementDocumentHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "lookup": {
    "documentSerie": "F110",
    "documentOrderNo": 12,
    "documentType": 0,
    "movementKind": 4,
    "normalReturn": 0
  },
  "header": {
    "goodsAcceptanceDate": "2026-04-21",
    "description": "Duzeltilen aciklama"
  },
  "lines": [
    {
      "movementGuid": "d7f6a8ec-9c2b-4e1e-bb1c-6da6cb4a5f67",
      "goodsAcceptanceDate": "2026-04-21",
      "quantity": 3
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/corrections/mikro-evrak-duzenleme/list/mikro-evrak-duzenleme-list.component'
      ).then((m) => m.MikroEvrakDuzenlemeListComponent),
    {
      accessKeyAliases: [
        'MikroEvrakDuzenleme',
        'mikro-evrak-duzenleme',
        'DuzeltmeIslemleri'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
