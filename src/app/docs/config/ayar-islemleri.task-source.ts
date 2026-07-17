import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const AYAR_ISLEMLERI_TASK_SOURCE = {
  cihazlar: singleRouteTask(
    {
      id: 'cihazlar',
      title: 'Cihazlar',
      subtitle:
        'Sube bazli cihaz tanimlarini, cihaz tiplerini ve ping durumlarini yonetir.',
      baseRouteOrFile: '/api/ayar-islemleri/cihazlar',
      highlights: [
        'Cihaz tipi dropdown kaynagi /cihazlar/tipler endpointidir',
        'Sube filtresi verilmezse tum cihaz kayitlari listelenir',
        'Durum endpointi cihaz ping sonucunu online, latency ve hata alanlariyla dondurur'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AyarIslemleri Cihazlar',
          description: 'Cihaz tanimlarini ve anlik erisilebilirlik durumlarini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ayar-islemleri/cihazlar/tipler',
              description: 'Cihaz tipi listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/cihazlar?branchNo=110',
              description: 'Cihaz tanimlarini sube filtresiyle listeler'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/cihazlar/durum?branchNo=110',
              description: 'Cihaz ping durumlarini getirir'
            },
            {
              method: 'POST',
              path: '/api/ayar-islemleri/cihazlar',
              description: 'Yeni cihaz tanimi olusturur',
              payload: 'CreateDeviceHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/ayar-islemleri/cihazlar/{id}',
              description: 'Cihaz tanimini siler'
            }
          ]
        }
      ],
      codeSample: `{
  "branchNo": 110,
  "deviceTypeId": 1,
  "ipAddress": "192.168.1.10",
  "description": "Manav terazisi"
}`
    },
    () =>
      import('../tasks/settings/cihazlar/list/cihazlar-list.component').then(
        (m) => m.CihazlarListComponent
      ),
    { accessKeyAliases: ['Cihazlar', 'ayar-cihazlar'] }
  ),
  'sube-ayarlari': singleRouteTask(
    {
      id: 'sube-ayarlari',
      title: 'Sube Ayarlari',
      subtitle:
        'Sube IP, terazi klasoru, POSKON/POSGENEL klasorleri ve kasa tanimlarini yonetir.',
      baseRouteOrFile: '/api/ayar-islemleri/sube-ayarlari',
      highlights: [
        'Sube ayarlari branchNo asc siralanir',
        'Terazi tipi ve kasa tipi secimleri /sube-ayarlari/secenekler lookup endpointinden gelir',
        'scalesType yalniz 0=CAS 16 veya 1=CAS 500 olarak gonderilir',
        'Create akisi ilk kasa tanimlarini cashRegisters listesiyle alabilir',
        'Update akisi yalniz sube ayar alanlarini gunceller'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AyarIslemleri Sube Ayarlari',
          description: 'Sube ayar kayitlarini ve subeye bagli kasa tanimlarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ayar-islemleri/sube-ayarlari/secenekler',
              description: 'Terazi tipi ve kasa tipi lookup kataloglarini getirir'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/sube-ayarlari',
              description: 'Sube ayarlari listesini getirir'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/sube-ayarlari/{branchNo}/kasalar',
              description: 'Subeye bagli kasa tanimlarini getirir'
            },
            {
              method: 'POST',
              path: '/api/ayar-islemleri/sube-ayarlari',
              description: 'Yeni sube ayari olusturur',
              payload: 'CreateBranchSettingsHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/ayar-islemleri/sube-ayarlari/{branchNo}',
              description: 'Sube ayarini gunceller',
              payload: 'UpdateBranchSettingsHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "branchNo": 110,
  "branchIpAddress": "192.168.1.5",
  "branchScalesFolderPath": "TERAZI",
  "scalesType": 1,
  "poskonFolderPath": "POSKON",
  "posGenelFolderPath": "POSGENEL",
  "cashRegisters": [
    { "cashNo": 1, "cashType": 1 }
  ]
}`
    },
    () =>
      import('../tasks/settings/sube-ayarlari/list/sube-ayarlari-list.component').then(
        (m) => m.SubeAyarlariListComponent
      ),
    { accessKeyAliases: ['SubeAyarlari', 'sube-ayari'] }
  ),
  'kasa-pos-terminalleri': singleRouteTask(
    {
      id: 'kasa-pos-terminalleri',
      title: 'Kasa POS Terminalleri',
      subtitle:
        'Sube kasa kayitlarini, POS terminal detaylarini ve MESAJ dosyasi durumlarini yonetir.',
      baseRouteOrFile: '/api/ayar-islemleri/kasa-pos-terminalleri',
      highlights: [
        'Kasa tipi secimi /kasa-pos-terminalleri/secenekler lookup endpointinden gelir',
        'branchNo + cashNo duplicate ise backend 409 doner',
        'Terminal silme islemi sube ve terminalNo ile branch scoped calisir',
        'Mesaj durumlari POSKON MESAJ.xxx dosyalarindan stateName metniyle hesaplanir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AyarIslemleri Kasa POS Terminalleri',
          description: 'Kasa, terminal ve POSKON mesaj durumlarini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri/secenekler',
              description: 'Kasa tipi lookup kataloglarini getirir'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri/kasalar/{cashNo}/terminaller',
              description: 'Kasa no icin terminal detaylarini getirir'
            },
            {
              method: 'GET',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri/subeler/{branchNo}/mesaj-durumlari',
              description: 'Sube POSKON mesaj durumlarini getirir'
            },
            {
              method: 'POST',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri',
              description: 'Yeni kasa ve terminal tanimi olusturur',
              payload: 'CreateCashRegisterHttpRequest'
            },
            {
              method: 'DELETE',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri/subeler/{branchNo}/kasalar/{cashNo}',
              description: 'Sube kapsaminda kasa tanimini siler'
            },
            {
              method: 'DELETE',
              path: '/api/ayar-islemleri/kasa-pos-terminalleri/subeler/{branchNo}/terminaller/{terminalNo}',
              description: 'Sube kapsaminda terminal tanimini siler'
            }
          ]
        }
      ],
      codeSample: `{
  "branchNo": 110,
  "cashNo": 1,
  "cashType": 1,
  "terminals": [
    {
      "terminalNo": "POS001",
      "bank": "Akbank",
      "terminalId": "T123456",
      "merchantNo": "M123456"
    }
  ]
}`
    },
    () =>
      import(
        '../tasks/settings/kasa-pos-terminalleri/list/kasa-pos-terminalleri-list.component'
      ).then((m) => m.KasaPosTerminalleriListComponent),
    { accessKeyAliases: ['KasaPosTerminalleri', 'kasa-pos'] }
  ),
  kasiyerler: singleRouteTask(
    {
      id: 'kasiyerler',
      title: 'Kasiyerler',
      subtitle:
        'Kasiyer tanimlarini sifresiz listeler, kasiyer olusturur, gunceller ve sifre sifirlar.',
      baseRouteOrFile: '/api/ayar-islemleri/kasiyerler',
      highlights: [
        'Liste endpointi kasiyer sifresi dondurmez',
        'Olusturma ve sifre sifirlama uretilen sifreyi tek seferlik dondurur',
        'Update akisi kasiyer sifresini degistirmez'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'AyarIslemleri Kasiyerler',
          description: 'Kasiyer kayitlarini ve sifre mutasyonlarini yonetir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ayar-islemleri/kasiyerler',
              description: 'Kasiyerleri sifresiz listeler'
            },
            {
              method: 'POST',
              path: '/api/ayar-islemleri/kasiyerler',
              description: 'Yeni kasiyer olusturur',
              payload: 'CreateCashierHttpRequest'
            },
            {
              method: 'PUT',
              path: '/api/ayar-islemleri/kasiyerler/{cashierCode}',
              description: 'Kasiyer bilgilerini gunceller',
              payload: 'UpdateCashierHttpRequest'
            },
            {
              method: 'POST',
              path: '/api/ayar-islemleri/kasiyerler/{cashierCode}/sifre-sifirla',
              description: 'Kasiyer sifresini sifirlar'
            }
          ]
        }
      ],
      codeSample: `{
  "cashierName": "Ali Veli",
  "cashierAuthorization": "A"
}`
    },
    () =>
      import('../tasks/settings/kasiyerler/list/kasiyerler-list.component').then(
        (m) => m.KasiyerlerListComponent
      ),
    { accessKeyAliases: ['Kasiyerler', 'cashiers'] }
  )
} as const satisfies Record<string, DocsTaskSource>;
