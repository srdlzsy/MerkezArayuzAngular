import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const DUZELTME_ISLEMLERI_TASK_SOURCE = {
  'mikro-evrak-duzenleme': singleRouteTask(
    {
      id: 'mikro-evrak-duzenleme',
      title: 'Mikro Evrak Duzenleme',
      subtitle:
        'Mikro stok kartlarini, depo bazli stok ayarlarini, satis fiyatlarini, hareket evraklarini ve siparis evraklarini kontrollu olarak duzeltir.',
      baseRouteOrFile: '/api/duzeltme-islemleri/mikro-evrak-duzenleme',
      highlights: [
        'Stok karti arama, detay ve alan bazli guncelleme',
        'Global karti etkilemeden depo bazli satis, siparis ve kabul bloklari',
        'Depo bazli stok satis fiyatlarini listeleme ve upsert etme',
        'Seri-sira ile stok, cari hareket, firma siparisi ve depo siparisi evraki bulma',
        'Stok hareketinde sevk deposu ve mal kabul tarihi duzenleme',
        'Alan etiketleri ve Mikro kolon bilgileri alan-haritasi katalog endpointinden okunur',
        'movementGuid ve orderGuid korumali satir guncelleme',
        'Yalniz degisen alanlari gonderen patch semantigi',
        '409 Conflict durumunda filtre daraltma rehberi'
      ],
      listTitle: 'Duzenleme Endpointleri',
      items: [
        {
          name: 'MikroEvrakDuzenlemeController',
          description:
            'STOKLAR, STOK_DEPO_DETAYLARI, STOK_HAREKETLERI, CARI_HESAP_HAREKETLERI, SIPARISLER ve DEPOLAR_ARASI_SIPARISLER kayitlarinin whitelist alanlarini gunceller.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/alan-haritasi',
              description: 'Form alan adlari, Mikro kolonlari, veri tipleri ve editable bilgisini getirir'
            },
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
            },
            {
              method: 'DELETE',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/cari-hareketleri',
              description: 'Cari hareket evrakini soft veya hard delete ile siler',
              payload: 'CustomerMovementDocumentLookupHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/firma-siparisleri',
              description: 'Seri-sira ve opsiyonel filtrelerle firma siparis evrakini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/firma-siparisleri',
              description: 'Firma siparis evraki header ve satirlarini gunceller',
              payload: 'UpdateCompanyOrderDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/firma-siparisleri',
              description: 'Firma siparis evrakini soft veya hard delete ile siler',
              payload: 'CompanyOrderDocumentLookupHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/depo-siparisleri',
              description: 'Seri-sira ve depo filtreleriyle depo siparis evrakini getirir'
            },
            {
              method: 'PUT',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/depo-siparisleri',
              description: 'Depo siparis evraki header ve satirlarini gunceller',
              payload: 'UpdateWarehouseOrderDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/duzeltme-islemleri/mikro-evrak-duzenleme/depo-siparisleri',
              description: 'Depo siparis evrakini soft veya hard delete ile siler',
              payload: 'WarehouseOrderDocumentLookupHttpRequest'
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
