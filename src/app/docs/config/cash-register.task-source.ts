import type { DocsTaskSource } from './docs-task-source.helpers';
import {
  multiRouteTask,
  route,
  singleRouteTask
} from './docs-task-source.helpers';

export const CASH_REGISTER_TASK_SOURCE = {
  'authorization-files': singleRouteTask(
    {
      id: 'authorization-files',
      title: 'Authorization Files',
      subtitle:
        'Operasyon export joblarini tetikler, durumlarini izler ve authorization file kayitlarini toplu gunceller.',
      baseRouteOrFile: '/api/operations',
      highlights: [
        'Queue tabanli export',
        'Job polling',
        'Authorization file grid',
        'Admin icin opsiyonel warehouseNo query destegi',
        'Promofile queue/polling destegi'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'OperationsController',
          description:
            'Terazi, urun/barcode/PLU, kasiyer ve promosyon exportlerini job olarak baslatir; authorization file kayitlarini da ayni modulden yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/operations/scalesfile?warehouseNo=110',
              description: 'Terazi export isini kuyruga alir; warehouseNo yalniz admin depo secimi icindir'
            },
            {
              method: 'GET',
              path: '/api/operations/productbarcodeplunofile?warehouseNo=110',
              description: 'Urun/barcode/PLU export isini kuyruga alir; warehouseNo yalniz admin depo secimi icindir'
            },
            {
              method: 'GET',
              path: '/api/operations/cashierfile?warehouseNo=110',
              description: 'Kasiyer export isini kuyruga alir; warehouseNo yalniz admin depo secimi icindir'
            },
            {
              method: 'GET',
              path: '/api/operations/promofile?warehouseNo=110',
              description: 'Promosyon ve yardimci POS dosyalari isini kuyruga alir; warehouseNo yalniz admin depo secimi icindir'
            },
            {
              method: 'GET',
              path: '/api/operations/jobs/{jobId}',
              description: 'Job durumunu getirir'
            },
            {
              method: 'GET',
              path: '/api/operations/authorization-files',
              description: 'Authorization file kayitlarini listeler'
            },
            {
              method: 'POST',
              path: '/api/operations/authorization-files',
              description: 'Authorization file kayitlarini toplu kaydeder',
              payload: 'SaveAuthorizationFileHttpRequest[]'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/dosya-gonderimi/list/dosya-gonderimi-list.component').then(
        (m) => m.DosyaGonderimiListComponent
      ),
    { accessKeyAliases: ['operations', 'dosya-gonderimi'] }
  ),
  'etiket-belgeleri': singleRouteTask(
    {
      id: 'etiket-belgeleri',
      title: 'Etiket Belgeleri',
      subtitle:
        'Tarih, belge ve manuel urun ekleme kaynaklarini kullanarak etiket onizleme ve baski alma gorevi.',
      baseRouteOrFile: '/api/kasa-islemleri/etiket-belgeleri',
      highlights: [
        'Tarihe gore urun etiketi',
        'Admin icin opsiyonel warehouseNo query destegi',
        'Belge bazli yukleme',
        'Baski onizleme ve yazdirma'
      ],
      listTitle: 'Etiket Basim Islem Akisi',
      items: [
        {
          name: 'EtiketBasimController',
          description:
            'Etiket verisi toplama, son belge listesi ve promosyon tabanli baski akisi.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/fiyati-degisen-urunler?dateTimeFilter=...&warehouseNo=110',
              description: 'Belirli zamandan sonra fiyati degisen urunleri getirir; warehouseNo admin icin opsiyoneldir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/{documentId}',
              description: 'Belge numarasina gore etiket satirlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/son?warehouseNo=...&take=10',
              description: 'Depoya ait son 10 belgeyi listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/etiket-belgeleri/etiketler?dateToGet=...&warehouseNo=110',
              description: 'Secilen gun icin kunye/tag kayitlarini getirir; warehouseNo admin icin opsiyoneldir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/etiket-basimi/list/etiket-basimi-list.component').then(
        (m) => m.EtiketBasimiListComponent
      ),
    { accessKeyAliases: ['etiket-basimi', 'EtiketBasim', 'EtiketBasimi'] }
  ),
  'kunye-etiket-yazdirma': singleRouteTask(
    {
      id: 'kunye-etiket-yazdirma',
      title: 'Kunye Etiket Yazdirma',
      subtitle:
        'Kasa Islemleri altindaki tarih bazli kunye etiket onizleme ve yazdirma gorevi.',
      baseRouteOrFile: '/api/kasa-islemleri/kunye-etiket-yazdirma',
      highlights: [
        'JWT deposuna gore kunye etiket kayitlari',
        'Onizleme ve yazdirma',
        'LabelTagDto response modeli'
      ],
      listTitle: 'Kunye Etiket Yazdirma Akisi',
      items: [
        {
          name: 'KunyeEtiketYazdirmaController',
          description:
            'Kunye bazli etiket verisi toplama, onizleme ve yazdirma endpointini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kunye-etiket-yazdirma?dateToGet=...',
              description: 'Secilen gun icin kullanici deposuna ait kunye etiket kayitlarini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/kunye-etiket-yazdirma/list/kunye-etiket-basimi-list.component').then(
        (m) => m.KunyeEtiketBasimiListComponent
    ),
    { accessKeyAliases: ['kunye-etiket-yazdirma', 'KunyeEtiketYazdirma'] }
  ),
  'manav-kunye-etiket-yazdirma': singleRouteTask(
    {
      id: 'manav-kunye-etiket-yazdirma',
      title: 'Manav Kunye Etiket Yazdirma',
      subtitle:
        'Kasa Islemleri altindaki depo bazli manav kunye etiketlerini stok, fiyat ve birim bilgileriyle listeler.',
      baseRouteOrFile: '/api/kasa-islemleri/manav-kunye-etiket-yazdirma',
      highlights: [
        'warehouseNo zorunludur',
        'dateToGet opsiyoneldir; bos ise son 1 ay icinden son kunye kayitlari gelir',
        'KunyeLabelTagDto response modeli stok kodu, satis fiyati ve urun birimi tasir',
        'Endpoint anonim aciktir; menu gorunurlugu kasa-islemleri.manav-kunye-etiket-yazdirma.list yetkisine baglidir'
      ],
      listTitle: 'Manav Kunye Etiket Yazdirma Akisi',
      items: [
        {
          name: 'ManavKunyeEtiketYazdirmaController',
          description:
            'Manav stoklari icin depo bazli zengin kunye etiket kayitlarini getirir ve baski akisini besler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/manav-kunye-etiket-yazdirma/detayli-etiketler?warehouseNo=110&dateToGet=2026-04-24',
              description:
                'Secilen depo ve opsiyonel sevk tarihi icin manav kunye etiketlerini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/cash-register/manav-kunye-etiket-yazdirma/list/manav-kunye-etiket-basimi-list.component').then(
        (m) => m.ManavKunyeEtiketBasimiListComponent
      ),
    {
      accessKeyAliases: [
        'ManavKunyeEtiketYazdirma',
        'manav-kunye-etiket-yazdirma',
        'kasa-islemleri.manav-kunye-etiket-yazdirma'
      ]
    }
  ),
  'kasa-sayimlari': multiRouteTask(
    {
      id: 'kasa-sayimlari',
      title: 'Kasa Sayimlari',
      subtitle:
        'Kasa sayimi listesi, lookup yardimcilari ve CreateCashSummaryHttpRequest tabanli olusturma akisi.',
      baseRouteOrFile: '/api/kasa-islemleri/kasa-sayimlari | /api/kasa-islemleri/kasa-sayimlari/rapor',
      highlights: [
        'WarehouseNo body icinde opsiyoneldir ve JWT deposuyla ayni olmali',
        'En az bir paymentTypes veya storeExpenses satiri zorunludur',
        'Belge serisi backend tarafinda KS{loginDepoNo} olarak uretilir'
      ],
      listTitle: 'Olusturma ve Liste Endpointleri',
      items: [
        {
          name: 'KasaSayimlariController',
          description: 'Gunluk kasa icmal kayitlarini, raporunu, detaylarini ve create akislarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari?dateToGet=...',
              description: 'Secilen gunun kasa sayim satirlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/rapor?dateToGet=...',
              description: 'Gunluk depo bazli icmal raporunu getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/detaylar',
              description: 'Icmal odeme detaylarini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-sayimlari',
              description: 'Yeni kasa sayimi olusturur',
              payload: 'CreateCashSummaryHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/detaylar',
              description: 'Icmal odeme satirlarini gunceller',
              payload: 'UpdateCashSummaryDetailsHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}/banknot-hareketleri',
              description: 'Banknot satirlarini gunceller',
              payload: 'UpdateCashSummaryBanknotesHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/kasa-islemleri/kasa-sayimlari/{seri}/{sira}',
              description: 'Kasa sayimi kaydini siler'
            }
          ]
        },
        {
          name: 'Lookup Endpointleri',
          description: 'Create ekraninda kasiyer, kasa, banknot ve odeme tipi yardimcilari icin kullanilir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/kasiyerler?filterString=mehmet',
              description: 'Kasiyer arama yardimcisini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/kasalar?branchNo=110',
              description: 'Secili depoya ait kasa listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/banknot-tipleri',
              description: 'Banknot tiplerini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/hediye-ceki-tipleri',
              description: 'Hediye ceki tiplerini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/odeme-tipleri/banka?cashRegisterNo=CR-01',
              description: 'Banka odeme tipi lookup kayitlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-sayimlari/z-rapor-toplam?documentSerie=KS110&warehouseNo=110&zReportNo=125&cashNo=1',
              description: 'Paylasim klasorundeki Z raporundan NET CIRO degerini okumaya calisir'
            }
          ]
        }
      ],
      codeSample: `{
  "cashNo": 1,
  "zReportNo": 125,
  "cashierNo": 1001,
  "managerNo": 1002,
  "zTotalValue": 15340.5,
  "total": 15340.5,
  "summaryDate": "2026-04-24",
  "giftCheckMovements": [],
  "banknoteMovements": [
    {
      "banknoteType": 1,
      "quantity": 20,
      "total": 4000,
      "value": 200
    }
  ],
  "paymentTypes": [
    {
      "paymentName": "Nakit",
      "paymentTypeNo": 1,
      "accountCode": "",
      "terminalId": "",
      "slipNumber": 0,
      "amountValue": 11340.5
    }
  ],
  "storeExpenses": []
}`
    },
    [
      route(
        'docs/api/kasa-sayimlari/ekle',
        () =>
          import('../tasks/cash-register/icmal-dokumu/create/icmal-dokumu-create.component').then(
            (m) => m.IcmalDokumuCreateComponent
          ),
        {
          data: { title: 'Kasa Sayimi Olustur' }
        }
      ),
      route(
        'docs/api/kasa-sayimlari',
        () =>
          import('../tasks/cash-register/icmal-dokumu/list/icmal-dokumu-list.component').then(
            (m) => m.IcmalDokumuListComponent
          ),
        {
          isPrimary: true
        }
      )
    ],
    ['icmal-dokumu']
  ),
  'banknot-takipleri': singleRouteTask(
    {
      id: 'banknot-takipleri',
      title: 'Banknot Takipleri',
      subtitle:
        'Gunluk fiziksel para teslim kayitlarini liste, detay ve create rotalariyla ayri Kasa gorevi olarak sunar.',
      baseRouteOrFile: '/api/kasa-islemleri/banknot-takipleri',
      highlights: [
        'Kasa sayimlari altindan ayrilan yeni route ailesidir',
        'warehouseNo = 1 tum depolari listeler',
        'differenceAmount deliveryTotalAmount - totalAmount olarak gelir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'BanknotTakipleriController',
          description: 'Gunluk banknot teslim ve toplam kayitlarini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/banknot-takipleri?dateToGet=2026-04-24&warehouseNo=110',
              description: 'Secilen gun icin banknot takip kayitlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/banknot-takipleri/{banknoteTrackId}',
              description: 'Banknot takip kaydinin detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/banknot-takipleri',
              description: 'Gunluk banknot teslim kaydi olusturur',
              payload: 'CreateBanknoteTrackHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "banknoteTrackDate": "2026-04-24",
  "totalAmount": 12000,
  "deliveryTotalAmount": 11850,
  "deliverer": "Teslim Eden",
  "receiver": "Teslim Alan"
}`
    },
    () =>
      import('../tasks/cash-register/banknot-takipleri/list/banknot-takipleri-list.component').then(
        (m) => m.BanknotTakipleriListComponent
      ),
    { accessKeyAliases: ['banknot-takip', 'BanknotTakipleri'] }
  ),
  'kasa-cirolari': singleRouteTask(
    {
      id: 'kasa-cirolari',
      title: 'Kasa Cirolari',
      subtitle:
        'Yeni, eski ve toplam kasa ciro rotalarini liste, sube bazli ozet ve detay gorunumleriyle sunar.',
      baseRouteOrFile:
        '/api/kasa-islemleri/kasa-cirolari | /api/kasa-islemleri/kasa-cirolari/yeni | /api/kasa-islemleri/kasa-cirolari/eski | /api/kasa-islemleri/kasa-cirolari/toplam | /api/kasa-islemleri/kasa-cirolari/ozet',
      highlights: [
        'Liste request modeli WarehouseOrderDateRangeHttpRequest yapisindadir',
        'Liste tarafinda warehouseNo verilmezse JWT icindeki kullanici deposu kullanilir',
        'Ozet tarafinda warehouseNo verilmezse tum subeler, verilirse tek sube doner',
        'Yeni kasa rotalari ShopigoCiroConnection ile SHOPIGO kaynagindan okunur',
        'Eski kasa rotalari Summaries ve ozet tarafinda TurnoverTotals/TurnoverDetails kaynaklarini kullanir',
        'source alani satirin new veya old kaynagini gosterir',
        'netCollectionAmount backend tarafinda hesaplanir ve detay kaydi yoksa 404 doner'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'KasaCirolariController',
          description:
            'Kasa cirolarini vardiya ve kasiyer bazinda aggregate eder; yeni, eski ve toplam rotalarda ayni response modelini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Ana rota yeni kasa cirolarini vardiya ve kasiyer bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Yeni kasa cirolarini vardiya ve kasiyer bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Klasik Mikro Summaries kaynagindaki eski kasa cirolarini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam?startDate=2026-05-01&endDate=2026-05-04&warehouseNo=110',
              description: 'Yeni ve eski kasa cirolarini ayni response modelinde birlikte listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Ana rota yeni kasa verisini sube bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Yeni kasa cirolarini sube bazli ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Eski kasa cirolarini TurnoverTotals ve TurnoverDetails kaynagindan ozetler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam/ozet?startDate=2026-05-03&endDate=2026-05-05',
              description: 'Yeni ve eski kasa verilerini sube bazinda birlestirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Ana detay rotasi yeni kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/yeni/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Yeni kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/eski/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Eski kasa kaydi icin odeme tipi ve kasa-banka kirilimini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-cirolari/toplam/detay?businessDate=2026-05-01&shiftNo=1&cashierCode=1001&warehouseNo=110',
              description: 'Toplam akista secilen kaydin odeme tipi ve kasa-banka kirilimini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "header": {
    "businessDate": "2026-05-01T00:00:00",
    "warehouseNo": 110,
    "warehouseName": "KESTEL 1",
    "shiftNo": 1,
    "cashierCode": "1001",
    "cashierName": "MEHMET YILMAZ",
    "productLineCount": 124,
    "totalSalesQuantity": 187.5,
    "totalSalesAmount": 25640.75,
    "paymentLineCount": 18,
    "totalCollectionAmount": 25640.75,
    "totalCustomerCommission": 142.3,
    "netCollectionAmount": 25498.45,
    "source": "new"
  },
  "payments": [
    {
      "paymentTypeNo": 1,
      "paymentTypeName": "Nakit",
      "cashBankCode": "KASA-01",
      "cashBankName": "MAGAZA KASA 1",
      "paymentLineCount": 5,
      "amount": 14320.5,
      "customerCommission": 0,
      "netAmount": 14320.5,
      "source": "new"
    }
  ]
}`
    },
    () =>
      import('../tasks/cash-register/kasa-cirolari/list/kasa-cirolari-list.component').then(
        (m) => m.KasaCirolariListComponent
      )
  ),
  'yeni-kasa-analizleri': singleRouteTask(
    {
      id: 'yeni-kasa-analizleri',
      title: 'Yeni Kasa Analizleri',
      subtitle:
        'ShopigoCiroConnection kaynagindan yeni kasa satislarini ciro, kasa, fis mutabakat, anomali ve odeme tipi sekmeleriyle denetler.',
      baseRouteOrFile: '/api/kasa-islemleri/yeni-kasa-analizleri',
      highlights: [
        'Yalniz yeni kasa Shopigo kaynagini kullanir',
        'startDate ve endDate zorunludur',
        'warehouseNo, cashRegisterNo, cashierCode, take ve onlyProblematic filtreleri desteklenir',
        'Fis mutabakatinda duplicate, eksik odeme, satir toplam farki ve teknik alan sorunlari gorunur',
        'Odeme tipleri payment_methods eslesmesi ve kategori bilgisini gosterir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'YeniKasaAnalizleriController',
          description:
            'Yeni kasa satislarini operasyonel denetim, mutabakat ve veri kalitesi analizleri icin listeler.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/ciro-ozeti?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110',
              description: 'Sube, kasa ve kasiyer bazinda satis/odeme ciro ozetini verir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/kasa-ozeti?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110',
              description: 'Kasa bazinda gunluk odeme kategori kirilimini verir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/fis-mutabakat?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110&onlyProblematic=true&take=200',
              description: 'Fis header, urun satiri ve odeme toplamini karsilastirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/anomaliler?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110&take=200',
              description: 'Fis mutabakat ve odeme tipi anomalilerini tek listede dondurur'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/odeme-tipleri?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110',
              description: 'Yeni kasa odeme kodlari, kategori ve eslesme bilgisini listeler'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/saglik-ozeti?startDate=2026-07-08&endDate=2026-07-08&warehouseNo=110',
              description: 'Sube ve kasa bazinda fis sagligi risk ozetini verir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/yeni-kasa-analizleri/fis-detay?uuid=3f0f6f4a-74d4-4f8f-84f1-2e8d2f2d1d11',
              description: 'Secili fisin ust bilgi, mutabakat, satis, urun ve odeme satirlarini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-07-08",
  "endDate": "2026-07-08",
  "warehouseNo": 110,
  "cashRegisterNo": "1",
  "cashierCode": "1001",
  "take": 500,
  "onlyProblematic": true
}`
    },
    () =>
      import('../tasks/cash-register/yeni-kasa-analizleri/list/yeni-kasa-analizleri-list.component').then(
        (m) => m.YeniKasaAnalizleriListComponent
      ),
    {
      accessKeyAliases: [
        'YeniKasaAnalizleri',
        'kasa-islemleri.yeni-kasa-analizleri',
        'kasa-islemleri.yeni-kasa-analizleri.list'
      ]
    }
  ),
  'kasa-ciro-aktarimi': singleRouteTask(
    {
      id: 'kasa-ciro-aktarimi',
      title: 'Kasa Ciro Aktarimi',
      subtitle:
        'Eski kasa HR dosyalarini okuyup TurnoverTotals, TurnoverDetails ve TurnoverDiscountCardDetails tablolarina ciro ozetlerini aktarir.',
      baseRouteOrFile: '/api/kasa-islemleri/kasa-ciro-aktarimi',
      highlights: [
        'Sube lookup ile aktarim kapsami opsiyonel secilir',
        'branches bos birakilirsa 101..300 araligindaki sube klasorleri taranir',
        'movementRootPath bos birakilirsa backend konfigurasyonu ve fallback path kullanilir',
        'dryRun dosyalari parse eder ve insert/update adetlerini hesaplar, DB yazmaz',
        'Basarili import sonucu Kasa Cirolari ekraninda eski veya toplam kaynaklariyla izlenir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'KasaCiroAktarimiController',
          description:
            'HRddMMyy.* dosyalarindan eski kasa ciro tablolarina total, detail ve indirim karti kirilimlarini aktarir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-ciro-aktarimi/subeler',
              description: 'Kasa ciro aktarimi icin sube listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-ciro-aktarimi/metin/aktar',
              description: 'Secilen tarih araligi ve subeler icin HR dosyalarindan ciro import eder',
              payload: 'KasaCiroImportHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-06-01",
  "endDate": "2026-06-09",
  "branches": [101, 102, 110],
  "movementRootPath": "\\\\10.0.0.55\\kasa\\",
  "dryRun": true
}`
    },
    () =>
      import('../tasks/cash-register/kasa-ciro-aktarimi/list/kasa-ciro-aktarimi-list.component').then(
        (m) => m.KasaCiroAktarimiListComponent
      ),
    {
      accessKeyAliases: ['KasaCiroAktarimi', 'kasa-ciro-aktarimi']
    }
  ),
  'kasa-hareket-aktarimi': singleRouteTask(
    {
      id: 'kasa-hareket-aktarimi',
      title: 'Kasa Hareket Aktarimi',
      subtitle:
        'Eski kasa HR/IP dosyalarini staging tablolara alir, staging hareketlerini Mikro stok hareketlerine aktarir veya aktarimi geri siler.',
      baseRouteOrFile: '/api/kasa-islemleri/kasa-hareket-aktarimi',
      highlights: [
        'Sube ve kasa lookup endpointleriyle import filtreleri hazirlanir',
        'HR hareket importu ve IP iptal belge importu ayri aksiyonlardir',
        'Zamanli import HR ve IP dosyalarini birlikte calistirir',
        'dryRun import dosyalarini parse eder, staging tablolara yazmaz',
        'Mikro aktar/sil endpointleri stored procedure sonucu doner'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'KasaHareketAktarimiController',
          description:
            'Kasa hareket dosyalarini import eder, staging temizler, Mikro aktarimini yonetir ve rapor satirlarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/subeler',
              description: 'Kasa hareket aktarimi icin sube listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/subeler/{branchNo}/kasalar',
              description: 'Secilen subeye ait kasa listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/hareketler/aktar',
              description: 'HR formatindaki kasa hareket dosyalarini staging tablolara aktarir',
              payload: 'KasaHareketImportHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/iptal-belgeleri/aktar',
              description: 'IP formatindaki iptal belge dosyalarini staging tablolara aktarir',
              payload: 'KasaHareketImportHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/zamanli-aktarim/calistir',
              description: 'Zamanli HR/IP import akislarini birlikte calistirir',
              payload: 'KasaHareketScheduledImportHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/staging',
              description: 'Secilen tarih/sube/kasa filtresi icin staging hareketlerini siler',
              payload: 'KasaHareketDeleteStagingHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/mikro/aktar',
              description: 'Staging hareketlerini Mikro stok hareketlerine aktarir',
              payload: 'KasaHareketMikroTransferHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/mikro',
              description: 'Secilen tarih/sube filtresi icin Mikro aktarimini geri siler',
              payload: 'KasaHareketMikroTransferHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/mikro/aralik-aktar',
              description: 'Tarih araligi icin Mikro aktarim procedure akisini calistirir',
              payload: 'KasaHareketMikroTransferRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/kasa-islemleri/kasa-hareket-aktarimi/rapor?date=2026-06-09&branchNo=110&cashRegisterNo=1',
              description: 'Aktarim rapor satirlarini tarih, sube ve kasa filtresiyle getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-06-08",
  "endDate": "2026-06-09",
  "branches": [110, 115],
  "cashRegisters": [1, 2],
  "fileRootPath": null,
  "skipExisting": true,
  "dryRun": false
}`
    },
    () =>
      import('../tasks/cash-register/kasa-hareket-aktarimi/list/kasa-hareket-aktarimi-list.component').then(
        (m) => m.KasaHareketAktarimiListComponent
      ),
    {
      accessKeyAliases: ['KasaHareketAktarimi']
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
