import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const COMMON_TASK_SOURCE = {
  'sikayet-oneri': singleRouteTask(
    {
      id: 'sikayet-oneri',
      title: 'Sikayet Oneri',
      subtitle:
        'Home veya yonetim ekranindan acilan sikayet ve onerileri permission kapsamina gore izler; yeni kayit ve yonetim aksiyonlarini ayri yonetir.',
      baseRouteOrFile: '/api/ortak-islemler/sikayet-oneri',
      highlights: [
        'Home endpointleri login olan her kullanici icin aciktir',
        'Yeni sikayet/oneri kaydi home veya yonetim ekranindan olusturulabilir',
        'Yonetim ekrani icin ortak-islemler.sikayet-oneri.page, liste API icin list gerekir',
        'Tum kayit kapsami icin ortak-islemler.sikayet-oneri.list-all gerekir',
        'Okundu ve durum/admin notu aksiyonlari ortak-islemler.sikayet-oneri.update yetkisiyle acilir'
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
              description: 'Permission kapsamina gore sikayet/oneri kayitlarini listeler'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/sikayet-oneri/{id}',
              description: 'Secili kaydin detayini getirir'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/sikayet-oneri/{id}/okundu',
              description: 'Guncelleme yetkisiyle kaydi okundu olarak isaretler'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/sikayet-oneri/{id}/durum',
              description: 'Guncelleme yetkisiyle kaydin durumunu ve yonetim notunu gunceller',
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
      accessKeyAliases: [
        'SikayetOneri',
        'ortak-sikayet-oneri',
        'ortak-islemler.sikayet-oneri.page'
      ],
      requiredPermissionCodes: ['ortak-islemler.sikayet-oneri.page']
    }
  ),
  duyurular: singleRouteTask(
    {
      id: 'duyurular',
      title: 'Duyurular',
      subtitle:
        'Home duyuru inbox akisini ve Ortak Islemler altindaki duyuru yonetimini permission kapsamina gore yonetir.',
      baseRouteOrFile: '/api/ortak-islemler/duyurular',
      highlights: [
        'Home duyuru inbox ve ozet endpointleri login olan her kullanici icin aciktir',
        'Yonetim ekrani icin ortak-islemler.duyurular.page, liste API icin list gerekir',
        'Olusturma, guncelleme ve arsivleme butonlari create/update/archive yetkilerine gore acilir',
        'Tum depolar veya baska depo hedefleme icin ortak-islemler.duyurular.all-warehouses gerekir',
        'Hedef kullanici secimi aktif kullanici arama endpointiyle yapilir, id elle yazdirilmaz',
        'Okundu ozeti readSummary ile listede, okuyan kisi listesi detay/okuyanlar endpointiyle gosterilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'DuyurularController',
          description:
            'Aktif duyuru inbox akisini, ozet sayaclarini ve yonetim CRUD/arsiv islemlerini saglar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/home/duyurular?includeRead=false&take=20',
              description: 'Kullanicinin kapsamindaki aktif duyurulari listeler'
            },
            {
              method: 'GET',
              path: '/api/home/duyurular/ozet',
              description: 'Aktif ve okunmamis duyuru sayaclarini getirir'
            },
            {
              method: 'PATCH',
              path: '/api/home/duyurular/{id}/okundu',
              description: 'Duyuruyu kullanici icin okundu olarak isaretler'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/duyurular?status=Published&targetWarehouseNo=110&take=100',
              description: 'Yonetim duyuru listesini readSummary sayaclariyla permission kapsamiyla getirir'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/duyurular/hedef-kullanicilar?search=serdal&warehouseNo=101&take=25',
              description: 'Duyuru hedefi icin aktif kullanici arama listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/duyurular/{id}',
              description: 'Secili duyurunun readSummary ve readReceipts dolu detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/ortak-islemler/duyurular/{id}/okuyanlar',
              description: 'Duyuruyu okuyan kullanicilari en son okuyan ustte olacak sekilde getirir'
            },
            {
              method: 'POST',
              path: '/api/ortak-islemler/duyurular',
              description: 'Yeni duyuru yayinlar',
              payload: 'SaveAnnouncementHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/ortak-islemler/duyurular/{id}',
              description: 'Duyuruyu ve hedeflerini yeniden yazar',
              payload: 'SaveAnnouncementHttpRequest'
            },
            {
              method: 'PATCH',
              path: '/api/ortak-islemler/duyurular/{id}/arsivle',
              description: 'Duyuruyu arsivler'
            }
          ]
        }
      ],
      codeSample: `{
  "title": "Aksam sayim duyurusu",
  "message": "Bugun 18:00 sonrasi sayim hazirligi yapilacaktir.",
  "priority": "Important",
  "targetType": "Warehouse",
  "targetWarehouseNos": [110, 120],
  "targetUserIds": null,
  "startsAtUtc": "2026-07-29T12:00:00Z",
  "expiresAtUtc": "2026-08-01T21:00:00Z"
}`
    },
    () =>
      import('../tasks/common/duyurular/list/duyurular-list.component').then(
        (m) => m.DuyurularListComponent
      ),
    {
      accessKeyAliases: [
        'Duyurular',
        'Announcements',
        'ortak-duyurular',
        'ortak-islemler.duyurular.page'
      ],
      requiredPermissionCodes: ['ortak-islemler.duyurular.page']
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
