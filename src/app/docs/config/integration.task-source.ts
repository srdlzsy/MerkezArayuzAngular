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
              path: '/api/integrations/axata-sync/tasks/{taskCode}/preview?warehouseNo=...&take=10',
              description: 'Secili task icin canli veriden preview payload olusturur'
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
              path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/candidates?...',
              description: 'Manuel kurtarma icin evrak adaylarini listeler'
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
                description: 'Secili tek evraki eski AXATA worker kontratina uygun canli SOAP dispatch ile gonderir',
                payload: 'AxataSynchronizationManualDocumentHttpRequest'
              },
              {
                method: 'POST',
                path: '/api/integrations/axata-sync/manual/tasks/{taskCode}/documents/dispatch-batch',
                description: 'Birden fazla secili evraki canli SOAP dispatch ile toplu gonderir',
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
  "warehouseNo": 1
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
        'Z raporlari, POS faturalar, gider pusulalari ve kasa eslemeleri icin scaffold tabanli web omurgasi.',
      baseRouteOrFile: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
      highlights: [
        'Tek menu, 4 tab',
        'Scaffold response odakli',
        '501 Not Implemented uyumlu UI',
        'Liste / detay / toplu islem ayrimi',
        'Staging ve ERP kavramlarini ayri tutar'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'PosMuhasebeAktarimiController',
          description:
            'POS muhasebe aktarimi ailesinin route ve request contractlarini acik tutar; business implementasyon sonraki fazda baglanacaktir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi',
              description: 'Menu overview scaffold response dondurur'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Z raporlari listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/{reportId}',
              description: 'Z raporu detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar',
              description: 'Z raporlarini staginge alma akisinin contracti hazirdir',
              payload: 'ImportZReportsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder',
              description: 'Z raporlarini ERPye gonderme akisinin contracti hazirdir',
              payload: 'PosAccountingTransferHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
              description: 'Z raporu staging temizleme akisinin contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
              description: 'POS faturalar listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
              description: 'POS fatura detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/ice-aktar',
              description: 'POS faturalarini staginge alma akisinin contracti hazirdir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/erpye-gonder',
              description: 'POS faturalarini ERPye gonderme akisinin contracti hazirdir',
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
              description: 'POS fatura staging temizleme contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
              description: 'Gider pusulalari listesi icin scaffold response dondurur',
              payload: 'PosAccountingDateRangeHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
              description: 'Gider pusulasi detay routeu scaffold response dondurur'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/ice-aktar',
              description: 'Gider pusulasi import contracti hazirdir',
              payload: 'ImportPosDocumentsHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/erpye-gonder',
              description: 'Gider pusulasi ERP transfer contracti hazirdir',
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
              description: 'Gider pusulasi staging temizleme contracti hazirdir',
              payload: 'PosAccountingDeleteHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
              description: 'Kasa eslemeleri listesi icin scaffold response dondurur',
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
  "moduleCode": "entegrasyon-islemleri",
  "menuCode": "pos-muhasebe-aktarimi",
  "actionCode": "list",
  "isImplemented": false,
  "message": "Bu endpoint iskelet olarak acildi. Is kurali ve Mikro veritabani entegrasyonu sonraki adimda baglanacak."
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
        'Scalar parameter + payloadXml',
        'Whitelist Get* operasyonlari'
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
        'Scalar parameter + payloadXml',
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
  "payloadXml": "<query><PageIndex>1</PageIndex><PageSize>20</PageSize><IsArchived>false</IsArchived></query>"
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
