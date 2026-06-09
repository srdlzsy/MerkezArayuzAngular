import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const COMMON_TASK_SOURCE = {
  'sikayet-oneri': singleRouteTask(
    {
      id: 'sikayet-oneri',
      title: 'Sikayet Oneri',
      subtitle:
        'Home uzerinden acilan sikayet ve onerileri depo/yetki kapsamina gore izler, okundu ve durum aksiyonlarini yonetir.',
      baseRouteOrFile: '/api/ortak-islemler/sikayet-oneri',
      highlights: [
        'Home endpointleri login olan her kullanici icin aciktir',
        'Yonetim listesi list veya list-all yetkisiyle acilir',
        'list-all olmayan kullanicilar backend tarafinda JWT deposuna sinirlanir',
        'Okundu ve durum degisimi ayri PATCH endpointleriyle yapilir'
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
              description: 'Kaydi okundu olarak isaretler'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/sikayet-oneri/{id}/durum',
              description: 'Kaydin durumunu ve yonetim notunu gunceller',
              payload: 'ChangeFeedbackStatusHttpRequest'
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
