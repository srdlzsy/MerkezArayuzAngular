import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const INTEGRATION_TASK_SOURCE = {
  'axata-senkronizasyonu': singleRouteTask(
      {
        id: 'axata-senkronizasyonu',
        title: 'Axata Senkronizasyonu',
        subtitle:
          'Sade is merkezi, teknik audit, live dispatch, AXATA native bridge ve manuel kurtarma akislarini tek ekranda toplar.',
        baseRouteOrFile: '/api/integrations/axata-sync',
        highlights: [
          'Sade is merkezi: panel, ekran bolumleri, operasyon sozlugu, endpoint sozlugu ve kurallar',
          'Task overview + health probe',
          'Fetch profile explorer',
          'AXATA SQL tabanli live audit, status evreni ve queue preview',
          'Mikro siparisten AXATA siparis/sevk ve Mikro linkine evrak bazli yasam dongusu',
          'company-receiving-sync verilen firma/satinalma siparisini AXATA G01 inbound order olarak gonderir',
          'Basarili C01/C02/G01/G02 dispatch kaynak siparis satirlarinda Special1 bayragini isaretler',
          'Mikro urun, tum barkod ve birimleriyle AXATA addSKUMaster canli aktarimi',
          'AXATA sevk tarihi listesi',
          'C02/C03/C04/G01/G02/DynamicCensus live import',
          'Preview, route-based execute ve POST /jobs',
          'Job polling',
          'Document bazli batch kurtarma',
          'Live dispatch',
          'AXATA native outbound/inbound bridge',
          'Manual incoming single ve batch recovery'
        ],
        listTitle: 'Endpointler ve Akislar',
        items: [
          {
            name: 'AxataSynchronizationController',
          description:
            'AXATA task katalogunu, preview akisini, execute joblarini ve manuel kurtarma endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/status',
              description: 'Task listesi, scheduler durumu ve son joblari sade alias ile getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/connection-test',
              description: 'Kaynak SQL ve endpoint probe durumlarini sade alias ile getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/profiles',
              description: 'Eski worker parity icin planlanan AXATA fetch/import profillerini sade alias ile listeler'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/workbench?startDate=...&endDate=...&warehouseNo=50&take=50',
              description: 'Ana ekran icin panel, ekran bolumleri, operasyon gruplari, endpoint gruplari, sozluk ve kurallari doner'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/is-merkezi?startDate=...&endDate=...&warehouseNo=50&take=50',
              description: 'Workbench endpointinin Turkce aliasidir; ayni is merkezi responseunu doner'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/panel?startDate=...&endDate=...&warehouseNo=50&take=50',
              description: 'Workbench yoksa kullanilan daha kucuk ozet panel responseudur'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/operations/product-master/preview?productCode=URUN001&take=20',
              description: 'Aktif Mikro urunlerini tum barkod ve birimleriyle addSKUMaster paketi olarak onizler'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/operations/product-master/dispatch',
              description: 'Secili urun kodlarini veya take kadar aktif Mikro urununu AXATAya 100luk paketlerle canli gonderir',
              payload: 'AxataProductSynchronizationDispatchHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/operations/product-master/dispatch',
              description: 'Tek Mikro urununu productCodes dizisiyle AXATAya canli gonderir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/audit?startDate=...&endDate=...&warehouseNo=50&statuses=0,1&take=50',
              description: 'Mikro siparis gonderimi ile AXATA pending/tamamlanmis/iptal sevklerini ve Mikro linklerini karsilastirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/outbound-deliveries?movementType=C02&take=20',
              description: 'C01/C02/C03/C4 AXATA pending outbound delivery kuyrugunu okur; Mikro veya AXATA verisi yazmaz'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/outbound-deliveries/by-date?date=2026-06-19',
              description: 'AXATA ENT006.S06ITAR tarihine gore sevk basliklarini ve ENT007 satir ozetini listeler; veri yazmaz'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/c01/preview?take=20',
              description: 'C01 pending teslimatlarini Mikro siparis satirlariyla eslestirir; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/c01/import',
              description: 'Uygun C01 teslimatlarini Mikro sevk fisine cevirir; siparis link ve teslim etkisi Mikro tarafinda islenir',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/c01/documents/{documentSerie}/{documentOrderNo}/preview?status=1',
              description: 'Tek C01 belgeyi seri/sira ile kontrol eder; status bos ise backend once 0 sonra 1 dener'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/c01/documents/{documentSerie}/{documentOrderNo}/import',
              description: 'Tek C01 belgeyi Mikro depolar arasi sevk fisine cevirir',
              payload: 'AxataOutboundDeliveryDocumentImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/c02/preview?take=20',
              description: 'C02 pending teslimatlarini Mikro firma siparisleriyle eslestirir; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/c02/import',
              description: 'Uygun C02 teslimatlarini Mikro firma sevk hareketine cevirir ve istenirse AXATA ack atar',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/c03/preview?take=20',
              description: 'C03 legacy teslimatlarini kontrol eder; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/c03/import',
              description: 'Uygun C03 teslimatlarini Mikro legacy firma iade/ozel cikis hareketine cevirir',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/c04/preview?take=20',
              description: 'AXATA C4 teslimatlarini c04 route adiyla kontrol eder; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/c04/import',
              description: 'Uygun C4 teslimatlarini Mikro 50 -> 51 legacy hareketine cevirir',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/g02/preview?take=20',
              description: 'G02 pending giris teslimatlarini Mikro siparis ve bekleyen sevk fisiyle eslestirir; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/g02/import',
              description: 'Uygun G02 teslimatini mevcut Mikro bekleyen sevk fisine mal kabul olarak uygular',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/g02/documents/{documentSerie}/{documentOrderNo}/preview?status=1',
              description: 'Tek G02 belgeyi seri/sira ile kontrol eder; status bos ise backend once 0 sonra 1 dener'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/g02/documents/{documentSerie}/{documentOrderNo}/import',
              description: 'Tek G02 belgeyi bekleyen Mikro sevk fisine kabul olarak uygular',
              payload: 'AxataOutboundDeliveryDocumentImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/g01/preview?take=20',
              description: 'G01 ATF satirlarini Mikro firma siparisiyle eslestirir; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/g01/import',
              description: 'Uygun G01 ATF satirlarini Mikro firma mal kabul hareketine cevirir',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/dynamic-census/preview?take=50',
              description: 'AXATA vw_stok_duzeltme satirlarini Mikro stok duzeltme importu icin onizler'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/dynamic-census/import',
              description: 'Uygun DynamicCensus satirlarini Mikro stok duzeltme hareketine cevirir',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/tasks/{taskCode}/preview?warehouseNo=...&take=10',
              description: 'Secili task icin canli veriden preview payload olusturur; issued taskta warehouseNo kaynak/cikis, warehouse-inbound taskta hedef/giris depodur'
            },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/tasks/{taskCode}/execute',
                description: 'Secili task icin DryRun, Outbox veya destekliyorsa Live job baslatir',
                payload: 'AxataSynchronizationExecuteTaskHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/jobs',
                description: 'Task kodunu body ile alip genel execute job baslatir',
                payload: 'AxataSynchronizationExecuteHttpRequest'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/jobs/{jobId}',
                description: 'Kuyruga alinan entegrasyon job detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/operations/{taskCode}/documents/candidates?warehouseNo=...&startDate=...&endDate=...&skip=0&take=25',
              description: 'Manuel kurtarma icin evrak adaylarini skip/take ile sayfali listeler'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/operations/{taskCode}/documents/preview',
              description: 'Tek evrak icin manuel preview payload dondurur',
              payload: 'AxataSynchronizationManualDocumentHttpRequest'
            },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/execute',
                description: 'Tek evrak icin manuel DryRun veya Outbox calistirir',
                payload: 'AxataSynchronizationManualDocumentExecuteHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/operations/{taskCode}/documents/preview-batch',
                description: 'Birden fazla secili evrak icin toplu preview payload dondurur',
                payload: 'AxataSynchronizationManualDocumentBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/execute-batch',
                description: 'Birden fazla secili evrak icin toplu DryRun veya Outbox calistirir',
                payload: 'AxataSynchronizationManualDocumentBatchExecuteHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/operations/{taskCode}/documents/dispatch',
                description: 'Secili tek evraki WCF client ile gonderir; C01/C02/G01/G02 basarili dispatch kaynak siparis Special1 bayragini isaretler',
                payload: 'AxataSynchronizationManualDocumentHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/operations/{taskCode}/documents/dispatch-batch',
                description: 'Birden fazla secili evraki canli WCF dispatch ile toplu gonderir; basarili kaynak siparisler Special1 ile isaretlenir',
                payload: 'AxataSynchronizationManualDocumentBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments',
                description: 'AXATA outbound delivery verisini Mikro depolar arasi sevke cevirir',
                payload: 'AxataOutboundDeliveryHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments/batch',
                description: 'Coklu AXATA outbound delivery kaydini toplu Mikro sevkine cevirir',
                payload: 'AxataOutboundDeliveryBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/inbound-atf/company-receivings',
                description: 'AXATA inbound ATF verisini Mikro firma mal kabule cevirir; native quantity kismi kabul farki olusturmaz',
                payload: 'AxataInboundAtfCompanyReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/axata/inbound-atf/company-receivings/batch',
                description: 'Coklu AXATA inbound ATF kaydini toplu firma mal kabule cevirir; native quantity kismi kabul farki olusturmaz',
                payload: 'AxataInboundAtfCompanyReceivingBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/company-receivings',
                description: 'dispatchQuantity ve acceptedQuantity ayrimiyla kismi kabul destekleyen firma mal kabul payloadini Mikroya yazar',
                payload: 'CreateCompanyReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/company-receivings/batch',
                description: 'Kismi kabul destekleyen coklu firma mal kabul payloadlarini toplu yazar',
                payload: 'AxataManualIncomingCompanyReceivingBatchHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/inventory-counts',
                description: 'AXATA kaynakli tekil sayim sonucunu Mikroya yazar',
                payload: 'CreateInventoryCountHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/inventory-counts/batch',
                description: 'AXATA kaynakli coklu sayim payloadlarini toplu yazar',
                payload: 'AxataManualIncomingInventoryCountBatchHttpRequest'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings?warehouseNo=...&startDate=...&endDate=...',
                description: 'Bekleyen depo mal kabullerini manuel kurtarma icin listeler'
              },
              {
                method: 'GET',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/{documentSerie}/{documentOrderNo}?warehouseNo=...',
                description: 'Secili depo kabul evraginin satir detayini getirir'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/{documentSerie}/{documentOrderNo}/accept',
                description: 'Tek bekleyen depo mal kabul evragini manuel kabul eder',
                payload: 'AcceptWarehouseReceivingHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/incoming/warehouse-receivings/accept-batch',
                description: 'Birden fazla bekleyen depo mal kabul evragini toplu kabul eder',
                payload: 'AxataManualIncomingWarehouseReceivingBatchHttpRequest'
              }
            ]
          }
        ],
      codeSample: `{
  "executionMode": "DryRun",
  "warehouseNo": 50
}`
    },
    () =>
      import(
        '../tasks/integration/axata-senkronizasyonu/list/axata-senkronizasyonu-list.component'
      ).then((m) => m.AxataSenkronizasyonuListComponent),
    {
      accessKeyAliases: [
        'axata-sync',
        'AxataSync',
        'AxataSenkronizasyonu',
        'integrations',
        'entegrasyon-islemleri'
      ]
    }
  ),
  'pos-muhasebe-aktarimi': singleRouteTask(
    {
      id: 'pos-muhasebe-aktarimi',
      title: 'POS Muhasebe Aktarimi',
      subtitle:
        'Z raporlari, POS faturalar, gider pusulalari ve kasa eslemeleri icin aktif business DTO tabanli web omurgasi.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
      highlights: [
        'Tek menu, 4 tab',
        'Business DTO response odakli',
        'Z dosya importu haric aktif backend akislari',
        'Liste / detay / toplu islem ayrimi',
        'Belge tipine gore totalIds / invoiceIds / expenseIds secimi',
        'Depo secimi pos-muhasebe-aktarimi.all-warehouses yetkisine baglidir',
        'Staging ve ERP kavramlarini ayri tutar'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'PosMuhasebeAktarimiController',
          description:
            'POS muhasebe aktarimi ailesinin liste, detay, import, update, silme, kasa esleme ve ERPye gonderme akisini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
              description: 'Menu overview business DTO response dondurur'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Z raporlari listesini dondurur; OnlyPending default true kabul edilir',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/{reportId}',
              description: 'Z raporu header, KDV ve odeme detaylarini dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar',
              description: 'Z raporu dosya parseri aktif olana kadar basarisiz import sonuc satiri dondurebilir',
              payload: 'ImportZReportsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder',
              description: 'Secili totalIds kayitlarini Mikro muhasebe fisine aktarir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Secili totalIds staging kayitlarini temizler',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
              description: 'POS faturalar listesini dondurur; warehouseNo kapsami UI yetkisine gore belirlenir',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
              description: 'POS fatura detayini dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/ice-aktar',
              description: 'POS faturalarini staginge alir; dateToGet businessDate aliasidir, warehouseNo kapsami UI yetkisine gore belirlenir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/erpye-gonder',
              description: 'Secili invoiceIds kayitlarini Mikro muhasebe fisine aktarir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
              description: 'POS fatura header update contracti hazirdir',
              payload: 'UpdatePosAccountingDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
              description: 'Secili invoiceIds staging kayitlarini temizler',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
              description: 'Gider pusulalari listesini dondurur; warehouseNo kapsami UI yetkisine gore belirlenir',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
              description: 'Gider pusulasi detayini dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/ice-aktar',
              description: 'Gider pusulasini staginge alir; dateToGet businessDate aliasidir, warehouseNo kapsami UI yetkisine gore belirlenir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/erpye-gonder',
              description: 'Secili expenseIds kayitlarini Mikro muhasebe fisine aktarir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
              description: 'Gider pusulasi header update contracti hazirdir',
              payload: 'UpdatePosAccountingDocumentHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
              description: 'Secili expenseIds staging kayitlarini temizler',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
              description: 'Kasa eslemeleri listesini dondurur',
              payload: 'CashRegisterBranchMappingListHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
              description: 'Kasa eslemesi create contracti hazirdir',
              payload: 'CashRegisterBranchMappingHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri/{mappingId}',
              description: 'Kasa eslemesi update contracti hazirdir',
              payload: 'CashRegisterBranchMappingHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "invoiceIds": [125, 126],
  "continueOnError": true
}`
    },
    () =>
      import(
        '../tasks/integration/pos-muhasebe-aktarimi/list/pos-muhasebe-aktarimi-list.component'
      ).then((m) => m.PosMuhasebeAktarimiListComponent),
    {
      accessKeyAliases: [
        'pos-muhasebe-aktarimi',
        'PosMuhasebeAktarimi',
        'entegrasyon-islemleri'
      ]
    }
  ),
  'uyumsoft-e-fatura': singleRouteTask(
    {
      id: 'uyumsoft-e-fatura',
      title: 'Uyumsoft E Fatura',
      subtitle:
        'Uyumsoft BasicIntegration query modulu icin servis ozeti, operasyon listesi ve whitelist GET cagrilarini dokumante eder.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/uyumsoft/e-fatura',
      highlights: [
        'Servis ozet karti',
        'Operasyon explorer',
        'operations cevabindan typed parameter formu',
        'Enum alanlarda allowedValues dropdown',
        'Array alanlarda ayni query key ile coklu deger',
        'Whitelist Get* operasyonlari',
        'Direkt PDF binary aliaslari'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UyumsoftEInvoiceController',
          description:
            'Uyumsoft e-fatura connected-service query ekraninin backend kaynak endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura',
              description: 'Servis ozeti ve desteklenen GET operasyonlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/operations',
              description: 'Operasyon listesini parameters ve allowedValues bilgileriyle getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu direkt query alanlari veya parameter=name=value ile calistirir'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu calistirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/system/date',
              description: 'Sik kullanilan sistem tarihi alias routeunu operationName secmeden cagirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/inbox/invoices/{invoiceUuid}/pdf-file',
              description: 'Uyumsoft teknik invoiceUuid ile inbox PDF dosyasini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/outbox/invoices/{invoiceUuid}/pdf-file',
              description: 'Uyumsoft teknik invoiceUuid ile outbox PDF dosyasini getirir'
            }
          ]
        }
      ],
      codeSample: `{
  "parameters": [
    {
      "name": "format",
      "value": "yyyy-MM-dd HH:mm:ss"
    }
  ]
}`
    },
    () =>
      import('../tasks/integration/uyumsoft-query/list/uyumsoft-query-list.component').then(
        (m) => m.UyumsoftQueryListComponent
      ),
    {
      accessKeyAliases: [
        'uyumsoftefatura',
        'UyumsoftEFatura',
        'uyumsoft-e-fatura',
        'uyumsoft-fatura-query'
      ]
    }
  ),
  'uyumsoft-e-irsaliye': singleRouteTask(
    {
      id: 'uyumsoft-e-irsaliye',
      title: 'Uyumsoft E Irsaliye',
      subtitle:
        'Uyumsoft BasicDespatchIntegration query modulu icin servis ozeti, operasyon listesi ve whitelist GET cagrilarini dokumante eder.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye',
      highlights: [
        'Servis ozet karti',
        'Despatch operasyon explorer',
        'operations cevabindan typed parameter formu',
        'Enum alanlarda allowedValues dropdown',
        'Array alanlarda ayni query key ile coklu deger',
        'Whitelist Get* operasyonlari'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UyumsoftEDespatchController',
          description:
            'Uyumsoft e-irsaliye connected-service query ekraninin backend kaynak endpointlerini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye',
              description: 'Servis ozeti ve desteklenen GET operasyonlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/operations',
              description: 'Operasyon listesini parameters ve allowedValues bilgileriyle getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu direkt query alanlari veya parameter=name=value ile calistirir'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu calistirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/system/date',
              description: 'Sik kullanilan sistem tarihi alias routeunu operationName secmeden cagirir'
            }
          ]
        }
      ],
      codeSample: `{
  "parameters": [
    {
      "name": "PageIndex",
      "value": "1"
    },
    {
      "name": "PageSize",
      "value": "20"
    },
    {
      "name": "IsArchived",
      "value": "false"
    }
  ]
}`
    },
    () =>
      import('../tasks/integration/uyumsoft-query/list/uyumsoft-query-list.component').then(
        (m) => m.UyumsoftQueryListComponent
      ),
    {
      accessKeyAliases: [
        'uyumsofteirsaliye',
        'UyumsoftEIrsaliye',
        'uyumsoft-e-irsaliye',
        'uyumsoft-irsaliye-query'
      ]
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
