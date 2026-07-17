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
        'POST senkronize varsayilan hizli modda calisir; includeStatuses=true ile durum/log cachei de yenilenir',
        'Progress endpointi senkronizasyon sirasinda sayfa, okunan, eslesen ve upsert sayaclarini dondurur',
        'Uyumsoft kaynak sorgusu ExecutionStartDate/ExecutionEndDate ile calisir, bitis tarihinden ileri bakar ve cache kapsami invoiceDate/Fatura Tarihi ile daraltilir',
        'Uyumsoft zaman asiminda endpoint 504 doner; onceki sayfalardaki eslesen kayitlar cachee yazilmis olabilir',
        'Fatura Tarihi UBL IssueDate alanindan, kayit tarihi CreateDateUtc alanindan okunur',
        'invoiceId, despatchId ve documentId ile backend tarafinda net filtreleme',
        'documentId teknik UUID ile application/pdf dosyasi',
        'HTML detay /detail endpointinden alinir',
        'POST render override',
        'Yazdirildi komutu ayri endpoint',
        'Irsaliye GetInboxInvoices despatchId alanindan, siparis/order referansi orderDocumentId alanindan okunur',
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
              description: 'Lokal cache uzerinden Fatura Tarihi bazli listeyi getirir; invoiceDate yoksa createDate kullanir ve invoiceId, despatchId, customerTitle, customerTcknVkn, documentId gibi filtreleri backend tarafinda uygular'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-goruntuleme/senkronize',
              description: 'GetInboxInvoices sayfalarini ExecutionStartDate/ExecutionEndDate ile okur, bitis tarihinden konfigurasyon kadar ileri bakar, her sayfadaki kayitlari invoiceDate/Fatura Tarihi araligina gore daraltip hemen cache tabloya yazar; response sourceTotalCount, fetchedCount ve matchedCount sayaclarini dondurur; Uyumsoft timeout durumunda 504 doner ve ayni aralik tekrar calistirildiginda cachedeki onceki sayfalar korunur',
              payload: 'InvoiceViewingSynchronizationRequest'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-goruntuleme/senkronize/progress',
              description: 'Aktif veya son senkronizasyonun running/completed/failed durumunu, progressPercent, sayfa ve matched/upsert sayaclariyla getirir'
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
      ],
      codeSample: `{
  "startDate": "2026-05-01",
  "endDate": "2026-05-05",
  "includeStatuses": false
}`
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
        'Giden Mikro faturalarini listeleme, bekleyenler icin lokal HTML onizleme, gonderilenler icin Uyumsoft outbox PDF, canli gonderim ve manuel XML preview akislarini tek modulde toplar.',
      baseRouteOrFile: '/api/fatura-islemleri/fatura-gonderimi',
      highlights: [
        'Giden fatura listesi',
        'Gonderilmemis satirlar icin lokal HTML onizleme',
        'Gonderilmis satirlar icin Uyumsoft resmi outbox PDF',
        'Iade fatura referansi secimi',
        'Ayrı validate kontrolu',
        'Canli SendInvoice gonderimi',
        'Gonderilmis faturalar icin Uyumsoft retry gonderimi',
        'Karekodun tek kaynagi embedded veya fallback XSLT',
        'XML preview'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'InvoiceSendingController',
          description:
            'Mikro giden faturalarini listeler, gonderilmemisleri lokal render eder, gonderilmislerin Uyumsoft outbox PDF dosyasini acar, bekleyenleri Uyumsofta gonderir ve manuel XML preview sunar.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi?StartDate=2026-05-01&EndDate=2026-05-05&Scenario=EFatura&isSent=0',
              description: 'Mikro tarafindaki bekleyen veya gonderilmis faturalari senaryo ve gonderim durumuna gore listeler'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}?scenario=EFatura',
              description: 'Secili gonderilmemis giden fatura icin UBL ve HTML lokal onizleme detayini getirir'
            },
            {
              method: 'GET',
              path: '/api/fatura-islemleri/fatura-gonderimi/{documentSerie}/{documentOrderNo}/pdf?scenario=EFatura',
              description: 'Secili gonderilmis giden faturanin resmi PDF dosyasini Uyumsoft outbox servisinden application/pdf olarak getirir'
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
              description: 'Secili gonderilmemis faturalari Uyumsoft SendInvoice ile canli ortama gonderir; validate kontrolunu tekrar calistirmaz',
              payload: 'SendInvoiceDocumentsRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/validate',
              description: 'Secili gonderilmemis faturalari canli gonderim yapmadan UBL-TR is kurallari ve XSD kontrollerinden gecirir',
              payload: 'SendInvoiceDocumentsRequest'
            },
            {
              method: 'POST',
              path: '/api/fatura-islemleri/fatura-gonderimi/retry',
              description: 'Daha once Uyumsofta gonderilmis faturalar icin RetrySendInvoices istegi baslatir',
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
