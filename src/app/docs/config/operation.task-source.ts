import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const OPERATION_TASK_SOURCE = {
  'urun-dagilimlari': singleRouteTask(
    {
      id: 'urun-dagilimlari',
      title: 'Urun Dagilimlari',
      subtitle:
        'Satis verisine gore sube bazli dagilim onerisi uretir, STOK_DAGILIM kaydini ve kesinlestirme akisini yonetir.',
      baseRouteOrFile: '/api/operasyon-islemleri/urun-dagilimlari',
      highlights: [
        'Dagitim merkezleri acilista yuklenir ve oneri akisi bu depoya gore calisir',
        'Oneri satirlarinda toplam koli farki sifir olmadan kaydetme aktif olmaz',
        'Kaydedildi durumunda guncelle, sil ve bolge bilgilendirme aksiyonlari aciktir',
        'Bilgilendirildi durumunda kesinlestirme ile Mikro depolar arasi siparisleri olusturulur',
        'API mail gondermez; bolge alici ve ozet bilgisini UI/outbox katmani icin hazirlar'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'ProductDistributionController',
          description:
            'Urun dagilim onerisi, STOK_DAGILIM kaydi, bolge bilgilendirme ve Mikro siparis kesinlestirme akisini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/urun-dagilimlari/dagitim-merkezleri',
              description: 'Dagilim cikis deposu olarak kullanilacak dagitim merkezlerini getirir'
            },
            {
              method: 'POST',
              path: '/api/operasyon-islemleri/urun-dagilimlari/oneri',
              description: 'Stok, dagitim merkezi ve toplam koliye gore sube dagilim onerisi uretir'
            },
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/urun-dagilimlari?startDate=2026-07-24&endDate=2026-07-24&statusCode=0',
              description: 'Dagilim kayitlarini filtreli olarak listeler'
            },
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/urun-dagilimlari/{documentNo}',
              description: 'Secili dagilim evrakinin satirlarini ve durumunu getirir'
            },
            {
              method: 'POST',
              path: '/api/operasyon-islemleri/urun-dagilimlari',
              description: 'Dengeli dagilim onerisini STOK_DAGILIM kaydi olarak olusturur'
            },
            {
              method: 'PUT',
              path: '/api/operasyon-islemleri/urun-dagilimlari/{documentNo}',
              description: 'Sadece Kaydedildi durumundaki dagilim satirlarini gunceller'
            },
            {
              method: 'POST',
              path: '/api/operasyon-islemleri/urun-dagilimlari/{documentNo}/bilgilendir',
              description: 'Bolge bazli alici ve dagilim ozetini hazirlar, statusu Bilgilendirildi yapar'
            },
            {
              method: 'POST',
              path: '/api/operasyon-islemleri/urun-dagilimlari/{documentNo}/kesinlestir',
              description: 'Bilgilendirilmis dagilimi Mikro depolar arasi siparislere cevirir'
            },
            {
              method: 'DELETE',
              path: '/api/operasyon-islemleri/urun-dagilimlari/{documentNo}',
              description: 'Sadece Kaydedildi durumundaki dagilim kaydini siler'
            }
          ]
        }
      ],
      codeSample: `{
  "stockCode": "153.01.0001",
  "distributionCenterWarehouseNo": 50,
  "totalCaseQuantity": 120,
  "salesDayCount": 42,
  "referenceDate": "2026-07-24"
}`
    },
    () =>
      import('../tasks/operation/urun-dagilimlari/list/urun-dagilimlari-list.component').then(
        (m) => m.UrunDagilimlariListComponent
      ),
    {
      accessKeyAliases: [
        'operasyon-islemleri.urun-dagilimlari',
        'UrunDagilimlari',
        'ProductDistribution',
        'FrmDagilim'
      ]
    }
  ),
  'depo-operasyon-paneli': singleRouteTask(
    {
      id: 'depo-operasyon-paneli',
      title: 'Depo Operasyon Paneli',
      subtitle:
        'Aktif depolarin gunluk sevk, mal kabul, bekleyen islem ve e-irsaliye hata durumlarini tek ekranda izler.',
      baseRouteOrFile: '/api/operasyon-islemleri/depo-operasyon-paneli',
      highlights: [
        'Yalnizca Furpa Merkez API tarafindan kaydedilen belge akislarini sayar',
        'Secilen gun icin sevk, mal kabul ve tamamlanmamis operasyon ozetini sunar',
        'Depo sagligini Healthy, Warning ve Critical seviyelerinde gosterir',
        'Depo satirindan filtreli belge akis listesine gecis saglar'
      ],
      listTitle: 'Endpoint',
      items: [
        {
          name: 'WarehouseOperationDashboardController',
          description:
            'Mikro DEPOLAR listesini Auth DB belge akis metrikleriyle birlestirerek merkez yonetim panelini dondurur.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/depo-operasyon-paneli?date=2026-07-02',
              description: 'Secilen gunun depo operasyon ozetini ve depo bazli saglik metriklerini getirir'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/operation/depo-operasyon-paneli/list/depo-operasyon-paneli-list.component').then(
        (m) => m.DepoOperasyonPaneliListComponent
      ),
    {
      accessKeyAliases: [
        'operasyon-islemleri.depo-operasyon-paneli',
        'DepoOperasyonPaneli',
        'WarehouseOperationDashboard'
      ]
    }
  ),
  'belge-akis-takibi': singleRouteTask(
    {
      id: 'belge-akis-takibi',
      title: 'Belge Akis ve Hata Takibi',
      subtitle:
        'Sevk, iade, mal kabul, siparis ve e-irsaliye akislarini olay timeline ile izler.',
      baseRouteOrFile: '/api/operasyon-islemleri/belge-akis-takibi',
      highlights: [
        'Auth DB document_flows ve document_flow_events kayitlarini okur',
        'Mikro API teknik yazma audit kayitlari bu ekrandaki belge akislarindan ayridir',
        'mikro_api_write_audits icin UI endpointi yayinlanana kadar audit alanlari bu response modelinde beklenmez',
        'Depo kullanicisi yalnizca kendi deposuyla iliskili akislarini gorur',
        'Admin kullanicilar warehouseNo filtresiyle tum depolari sorgulayabilir',
        'trackingEnabled false ise eski kayitlar okunur ama yeni akis yazimi kapali demektir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DocumentFlowTrackingController',
          description:
            'Belge akislarinin ozet listesini ve secili akis icin olay timeline detayini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/belge-akis-takibi?warehouseNo=1&startDate=2026-07-01&endDate=2026-07-01&documentType=CompanyShipment&status=Failed&search=FRM2026000000101&take=100',
              description: 'Belge akislarini filtreli olarak listeler'
            },
            {
              method: 'GET',
              path: '/api/operasyon-islemleri/belge-akis-takibi/{id}',
              description: 'Belge akis detayini ve event timeline kayitlarini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "trackingEnabled": true,
  "totalCount": 1,
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "flowKey": "CompanyShipment:1:FRM2026:101",
      "documentType": "CompanyShipment",
      "sourceWarehouseNo": 1,
      "targetWarehouseNo": null,
      "documentNo": "FRM2026000000101",
      "status": "Succeeded",
      "currentStep": "EDespatchSubmission",
      "lastChangedByUserId": null
    }
  ]
}`
    },
    () =>
      import('../tasks/operation/belge-akis-takibi/list/belge-akis-takibi-list.component').then(
        (m) => m.BelgeAkisTakibiListComponent
      ),
    {
      accessKeyAliases: [
        'operasyon-islemleri.belge-akis-takibi',
        'DocumentFlowTracking',
        'BelgeAkisTakibi',
        'belge-akis-ve-hata-takibi'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
