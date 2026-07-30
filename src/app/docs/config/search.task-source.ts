import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const SEARCH_TASK_SOURCE = {
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
        'Terazi barkodunda okutulan barkod ve normalize edilen lookup barkodu ayrilir',
        'Stok kodu ile fiyat arama',
        'Urun adi ile arama',
        'Stok kodundan son kunye bilgisi',
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
              path: '/api/arama-islemleri/fiyat-gor?warehouseNo=110&barcode=2700174041103',
              description: 'Barkod uzerinden fiyat sorgusu yapar; terazi barkodunda lookup barkod ve KG miktarini dondurur'
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
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/barkodlar/2700174041103/cozumle?warehouseNo=110&operationType=receiving&targetWarehouseNo=120&supplierCode=120.01.03106',
              description: 'Kamera/barkod okutma akislari icin urun, miktar, hedef depo ve islem kullanilabilirlik kararini tek cevapta dondurur'
            },
            {
              method: 'GET',
              path: '/api/arama-islemleri/urunler/016201/son-kunye?warehouseNo=110',
              description: 'Secili stok ve depo icin son sevk tarihli kunye bilgisini ve Mikro satis fiyatini getirir'
            }
          ]
        }
      ],
  codeSample: `{
  "warehouseNo": 110,
  "barcode": "2700174",
  "stockCode": "015550",
  "stockName": "MNV SEFTALI KG",
  "price": 99.9,
  "priceTypeCode": 1,
  "unitName": "KG",
  "unitMultiplier": 1,
  "secondaryUnitName": "",
  "secondaryUnitMultiplier": 0,
  "isSalesBlocked": false,
  "isOrderBlocked": false,
  "isGoodsAcceptanceBlocked": false,
  "requestedBarcode": "2700174041103",
  "lookupBarcode": "2700174",
  "isVariableWeightBarcode": true,
  "embeddedQuantity": 4.11,
  "embeddedQuantityUnit": "KG",
  "isBarcodeCheckDigitValid": true
}`
    },
    () =>
      import('../tasks/arama-islemleri/fiyat-gor/list/fiyat-gor-list.component').then(
        (m) => m.FiyatGorListComponent
      ),
    { accessKeyAliases: ['arama-islemleri-fiyat-gor', 'fiyat-ara', 'fiyat-sorgula'] }
  )
} as const satisfies Record<string, DocsTaskSource>;
