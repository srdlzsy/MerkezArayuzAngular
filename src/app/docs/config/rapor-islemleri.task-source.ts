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
        'Normal kullanici aktif JWT deposuyla sinirlanir; Tum Depolar yalniz Admin/Administrator icindir',
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
        'Tek depo raporlarinda Admin/Administrator depo secmelidir; normal kullanicida backend JWT deposunu uygular',
        'Son stok ve envanter degeri StockOnHandReportDto response modelini kullanir',
        'Hareket, satis, iade, satmayan urun, karlilik ve sayim raporlari ayni ekranda sekmelerle acilir',
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
              path: '/api/rapor-islemleri/stok-raporlari/urun-depo-durum?stockCodeOrBarcode=015550&reportDate=2026-07-21',
              description: 'Tek urunun depo/sube bazli stok durumunu getirir'
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
        'Performans ve satis-marj etkisi PromotionPerformanceHttpRequest query modelini kullanir',
        'Sube kirilimi performans/sube endpointinden okunur',
        'Bulten tanim CRUD islemleri bu ekranda yoktur; ekran salt okunurdur',
        'Admin/Administrator warehouseNo bos birakinca tum subeler okunabilir'
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
              path: '/api/rapor-islemleri/promosyon-raporlari/performans?startDate=2026-07-01&endDate=2026-07-21&warehouseNo=110&take=250',
              description: 'Promosyon bazli kullanim, satis, indirim ve marj ozetini getirir'
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
} as const satisfies Record<string, DocsTaskSource>;
