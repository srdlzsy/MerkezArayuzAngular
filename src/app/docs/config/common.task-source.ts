import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const COMMON_TASK_SOURCE = {
  'sikayet-oneri': singleRouteTask(
    {
      id: 'sikayet-oneri',
      title: 'Sikayet Oneri',
      subtitle:
        'Home veya yonetim ekranindan acilan sikayet ve onerileri rol kapsamina gore izler; yeni kayit ve admin aksiyonlarini ayri yonetir.',
      baseRouteOrFile: '/api/ortak-islemler/sikayet-oneri',
      highlights: [
        'Home endpointleri login olan her kullanici icin aciktir',
        'Yeni sikayet/oneri kaydi home veya yonetim ekranindan olusturulabilir',
        'Admin/Administrator tum kayitlari ve depo filtresini kullanir',
        'Admin olmayan kullanici kendi actigi kayitlari gorur; okundu/durum/admin notu aksiyonlari salt okunurdur',
        'Okundu ve durum/admin notu aksiyonlari sadece Admin/Administrator icin aciktir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'SikayetOneriController',
          description:
            'Kullanici feedback kayitlarini yonetim gridinde listeler, detayini getirir ve durum aksiyonlarini uygular.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ortak-islemler/sikayet-oneri?status=New&type=Complaint&warehouseNo=110&startDate=2026-06-01&endDate=2026-06-09&take=100',
              description: 'Yetki kapsamina gore sikayet/oneri kayitlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/sikayet-oneri/{id}',
              description: 'Secili kaydin detayini getirir'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/sikayet-oneri/{id}/okundu',
              description: 'Admin kaydi okundu olarak isaretler'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/sikayet-oneri/{id}/durum',
              description: 'Admin kaydin durumunu ve yonetim notunu gunceller',
              payload: 'ChangeFeedbackStatusHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/home/sikayet-oneri',
              description: 'Home veya yonetim ekranindan yeni sikayet/oneri kaydi olusturur',
              payload: 'CreateFeedbackItemHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "status": "InProgress",
  "adminNote": "Bolge sorumlusuna iletildi."
}`
    },
    () =>
      import('../tasks/common/sikayet-oneri/list/sikayet-oneri-list.component').then(
        (m) => m.SikayetOneriListComponent
      ),
    {
      accessKeyAliases: ['SikayetOneri', 'ortak-sikayet-oneri']
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
