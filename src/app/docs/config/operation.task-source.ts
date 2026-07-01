import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const OPERATION_TASK_SOURCE = {
  'belge-akis-takibi': singleRouteTask(
    {
      id: 'belge-akis-takibi',
      title: 'Belge Akis ve Hata Takibi',
      subtitle:
        'Sevk, iade, mal kabul, siparis ve e-irsaliye akislarini olay timeline ile izler.',
      baseRouteOrFile: '/api/operasyon-islemleri/belge-akis-takibi',
      highlights: [
        'Auth DB document_flows ve document_flow_events kayitlarini okur',
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
      "documentType": "CompanyShipment",
      "sourceWarehouseNo": 1,
      "targetWarehouseNo": null,
      "documentNo": "FRM2026000000101",
      "status": "Succeeded",
      "currentStep": "EDespatchSubmission"
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
