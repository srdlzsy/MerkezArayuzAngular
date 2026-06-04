import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const RECEIVING_TASK_SOURCE = {
  'firma-mal-kabulleri': singleRouteTask(
    {
      id: 'firma-mal-kabulleri',
      title: 'Firma Mal Kabulleri',
      subtitle:
        'Firma mal kabul gecmisi, ETTN ile on-dolum ve siparis baglama create akisini kapsar.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/firma-mal-kabulleri',
      highlights: [
        'DocumentNo bos, prefix veya seri + 9 haneli sira formatinda olabilir',
        'Yeni create akisi dispatchQuantity ve acceptedQuantity alanlarini ayri gonderir',
        'Eksik kabul farki icin varsayilan olarak otomatik firma iadesi olusturulur',
        'ETTN endpointi create ekrani icin ust bilgi ve kalem on-dolumu saglar',
        'Siparisli ve siparissiz kalemler ayni fis icinde birlikte gonderilebilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'ToptanGirisIrsaliyeleriController',
          description:
            'Firma mal kabul gecmisi, detay, ETTN cozumleme ve create akisini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Yapilmis firma mal kabul fislerini listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/{seri}/{sira}?warehouseNo=110',
              description: 'Secilen firma mal kabul fisinin salt-okunur detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/e-irsaliye/ettn/{ettn}?warehouseNo=110',
              description: 'ETTN ile resmi e-irsaliye ust bilgi, stok eslesmeleri ve cari onerilerini getirir'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri',
              description: 'Yeni firma mal kabul fisini olusturur',
              payload: 'CreateCompanyReceivingHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/mal-kabuller/firma',
              description: 'Firma mal kabul create endpoint aliasi',
              payload: 'CreateCompanyReceivingHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/firma-mal-kabulleri/offline-sync/{clientRequestId}',
              description: 'Offline retry icin create sonucunu sorgular'
            }
          ]
        }
      ],
      codeSample: `{
  "clientRequestId": "d8d0f3d6-5c62-4c67-b6b7-0f5d76b81b6f",
  "customerCode": "120.01.03106",
  "movementDate": "2026-04-20",
  "documentDate": "2026-04-20",
  "documentNo": "ST12026000002395",
  "deliverer": "Teslim Eden",
  "receiver": "Teslim Alan",
  "description": "",
  "allowOrderOverReceiving": false,
  "autoCreateReturnForPartialAcceptance": true,
  "lines": [
    {
      "stockCode": "015792",
      "dispatchQuantity": 10,
      "acceptedQuantity": 8,
      "unitPrice": 0,
      "unitPointer": 1,
      "lastConsumingDate": "2026-12-31",
      "orderGuid": "1bb2b4fe-b722-4e67-9d4b-050b6d87e800"
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/receiving/toptan-giris-irsaliyeleri/list/toptan-giris-irsaliyeleri-list.component'
      ).then((m) => m.ToptanGirisIrsaliyeleriListComponent),
    { accessKeyAliases: ['toptan-giris-irsaliyeleri'] }
  ),
  'depo-mal-kabulleri': singleRouteTask(
    {
      id: 'depo-mal-kabulleri',
      title: 'Depo Mal Kabulleri',
      subtitle:
        'Bekleyen gelen depo sevklerini ve depo iadelerini listeler, movementGuid bazli kabul yapar ve ETTN ile resmi e-irsaliye karsilastirmasini destekler.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/depo-mal-kabulleri',
      highlights: [
        'Bu ekran bos fis acmaz; bekleyen gelen sevklerden ve iadelerden create benzeri kabul akisi uretir',
        'isReturn false normal gelen depo sevkini, true gelen depo iadesini ifade eder',
        'Satir eslestirmesi movementGuid ile yapilmalidir',
        'ETTN endpointi resmi gelen e-irsaliye satirlarini on-karsilastirma icin kullanilir',
        'allowDiscrepancy false iken eksik/fazla kabul 409 Conflict ile engellenir',
        'allowDiscrepancy true iken fark sth_FormulMiktar uzerinde recorded-on-formula-quantity olarak izlenir',
        'Kabul islemi mevcut sevk satirlarini gunceller, yeni ana hareket acmaz'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DepolarArasiNakliyeMalKabulFisleriController',
          description:
            'Bekleyen gelen depo sevklerini ve depo iadelerini listeler, detay ve kabul komutlarini movementGuid bazli calistirir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Bekleyen gelen depo sevklerini ve iadelerini mal kabul listesi olarak getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/{seri}/{sira}?warehouseNo=110',
              description: 'Secilen bekleyen gelen sevk veya iade detayini ve kabul icin movementGuid satirlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/e-irsaliye/ettn/{ettn}?warehouseNo=110',
              description: 'Gelen e-irsaliye ust bilgi ve satirlarini depo kabul baglaminda karsilastirma icin getirir'
            },
            {
              method: 'POST',
              path: '/api/mal-kabul-islemleri/depo-mal-kabulleri/{seri}/{sira}/kabul',
              description: 'Sayilan miktarlari movementGuid bazli kabul eder; fark varsa allowDiscrepancy kurali uygulanir',
              payload: 'AcceptWarehouseReceivingHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "allowDiscrepancy": false,
  "lines": [
    {
      "movementGuid": "8d4a5a77-1b3f-4f2a-93a1-b90a1b7d3c11",
      "receivedQuantity": 10
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/receiving/depolar-arasi-nakliye-mal-kabul-fisleri/list/depolar-arasi-nakliye-mal-kabul-fisleri-list.component'
      ).then((m) => m.DepolarArasiNakliyeMalKabulFisleriListComponent),
    { accessKeyAliases: ['depolar-arasi-nakliye-mal-kabul-fisleri'] }
  ),
  'mal-kabul-farklari': singleRouteTask(
    {
      id: 'mal-kabul-farklari',
      title: 'Mal Kabul Farklari',
      subtitle:
        'Kabul edilmis depo sevki veya depo iadesi satirlarinda sevk miktari ile kabul miktari farklarini listeler.',
      baseRouteOrFile: '/api/mal-kabul-islemleri/mal-kabul-farklari',
      highlights: [
        'scope=accepted kullanicinin deposunun kabul ettigi evraklari listeler',
        'scope=created kullanicinin deposunun olusturdugu veya gonderdigi evraklari listeler',
        'Normal sevk ve depo iadesi ayni response icinde isReturn alanina gore ayrilir',
        'differenceQuantity = receivedQuantity - quantity mantigiyla hesaplanir',
        'Sadece kabul edilmis satirlar doner'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'MalKabulFarklariController',
          description:
            'Mal kabulde eksik veya fazla kabul edilen depo sevki/iadesi satirlarini tarih ve kapsam filtresiyle listeler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30&scope=accepted',
              description: 'Mal kabul farklarini accepted veya created kapsaminda listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/accepted?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Kullanicinin deposunun kabul ettigi evraklardaki farklari listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/created?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'Kullanicinin deposunun olusturdugu veya gonderdigi evraklardaki farklari listeler'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/kabul-ettigim?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'accepted kapsami icin Turkce alias'
            },
            {
              method: 'GET',
              path: '/api/mal-kabul-islemleri/mal-kabul-farklari/olusturdugum?WarehouseNo=110&StartDate=2026-04-01&EndDate=2026-04-30',
              description: 'created kapsami icin Turkce alias'
            }
          ]
        }
      ],
      codeSample: `[
  {
    "documentDate": "2026-04-10T00:00:00",
    "movementDate": "2026-04-10T00:00:00",
    "documentNo": "FRM2026600065140",
    "documentSerie": "F50",
    "documentOrderNo": 192188,
    "lineNo": 28,
    "movementGuid": "8d4a5a77-1b3f-4f2a-93a1-b90a1b7d3c11",
    "isReturn": false,
    "sourceWarehouseNo": 50,
    "sourceWarehouse": "PANAYIR PREMIUM",
    "targetWarehouseNo": 135,
    "targetWarehouse": "ALICI DEPO",
    "productCode": "019042",
    "productName": "COOK EKO BUYUK BUZDOLABI POS.30x42CM 80 YAP.*15",
    "unitName": "ADET",
    "unitPointer": 1,
    "quantity": 45,
    "receivedQuantity": 25,
    "differenceQuantity": -20,
    "differenceType": "missing",
    "description": ""
  }
]`
    },
    () =>
      import(
        '../tasks/receiving/mal-kabul-farklari/list/mal-kabul-farklari-list.component'
      ).then((m) => m.MalKabulFarklariListComponent),
    {
      accessKeyAliases: [
        'MalKabulFarklari',
        'kabul-ettigim',
        'olusturdugum',
        'mal-kabul-islemleri-mal-kabul-farklari'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
