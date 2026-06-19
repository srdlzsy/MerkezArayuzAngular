import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const INTEGRATION_TASK_SOURCE = {
  'axata-senkronizasyonu': singleRouteTask(
      {
        id: 'axata-senkronizasyonu',
        title: 'Axata Senkronizasyonu',
        subtitle:
          'Overview, fetch profile, live dispatch, AXATA native bridge ve manuel kurtarma akislarini tek panelde toplar.',
        baseRouteOrFile: '/api/integrations/axata-sync',
        highlights: [
          'Task overview + health probe',
          'Fetch profile explorer',
          'Live audit ve AXATA queue preview',
          'AXATA sevk tarihi listesi',
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
              path: '/api/integrations/axata-sync',
              description: 'Task listesi, scheduler durumu ve son joblari getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/health',
              description: 'Kaynak SQL ve endpoint probe durumlarini getirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/fetch-profiles',
              description: 'Eski worker parity icin planlanan AXATA fetch/import profillerini listeler'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/live/audit/overview?startDate=...&endDate=...&warehouseNo=50&take=50',
              description: 'Mikro siparis bayraklari ile AXATA pending sevk kuyrugunu karsilastirir'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/live/axata/outbound-deliveries/preview?movementType=C02&take=20',
              description: 'C01/C02/C03/C4 AXATA pending outbound delivery kuyrugunu okur; Mikro veya AXATA verisi yazmaz'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/live/axata/outbound-deliveries/by-date?date=2026-06-19',
              description: 'AXATA ENT006.S06ITAR tarihine gore sevk basliklarini ve ENT007 satir ozetini listeler; veri yazmaz'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/live/axata/outbound-deliveries/c01/preview?take=20',
              description: 'C01 pending teslimatlarini Mikro siparis satirlariyla eslestirir; veri yazmaz'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/live/axata/outbound-deliveries/c01/import',
              description: 'Uygun C01 teslimatlarini Mikro sevk fisine cevirir; acknowledge true ise AXATA ack atar',
              payload: 'AxataOutboundDeliveryImportExecuteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/integrations/axata-sync/tasks/{taskCode}/preview?warehouseNo=...&take=10',
              description: 'Secili task icin canli veriden preview payload olusturur; issued-warehouse-order-sync icin warehouseNo kaynak/cikis depodur'
            },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/tasks/{taskCode}/execute',
                description: 'Secili task icin DryRun veya Outbox job baslatir',
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
              path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/candidates?warehouseNo=...&startDate=...&endDate=...&skip=0&take=25',
              description: 'Manuel kurtarma icin evrak adaylarini skip/take ile sayfali listeler'
            },
            {
              method: 'POST',
              path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/preview',
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
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/preview-batch',
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
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/dispatch',
                description: 'Secili tek evraki eski AXATA worker kontratina uygun WCF client ile canli gonderir',
                payload: 'AxataSynchronizationManualDocumentHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/dispatch-batch',
                description: 'Birden fazla secili evraki canli WCF dispatch ile toplu gonderir',
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
              description: 'POS faturalar listesini dondurur; OnlyPending default true kabul edilir',
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
              description: 'POS faturalarini staginge alir; dateToGet, businessDate aliasi olarak desteklenir',
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
              description: 'Gider pusulalari listesini dondurur; OnlyPending default true kabul edilir',
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
              description: 'Gider pusulasini staginge alir; dateToGet, businessDate aliasi olarak desteklenir',
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
        'Typed parameter formu',
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
              description: 'Sadece operasyon listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu query string ile calistirir'
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
        'Typed parameter formu',
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
              description: 'Sadece operasyon listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-irsaliye/get/{operationName}',
              description: 'Whitelist icindeki tek bir GET operasyonunu query string ile calistirir'
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
