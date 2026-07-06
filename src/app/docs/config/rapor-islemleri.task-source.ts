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
