import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const EDOCUMENTS_TASK_SOURCE = {
  'fatura-goruntuleme': singleRouteTask(
    {
      id: 'fatura-goruntuleme',
      title: 'Fatura Goruntuleme',
      subtitle:
        'Manuel inbox senkronizasyonu, cache listeleme, teknik documentId ile PDF acma, HTML detay/render ve yazdirildi durumunu ayri komutla guncelleme akislarini yeni API uzerinden sunar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-goruntuleme',
      highlights: [
        'POST senkronize ile cache guncelleme',
        'invoiceDate bazli tam liste',
        'invoiceId, despatchId ve documentId ile backend tarafinda net filtreleme',
        'documentId teknik UUID ile application/pdf dosyasi',
        'HTML detay /detail endpointinden alinir',
        'POST render override',
        'Yazdirildi komutu ayri endpoint',
        'Irsaliye despatchId alanindan, siparis/order referansi orderDocumentId alanindan okunur',
        'Envelope, vergi, doviz, arsiv ve goruldu bilgileri cache listesinden okunur'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceViewingController',
          description:
            'Uyumsoft inbox kayitlarini lokal cachee senkronize eder, cache listesini dondurur, belgeyi documentId ile PDF veya HTML detay olarak getirir ve printed guncellemesini ayri komutla yapar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme?StartDate=2026-05-01&EndDate=2026-05-05&isProcessed=-1&isPrinted=-1&invoiceId=KEF2026&page=1&PageSize=50',
              description: 'Lokal cache uzerinden invoiceDate bazli listeyi getirir; invoiceId, despatchId, customerTitle, customerTcknVkn, documentId ve benzeri net filtrelerle genis aday setini backend tarafinda daraltir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/senkronize',
              description: 'Secili tarih araligini Uyumsoft GetInboxInvoices ile cache tabloya senkronize eder'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}',
              description: 'Secili evragin resmi PDF dosyasini application/pdf olarak getirir'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/pdf',
              description: 'Secili evragin resmi PDF dosyasini application/pdf olarak getirir'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/detail',
              description: 'Secili evragin summary ve HTML render detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/render',
              description: 'Profil, embedded XSLT tercihi ve fallback davranisi ile belgeyi yeniden render eder',
              payload: 'InvoiceViewingRenderRequest'
            },
            {
              method: 'PATCH',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/printed',
              description: 'Secili belgeyi yazdirildi say veya printed durumunu geri al'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component').then(
        (m) => m.FaturaIslemleriListComponent
      ),
    {
      data: {
        workspace: 'viewing'
      }
    }
  ),
  'fatura-gonderimi': singleRouteTask(
    {
      id: 'fatura-gonderimi',
      title: 'Fatura Gonderimi',
      subtitle:
        'Giden Mikro faturalarini listeleme, tek lokal HTML onizleme, canli gonderim ve manuel XML preview akislarini tek modulde toplar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-gonderimi',
      highlights: [
        'Giden fatura listesi',
        'Gonderilmemis ve gonderilmis satirlar icin lokal HTML onizleme',
        'Iade fatura referansi secimi',
        'Canli SendInvoice gonderimi',
        'Karekodun tek kaynagi embedded veya fallback XSLT',
        'XML preview'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceSendingController',
          description:
            'Mikro giden faturalarini listeler, gonderim durumundan bagimsiz olarak lokal render eder, gonderilmemisleri Uyumsofta gonderir ve manuel XML preview sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi?StartDate=2026-05-01&EndDate=2026-05-05&Scenario=EFatura&isSent=0',
              description: 'Mikro tarafindaki bekleyen veya gonderilmis faturalari senaryo ve gonderim durumuna gore listeler'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}?scenario=EFatura',
              description: 'Secili giden fatura icin UBL ve HTML lokal onizleme detayini getirir; isSent degerinden bagimsizdir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/render',
              description: 'Secili giden fatura icin senaryo ve XSLT ayarlarini override ederek belgeyi yeniden render eder',
              payload: 'InvoiceSendingRenderRequest'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/return-reference-candidates?scenario=EFatura',
              description: 'Iade faturasi icin kayitli, fallback ve secilebilir iade referansi adaylarini getirir'
            },
            {
              method: 'PUT',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/return-reference',
              description: 'Iade faturasi icin secilen veya fallback iade referansini kaydeder',
              payload: 'UpdateInvoiceReturnReferenceRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/send',
              description: 'Secili gonderilmemis faturalari Uyumsoft SendInvoice ile canli ortama gonderir',
              payload: 'SendInvoiceDocumentsRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/preview',
              description: 'Ham xmlContent uzerinden html preview sonucu uretir',
              payload: 'InvoicePreviewHttpRequest'
            }
          ]
        }
      ],
      codeSample: `{
  "scenario": 0,
  "documents": [
    {
      "documentSerie": "FAT",
      "documentOrderNo": 12345
    },
    {
      "documentSerie": "FAT",
      "documentOrderNo": 12346
    }
  ]
}`
    },
    () =>
      import('../tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component').then(
        (m) => m.FaturaIslemleriListComponent
      ),
    {
      data: {
        workspace: 'sending'
      }
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
