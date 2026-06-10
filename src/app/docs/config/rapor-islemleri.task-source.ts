import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const RAPOR_ISLEMLERI_TASK_SOURCE = {
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
