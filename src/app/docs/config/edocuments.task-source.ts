import type { DocsTaskSource } from './docs-task-source.helpers';
import { singleRouteTask } from './docs-task-source.helpers';

export const EDOCUMENTS_TASK_SOURCE = {
  'fatura-goruntuleme': singleRouteTask(
    {
      id: 'fatura-goruntuleme',
      title: 'Fatura Goruntuleme',
      subtitle:
        'Manuel inbox senkronizasyonu, cache listeleme, documentId ile PDF acma, HTML detay/render ve yazdirildi durumunu ayri komutla guncelleme akislarini yeni API uzerinden sunar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-goruntuleme',
      highlights: [
        'POST senkronize ile cache guncelleme',
        'invoiceDate bazli liste',
        'documentId ile direkt PDF dosyasi',
        'HTML detay /detail endpointinden alinir',
        'POST render override',
        'Yazdirildi komutu ayri endpoint',
        'Varsayilan belge acma Uyumsoft GetInboxInvoicePdf kullanir'
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
              path: '/api/fatura-islemleri/fatura-goruntuleme?StartDate=2026-05-01&EndDate=2026-05-05&isProcessed=-1&isPrinted=-1&SearchField=InvoiceId&SearchText=INV-2026&page=1&PageSize=50',
              description: 'Lokal cache uzerinden invoiceDate bazli, arama destekli sayfali fatura listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/senkronize',
              description: 'Secili tarih araligini Uyumsoft GetInboxInvoiceList ile cache tabloya senkronize eder'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}',
              description: 'Secili evragin resmi PDF datasini Uyumsoft GetInboxInvoicePdf ile getirir'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/{documentId}/pdf',
              description: 'PDF acma endpoint aliasi'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/inbox/invoices/{documentId}/pdf-file',
              description: 'Secili inbox faturasini application/pdf binary dosyasi olarak getirir'
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
        'Bekleyen Mikro faturalarini listeleme, UBL onizleme, canli gonderim, outbox arama ve XML preview akislarini tek modulde toplar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-gonderimi',
      highlights: [
        'Bekleyen fatura listesi',
        'UBL onizleme ve POST render override',
        'Iade fatura referansi secimi',
        'Canli SendInvoice gonderimi',
        'Outbox arama',
        'Tekil outbox belge render',
        'Gonderilmis belge PDF Goster',
        'XML preview'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceSendingController',
          description:
            'Mikro bekleyen faturalarini listeler, secili belgeyi render eder, Uyumsofta gonderir; ayrica outbox ve manuel preview araclarini sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi?StartDate=2026-05-01&EndDate=2026-05-05&Scenario=EFatura&isSent=0',
              description: 'Mikro tarafindaki bekleyen veya gonderilmis faturalari senaryo ve gonderim durumuna gore listeler'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}?scenario=EFatura',
              description: 'Secili bekleyen fatura icin UBL ve HTML onizleme detayini getirir'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/render',
              description: 'Secili bekleyen fatura icin senaryo ve XSLT ayarlarini override ederek belgeyi yeniden render eder',
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
              description: 'Secili bekleyen faturalarni Uyumsoft SendInvoice ile canli ortama gonderir',
              payload: 'SendInvoiceDocumentsRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/outbox/search',
              description: 'Uyumsoft GetOutboxInvoices operasyonunu typed parameters ile cagirir',
              payload: 'UyumsoftOperationHttpRequest'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/outbox/{invoiceId}?profile=Auto&preferEmbeddedXslt=true',
              description: 'Secili outbox faturasini render edilmis belge olarak getirir'
            },
            {
              method: 'GET',
              path: '/api/entegrasyon-islemleri/uyumsoft/e-fatura/outbox/invoices/{invoiceId}/pdf-file',
              description: 'Secili outbox faturasini application/pdf binary dosyasi olarak getirir'
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
  "scenario": "EFatura",
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
