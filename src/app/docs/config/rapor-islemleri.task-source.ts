import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const RAPOR_ISLEMLERI_TASK_SOURCE = {
  'tedarikci-performans-karnesi': singleRouteTask(
    {
      id: 'tedarikci-performans-karnesi',
      title: 'Tedarikci Performans Karnesi',
      subtitle:
        'Tedarikciyi siparis, mal kabul, iade, zayiat etkisi ve fatura ozetleriyle tek performans kartinda degerlendirir.',
      baseRouteOrFile: '/api/rapor-islemleri/tedarikci-performans-karnesi',
      highlights: [
        'Liste endpointi SupplierPerformanceHttpRequest query modelini kullanir',
        'Tum Depolar secimi ilgili raporun all-warehouses yetkisine baglidir',
        'Detay endpointi tedarikci kodu ile kaynak olay zaman cizelgesini getirir',
        'Fatura metrikleri summary-only olarak gelen ve bizim kestigimiz toplamlar halinde ayri gosterilir',
        'Skor 100 uzerinden hesaplanir; risk seviyesi Healthy, Warning veya Critical olur'
      ],
      listTitle: 'Tedarikci Performans Endpointleri',
      items: [
        {
          name: 'SupplierPerformanceController',
          description:
            'Tedarikci karnesi icin siparis, mal kabul, iade, zayiat ve fatura ozetlerini tek ekranda toplar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/tedarikci-performans-karnesi?startDate=2026-07-01&endDate=2026-07-03&warehouseNo=110&take=100',
              description: 'Tedarikci performans karnesi listesini ve genel ozet metriklerini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/tedarikci-performans-karnesi/120.01.03106?startDate=2026-07-01&endDate=2026-07-03&warehouseNo=110&eventTake=100',
              description: 'Secili tedarikci kartini ve kaynak olay zaman cizelgesini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-07-01",
  "endDate": "2026-07-03",
  "warehouseNo": 110,
  "take": 100
}`
    },
    () =>
      import(
        '../tasks/reports/tedarikci-performans-karnesi/list/tedarikci-performans-karnesi-list.component'
      ).then((m) => m.TedarikciPerformansKarnesiListComponent),
    {
      accessKeyAliases: [
        'rapor-islemleri.tedarikci-performans-karnesi.list',
        'rapor-islemleri.tedarikci-performans-karnesi.detail',
        'rapor-islemleri.tedarikci-performans-karnesi',
        'TedarikciPerformansKarnesi',
        'Tedarikci Performans Karnesi'
      ]
    }
  ),
  'stok-raporlari': singleRouteTask(
    {
      id: 'stok-raporlari',
      title: 'Stok Raporlari',
      subtitle:
        'Stok, hareket, satis, iade, karlilik ve sayim raporlarini Mikro kaynaklarini degistirmeden listeler.',
      baseRouteOrFile: '/api/rapor-islemleri/stok-raporlari',
      highlights: [
        'Tum endpointler query parametreleriyle calisir; body gonderilmez',
        'Tek depo raporlarinda all-warehouses yetkili kullanici depo secmelidir; diger kullanicida backend kullanici deposunu uygular',
        'Kategori filtreleri kategori-secenekleri endpointinden dropdown olarak beslenir',
        'Son stok ve envanter degeri StockOnHandReportDto response modelini kullanir',
        'Urun depo durumu icin query endpointi ve urun/{stockCodeOrBarcode}/depo-durum path kisayolu desteklenir',
        'Take tum stok raporlarinda 1-1000 araliginda tutulur'
      ],
      listTitle: 'Stok Rapor Endpointleri',
      items: [
        {
          name: 'StockReportsController',
          description:
            'WinForms Depo Stok Listeleme raporlarini yeni API sozlesmesine gore salt okunur gridlere tasir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/son-stok?warehouseNo=110&reportDate=2026-07-21&search=ELMA&take=100',
              description: 'Secili depoda anlik stok ve satis degeri listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/kategori-secenekleri?search=MEYVE&take=50',
              description: 'Kategori dropdown seceneklerini urun sayilariyla getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/urun-depo-durum?stockCodeOrBarcode=015550&reportDate=2026-07-21',
              description: 'Tek urunun depo/sube bazli stok durumunu getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/urun/8690000000000/depo-durum?onlyWithStock=true',
              description: 'Barkod veya stok kodu path uzerinden tek urunun depo durumunu getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/urun-ara?stockName=ELMA&take=50',
              description: 'Stok kartlari icin kolay okunur arama aliasini kullanir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/hareketler?startDate=2026-07-01&endDate=2026-07-21&stockCode=015550&take=250',
              description: 'Stok hareketlerini tarih araligi ve opsiyonel stok kodu ile listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/karlilik?startDate=2026-07-01&endDate=2026-07-21&scope=producer&take=250',
              description: 'Karlilik raporunu secili kirilim ve tarih araliginda getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/stok-raporlari/sayim-karsilastirma?warehouseNo=110&countDate=2026-07-21&take=500',
              description: 'Sayim tarihi icin sistem/sayim miktari farklarini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "warehouseNo": 110,
  "reportDate": "2026-07-21",
  "search": "ELMA",
  "onlyWithStock": true,
  "take": 100
}`
    },
    () =>
      import('../tasks/reports/stok-raporlari/list/stok-raporlari-list.component').then(
        (m) => m.StokRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.stok-raporlari.list',
        'rapor-islemleri.stok-raporlari',
        'StokRaporlari',
        'Stok Raporlari'
      ]
    }
  ),
  'promosyon-raporlari': singleRouteTask(
    {
      id: 'promosyon-raporlari',
      title: 'Promosyon Raporlari',
      subtitle:
        'Promosyon bultenlerini ve POS gerceklesen promosyon kullanim, satis, indirim ve marj etkilerini raporlar.',
      baseRouteOrFile: '/api/rapor-islemleri/promosyon-raporlari',
      highlights: [
        'Bulten listesi activeOn ve onlyActive filtreleriyle calisir',
        'Performans filtrelerindeki promosyon dropdownu bultenler/secenekler endpointinden beslenir',
        'Performans ve satis-marj etkisi PromotionPerformanceHttpRequest query modelini kullanir',
        'Performans startDate ve endDate alanlari opsiyoneldir; backend bos tarihleri varsayilan araliga tamamlar',
        'Sube kirilimi performans/sube endpointinden okunur',
        'Bulten tanim CRUD islemleri bu ekranda yoktur; ekran salt okunurdur'
      ],
      listTitle: 'Promosyon Rapor Endpointleri',
      items: [
        {
          name: 'PromotionReportsController',
          description:
            'Promosyon bultenlerini ve POS promosyon etkilerini rapor/grid ekranlari icin getirir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/bultenler?warehouseNo=110&onlyActive=true&take=100',
              description: 'Aktif veya filtrelenen promosyon bultenlerini listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/bultenler/secenekler?search=12&take=50',
              description: 'Performans filtresi icin promosyon/bulten seceneklerini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/performans?startDate=2026-07-01&endDate=2026-07-21&warehouseNo=110&take=250',
              description: 'Promosyon bazli kullanim, satis, indirim ve marj ozetini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/performans?promotionCode=1234',
              description: 'Tek promosyon performansini backend varsayilan tarih araligiyla getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/satis-marj-etkisi?startDate=2026-07-01&endDate=2026-07-21&promotionCode=1234',
              description: 'Promosyon satis ve marj etkisini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/promosyon-raporlari/performans/sube?startDate=2026-07-01&endDate=2026-07-21&promotionCode=1234',
              description: 'Promosyon performansini sube kiriliminda listeler'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-07-01",
  "endDate": "2026-07-21",
  "warehouseNo": 110,
  "promotionCode": "1234",
  "take": 250
}`
    },
    () =>
      import('../tasks/reports/promosyon-raporlari/list/promosyon-raporlari-list.component').then(
        (m) => m.PromosyonRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.promosyon-raporlari.list',
        'rapor-islemleri.promosyon-raporlari',
        'PromosyonRaporlari',
        'Promosyon Raporlari'
      ]
    }
  ),
  'satis-analizleri': singleRouteTask(
    {
      id: 'satis-analizleri',
      title: 'Satis Analizleri',
      subtitle:
        'Ciro disi satis raporlarini banka, yemek ceki, MarketYo, Z rapor, indirim karti ve eksik ciro kirilimlariyla sunar.',
      baseRouteOrFile: '/api/rapor-islemleri/satis-analizleri',
      highlights: [
        'Tum endpointler WarehouseOrderDateRangeHttpRequest query modelini kullanir',
        'warehouseNo verilmezse tum subeler, verilirse tek sube raporlanir',
        'Tarih filtresi gun bazindadir ve endDate backend tarafinda dahil kabul edilir',
        'Tutar alanlari backend tarafinda 2 ondaliga yuvarlanir'
      ],
      listTitle: 'Satis Analizi Endpointleri',
      items: [
        {
          name: 'SatisAnalizleriController',
          description:
            'Eski SalesMvcCoreUI dashboard tarafindaki ciro disi raporlari tek modul altinda toplar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/banka-hareketleri?startDate=2026-06-01&endDate=2026-06-10&warehouseNo=110',
              description: 'Banka odemelerini Z no, sube, kasa, banka ve terminal bazinda listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/banka-hareketleri/sube?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Banka hareketlerini sube ve banka bazinda toplar'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/banka?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Banka adina gore toplam tutar ve slip sayisini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/merchant?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Banka ve uye isyeri no bazinda odeme ozetlerini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/valor?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Banka ve valor gunu bazinda yatacak tutarlari getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/yemek-cekleri?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Yemek ceki tutarlarini sube bazinda listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/yemek-cekleri/toplamlar?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Yemek ceki genel toplamlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/marketyo-satislari?startDate=2026-06-01&endDate=2026-06-10',
              description: 'MarketYo MYO seri satis belgelerini listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/marketyo-satislari/sube?startDate=2026-06-01&endDate=2026-06-10',
              description: 'MarketYo satislarini sube ve tarih bazinda toplar'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/z-rapor-banka-analizi?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Z rapor banka detaylarini kasa, terminal ve merchant bilgisiyle listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/indirim-kartlari?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Indirim karti kullanim adedi ve POS fatura toplam tutarini listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/satis-analizleri/eksik-cirolar?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Secilen tarih araliginda ciro kaydi olmayan aktif subeleri listeler'
            }
          ]
        }
      ],
      codeSample: `{
  "startDate": "2026-06-01",
  "endDate": "2026-06-10",
  "warehouseNo": 110
}`
    },
    () =>
      import('../tasks/reports/satis-analizleri/list/satis-analizleri-list.component').then(
        (m) => m.SatisAnalizleriListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.satis-analizleri.list',
        'rapor-islemleri.satis-analizleri',
        'SatisAnalizleri',
        'Satış Analizleri'
      ]
    }
  )
  ,
  'ciro-hedef-raporlari': singleRouteTask(
    {
      id: 'ciro-hedef-raporlari',
      title: 'Ciro & Hedef Karsilastirma',
      subtitle:
        'Cari donem ile gecen yil ayni donem cirolarini nakit, kredi karti, musteri ve hedef gerceklesme oranlariyla karsilastirir.',
      baseRouteOrFile: '/api/rapor-islemleri/ciro-hedef',
      highlights: [
        'Cari vs Onceki Yil Karsilastirmasi',
        'Hedef Gerceklesme Oranlari (% Büyüme / % Hedef)',
        'Mikro Hedef Tanimlari Listesi',
        'Nakit, KK, Furpara ve Musteri Analizleri'
      ],
      listTitle: 'Ciro & Hedef Endpointleri',
      items: [
        {
          name: 'CiroHedefRaporlariController',
          description: 'Ciro ve hedef karsilastirma raporu ve hedef parametreleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/ciro-hedef/karsilastirma?startDate=2026-06-01&endDate=2026-06-10&warehouseNo=110',
              description: 'Cari ve gecen yil karsilastirmali ciro, musteri ve hedef raporunu getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/ciro-hedef/hedef-tanimlari?year=2026&month=6',
              description: 'Mikro DB buyume hedef tanimlarini listeler'
            }
          ]
        }
      ],
      codeSample: JSON.stringify(
        {
          startDate: '2026-06-01',
          endDate: '2026-06-10',
          warehouseNo: 110
        },
        null,
        2
      )
    },
    () =>
      import('../tasks/reports/ciro-hedef-raporlari/list/ciro-hedef-raporlari-list.component').then(
        (m) => m.CiroHedefRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.ciro-hedef-raporlari.list',
        'rapor-islemleri.ciro-hedef-raporlari',
        'ciro-hedef',
        'CiroHedefRaporlari',
        'Ciro ve Hedef Raporları'
      ]
    }
  ),
  'mal-kabul-raporlari': singleRouteTask(
    {
      id: 'mal-kabul-raporlari',
      title: 'Mal Kabul Raporlari',
      subtitle:
        'Tembel subeler (kabul edilmemis acik sevkler) ve tedarikci bazli mal kabul hacim analizlerini sunar.',
      baseRouteOrFile: '/api/rapor-islemleri/mal-kabul',
      highlights: [
        'Tembel Subeler (Bekleyen Acik Irsaliyeler)',
        'Acik Irsaliye Detay Evraklari',
        'Tedarikci Mal Kabul Hacim Analizi'
      ],
      listTitle: 'Mal Kabul Raporu Endpointleri',
      items: [
        {
          name: 'MalKabulRaporlariController',
          description: 'Acik sevk irsaliyeleri ve tedarikci mal kabul hacim dökümleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/mal-kabul/tembel-subeler?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Mal kabul yapilmamis acik sevk irsaliyelerini sube bazli listeler'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/mal-kabul/tembel-subeler/evraklar?warehouseNo=110&startDate=2026-06-01&endDate=2026-06-10',
              description: 'Secilen subenin bekleyen acik sevk irsaliyesi detaylarini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/mal-kabul/tedarikci-hacim-analizi?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Tedarikci bazinda gelen mal kabul hacim ve net tutarlarini listeler'
            }
          ]
        }
      ],
      codeSample: JSON.stringify(
        {
          startDate: '2026-06-01',
          endDate: '2026-06-10'
        },
        null,
        2
      )
    },
    () =>
      import('../tasks/reports/mal-kabul-raporlari/list/mal-kabul-raporlari-list.component').then(
        (m) => m.MalKabulRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.mal-kabul-raporlari.list',
        'rapor-islemleri.mal-kabul-raporlari',
        'mal-kabul',
        'MalKabulRaporlari',
        'Mal Kabul Raporları',
        'Tembel Şubeler'
      ]
    }
  ),
  'kasa-raporlari': singleRouteTask(
    {
      id: 'kasa-raporlari',
      title: 'Kasa Gider Pusulalari Raporu',
      subtitle:
        'Bolge, sube, kasa ve kasiyer kiriliminda gider pusulalari, fis sayilari ve fis döküm detaylarini sunar.',
      baseRouteOrFile: '/api/rapor-islemleri/kasa-raporlari',
      highlights: [
        'Bolge -> Sube -> Kasa -> Kasiyer Hiyerarsisi',
        'Gider Pusulasi Detay Fis Dokumu',
        'Iptal Fisleri ve Tutar Ozeti'
      ],
      listTitle: 'Kasa Raporlari Endpointleri',
      items: [
        {
          name: 'KasaRaporlariController',
          description: 'Kasa gider pusulalari hiyerarsik ozetleri ve detay evraklari.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/rapor-islemleri/kasa-raporlari/gider-pusulalari?startDate=2026-06-01&endDate=2026-06-10',
              description: 'Bolge, sube, kasa ve kasiyer kiriliminda gider pusulasi ozetlerini getirir'
            },
            {
              method: 'GET',
              path: '/api/rapor-islemleri/kasa-raporlari/gider-pusulalari/detaylar?warehouseNo=110&cashierCode=101&startDate=2026-06-01&endDate=2026-06-10',
              description: 'Secilen kasa/kasiyer icin gider pusulasi fis dokumunu getirir'
            }
          ]
        }
      ],
      codeSample: JSON.stringify(
        {
          startDate: '2026-06-01',
          endDate: '2026-06-10',
          warehouseNo: 110
        },
        null,
        2
      )
    },
    () =>
      import('../tasks/reports/kasa-raporlari/list/kasa-raporlari-list.component').then(
        (m) => m.KasaRaporlariListComponent
      ),
    {
      accessKeyAliases: [
        'rapor-islemleri.kasa-raporlari.list',
        'rapor-islemleri.kasa-raporlari',
        'kasa-raporlari',
        'KasaRaporlari',
        'Kasa Raporları',
        'Gider Pusulaları'
      ]
    }
  )

} as const satisfies Record<string, DocsTaskSource>;
