import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  IInvoiceRenderProfileApiDto,
  IInvoiceSendingScenarioApiDto,
  IInvoiceStateFilterApiDto,
  IInvoiceViewingSearchFieldApiDto,
  IUyumsoftInvoiceListItemApiDto,
  IUyumsoftOperationParameterApiDto,
  IUyumsoftResponseNodeApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import {
  getDefaultDateRange,
  type FurpaDateRange
} from '../../../../../core/api/furpa-merkez-api.utils';
import {
  FaturaIslemleriService,
  type InvoiceOutboxSearchRequestDto,
  type InvoiceOutboxSearchResponseDto,
  type InvoicePreviewRequestDto,
  type InvoiceRenderedDocumentDto,
  type InvoiceReturnReferenceCandidatesResponseDto,
  type InvoiceReturnReferenceDto,
  type InvoiceSendingDetailDto,
  type InvoiceSendingListItemDto,
  type InvoiceSendingListResponseDto,
  type InvoiceSendingRenderRequestDto,
  type InvoiceViewingDetailDto,
  type InvoiceViewingListItemDto,
  type InvoiceViewingListResponseDto,
  type InvoiceViewingRenderRequestDto,
  type InvoiceViewingSynchronizationRequestDto,
  type InvoiceViewingPrintedStateRequestDto,
  type InvoiceViewingPrintedStateResponseDto,
  type UpdateInvoiceReturnReferenceRequestDto,
  type SendInvoiceDocumentsResponseDto
} from '../../../../../core/api/module-services/fatura-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { getPrimaryTaskRoutePath } from '../../../../config/docs-task-source.config';

type WorkspaceMode = 'viewing' | 'sending';
type FeedbackTone = 'success' | 'error' | 'info';

type ParameterFormGroup = FormGroup<{
  name: FormControl<string>;
  value: FormControl<string>;
}>;

interface PageFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface HeroStat {
  label: string;
  value: string;
}

interface SummaryMetric {
  label: string;
  value: string;
}

interface ResponseMetric extends SummaryMetric {
  tone: string;
}

interface ViewingSearchFieldOption {
  value: IInvoiceViewingSearchFieldApiDto;
  label: string;
  placeholder: string;
  hint: string;
}

interface EmbeddedPreferenceOption {
  value: boolean | null;
  label: string;
  hint: string;
}

interface SendingScenarioOption {
  value: IInvoiceSendingScenarioApiDto;
  label: string;
  description: string;
}

const VIEWING_TASK_ID = 'fatura-goruntuleme';
const SENDING_TASK_ID = 'fatura-gonderimi';
const VIEWING_LIST_PERMISSION = 'fatura-islemleri.fatura-goruntuleme.list';
const VIEWING_DETAIL_PERMISSION = 'fatura-islemleri.fatura-goruntuleme.detail';
const VIEWING_UPDATE_PERMISSION = 'fatura-islemleri.fatura-goruntuleme.update';
const SENDING_LIST_PERMISSION = 'fatura-islemleri.fatura-gonderimi.list';
const SENDING_DETAIL_PERMISSION = 'fatura-islemleri.fatura-gonderimi.detail';
const SENDING_CREATE_PERMISSION = 'fatura-islemleri.fatura-gonderimi.create';
const DEFAULT_OUTBOX_QUERY_PARAMETERS: IUyumsoftOperationParameterApiDto[] = [
  { name: 'PageIndex', value: '0' },
  { name: 'PageSize', value: '20' },
  { name: 'IsArchived', value: 'false' }
];
const DEFAULT_PREVIEW_XML =
  '<Invoice><!-- UBL XML icerigini buraya yapistirin --></Invoice>';

@Component({
  selector: 'app-fatura-islemleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fatura-islemleri-list.component.html',
  styleUrl: './fatura-islemleri-list.component.scss'
})
export class FaturaIslemleriListComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly faturaIslemleriService = inject(FaturaIslemleriService);
  private readonly previewObjectUrlCache = new Map<string, string>();
  private readonly previewResourceUrlCache = new Map<string, SafeResourceUrl>();

  protected readonly initialWorkspace =
    ((this.activatedRoute.snapshot.data['workspace'] as WorkspaceMode | undefined) ??
      this.resolveWorkspaceFromTaskId(
        (this.activatedRoute.snapshot.data['taskId'] as string | undefined) ?? VIEWING_TASK_ID
      ));

  protected readonly stateOptions: ReadonlyArray<{
    label: string;
    value: IInvoiceStateFilterApiDto;
    description: string;
  }> = [
    {
      label: 'Tumu',
      value: -1,
      description: 'Filtre uygulanmaz.'
    },
    {
      label: 'Evet',
      value: 1,
      description: 'True olan kayitlar.'
    },
    {
      label: 'Hayir',
      value: 0,
      description: 'False olan kayitlar.'
    }
  ];
  protected readonly profileOptions: ReadonlyArray<IInvoiceRenderProfileApiDto> = [
    'Auto',
    'EFatura',
    'EArsiv'
  ];
  protected readonly sendingScenarioOptions: ReadonlyArray<SendingScenarioOption> = [
    {
      value: 'EFatura',
      label: 'E-Fatura',
      description: 'Mikro tarafindaki e-fatura bekleyenlerini getirir.'
    },
    {
      value: 'EArsiv',
      label: 'E-Arsiv',
      description: 'E-arsiv tarafina dusen bekleyenleri getirir.'
    }
  ];
  protected readonly embeddedPreferenceOptions: ReadonlyArray<EmbeddedPreferenceOption> = [
    {
      value: null,
      label: 'Backend karari',
      hint: 'isStandard bilgisine gore backend secsin.'
    },
    {
      value: true,
      label: 'Gomulu XSLT dene',
      hint: 'Varsa embedded XSLT once kullanilsin.'
    },
    {
      value: false,
      label: 'Genel tasarimi zorla',
      hint: 'Gomulu XSLT aranmadan asset tasarimi kullanilsin.'
    }
  ];
  protected readonly viewingSearchFieldOptions: ReadonlyArray<ViewingSearchFieldOption> = [
    {
      value: 'InvoiceDate',
      label: 'Fatura Tarihi',
      placeholder: '2026-05-05',
      hint: 'Gun bazli tam tarih aramasi yapar.'
    },
    {
      value: 'InvoiceId',
      label: 'Fatura No',
      placeholder: 'INV-2026-0001',
      hint: 'Buyuk kucuk harf duyarli olmadan icerir aramasi yapar.'
    },
    {
      value: 'CustomerTitle',
      label: 'Musteri Unvani',
      placeholder: 'ORNEK MUSTERI',
      hint: 'Musteri unvani icinde arama yapar.'
    },
    {
      value: 'CustomerTcknVkn',
      label: 'TCKN / VKN',
      placeholder: '1234567890',
      hint: 'Kimlik veya vergi numarasi icinde arama yapar.'
    },
    {
      value: 'InvoiceTotal',
      label: 'Toplam Tutar',
      placeholder: '1250.75',
      hint: 'Tam tutar eslesmesi arar.'
    },
    {
      value: 'DespatchId',
      label: 'Irsaliye No',
      placeholder: 'DSP-2026-0007',
      hint: 'Irsaliye numarasi icinde arama yapar.'
    }
  ];

  protected readonly activeWorkspace = signal<WorkspaceMode>(this.initialWorkspace);
  protected readonly feedback = signal<PageFeedback | null>(null);

  protected readonly viewingQuickFilter = signal('');
  protected readonly sendingQuickFilter = signal('');

  protected readonly viewingList = signal<InvoiceViewingListResponseDto | null>(null);
  protected readonly viewingDetailDialogOpen = signal(false);
  protected readonly selectedViewingDocumentId = signal<string | null>(null);
  protected readonly viewingDetail = signal<InvoiceViewingDetailDto | null>(null);
  protected readonly viewingListLoading = signal(false);
  protected readonly viewingSyncLoading = signal(false);
  protected readonly viewingDetailLoading = signal(false);
  protected readonly viewingPdfLoading = signal(false);
  protected readonly viewingRenderLoading = signal(false);
  protected readonly viewingRenderMode = signal<'default' | 'manual'>('default');
  protected readonly printedStateUpdatingDocumentId = signal<string | null>(null);

  protected readonly sendingList = signal<InvoiceSendingListResponseDto | null>(null);
  protected readonly sendingDetailDialogOpen = signal(false);
  protected readonly selectedSendingKey = signal<string | null>(null);
  protected readonly sendingDetail = signal<InvoiceSendingDetailDto | null>(null);
  protected readonly sendingListLoading = signal(false);
  protected readonly sendingDetailLoading = signal(false);
  protected readonly sendingRenderLoading = signal(false);
  protected readonly sendingRenderMode = signal<'default' | 'manual'>('default');
  protected readonly selectedSendingKeys = signal<string[]>([]);
  protected readonly sendingRequestLoading = signal(false);
  protected readonly sendingPdfLoadingKey = signal<string | null>(null);
  protected readonly lastSendResponse = signal<SendInvoiceDocumentsResponseDto | null>(null);
  protected readonly returnReferencePanelOpen = signal(false);
  protected readonly returnReferenceInvoiceContext = signal<InvoiceSendingListItemDto | null>(null);
  protected readonly returnReferenceCandidates =
    signal<InvoiceReturnReferenceCandidatesResponseDto | null>(null);
  protected readonly returnReferenceLoading = signal(false);
  protected readonly returnReferenceSavingKey = signal<string | null>(null);

  protected readonly outboxSearchResponse = signal<InvoiceOutboxSearchResponseDto | null>(null);
  protected readonly outboxSearchLoading = signal(false);
  protected readonly outboxPdfLoadingKey = signal<string | null>(null);
  protected readonly renderedOutboxDocument = signal<InvoiceRenderedDocumentDto | null>(null);
  protected readonly renderedOutboxLoading = signal(false);
  protected readonly previewDocument = signal<InvoiceRenderedDocumentDto | null>(null);
  protected readonly previewLoading = signal(false);

  protected readonly viewingFilterForm = new FormGroup({
    startDate: new FormControl<string>(this.defaultDateRange().startDate, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.defaultDateRange().endDate, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    processedState: new FormControl<IInvoiceStateFilterApiDto>(-1, {
      nonNullable: true
    }),
    printedState: new FormControl<IInvoiceStateFilterApiDto>(-1, {
      nonNullable: true
    }),
    searchField: new FormControl<IInvoiceViewingSearchFieldApiDto | ''>('', {
      nonNullable: true
    }),
    searchText: new FormControl<string>('', {
      nonNullable: true
    }),
    pageNumber: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    }),
    pageSize: new FormControl<number>(50, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(500)]
    })
  });
  protected readonly sendingFilterForm = new FormGroup({
    startDate: new FormControl<string>(this.defaultDateRange().startDate, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.defaultDateRange().endDate, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    scenario: new FormControl<IInvoiceSendingScenarioApiDto>('EFatura', {
      nonNullable: true
    }),
    sentState: new FormControl<IInvoiceStateFilterApiDto>(0, {
      nonNullable: true
    })
  });
  protected readonly sendingRenderForm = new FormGroup({
    scenario: new FormControl<IInvoiceSendingScenarioApiDto>('EFatura', {
      nonNullable: true
    }),
    profile: new FormControl<IInvoiceRenderProfileApiDto>('Auto', {
      nonNullable: true
    }),
    preferEmbeddedXslt: new FormControl<boolean | null>(null),
    fallbackToGeneral: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly outboxSearchForm = new FormGroup({
    parameters: new FormArray<ParameterFormGroup>(
      DEFAULT_OUTBOX_QUERY_PARAMETERS.map(
        (parameter) =>
          new FormGroup({
            name: new FormControl(parameter.name, {
              nonNullable: true
            }),
            value: new FormControl(parameter.value ?? '', {
              nonNullable: true
            })
          })
      )
    )
  });
  protected readonly renderForm = new FormGroup({
    invoiceId: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    profile: new FormControl<IInvoiceRenderProfileApiDto>('Auto', {
      nonNullable: true
    }),
    preferEmbeddedXslt: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly viewingRenderForm = new FormGroup({
    profile: new FormControl<IInvoiceRenderProfileApiDto>('Auto', {
      nonNullable: true
    }),
    preferEmbeddedXslt: new FormControl<boolean | null>(null),
    fallbackToGeneral: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly previewForm = new FormGroup({
    invoiceId: new FormControl<string>('', {
      nonNullable: true
    }),
    xmlContent: new FormControl<string>(DEFAULT_PREVIEW_XML, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    profile: new FormControl<IInvoiceRenderProfileApiDto>('Auto', {
      nonNullable: true
    }),
    preferEmbeddedXslt: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly outboxParameterArray = this.outboxSearchForm.controls.parameters;

  protected readonly viewingPermissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(VIEWING_TASK_ID))
  );
  protected readonly sendingPermissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(SENDING_TASK_ID))
  );
  protected readonly canViewList = computed(() =>
    this.hasPermission(this.viewingPermissionCodes(), VIEWING_LIST_PERMISSION)
  );
  protected readonly canViewDetail = computed(() =>
    this.hasPermission(this.viewingPermissionCodes(), VIEWING_DETAIL_PERMISSION)
  );
  protected readonly canUpdatePrinted = computed(() =>
    this.hasPermission(this.viewingPermissionCodes(), VIEWING_UPDATE_PERMISSION)
  );
  protected readonly canSendList = computed(() =>
    this.hasPermission(this.sendingPermissionCodes(), SENDING_LIST_PERMISSION)
  );
  protected readonly canSendDetail = computed(() =>
    this.hasPermission(this.sendingPermissionCodes(), SENDING_DETAIL_PERMISSION)
  );
  protected readonly canSendCreate = computed(() =>
    this.hasPermission(this.sendingPermissionCodes(), SENDING_CREATE_PERMISSION)
  );
  protected readonly canOpenViewingWorkspace = computed(
    () =>
      this.authService.hasTaskAccess(VIEWING_TASK_ID) ||
      this.canViewList() ||
      this.canViewDetail() ||
      this.canUpdatePrinted()
  );
  protected readonly canOpenSendingWorkspace = computed(
    () =>
      this.authService.hasTaskAccess(SENDING_TASK_ID) ||
      this.canSendList() ||
      this.canSendDetail() ||
      this.canSendCreate()
  );
  protected readonly availableWorkspaces = computed<WorkspaceMode[]>(() => {
    const workspaces: WorkspaceMode[] = [];

    if (this.canOpenViewingWorkspace()) {
      workspaces.push('viewing');
    }

    if (this.canOpenSendingWorkspace()) {
      workspaces.push('sending');
    }

    return workspaces;
  });
  protected readonly heroStats = computed<HeroStat[]>(() =>
    this.activeWorkspace() === 'viewing'
      ? [
          {
            label: 'Toplam Kayit',
            value: `${this.viewingList()?.totalCount ?? 0}`
          },
          {
            label: 'Secili Fatura',
            value: this.selectedViewingSummary()?.invoiceId || '-'
          },
          {
            label: 'Yazdirildi',
            value: this.selectedViewingSummary()
              ? this.selectedViewingSummary()!.isPrinted
                ? 'Evet'
                : 'Hayir'
              : '-'
          }
        ]
      : [
          {
            label: 'Toplam Kayit',
            value: `${this.sendingList()?.totalCount ?? 0}`
          },
          {
            label: 'Secili Fatura',
            value: this.selectedSendingSummary()?.invoiceId || '-'
          },
          {
            label: 'Kuyruk',
            value: `${this.selectedSendingItems().length}`
          }
        ]
  );
  protected readonly filteredViewingItems = computed(() => {
    const items = this.viewingList()?.items ?? [];
    const filter = this.normalizeText(this.viewingQuickFilter());

    if (!filter) {
      return items;
    }

    return items.filter((item) =>
      [
        item.documentId,
        item.invoiceId,
        item.customerTitle,
        item.customerTcknVkn,
        item.invoiceType,
        item.statusCode,
        item.status,
        item.despatchId,
        `${item.invoiceTotal}`
      ].some((value) => this.normalizeText(value).includes(filter))
    );
  });
  protected readonly filteredSendingItems = computed(() => {
    const items = this.sendingList()?.items ?? [];
    const filter = this.normalizeText(this.sendingQuickFilter());

    if (!filter) {
      return items;
    }

    return items.filter((item) =>
      [
        item.documentSerie,
        `${item.documentOrderNo}`,
        item.invoiceId,
        item.customerCode,
        item.customerTitle,
        item.customerTcknVkn,
        item.targetAlias,
        item.invoiceProfileId,
        item.invoiceTypeCode,
        item.scenario,
        item.shipmentDocumentNo,
        item.returnInvoiceNo,
        item.returnInvoiceDate,
        item.sentDocumentNo,
        item.sendingPdfInvoiceNumber,
        item.sendingPdfLocalDocumentId,
        item.sendingPdfFilePath,
        item.warehouseName,
        item.description,
        `${item.payableTotal}`
      ].some((value) => this.normalizeText(value).includes(filter))
    );
  });
  protected readonly viewingMetrics = computed<SummaryMetric[]>(() => {
    const response = this.viewingList();
    const items = response?.items ?? [];

    return [
      {
        label: 'Toplam Kayit',
        value: `${response?.totalCount ?? 0}`
      },
      {
        label: 'Sayfa',
        value: response ? `${response.pageNumber} / ${this.getPageCount(response)}` : '-'
      },
      {
        label: 'Islenen',
        value: `${items.filter((item) => item.isProcessed).length}`
      },
      {
        label: 'Basilan',
        value: `${items.filter((item) => item.isPrinted).length}`
      },
      {
        label: 'Standart',
        value: `${items.filter((item) => item.isStandard).length}`
      }
    ];
  });
  protected readonly sendingMetrics = computed<SummaryMetric[]>(() => {
    const response = this.sendingList();
    const items = response?.items ?? [];
    const scenario = this.sendingFilterForm.controls.scenario.value;

    return [
      {
        label: 'Toplam Kayit',
        value: `${response?.totalCount ?? 0}`
      },
      {
        label: 'Bekleyen',
        value: `${items.filter((item) => !item.isSent).length}`
      },
      {
        label: 'Gonderilen',
        value: `${items.filter((item) => item.isSent).length}`
      },
      {
        label: 'Secilen',
        value: `${this.selectedSendingItems().length}`
      },
      {
        label: 'Iade Ref Eksik',
        value: `${items.filter((item) => this.isReturnInvoice(item) && !this.hasReturnReference(item)).length}`
      },
      {
        label: 'Senaryo',
        value: this.getScenarioLabel(scenario)
      }
    ];
  });
  protected readonly selectedViewingSummary = computed(
    () =>
      this.viewingDetail()?.summary ??
      this.viewingList()
        ?.items.find((item) => item.documentId === this.selectedViewingDocumentId()) ??
      null
  );
  protected readonly selectedSendingSummary = computed(
    () =>
      this.sendingDetail()?.summary ??
      this.findSendingItemByKey(this.selectedSendingKey()) ??
      null
  );
  protected readonly selectedSendingItems = computed(() => {
    const keys = new Set(this.selectedSendingKeys());
    return (this.sendingList()?.items ?? []).filter((item) =>
      keys.has(this.buildSendingKey(item.documentSerie, item.documentOrderNo))
    );
  });
  protected readonly sendResponseMetrics = computed<ResponseMetric[]>(() => {
    const response = this.lastSendResponse();

    if (!response) {
      return [];
    }

    return [
      {
        label: 'Senaryo',
        value: this.getScenarioLabel(response.scenario),
        tone: 'status-pill-neutral'
      },
      {
        label: 'Istenen',
        value: `${response.requestedCount}`,
        tone: 'status-pill-neutral'
      },
      {
        label: 'Basarili',
        value: `${response.succeededCount}`,
        tone: 'status-pill-success'
      },
      {
        label: 'Hatali',
        value: `${response.failedCount}`,
        tone: response.failedCount > 0 ? 'status-pill-danger' : 'status-pill-neutral'
      }
    ];
  });
  protected readonly outboxResponseSummary = computed<ResponseMetric[]>(() => {
    const response = this.outboxSearchResponse();

    if (!response) {
      return [];
    }

    return [
      {
        label: 'Durum',
        value: response.isSucceeded ? 'Basarili' : 'Basarisiz',
        tone: response.isSucceeded ? 'status-pill-success' : 'status-pill-danger'
      },
      {
        label: 'Operation',
        value: response.operationName || '-',
        tone: 'status-pill-neutral'
      },
      {
        label: 'Node',
        value: `${response.nodes.length}`,
        tone: 'status-pill-neutral'
      },
      {
        label: 'Typed Fatura',
        value: `${response.invoiceList?.items.length ?? 0}`,
        tone: 'status-pill-neutral'
      }
    ];
  });
  protected readonly outboxResponseJson = computed(() => {
    const response = this.outboxSearchResponse();

    if (!response) {
      return '';
    }

    return this.formatJson({
      serviceKey: response.serviceKey,
      serviceName: response.serviceName,
      operationName: response.operationName,
      resultElementName: response.resultElementName,
      isSucceeded: response.isSucceeded,
      message: response.message,
      scalarValue: response.scalarValue,
      resultAttributes: response.resultAttributes,
      nodes: response.nodes,
      invoiceList: response.invoiceList,
      responsePayloadJson: response.responsePayloadJson
    });
  });
  protected readonly outboxInvoiceRows = computed(
    () => this.outboxSearchResponse()?.invoiceList?.items ?? []
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.releasePreviewUrls());

    const availableWorkspaces = this.availableWorkspaces();

    if (availableWorkspaces.length > 0 && !availableWorkspaces.includes(this.activeWorkspace())) {
      this.activeWorkspace.set(availableWorkspaces[0]);
    }

    if (this.activeWorkspace() === 'viewing' && this.canViewList()) {
      this.loadViewingList();
    }

    if (this.activeWorkspace() === 'sending' && this.canSendList()) {
      this.loadSendingList();
    }
  }

  protected navigateToWorkspace(workspace: WorkspaceMode): void {
    if (!this.availableWorkspaces().includes(workspace)) {
      return;
    }

    this.activeWorkspace.set(workspace);

    if (workspace === 'viewing' && !this.viewingList() && this.canViewList()) {
      this.loadViewingList();
    }

    if (workspace === 'sending' && !this.sendingList() && this.canSendList()) {
      this.loadSendingList();
    }

    const nextTaskId = workspace === 'viewing' ? VIEWING_TASK_ID : SENDING_TASK_ID;
    const nextPath = getPrimaryTaskRoutePath(nextTaskId);
    const normalizedPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;

    if (this.router.url !== normalizedPath) {
      void this.router.navigateByUrl(normalizedPath);
    }
  }

  protected applyViewingFilters(): void {
    this.viewingFilterForm.controls.pageNumber.setValue(1);
    this.loadViewingList();
  }

  protected synchronizeViewingInvoices(): void {
    if (!this.canViewList()) {
      this.feedback.set({
        tone: 'error',
        title: 'Liste yetkisi bulunmuyor',
        message: 'Fatura goruntuleme senkronizasyonu icin gerekli yetki bu kullanicida tanimli degil.'
      });
      return;
    }

    const request = this.buildViewingSynchronizationRequest();

    if (!request) {
      return;
    }

    this.viewingSyncLoading.set(true);

    this.faturaIslemleriService
      .synchronizeInvoiceViewing(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingSyncLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.feedback.set({
            tone: 'success',
            title: 'Senkronizasyon tamamlandi',
            message: `${request.startDate} - ${request.endDate} araligindaki Uyumsoft inbox kayitlari cache'e alindi.`
          });

          if (
            this.viewingFilterForm.controls.pageNumber.invalid ||
            this.viewingFilterForm.controls.pageSize.invalid
          ) {
            return;
          }

          this.viewingFilterForm.controls.pageNumber.setValue(1);
          this.loadViewingList();
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Senkronizasyon calismadi',
            message: this.resolveErrorMessage(
              error,
              'Secilen tarih araligi icin Uyumsoft inbox senkronizasyonu tamamlanamadi.'
            )
          });
        }
      });
  }

  protected loadViewingList(keepSelection = false): void {
    if (!this.canViewList()) {
      this.feedback.set({
        tone: 'error',
        title: 'Liste yetkisi bulunmuyor',
        message: 'Fatura goruntuleme listesi icin gerekli yetki bu kullanicida tanimli degil.'
      });
      return;
    }

    if (this.viewingFilterForm.invalid) {
      this.viewingFilterForm.markAllAsTouched();
      return;
    }

    const rawValue = this.viewingFilterForm.getRawValue();
    const searchText = rawValue.searchText.trim();
    const searchField = rawValue.searchField || null;
    const hasSearch = !!searchField && !!searchText;

    if (!keepSelection) {
      this.viewingDetailDialogOpen.set(false);
      this.selectedViewingDocumentId.set(null);
      this.viewingDetail.set(null);
    }

    this.viewingListLoading.set(true);

    this.faturaIslemleriService
      .listInvoiceViewing({
        startDate: rawValue.startDate,
        endDate: rawValue.endDate,
        isProcessed: rawValue.processedState,
        processedState: rawValue.processedState,
        isPrinted: rawValue.printedState,
        printedState: rawValue.printedState,
        searchField: hasSearch ? searchField : null,
        searchText: hasSearch ? searchText : null,
        page: rawValue.pageNumber,
        pageNumber: rawValue.pageNumber,
        pageSize: rawValue.pageSize
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingListLoading.set(false))
      )
      .subscribe({
        next: (response: InvoiceViewingListResponseDto) => {
          this.viewingList.set(response);

          const selectedId = this.selectedViewingDocumentId();

          if (selectedId && !response.items.some((item) => item.documentId === selectedId)) {
            this.viewingDetailDialogOpen.set(false);
            this.selectedViewingDocumentId.set(null);
            this.viewingDetail.set(null);
          }

          this.clearInfoFeedback();
        },
        error: (error: HttpErrorResponse) => {
          this.viewingList.set(null);
          this.viewingDetail.set(null);
          this.viewingDetailDialogOpen.set(false);
          this.selectedViewingDocumentId.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Fatura listesi yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Fatura goruntuleme listesi su anda getirilemedi.'
            )
          });
        }
      });
  }

  protected resetViewingFilters(): void {
    const range = this.defaultDateRange();

    this.viewingFilterForm.reset({
      startDate: range.startDate,
      endDate: range.endDate,
      processedState: -1,
      printedState: -1,
      searchField: '',
      searchText: '',
      pageNumber: 1,
      pageSize: 50
    });
    this.viewingQuickFilter.set('');
  }

  protected setViewingQuickFilter(event: Event): void {
    this.viewingQuickFilter.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected openViewingDetail(item: InvoiceViewingListItemDto): void {
    this.selectedViewingDocumentId.set(item.documentId);
    this.viewingDetailDialogOpen.set(true);
    this.viewingRenderMode.set('default');
    this.resetViewingRenderForm();

    if (!this.canViewDetail()) {
      this.feedback.set({
        tone: 'info',
        title: 'Detay yetkisi gerekli',
        message: 'Liste satiri secildi ancak belge render detayi icin ek yetki gerekiyor.'
      });
      return;
    }

    this.fetchViewingDetail(item.documentId);
  }

  protected closeViewingDetailDialog(): void {
    this.viewingDetailDialogOpen.set(false);
  }

  protected reloadViewingDetail(): void {
    const documentId = this.selectedViewingDocumentId();

    if (!documentId) {
      return;
    }

    this.viewingRenderMode.set('default');
    this.resetViewingRenderForm();
    this.fetchViewingDetail(documentId);
  }

  protected openViewingPdf(summary: InvoiceViewingListItemDto): void {
    if (!this.canViewDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'Detay yetkisi gerekli',
        message: 'Resmi PDF acmak icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const invoiceUuid = summary.documentId?.trim();

    if (!invoiceUuid) {
      this.feedback.set({
        tone: 'error',
        title: 'PDF anahtari yok',
        message: 'Satirin teknik Uyumsoft UUID bilgisi bulunmadigi icin PDF acilamaz.'
      });
      return;
    }

    this.viewingPdfLoading.set(true);

    this.faturaIslemleriService
      .getUyumsoftEInvoiceInboxPdfFile(invoiceUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingPdfLoading.set(false))
      )
      .subscribe({
        next: (blob: Blob) => {
          const opened = this.openPdfBlob(blob);

          this.feedback.set({
            tone: opened ? 'success' : 'info',
            title: opened ? 'PDF acildi' : 'PDF cevabi alindi',
            message: opened
              ? `${summary.invoiceId} resmi PDF olarak acildi.`
              : 'Uyumsoft PDF dosyasi alindi ancak tarayici yeni sekmeyi acamadi.'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'PDF acilamadi',
            message: this.resolveErrorMessage(error, 'Secili belge icin resmi PDF getirilemedi.')
          });
        }
      });
  }

  protected renderViewingDetailWithOverrides(): void {
    const documentId = this.selectedViewingDocumentId();

    if (!documentId) {
      return;
    }

    if (!this.canViewDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'Detay yetkisi gerekli',
        message: 'Render ayarlarini kullanmak icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const rawValue = this.viewingRenderForm.getRawValue();
    const request: InvoiceViewingRenderRequestDto = {
      profile: rawValue.profile,
      preferEmbeddedXslt: rawValue.preferEmbeddedXslt,
      fallbackToGeneral: rawValue.fallbackToGeneral
    };

    this.viewingRenderLoading.set(true);

    this.faturaIslemleriService
      .renderInvoiceViewingDetail(documentId, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingRenderLoading.set(false))
      )
      .subscribe({
        next: (detail: InvoiceViewingDetailDto) => {
          this.viewingDetail.set(detail);
          this.viewingRenderMode.set('manual');
          this.feedback.set({
            tone: 'success',
            title: 'Belge yeniden render edildi',
            message: `${detail.summary.invoiceId} icin secili render ayarlari uygulandi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Render ayarlari uygulanamadi',
            message: this.resolveErrorMessage(
              error,
              'Secili belge yeni render ayarlariyla gosterilemedi.'
            )
          });
        }
      });
  }

  protected updateInvoicePrintedState(
    item: InvoiceViewingListItemDto | null,
    isPrinted: boolean,
    source: string
  ): void {
    if (!item) {
      return;
    }

    if (!this.canUpdatePrinted()) {
      this.feedback.set({
        tone: 'error',
        title: 'Guncelleme yetkisi gerekli',
        message: 'Yazdirildi durumunu degistirmek icin update yetkisi gerekiyor.'
      });
      return;
    }

    const request: InvoiceViewingPrintedStateRequestDto = {
      isPrinted,
      source
    };

    this.printedStateUpdatingDocumentId.set(item.documentId);

    this.faturaIslemleriService
      .updateInvoiceViewingPrintedState(item.documentId, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.printedStateUpdatingDocumentId.set(null))
      )
      .subscribe({
        next: (response: InvoiceViewingPrintedStateResponseDto) => {
          this.mergeViewingSummary(response.summary);
          this.feedback.set({
            tone: 'success',
            title: isPrinted ? 'Yazdirildi olarak isaretlendi' : 'Yazdirildi durumu kaldirildi',
            message: `${response.summary.invoiceId} kaydi guncellendi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Yazdirildi durumu guncellenemedi',
            message: this.resolveErrorMessage(
              error,
              'Secilen belge icin printed durumu guncellenemedi.'
            )
          });
        }
      });
  }

  protected goToViewingPage(pageNumber: number): void {
    if (!this.viewingList()) {
      return;
    }

    const totalPageCount = this.getPageCount(this.viewingList() as InvoiceViewingListResponseDto);

    if (pageNumber < 1 || pageNumber > totalPageCount) {
      return;
    }

    this.viewingFilterForm.controls.pageNumber.setValue(pageNumber);
    this.loadViewingList(true);
  }

  protected applySendingFilters(): void {
    this.clearSendingSelection();
    this.loadSendingList();
  }

  protected loadSendingList(keepSelection = false): void {
    if (!this.canSendList()) {
      this.feedback.set({
        tone: 'error',
        title: 'Liste yetkisi bulunmuyor',
        message: 'Fatura gonderimi listesi icin gerekli yetki bu kullanicida tanimli degil.'
      });
      return;
    }

    if (this.sendingFilterForm.invalid) {
      this.sendingFilterForm.markAllAsTouched();
      return;
    }

    const rawValue = this.sendingFilterForm.getRawValue();

    if (!keepSelection) {
      this.sendingDetailDialogOpen.set(false);
      this.selectedSendingKey.set(null);
      this.sendingDetail.set(null);
      this.selectedSendingKeys.set([]);
      this.lastSendResponse.set(null);
      this.returnReferencePanelOpen.set(false);
      this.returnReferenceInvoiceContext.set(null);
      this.returnReferenceCandidates.set(null);
      this.returnReferenceSavingKey.set(null);
    }

    this.sendingListLoading.set(true);

    this.faturaIslemleriService
      .listInvoiceSending({
        startDate: rawValue.startDate,
        endDate: rawValue.endDate,
        scenario: rawValue.scenario,
        isSent: rawValue.sentState,
        sentState: rawValue.sentState
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingListLoading.set(false))
      )
      .subscribe({
        next: (response: InvoiceSendingListResponseDto) => {
          this.sendingList.set(response);
          this.pruneSendingSelection(response);

          const selectedKey = this.selectedSendingKey();

          if (selectedKey && !this.findSendingItemByKey(selectedKey, response)) {
            this.sendingDetailDialogOpen.set(false);
            this.selectedSendingKey.set(null);
            this.sendingDetail.set(null);
          }

          this.clearInfoFeedback();
        },
        error: (error: HttpErrorResponse) => {
          this.sendingList.set(null);
          this.sendingDetailDialogOpen.set(false);
          this.selectedSendingKey.set(null);
          this.sendingDetail.set(null);
          this.selectedSendingKeys.set([]);
          this.returnReferencePanelOpen.set(false);
          this.returnReferenceInvoiceContext.set(null);
          this.returnReferenceCandidates.set(null);
          this.returnReferenceSavingKey.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Gonderim listesi yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Bekleyen fatura listesi su anda getirilemedi.'
            )
          });
        }
      });
  }

  protected resetSendingFilters(): void {
    const range = this.defaultDateRange();

    this.sendingFilterForm.reset({
      startDate: range.startDate,
      endDate: range.endDate,
      scenario: 'EFatura',
      sentState: 0
    });
    this.sendingQuickFilter.set('');
    this.clearSendingSelection();
    this.lastSendResponse.set(null);
    this.returnReferencePanelOpen.set(false);
    this.returnReferenceInvoiceContext.set(null);
    this.returnReferenceCandidates.set(null);
    this.returnReferenceSavingKey.set(null);
  }

  protected setSendingQuickFilter(event: Event): void {
    this.sendingQuickFilter.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected openSendingDetail(item: InvoiceSendingListItemDto): void {
    this.selectedSendingKey.set(this.buildSendingKey(item.documentSerie, item.documentOrderNo));
    this.sendingDetailDialogOpen.set(true);
    this.sendingRenderMode.set('default');
    this.returnReferencePanelOpen.set(false);
    this.returnReferenceInvoiceContext.set(null);
    this.returnReferenceCandidates.set(null);
    this.returnReferenceSavingKey.set(null);
    this.resetSendingRenderForm(item.scenario);

    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'info',
        title: 'Detay yetkisi gerekli',
        message: 'Liste satiri secildi ancak UBL onizleme icin detail yetkisi gerekiyor.'
      });
      return;
    }

    this.fetchSendingDetail(item.documentSerie, item.documentOrderNo, item.scenario);
  }

  protected closeSendingDetailDialog(): void {
    this.sendingDetailDialogOpen.set(false);
  }

  protected reloadSendingDetail(): void {
    const summary = this.selectedSendingSummary();

    if (!summary) {
      return;
    }

    this.sendingRenderMode.set('default');
    this.resetSendingRenderForm(summary.scenario);
    this.fetchSendingDetail(summary.documentSerie, summary.documentOrderNo, summary.scenario);
  }

  protected renderSendingDetailWithOverrides(): void {
    const summary = this.selectedSendingSummary();

    if (!summary) {
      return;
    }

    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'Detay yetkisi gerekli',
        message: 'Render ayarlarini kullanmak icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const rawValue = this.sendingRenderForm.getRawValue();
    const request: InvoiceSendingRenderRequestDto = {
      scenario: rawValue.scenario,
      profile: rawValue.profile,
      preferEmbeddedXslt: rawValue.preferEmbeddedXslt,
      fallbackToGeneral: rawValue.fallbackToGeneral
    };

    this.sendingRenderLoading.set(true);

    this.faturaIslemleriService
      .renderInvoiceSendingDetail(summary.documentSerie, summary.documentOrderNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingRenderLoading.set(false))
      )
      .subscribe({
        next: (detail: InvoiceSendingDetailDto) => {
          this.sendingDetail.set(detail);
          this.sendingRenderMode.set('manual');
          this.feedback.set({
            tone: 'success',
            title: 'Belge yeniden render edildi',
            message: `${detail.summary.invoiceId} icin secili render ayarlari uygulandi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Render ayarlari uygulanamadi',
            message: this.resolveErrorMessage(
              error,
              'Secili bekleyen fatura yeni render ayarlariyla gosterilemedi.'
            )
          });
        }
      });
  }

  protected toggleSendingSelection(item: InvoiceSendingListItemDto): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Gonderim yetkisi gerekli',
        message: 'Canli gonderim kuyrugu icin create yetkisi gerekiyor.'
      });
      return;
    }

    if (item.isSent) {
      this.feedback.set({
        tone: 'info',
        title: 'Belge zaten gonderilmis',
        message: `${item.invoiceId} icin tekrar kuyruk olusturulmaz.`
      });
      return;
    }

    const key = this.buildSendingKey(item.documentSerie, item.documentOrderNo);
    const nextSelection = new Set(this.selectedSendingKeys());

    if (nextSelection.has(key)) {
      nextSelection.delete(key);
    } else {
      nextSelection.add(key);
    }

    this.selectedSendingKeys.set(Array.from(nextSelection));
  }

  protected clearSendingSelection(): void {
    this.selectedSendingKeys.set([]);
  }

  protected sendSelectedInvoices(): void {
    this.submitSendingDocuments(this.selectedSendingItems());
  }

  protected sendCurrentInvoice(summary: InvoiceSendingListItemDto | null): void {
    if (!summary) {
      return;
    }

    this.submitSendingDocuments([summary]);
  }

  protected openSendingPdfFile(summary: InvoiceSendingListItemDto): void {
    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'PDF yetkisi gerekli',
        message: 'Gonderilmis faturanin PDF dosyasini acmak icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const pdfFilePath = this.getSendingPdfFilePath(summary);

    if (!pdfFilePath) {
      this.feedback.set({
        tone: 'info',
        title: 'PDF yolu yok',
        message: 'Gonderilmis fatura icin sendingPdfFilePath API cevabinda bulunmuyor.'
      });
      return;
    }

    this.sendingPdfLoadingKey.set(this.buildSendingKey(summary.documentSerie, summary.documentOrderNo));

    this.faturaIslemleriService
      .getUyumsoftEInvoicePdfFileFromPath(pdfFilePath)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingPdfLoadingKey.set(null))
      )
      .subscribe({
        next: (blob: Blob) => {
          const opened = this.openPdfBlob(blob);
          this.feedback.set({
            tone: opened ? 'success' : 'info',
            title: opened ? 'PDF acildi' : 'PDF cevabi alindi',
            message: opened
              ? `${summary.sentDocumentNo || summary.invoiceId} outbox PDF olarak acildi.`
              : 'Uyumsoft outbox PDF dosyasi alindi ancak tarayici yeni sekmeyi acamadi.'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'PDF acilamadi',
            message: this.resolveErrorMessage(
              error,
              'Secili gonderilmis fatura icin Uyumsoft outbox PDF dosyasi alinamadi.'
            )
          });
        }
      });
  }

  protected openReturnReferencePanel(summary: InvoiceSendingListItemDto): void {
    if (!this.isReturnInvoice(summary)) {
      return;
    }

    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'Iade referansi icin detay yetkisi gerekli',
        message: 'Iadeye konu fatura adaylarini gormek icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const scenario = this.getInvoiceScenario(summary.scenario);

    if (!scenario) {
      this.feedback.set({
        tone: 'error',
        title: 'Fatura senaryosu gecersiz',
        message: `${summary.invoiceId} satirinda EFatura veya EArsiv scenario bilgisi bulunmuyor.`
      });
      return;
    }

    const context: InvoiceSendingListItemDto = {
      ...summary,
      scenario
    };

    this.returnReferenceInvoiceContext.set(context);
    this.returnReferencePanelOpen.set(true);
    this.loadReturnReferenceCandidates(context);
  }

  protected reloadReturnReferenceCandidates(): void {
    const summary = this.returnReferenceInvoiceContext();

    if (!summary) {
      return;
    }

    this.loadReturnReferenceCandidates(summary);
  }

  protected saveReturnReference(
    _summary: InvoiceSendingListItemDto,
    reference: InvoiceReturnReferenceDto
  ): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Referans kayit yetkisi gerekli',
        message: 'Iade fatura referansini kaydetmek icin create yetkisi gerekiyor.'
      });
      return;
    }

    const summary = this.returnReferenceInvoiceContext();
    const scenario = this.getInvoiceScenario(summary?.scenario);

    if (!summary || !scenario) {
      this.feedback.set({
        tone: 'error',
        title: 'Iade faturasi baglami kayip',
        message: 'Referans kaydi icin secilen fatura seri, sira ve scenario bilgisi bulunamadi.'
      });
      return;
    }

    const sourceDocumentSerie = reference.sourceDocumentSerie?.trim() ?? '';

    if (!sourceDocumentSerie || reference.sourceDocumentOrderNo === null) {
      this.feedback.set({
        tone: 'error',
        title: 'Referans eksik',
        message: 'Secilen adayda kaynak seri veya sira bilgisi bulunmuyor.'
      });
      return;
    }

    this.saveReturnReferenceRequest(
      summary,
      {
        scenario,
        sourceDocumentSerie,
        sourceDocumentOrderNo: reference.sourceDocumentOrderNo,
        useFallbackWhenNotSelected: false
      },
      reference,
      this.buildReturnReferenceKey(reference)
    );
  }

  protected saveFallbackReturnReference(_summary: InvoiceSendingListItemDto): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Referans kayit yetkisi gerekli',
        message: 'Iade fatura referansini kaydetmek icin create yetkisi gerekiyor.'
      });
      return;
    }

    const summary = this.returnReferenceInvoiceContext();
    const scenario = this.getInvoiceScenario(summary?.scenario);

    if (!summary || !scenario) {
      this.feedback.set({
        tone: 'error',
        title: 'Iade faturasi baglami kayip',
        message: 'Fallback kaydi icin secilen fatura seri, sira ve scenario bilgisi bulunamadi.'
      });
      return;
    }

    const fallbackReference = this.returnReferenceCandidates()?.fallbackReference ?? null;

    if (!fallbackReference) {
      this.feedback.set({
        tone: 'error',
        title: 'Fallback aday yok',
        message: 'Backend bu iade faturasi icin otomatik fallback aday dondurmedi.'
      });
      return;
    }

    this.saveReturnReferenceRequest(
      summary,
      {
        scenario,
        useFallbackWhenNotSelected: true
      },
      fallbackReference,
      `fallback:${this.buildReturnReferenceKey(fallbackReference)}`
    );
  }

  protected addSearchParameter(
    parameter: Partial<IUyumsoftOperationParameterApiDto> = {}
  ): void {
    this.outboxParameterArray.push(
      new FormGroup({
        name: new FormControl(parameter.name ?? '', {
          nonNullable: true
        }),
        value: new FormControl(parameter.value ?? '', {
          nonNullable: true
        })
      })
    );
  }

  protected removeSearchParameter(index: number): void {
    this.outboxParameterArray.removeAt(index);
  }

  protected clearSearchParameters(): void {
    this.outboxParameterArray.clear();
  }

  protected applyDefaultOutboxQuery(): void {
    this.clearSearchParameters();
    for (const parameter of DEFAULT_OUTBOX_QUERY_PARAMETERS) {
      this.addSearchParameter(parameter);
    }
    this.feedback.set({
      tone: 'info',
      title: 'Outbox sorgu sablonu yuklendi',
      message: 'Sayfali Uyumsoft outbox typed parameter sablonu forma geri tasindi.'
    });
  }

  protected runOutboxSearch(): void {
    if (!this.canSendList()) {
      this.feedback.set({
        tone: 'error',
        title: 'Outbox arama yetkisi yok',
        message: 'Fatura gonderimi outbox search endpointi icin gerekli yetki bulunmuyor.'
      });
      return;
    }

    const request = this.buildOutboxSearchRequest();
    this.outboxSearchLoading.set(true);
    this.outboxSearchResponse.set(null);

    this.faturaIslemleriService
      .searchOutboxInvoices(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.outboxSearchLoading.set(false))
      )
      .subscribe({
        next: (response: InvoiceOutboxSearchResponseDto) => {
          this.outboxSearchResponse.set(response);

          const firstInvoiceUuid = response.invoiceList?.items.find(
            (item) => !!item.invoiceUuid?.trim()
          )?.invoiceUuid;
          const currentInvoiceId = this.renderForm.controls.invoiceId.value.trim();

          if (!currentInvoiceId && firstInvoiceUuid?.trim()) {
            this.renderForm.controls.invoiceId.setValue(firstInvoiceUuid.trim());
            this.previewForm.controls.invoiceId.setValue(firstInvoiceUuid.trim());
          }

          this.feedback.set({
            tone: response.isSucceeded ? 'success' : 'error',
            title: response.isSucceeded ? 'Outbox sorgusu tamamlandi' : 'Outbox sorgusu hata ile dondu',
            message:
              response.message?.trim() ||
              `${response.operationName || 'GetOutboxInvoiceList'} cevabi alindi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Outbox sorgusu calismadi',
            message: this.resolveErrorMessage(
              error,
              'Uyumsoft outbox search endpointi su anda cevap vermiyor.'
            )
          });
        }
      });
  }

  protected applyInvoiceUuidCandidate(invoiceUuid: string): void {
    this.renderForm.controls.invoiceId.setValue(invoiceUuid);
    this.previewForm.controls.invoiceId.setValue(invoiceUuid);
    this.feedback.set({
      tone: 'info',
      title: 'Invoice UUID secildi',
      message: `${invoiceUuid} render ve preview formlarina tasindi.`
    });
  }

  protected applyOutboxInvoiceRow(row: IUyumsoftInvoiceListItemApiDto): void {
    const invoiceUuid = row.invoiceUuid?.trim();

    if (!invoiceUuid) {
      this.feedback.set({
        tone: 'error',
        title: 'Invoice UUID yok',
        message: `${row.invoiceNumber || 'Secili satir'} icin teknik UUID API cevabinda bulunamadi.`
      });
      return;
    }

    this.applyInvoiceUuidCandidate(invoiceUuid);
  }

  protected openOutboxInvoicePdf(row: IUyumsoftInvoiceListItemApiDto): void {
    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'PDF yetkisi gerekli',
        message: 'Outbox PDF dosyasini acmak icin detail yetkisi gerekiyor.'
      });
      return;
    }

    const invoiceUuid = row.invoiceUuid?.trim();
    const pdfFilePath = row.pdfFilePath?.trim();

    if (!invoiceUuid || !pdfFilePath) {
      this.feedback.set({
        tone: 'error',
        title: 'PDF yolu yok',
        message:
          `${row.invoiceNumber || 'Secili fatura'} icin teknik UUID veya pdfFilePath ` +
          'API cevabinda bulunamadi.'
      });
      return;
    }

    this.outboxPdfLoadingKey.set(invoiceUuid);

    this.faturaIslemleriService
      .getUyumsoftEInvoicePdfFileFromPath(pdfFilePath)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.outboxPdfLoadingKey.set(null))
      )
      .subscribe({
        next: (blob: Blob) => {
          const opened = this.openPdfBlob(blob);
          this.feedback.set({
            tone: opened ? 'success' : 'info',
            title: opened ? 'PDF acildi' : 'PDF cevabi alindi',
            message: opened
              ? `${row.invoiceNumber || invoiceUuid} outbox PDF olarak acildi.`
              : 'Uyumsoft outbox PDF dosyasi alindi ancak tarayici yeni sekmeyi acamadi.'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'PDF acilamadi',
            message: this.resolveErrorMessage(
              error,
              'Secili outbox satiri icin Uyumsoft PDF dosyasi alinamadi.'
            )
          });
        }
      });
  }

  protected renderOutboxInvoice(): void {
    if (!this.canSendDetail()) {
      this.feedback.set({
        tone: 'error',
        title: 'Belge render yetkisi yok',
        message: 'Outbox tekil belge render endpointi icin gerekli detail yetkisi bulunmuyor.'
      });
      return;
    }

    if (this.renderForm.invalid) {
      this.renderForm.markAllAsTouched();
      return;
    }

    const rawValue = this.renderForm.getRawValue();
    this.renderedOutboxLoading.set(true);
    this.renderedOutboxDocument.set(null);

    this.faturaIslemleriService
      .renderOutboxInvoice(rawValue.invoiceId.trim(), {
        profile: rawValue.profile,
        preferEmbeddedXslt: rawValue.preferEmbeddedXslt
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.renderedOutboxLoading.set(false))
      )
      .subscribe({
        next: (document: InvoiceRenderedDocumentDto) => {
          this.renderedOutboxDocument.set(document);
          this.feedback.set({
            tone: 'success',
            title: 'Outbox belge render edildi',
            message: `${document.invoiceId || rawValue.invoiceId} icin HTML onizleme hazir.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Belge render edilemedi',
            message: this.resolveErrorMessage(
              error,
              'Secilen outbox invoiceId icin render sonucu getirilemedi.'
            )
          });
        }
      });
  }

  protected useDocumentXmlForPreview(document: InvoiceRenderedDocumentDto | null): void {
    if (!document?.xmlContent?.trim()) {
      this.feedback.set({
        tone: 'info',
        title: 'XML bulunamadi',
        message: 'Secili belgede preview formuna tasinabilecek bir xmlContent yok.'
      });
      return;
    }

    this.previewForm.patchValue({
      invoiceId: document.invoiceId ?? this.previewForm.controls.invoiceId.value,
      xmlContent: document.xmlContent,
      profile: this.normalizeProfile(document.profile),
      preferEmbeddedXslt: true
    });

    this.feedback.set({
      tone: 'info',
      title: 'XML preview formuna tasindi',
      message: 'Secili belgenin ham XML icerigi preview istegi icin hazirlandi.'
    });
  }

  protected previewInvoiceXml(): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'XML preview yetkisi yok',
        message: 'Preview endpointini kullanmak icin create yetkisi gerekli.'
      });
      return;
    }

    if (this.previewForm.invalid) {
      this.previewForm.markAllAsTouched();
      return;
    }

    const rawValue = this.previewForm.getRawValue();
    const request: InvoicePreviewRequestDto = {
      invoiceId: rawValue.invoiceId.trim() || null,
      xmlContent: rawValue.xmlContent.trim(),
      profile: rawValue.profile,
      preferEmbeddedXslt: rawValue.preferEmbeddedXslt
    };

    this.previewLoading.set(true);
    this.previewDocument.set(null);

    this.faturaIslemleriService
      .previewInvoiceDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.previewLoading.set(false))
      )
      .subscribe({
        next: (document: InvoiceRenderedDocumentDto) => {
          this.previewDocument.set(document);
          this.feedback.set({
            tone: 'success',
            title: 'XML preview hazir',
            message: `${document.invoiceId || request.invoiceId || 'Secili XML'} icin HTML sonucu uretildi.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'XML preview alinamadi',
            message: this.resolveErrorMessage(
              error,
              'Preview endpointi XML icerigini render edemedi.'
            )
          });
        }
      });
  }

  protected clearPreviewXml(): void {
    this.previewForm.controls.xmlContent.setValue('');
  }

  protected getDocumentPreviewUrl(htmlContent: string | null | undefined): SafeResourceUrl | null {
    const normalizedHtml = typeof htmlContent === 'string' ? htmlContent : '';

    if (!normalizedHtml.trim()) {
      return null;
    }

    const cachedResourceUrl = this.previewResourceUrlCache.get(normalizedHtml);

    if (cachedResourceUrl) {
      return cachedResourceUrl;
    }

    const objectUrl = URL.createObjectURL(
      new Blob([normalizedHtml], {
        type: 'text/html;charset=utf-8'
      })
    );
    const resourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);

    this.previewObjectUrlCache.set(normalizedHtml, objectUrl);
    this.previewResourceUrlCache.set(normalizedHtml, resourceUrl);

    return resourceUrl;
  }

  protected getSelectedViewingSearchOption(): ViewingSearchFieldOption | null {
    const currentValue = this.viewingFilterForm.controls.searchField.value;
    return this.viewingSearchFieldOptions.find((option) => option.value === currentValue) ?? null;
  }

  protected getSelectedSendingScenarioDescription(): string {
    return (
      this.sendingScenarioOptions.find(
        (option) => option.value === this.sendingFilterForm.controls.scenario.value
      )?.description ?? ''
    );
  }

  protected getScenarioLabel(value: unknown): string {
    return this.resolveSendingScenario(value) === 'EArsiv' ? 'E-Arsiv' : 'E-Fatura';
  }

  protected getEmbeddedPreferenceLabel(value: boolean | null | undefined): string {
    if (value === true) {
      return 'Varsa embedded XSLT once denenir.';
    }

    if (value === false) {
      return 'Embedded aranmadan genel asset tasarimi kullanilir.';
    }

    return 'Backend isStandard bilgisini yorumlar ve uygun render kararini verir.';
  }

  protected getViewingModeSummary(): string {
    return this.viewingRenderMode() === 'manual' ? 'Elle render edildi' : 'Varsayilan acilis';
  }

  protected getSendingModeSummary(): string {
    return this.sendingRenderMode() === 'manual' ? 'Elle render edildi' : 'Varsayilan onizleme';
  }

  protected getDocumentDesignLabel(document: InvoiceRenderedDocumentDto | null): string {
    if (!document) {
      return '-';
    }

    return document.usedEmbeddedXslt ? 'Gomulu XSLT' : 'Genel XSLT';
  }

  protected getDocumentProfileLabel(document: InvoiceRenderedDocumentDto | null): string {
    if (!document?.profile) {
      return '-';
    }

    return `${document.profile}`;
  }

  protected getDocumentXsltLabel(document: InvoiceRenderedDocumentDto | null): string {
    if (!document?.appliedXsltName?.trim()) {
      return '-';
    }

    return document.appliedXsltName;
  }

  protected getSendingSelectionLabel(item: InvoiceSendingListItemDto): string {
    if (item.isSent) {
      return 'Gonderildi';
    }

    return this.isSendingItemSelected(item) ? 'Kuyruktan Cikar' : 'Kuyruga Ekle';
  }

  protected canOpenSendingPdf(summary: InvoiceSendingListItemDto | null | undefined): boolean {
    return !!summary && summary.isSent && !!this.getSendingPdfFilePath(summary);
  }

  protected getSendingPdfButtonTitle(
    summary: InvoiceSendingListItemDto | null | undefined
  ): string {
    if (!summary?.isSent) {
      return 'PDF sadece gonderilmis faturalar icin acilir.';
    }

    if (!this.getSendingPdfFilePath(summary)) {
      return 'API cevabinda sendingPdfFilePath bulunmuyor.';
    }

    return 'Gonderilmis fatura PDF dosyasini ac.';
  }

  protected canOpenOutboxInvoicePdf(
    row: IUyumsoftInvoiceListItemApiDto | null | undefined
  ): boolean {
    return !!row?.invoiceUuid?.trim() && !!row.pdfFilePath?.trim();
  }

  protected isSendingPdfLoading(summary: InvoiceSendingListItemDto): boolean {
    return (
      this.sendingPdfLoadingKey() ===
      this.buildSendingKey(summary.documentSerie, summary.documentOrderNo)
    );
  }

  protected isOutboxInvoicePdfLoading(row: IUyumsoftInvoiceListItemApiDto): boolean {
    const invoiceUuid = row.invoiceUuid?.trim();
    return !!invoiceUuid && this.outboxPdfLoadingKey() === invoiceUuid;
  }

  protected isReturnInvoice(item: InvoiceSendingListItemDto | null | undefined): boolean {
    return (item?.invoiceTypeCode ?? '').trim().toUpperCase() === 'IADE';
  }

  protected hasReturnReference(item: InvoiceSendingListItemDto | null | undefined): boolean {
    return !!item?.returnInvoiceNo?.trim();
  }

  protected getReturnReferenceLabel(item: InvoiceSendingListItemDto): string {
    if (!this.isReturnInvoice(item)) {
      return '-';
    }

    return item.returnInvoiceNo?.trim() || 'Referans gerekli';
  }

  protected getReturnReferenceCandidates(
    response: InvoiceReturnReferenceCandidatesResponseDto | null
  ): InvoiceReturnReferenceDto[] {
    return response?.candidates ?? [];
  }

  protected getReferenceDocumentLabel(reference: InvoiceReturnReferenceDto | null): string {
    if (!reference) {
      return '-';
    }

    const sourceDocumentSerie = reference.sourceDocumentSerie?.trim();

    if (!sourceDocumentSerie || reference.sourceDocumentOrderNo === null) {
      return '-';
    }

    return `${sourceDocumentSerie} / ${reference.sourceDocumentOrderNo}`;
  }

  protected getReturnReferenceAmount(reference: InvoiceReturnReferenceDto | null): number | null {
    if (!reference) {
      return null;
    }

    const amount =
      reference.payableTotal ??
      reference.invoiceTotal ??
      reference.totalAmount ??
      reference.amount ??
      null;

    return typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
  }

  protected getReturnReferenceBadge(reference: InvoiceReturnReferenceDto): string {
    if (reference.isFallbackCandidate) {
      return 'Fallback';
    }

    return reference.isGeneratedInvoiceNo ? 'Uretilen No' : 'Aday';
  }

  protected isSavingReturnReference(reference: InvoiceReturnReferenceDto): boolean {
    return this.returnReferenceSavingKey() === this.buildReturnReferenceKey(reference);
  }

  protected isSavingFallbackReference(reference: InvoiceReturnReferenceDto | null): boolean {
    return reference
      ? this.returnReferenceSavingKey() === `fallback:${this.buildReturnReferenceKey(reference)}`
      : false;
  }

  protected isPrintedStateUpdating(documentId: string | null | undefined): boolean {
    return !!documentId && this.printedStateUpdatingDocumentId() === documentId;
  }

  protected isSendingCardSelected(item: InvoiceSendingListItemDto): boolean {
    return this.buildSendingKey(item.documentSerie, item.documentOrderNo) === this.selectedSendingKey();
  }

  protected isSendingItemSelected(item: InvoiceSendingListItemDto): boolean {
    return this.selectedSendingKeys().includes(
      this.buildSendingKey(item.documentSerie, item.documentOrderNo)
    );
  }

  protected hasNodeAttributes(node: IUyumsoftResponseNodeApiDto): boolean {
    return Object.keys(node.attributes ?? {}).length > 0;
  }

  protected formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected getPageCount(response: InvoiceViewingListResponseDto | null): number {
    if (!response || !response.pageSize) {
      return 1;
    }

    return Math.max(1, Math.ceil(response.totalCount / response.pageSize));
  }

  protected isViewingCardSelected(item: InvoiceViewingListItemDto): boolean {
    return item.documentId === this.selectedViewingDocumentId();
  }

  protected readonly trackByInvoice = (
    _index: number,
    item: InvoiceViewingListItemDto
  ): string => item.documentId;
  protected readonly trackBySendingInvoice = (
    _index: number,
    item: InvoiceSendingListItemDto
  ): string => this.buildSendingKey(item.documentSerie, item.documentOrderNo);
  protected readonly trackByReturnReference = (
    _index: number,
    item: InvoiceReturnReferenceDto
  ): string => this.buildReturnReferenceKey(item);
  protected readonly trackByNode = (_index: number, node: IUyumsoftResponseNodeApiDto): string =>
    `${node.name}|${node.value ?? ''}`;
  protected readonly trackByOutboxInvoiceRow = (
    index: number,
    row: IUyumsoftInvoiceListItemApiDto
  ): string =>
    row.invoiceUuid?.trim() ||
    row.invoiceNumber?.trim() ||
    row.localDocumentId?.trim() ||
    `${row.direction}|${index}`;
  protected readonly trackByStat = (_index: number, stat: HeroStat): string => stat.label;
  protected readonly trackByMetric = (_index: number, metric: SummaryMetric): string =>
    metric.label;
  protected readonly trackByResponseMetric = (
    _index: number,
    metric: ResponseMetric
  ): string => metric.label;
  protected readonly trackBySendResponseItem = (
    _index: number,
    item: SendInvoiceDocumentsResponseDto['items'][number]
  ): string => this.buildSendingKey(item.documentSerie, item.documentOrderNo);

  private fetchViewingDetail(documentId: string): void {
    this.viewingDetailLoading.set(true);

    this.faturaIslemleriService
      .getInvoiceViewingDetail(documentId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: InvoiceViewingDetailDto) => {
          this.viewingDetail.set(detail);
        },
        error: (error: HttpErrorResponse) => {
          this.viewingDetail.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Belge detayi yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Secilen fatura icin detay ve render bilgisi getirilemedi.'
            )
          });
        }
      });
  }

  private openPdfBlob(blob: Blob): boolean {
    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], {
            type: 'application/pdf'
          });
    const objectUrl = URL.createObjectURL(pdfBlob);
    const openedWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

    return !!openedWindow;
  }

  private loadReturnReferenceCandidates(summary: InvoiceSendingListItemDto): void {
    const scenario = this.getInvoiceScenario(summary.scenario);

    if (!scenario) {
      this.feedback.set({
        tone: 'error',
        title: 'Fatura senaryosu gecersiz',
        message: `${summary.documentSerie}/${summary.documentOrderNo} icin scenario belirlenemedi.`
      });
      return;
    }

    this.returnReferenceLoading.set(true);
    this.returnReferenceCandidates.set(null);

    this.faturaIslemleriService
      .getInvoiceReturnReferenceCandidates(
        summary.documentSerie,
        summary.documentOrderNo,
        scenario
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.returnReferenceLoading.set(false))
      )
      .subscribe({
        next: (response: InvoiceReturnReferenceCandidatesResponseDto) => {
          if (response.invoice && !this.matchesReturnReferenceInvoice(summary, response.invoice)) {
            this.returnReferenceCandidates.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Iade referansi faturasi uyusmuyor',
              message:
                `Secilen ${summary.documentSerie}/${summary.documentOrderNo} (${scenario}) yerine ` +
                `${response.invoice.documentSerie}/${response.invoice.documentOrderNo} ` +
                `(${response.invoice.scenario}) cevabi dondu.`
            });
            return;
          }

          const normalizedResponse: InvoiceReturnReferenceCandidatesResponseDto = {
            ...response,
            candidates: response.candidates ?? []
          };

          this.returnReferenceCandidates.set(normalizedResponse);

          if (
            !normalizedResponse.currentReference &&
            !normalizedResponse.fallbackReference &&
            normalizedResponse.candidates.length === 0
          ) {
            this.feedback.set({
              tone: 'info',
              title: 'Iade referans adayi yok',
              message: `${summary.invoiceId} icin secilebilir iade referansi donmedi.`
            });
            return;
          }

          this.clearInfoFeedback();
        },
        error: (error: HttpErrorResponse) => {
          this.returnReferenceCandidates.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Iade referans adaylari alinamadi',
            message:
              this.resolveErrorMessage(
                error,
                'Secili iade fatura icin referans adaylari getirilemedi.'
              ) +
              ` [${summary.documentSerie}/${summary.documentOrderNo}, scenario=${scenario}]`
          });
        }
      });
  }

  private saveReturnReferenceRequest(
    summary: InvoiceSendingListItemDto,
    request: UpdateInvoiceReturnReferenceRequestDto,
    optimisticReference: InvoiceReturnReferenceDto,
    savingKey: string
  ): void {
    this.returnReferenceSavingKey.set(savingKey);

    this.faturaIslemleriService
      .updateInvoiceReturnReference(summary.documentSerie, summary.documentOrderNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.returnReferenceSavingKey.set(null))
      )
      .subscribe({
        next: (savedReference: InvoiceReturnReferenceDto | null) => {
          const reference = savedReference?.invoiceNo?.trim()
            ? savedReference
            : optimisticReference;

          this.mergeReturnReference(summary, reference);
          this.returnReferenceCandidates.update((currentResponse) =>
            currentResponse
              ? {
                  ...currentResponse,
                  currentReference: reference
                }
              : currentResponse
          );
          this.feedback.set({
            tone: 'success',
            title: 'Iade referansi kaydedildi',
            message: `${summary.invoiceId} icin ${reference.invoiceNo} referansi kullanilacak.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Iade referansi kaydedilemedi',
            message: this.resolveErrorMessage(
              error,
              'Secili iade referansi backend tarafinda kaydedilemedi.'
            )
          });
        }
      });
  }

  private fetchSendingDetail(
    documentSerie: string,
    documentOrderNo: number,
    scenario: unknown
  ): void {
    this.sendingDetailLoading.set(true);

    this.faturaIslemleriService
      .getInvoiceSendingDetail(
        documentSerie,
        documentOrderNo,
        this.resolveSendingScenario(scenario)
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: InvoiceSendingDetailDto) => {
          this.sendingDetail.set(detail);
        },
        error: (error: HttpErrorResponse) => {
          this.sendingDetail.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Bekleyen fatura yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Secilen bekleyen fatura icin UBL onizleme getirilemedi.'
            )
          });
        }
      });
  }

  private submitSendingDocuments(documents: InvoiceSendingListItemDto[]): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Gonderim yetkisi gerekli',
        message: 'Canli Uyumsoft gonderimi icin create yetkisi gerekiyor.'
      });
      return;
    }

    const unsentDocuments = documents.filter((item) => !item.isSent);

    if (unsentDocuments.length === 0) {
      this.feedback.set({
        tone: 'info',
        title: 'Gonderilecek belge secilmedi',
        message: 'Canli gonderim icin en az bir gonderilmemis belge secmelisin.'
      });
      return;
    }

    const missingReturnReference = unsentDocuments.find(
      (item) => this.isReturnInvoice(item) && !this.hasReturnReference(item)
    );

    if (missingReturnReference) {
      this.openSendingDetail(missingReturnReference);

      if (this.canSendDetail()) {
        this.openReturnReferencePanel(missingReturnReference);
      }

      this.feedback.set({
        tone: 'error',
        title: 'Iade referansi zorunlu',
        message: `${missingReturnReference.invoiceId} iade faturasi gonderilmeden once iadeye konu fatura referansi secilmeli.`
      });
      return;
    }

    const scenario = this.resolveSendingScenario(unsentDocuments[0].scenario);
    this.sendingRequestLoading.set(true);

    this.faturaIslemleriService
      .sendInvoiceDocuments({
        scenario,
        documents: unsentDocuments.map((item) => ({
          documentSerie: item.documentSerie,
          documentOrderNo: item.documentOrderNo
        }))
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingRequestLoading.set(false))
      )
      .subscribe({
        next: (response: SendInvoiceDocumentsResponseDto) => {
          this.lastSendResponse.set(response);
          this.mergeSendResponse(response);
          this.feedback.set({
            tone: response.failedCount > 0 ? 'info' : 'success',
            title:
              response.failedCount > 0
                ? 'Gonderim tamamlandi, bazi kayitlar hata verdi'
                : 'Gonderim basariyla tamamlandi',
            message: `${response.succeededCount} basarili, ${response.failedCount} hatali sonuc dondu.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Canli gonderim calismadi',
            message: this.resolveErrorMessage(
              error,
              'Secili bekleyen faturalar Uyumsofta gonderilemedi.'
            )
          });
        }
      });
  }

  private buildOutboxSearchRequest(): InvoiceOutboxSearchRequestDto {
    const parameters = this.outboxParameterArray.controls
      .map((parameterGroup: ParameterFormGroup) => ({
        name: parameterGroup.controls.name.value.trim(),
        value: parameterGroup.controls.value.value.trim() || null
      }))
      .filter((parameter: IUyumsoftOperationParameterApiDto) => !!parameter.name);

    return {
      parameters: parameters.length ? parameters : undefined
    };
  }

  private buildViewingSynchronizationRequest(): InvoiceViewingSynchronizationRequestDto | null {
    const { startDate, endDate } = this.viewingFilterForm.controls;

    startDate.markAsTouched();
    endDate.markAsTouched();

    if (startDate.invalid || endDate.invalid) {
      return null;
    }

    return {
      startDate: startDate.value,
      endDate: endDate.value
    };
  }

  private resetViewingRenderForm(): void {
    this.viewingRenderForm.reset({
      profile: 'Auto',
      preferEmbeddedXslt: null,
      fallbackToGeneral: true
    });
  }

  private resetSendingRenderForm(scenario?: unknown): void {
    this.sendingRenderForm.reset({
      scenario: this.resolveSendingScenario(scenario ?? this.sendingFilterForm.controls.scenario.value),
      profile: 'Auto',
      preferEmbeddedXslt: null,
      fallbackToGeneral: true
    });
  }

  private mergeViewingSummary(summary: InvoiceViewingListItemDto): void {
    const currentList = this.viewingList();

    if (currentList) {
      this.viewingList.set({
        ...currentList,
        items: currentList.items.map((item) =>
          item.documentId === summary.documentId ? summary : item
        )
      });
    }

    const currentDetail = this.viewingDetail();

    if (currentDetail?.summary.documentId === summary.documentId) {
      this.viewingDetail.set({
        ...currentDetail,
        summary
      });
    }
  }

  private mergeReturnReference(
    summary: InvoiceSendingListItemDto,
    reference: InvoiceReturnReferenceDto
  ): void {
    const selectedKey = this.buildSendingKey(summary.documentSerie, summary.documentOrderNo);
    const returnInvoiceNo = reference.invoiceNo?.trim() || null;
    const returnInvoiceDate = reference.invoiceDate ?? null;
    const currentList = this.sendingList();

    if (currentList) {
      this.sendingList.set({
        ...currentList,
        items: currentList.items.map((item) =>
          this.buildSendingKey(item.documentSerie, item.documentOrderNo) === selectedKey
            ? {
                ...item,
                returnInvoiceNo,
                returnInvoiceDate
              }
            : item
        )
      });
    }

    const currentDetail = this.sendingDetail();

    if (
      currentDetail &&
      this.buildSendingKey(
        currentDetail.summary.documentSerie,
        currentDetail.summary.documentOrderNo
      ) === selectedKey
    ) {
      this.sendingDetail.set({
        ...currentDetail,
        summary: {
          ...currentDetail.summary,
          returnInvoiceNo,
          returnInvoiceDate
        }
      });
    }
  }

  private mergeSendResponse(response: SendInvoiceDocumentsResponseDto): void {
    const resultsByKey = new Map(
      response.items.map((item) => [
        this.buildSendingKey(item.documentSerie, item.documentOrderNo),
        item
      ])
    );
    const currentList = this.sendingList();

    if (currentList) {
      this.sendingList.set({
        ...currentList,
        items: currentList.items.map((item) => {
          const result = resultsByKey.get(
            this.buildSendingKey(item.documentSerie, item.documentOrderNo)
          );

          if (!result) {
            return item;
          }

          return {
            ...item,
            invoiceId: result.invoiceId?.trim() || item.invoiceId,
            customerCode: result.customerCode?.trim() || item.customerCode,
            customerTitle: result.customerTitle?.trim() || item.customerTitle,
            serviceDocumentId: result.serviceDocumentId?.trim() || item.serviceDocumentId,
            isSent: result.isSucceeded ? true : item.isSent,
            sentDocumentNo: result.serviceDocumentNumber?.trim() || item.sentDocumentNo
          };
        })
      });
    }

    const currentDetail = this.sendingDetail();

    if (currentDetail) {
      const result = resultsByKey.get(
        this.buildSendingKey(
          currentDetail.summary.documentSerie,
          currentDetail.summary.documentOrderNo
        )
      );

      if (result) {
        this.sendingDetail.set({
          ...currentDetail,
          summary: {
            ...currentDetail.summary,
            invoiceId: result.invoiceId?.trim() || currentDetail.summary.invoiceId,
            customerCode: result.customerCode?.trim() || currentDetail.summary.customerCode,
            customerTitle: result.customerTitle?.trim() || currentDetail.summary.customerTitle,
            serviceDocumentId:
              result.serviceDocumentId?.trim() || currentDetail.summary.serviceDocumentId,
            isSent: result.isSucceeded ? true : currentDetail.summary.isSent,
            sentDocumentNo:
              result.serviceDocumentNumber?.trim() || currentDetail.summary.sentDocumentNo
          }
        });
      }
    }

    this.selectedSendingKeys.set(
      this.selectedSendingKeys().filter((key) => !resultsByKey.get(key)?.isSucceeded)
    );
  }

  private pruneSendingSelection(response: InvoiceSendingListResponseDto): void {
    const validKeys = new Set(
      response.items
        .filter((item) => !item.isSent)
        .map((item) => this.buildSendingKey(item.documentSerie, item.documentOrderNo))
    );

    this.selectedSendingKeys.set(
      this.selectedSendingKeys().filter((key) => validKeys.has(key))
    );
  }

  private buildSendingKey(documentSerie: string, documentOrderNo: number): string {
    return `${documentSerie}|${documentOrderNo}`;
  }

  private getSendingPdfFilePath(
    summary: InvoiceSendingListItemDto | null | undefined
  ): string | null {
    if (!summary?.isSent) {
      return null;
    }

    return summary.sendingPdfFilePath?.trim() || null;
  }

  private buildReturnReferenceKey(reference: InvoiceReturnReferenceDto): string {
    return [
      reference.sourceDocumentSerie ?? '',
      reference.sourceDocumentOrderNo ?? '',
      reference.invoiceNo ?? '',
      reference.invoiceDate ?? ''
    ].join('|');
  }

  private findSendingItemByKey(
    key: string | null,
    response: InvoiceSendingListResponseDto | null = this.sendingList()
  ): InvoiceSendingListItemDto | null {
    if (!key) {
      return null;
    }

    return (
      response?.items.find(
        (item) => this.buildSendingKey(item.documentSerie, item.documentOrderNo) === key
      ) ?? null
    );
  }

  private uniquePermissionCodes(values: string[]): string[] {
    return values
      .map((value) => this.normalizeText(value))
      .filter((value, index, items) => !!value && items.indexOf(value) === index);
  }

  private hasPermission(permissionCodes: string[], code: string): boolean {
    return permissionCodes.includes(this.normalizeText(code));
  }

  private clearInfoFeedback(): void {
    if (this.feedback()?.tone === 'info') {
      this.feedback.set(null);
    }
  }

  private normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim().toLocaleLowerCase('tr-TR');
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim().toLocaleLowerCase('tr-TR');
  }

  private normalizeProfile(value: unknown): IInvoiceRenderProfileApiDto {
    const normalizedValue = this.normalizeText(value);

    switch (normalizedValue) {
      case 'efatura':
        return 'EFatura';
      case 'earsiv':
        return 'EArsiv';
      default:
        return 'Auto';
    }
  }

  private getInvoiceScenario(value: unknown): IInvoiceSendingScenarioApiDto | null {
    const normalizedValue = this.normalizeIdentifier(String(value ?? ''));

    if (value === 0 || normalizedValue === '0' || normalizedValue === 'efatura') {
      return 'EFatura';
    }

    if (
      value === 1 ||
      value === 2 ||
      normalizedValue === '1' ||
      normalizedValue === '2' ||
      normalizedValue === 'earsiv'
    ) {
      return 'EArsiv';
    }

    return null;
  }

  private matchesReturnReferenceInvoice(
    selectedInvoice: InvoiceSendingListItemDto,
    responseInvoice: NonNullable<InvoiceReturnReferenceCandidatesResponseDto['invoice']>
  ): boolean {
    const selectedScenario = this.getInvoiceScenario(selectedInvoice.scenario);
    const responseScenario = this.getInvoiceScenario(responseInvoice.scenario);

    return (
      selectedInvoice.documentSerie.trim() === responseInvoice.documentSerie.trim() &&
      selectedInvoice.documentOrderNo === responseInvoice.documentOrderNo &&
      !!selectedScenario &&
      selectedScenario === responseScenario
    );
  }

  private resolveSendingScenario(value: unknown): IInvoiceSendingScenarioApiDto {
    return this.getInvoiceScenario(value) ?? 'EFatura';
  }

  private normalizeIdentifier(value: string | null | undefined): string {
    return (value ?? '').replace(/[^a-zA-Z0-9]+/g, '').toLocaleLowerCase('tr-TR');
  }

  private resolveWorkspaceFromTaskId(taskId: string): WorkspaceMode {
    return taskId === SENDING_TASK_ID ? 'sending' : 'viewing';
  }

  private defaultDateRange(): FurpaDateRange {
    return getDefaultDateRange(1);
  }

  private releasePreviewUrls(): void {
    for (const objectUrl of this.previewObjectUrlCache.values()) {
      URL.revokeObjectURL(objectUrl);
    }

    this.previewObjectUrlCache.clear();
    this.previewResourceUrlCache.clear();
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.error === 'object' && error.error !== null) {
      const problem = error.error as Record<string, unknown>;
      const message = problem['message'] ?? problem['detail'] ?? problem['title'];
      const correlationId = problem['correlationId'] ?? problem['traceId'];

      if (typeof message === 'string' && message.trim()) {
        return typeof correlationId === 'string' && correlationId.trim()
          ? `${message} (correlationId: ${correlationId})`
          : message;
      }
    }

    return fallback;
  }
}
