import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import type {
  IInvoiceRenderProfileApiDto,
  IInvoiceSendingScenarioApiDto,
  IInvoiceStateFilterApiDto,
  IInvoiceViewingSearchFieldApiDto
} from '@interfaces';
import { finalize, firstValueFrom, of, switchMap } from 'rxjs';

import {
  getDefaultDateRange,
  type FurpaDateRange
} from '../../../../../core/api/furpa-merkez-api.utils';
import {
  FaturaIslemleriService,
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
  type SendInvoiceDocumentsRequestDto,
  type ValidateInvoiceDocumentsResponseDto,
  type SendInvoiceDocumentsResponseDto
} from '../../../../../core/api/module-services/fatura-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

type WorkspaceMode = 'viewing' | 'sending';
type FeedbackTone = 'success' | 'error' | 'info';
type SortDirection = 'asc' | 'desc';
type ViewingSortKey =
  | 'invoiceId'
  | 'despatchId'
  | 'customerTitle'
  | 'invoiceDate'
  | 'invoiceType'
  | 'status'
  | 'invoiceTotal'
  | 'isPrinted';
type SendingSortKey =
  | 'invoiceId'
  | 'customerTitle'
  | 'documentDate'
  | 'isSent'
  | 'scenario'
  | 'profile'
  | 'sourceLine'
  | 'taxRate'
  | 'returnReference'
  | 'payableTotal';

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

interface SendingSortState {
  key: SendingSortKey;
  direction: SortDirection;
}

interface ViewingSortState {
  key: ViewingSortKey | null;
  direction: SortDirection | null;
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

interface ViewingTableFilterOption {
  value: string;
  label: string;
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

@Component({
  selector: 'app-fatura-islemleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fatura-islemleri-list.component.html',
  styleUrl: './fatura-islemleri-list.component.scss'
})
export class FaturaIslemleriListComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly faturaIslemleriService = inject(FaturaIslemleriService);
  private readonly previewObjectUrlCache = new Map<string, string>();
  private readonly previewResourceUrlCache = new Map<string, SafeResourceUrl>();
  private viewingPdfObjectUrl: string | null = null;
  private printFrame: HTMLIFrameElement | null = null;
  private printObjectUrl: string | null = null;
  private feedbackDismissTimer: ReturnType<typeof setTimeout> | null = null;

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
      description: 'Mikro tarafindaki giden e-faturalari getirir.'
    },
    {
      value: 'EArsiv',
      label: 'E-Arsiv',
      description: 'E-arsiv tarafina dusen giden faturalari getirir.'
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
      value: 'Any',
      label: 'Genel Arama',
      placeholder: 'no, musteri, durum, zarf, mesaj',
      hint: 'Temel metin alanlari, tarih ve tutar uzerinde genel arama yapar.'
    },
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
    },
    {
      value: 'Status',
      label: 'Durum',
      placeholder: '1000 veya Onaylandi',
      hint: 'Durum aciklamasi, status code veya envelope status code icinde arama yapar.'
    },
    {
      value: 'InvoiceType',
      label: 'Fatura Tipi',
      placeholder: 'Temel',
      hint: 'Fatura tipi alaninda arama yapar.'
    },
    {
      value: 'EnvelopeIdentifier',
      label: 'Envelope',
      placeholder: 'urn:mail:...',
      hint: 'Envelope identifier icinde arama yapar.'
    },
    {
      value: 'OrderDocumentId',
      label: 'Siparis / Irsaliye',
      placeholder: 'IRS202600001',
      hint: 'Order document id icinde arama yapar.'
    },
    {
      value: 'Message',
      label: 'Mesaj',
      placeholder: 'Uyumsoft mesaj metni',
      hint: 'Uyumsoft mesaj alaninda arama yapar.'
    }
  ];

  protected readonly activeWorkspace = signal<WorkspaceMode>(this.initialWorkspace);
  protected readonly feedback = signal<PageFeedback | null>(null);

  protected readonly viewingQuickFilter = signal('');
  protected readonly viewingTableStateFilter = signal('all');
  protected readonly viewingTableTypeFilter = signal('');
  protected readonly viewingAmountMinFilter = signal<number | null>(null);
  protected readonly viewingAmountMaxFilter = signal<number | null>(null);
  protected readonly sendingQuickFilter = signal('');
  protected readonly viewingSort = signal<ViewingSortState>({
    key: 'invoiceDate',
    direction: 'desc'
  });
  protected readonly sendingSort = signal<SendingSortState>({
    key: 'documentDate',
    direction: 'desc'
  });

  protected readonly viewingList = signal<InvoiceViewingListResponseDto | null>(null);
  protected readonly viewingDetailDialogOpen = signal(false);
  protected readonly selectedViewingDocumentId = signal<string | null>(null);
  protected readonly viewingDetail = signal<InvoiceViewingDetailDto | null>(null);
  protected readonly viewingListLoading = signal(false);
  protected readonly viewingSyncLoading = signal(false);
  protected readonly viewingDetailLoading = signal(false);
  protected readonly viewingPdfLoading = signal(false);
  protected readonly viewingPdfDialogOpen = signal(false);
  protected readonly viewingPdfTitle = signal<string | null>(null);
  protected readonly viewingPdfUrl = signal<SafeResourceUrl | null>(null);
  protected readonly viewingRenderLoading = signal(false);
  protected readonly viewingRenderMode = signal<'default' | 'manual'>('default');
  protected readonly printedStateUpdatingDocumentId = signal<string | null>(null);
  protected readonly viewingPrintDocumentId = signal<string | null>(null);
  protected readonly viewingBulkPrintLoading = signal(false);
  protected readonly selectedViewingDocumentIds = signal<string[]>([]);

  protected readonly sendingList = signal<InvoiceSendingListResponseDto | null>(null);
  protected readonly sendingDetailDialogOpen = signal(false);
  protected readonly selectedSendingKey = signal<string | null>(null);
  protected readonly sendingDetail = signal<InvoiceSendingDetailDto | null>(null);
  protected readonly sendingListLoading = signal(false);
  protected readonly sendingDetailLoading = signal(false);
  protected readonly sendingRenderLoading = signal(false);
  protected readonly sendingRenderMode = signal<'default' | 'manual'>('default');
  protected readonly selectedSendingKeys = signal<string[]>([]);
  protected readonly sendingValidateLoading = signal(false);
  protected readonly sendingRequestLoading = signal(false);
  protected readonly lastValidateResponse = signal<ValidateInvoiceDocumentsResponseDto | null>(null);
  protected readonly lastSendResponse = signal<SendInvoiceDocumentsResponseDto | null>(null);
  protected readonly returnReferencePanelOpen = signal(false);
  protected readonly returnReferenceInvoiceContext = signal<InvoiceSendingListItemDto | null>(null);
  protected readonly returnReferenceCandidates =
    signal<InvoiceReturnReferenceCandidatesResponseDto | null>(null);
  protected readonly returnReferenceLoading = signal(false);
  protected readonly returnReferenceSavingKey = signal<string | null>(null);

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
  protected readonly viewingRenderForm = new FormGroup({
    profile: new FormControl<IInvoiceRenderProfileApiDto>('Auto', {
      nonNullable: true
    }),
    preferEmbeddedXslt: new FormControl<boolean | null>(null),
    fallbackToGeneral: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
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
    const hasAccess =
      this.initialWorkspace === 'viewing'
        ? this.canOpenViewingWorkspace()
        : this.canOpenSendingWorkspace();

    return hasAccess ? [this.initialWorkspace] : [];
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
    const stateFilter = this.viewingTableStateFilter();
    const typeFilter = this.normalizeText(this.viewingTableTypeFilter());
    const minAmount = this.viewingAmountMinFilter();
    const maxAmount = this.viewingAmountMaxFilter();

    const filteredItems = items.filter((item) => {
      const matchesSearch =
        !filter ||
        [
        item.documentId,
        item.invoiceId,
        item.customerTitle,
        item.customerTcknVkn,
        item.invoiceType,
        item.statusCode,
        item.status,
        item.envelopeIdentifier,
        item.envelopeStatusCode,
        item.message,
        item.orderDocumentId,
        item.documentCurrencyCode,
        item.invoiceTipType,
        item.despatchId,
        item.isStandard ? 'standart' : 'ozel tasarim',
        item.isProcessed ? 'islendi' : 'bekliyor',
        item.isPrinted ? 'yazdirildi' : 'yazdirilmadi',
        item.isArchived ? 'arsiv' : '',
        item.isSeen === true ? 'goruldu' : item.isSeen === false ? 'gorulmedi' : '',
        `${item.taxTotal}`,
        `${item.taxExclusiveAmount}`,
        `${item.exchangeRate}`,
        `${item.invoiceTotal}`
        ].some((value) => this.normalizeText(value).includes(filter));

      if (!matchesSearch) {
        return false;
      }

      if (typeFilter && this.normalizeText(item.invoiceType) !== typeFilter) {
        return false;
      }

      if (minAmount !== null && item.invoiceTotal < minAmount) {
        return false;
      }

      if (maxAmount !== null && item.invoiceTotal > maxAmount) {
        return false;
      }

      switch (stateFilter) {
        case 'processed':
          return item.isProcessed;
        case 'waiting':
          return !item.isProcessed;
        case 'printed':
          return item.isPrinted;
        case 'not-printed':
          return !item.isPrinted;
        case 'standard':
          return item.isStandard;
        case 'custom':
          return !item.isStandard;
        default:
          return true;
      }
    });

    return this.sortViewingItems(filteredItems, this.viewingSort());
  });
  protected readonly viewingTableStateOptions: ReadonlyArray<ViewingTableFilterOption> = [
    { value: 'all', label: 'Tum durumlar' },
    { value: 'processed', label: 'Islenenler' },
    { value: 'waiting', label: 'Bekleyenler' },
    { value: 'printed', label: 'Yazdirilanlar' },
    { value: 'not-printed', label: 'Yazdirilmayanlar' },
    { value: 'standard', label: 'Standart' },
    { value: 'custom', label: 'Ozel tasarim' }
  ];
  protected readonly viewingTypeOptions = computed(() => {
    const types = new Set(
      (this.viewingList()?.items ?? [])
        .map((item) => item.invoiceType?.trim())
        .filter((value): value is string => !!value)
    );

    return Array.from(types).sort((left, right) =>
      left.localeCompare(right, 'tr-TR', {
        numeric: true,
        sensitivity: 'base'
      })
    );
  });
  protected readonly hasViewingTableFilters = computed(
    () =>
      !!this.viewingQuickFilter() ||
      this.viewingTableStateFilter() !== 'all' ||
      !!this.viewingTableTypeFilter() ||
      this.viewingAmountMinFilter() !== null ||
      this.viewingAmountMaxFilter() !== null
  );
  protected readonly filteredSendingItems = computed(() => {
    const items = this.sendingList()?.items ?? [];
    const filter = this.normalizeText(this.sendingQuickFilter());
    const filteredItems = !filter
      ? items
      : items.filter((item) =>
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
            item.warehouseName,
            item.description,
            item.sourceLineSummary,
            item.taxRateSummary,
            `${item.sourceLineCount ?? ''}`,
            `${item.payableTotal}`
          ].some((value) => this.normalizeText(value).includes(filter))
        );

    return this.sortSendingItems(filteredItems, this.sendingSort());
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
        label: 'Liste Boyutu',
        value: `${items.length}`
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
        label: 'Gonderilmemis',
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
  protected readonly selectedViewingItems = computed(() => {
    const selectedIds = new Set(this.selectedViewingDocumentIds());

    return this.filteredViewingItems().filter((item) => selectedIds.has(item.documentId));
  });
  protected readonly selectableViewingItems = computed(() =>
    this.filteredViewingItems().filter((item) => !item.isPrinted)
  );
  protected readonly allVisibleViewingItemsSelected = computed(() => {
    const selectedIds = new Set(this.selectedViewingDocumentIds());
    const items = this.selectableViewingItems();

    return items.length > 0 && items.every((item) => selectedIds.has(item.documentId));
  });
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
  protected readonly filteredUnsentSendingItems = computed(() =>
    this.filteredSendingItems().filter((item) => !item.isSent)
  );
  protected readonly filteredAttentionSendingItems = computed(() =>
    this.filteredSendingItems().filter(
      (item) =>
        !item.isSent &&
        ((this.isReturnInvoice(item) && !this.hasReturnReference(item)) ||
          !this.hasReceiverAddress(item))
    )
  );
  protected readonly validateResponseMetrics = computed<ResponseMetric[]>(() => {
    const response = this.lastValidateResponse();

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
        label: 'Gecerli',
        value: `${response.validCount}`,
        tone: 'status-pill-success'
      },
      {
        label: 'Gecersiz',
        value: `${response.invalidCount}`,
        tone: response.invalidCount > 0 ? 'status-pill-danger' : 'status-pill-neutral'
      }
    ];
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
  constructor() {
    effect(() => this.scheduleFeedbackDismiss(this.feedback()));

    this.destroyRef.onDestroy(() => {
      this.clearFeedbackDismissTimer();
      this.releasePreviewUrls();
      this.releaseViewingPdfUrl();
    });

    if (this.activeWorkspace() === 'viewing' && this.canViewList()) {
      this.loadViewingList();
    }

    if (this.activeWorkspace() === 'sending' && this.canSendList()) {
      this.loadSendingList();
    }
  }

  protected applyViewingFilters(): void {
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
    const hasSearch = !!searchText;

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
        searchText: hasSearch ? searchText : null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingListLoading.set(false))
      )
      .subscribe({
        next: (response: InvoiceViewingListResponseDto) => {
          this.viewingList.set(response);
          this.pruneViewingSelection(response);

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
      searchText: ''
    });
    this.clearViewingTableFilters();
    this.viewingQuickFilter.set('');
  }

  protected setViewingQuickFilter(event: Event): void {
    this.viewingQuickFilter.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected setViewingTableStateFilter(event: Event): void {
    this.viewingTableStateFilter.set((event.target as HTMLSelectElement | null)?.value || 'all');
  }

  protected setViewingTableTypeFilter(event: Event): void {
    this.viewingTableTypeFilter.set((event.target as HTMLSelectElement | null)?.value || '');
  }

  protected setViewingAmountMinFilter(event: Event): void {
    this.viewingAmountMinFilter.set(this.readNullableNumber(event));
  }

  protected setViewingAmountMaxFilter(event: Event): void {
    this.viewingAmountMaxFilter.set(this.readNullableNumber(event));
  }

  protected clearViewingTableFilters(): void {
    this.viewingQuickFilter.set('');
    this.viewingTableStateFilter.set('all');
    this.viewingTableTypeFilter.set('');
    this.viewingAmountMinFilter.set(null);
    this.viewingAmountMaxFilter.set(null);
  }

  protected setViewingSort(key: ViewingSortKey): void {
    this.viewingSort.update((currentSort) => {
      if (currentSort.key !== key) {
        return {
          key,
          direction: 'asc'
        };
      }

      if (currentSort.direction === 'asc') {
        return {
          key,
          direction: 'desc'
        };
      }

      return {
        key: null,
        direction: null
      };
    });
  }

  protected getViewingSortIndicator(key: ViewingSortKey): string {
    const sort = this.viewingSort();

    if (sort.key !== key) {
      return '';
    }

    return sort.direction === 'asc' ? '^' : 'v';
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

  protected closeViewingPdfDialog(): void {
    this.viewingPdfDialogOpen.set(false);
    this.viewingPdfTitle.set(null);
    this.viewingPdfUrl.set(null);
    this.releaseViewingPdfUrl();
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

    const documentId = summary.documentId?.trim();

    if (!documentId) {
      this.feedback.set({
        tone: 'error',
        title: 'PDF anahtari yok',
        message: 'Satirin teknik Uyumsoft UUID bilgisi bulunmadigi icin PDF acilamaz.'
      });
      return;
    }

    this.viewingPdfLoading.set(true);

    this.faturaIslemleriService
      .getInvoiceViewingPdf(documentId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.viewingPdfLoading.set(false))
      )
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfBlobInDialog(blob, summary.invoiceId);

          this.feedback.set({
            tone: 'success',
            title: 'PDF hazirlandi',
            message: `${summary.invoiceId} resmi PDF olarak fatura goruntuleme endpointinden acildi.`
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

  protected handleViewingPrintedAction(item: InvoiceViewingListItemDto): void {
    if (item.isPrinted) {
      this.updateInvoicePrintedState(item, false, 'detail-panel');
      return;
    }

    void this.printViewingInvoice(item);
  }

  protected async printViewingInvoice(item: InvoiceViewingListItemDto | null): Promise<void> {
    if (!item || item.isPrinted) {
      return;
    }

    if (!this.canViewDetail() || !this.canUpdatePrinted()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki gerekli',
        message: 'Faturayi yazdirip isaretlemek icin detail ve update yetkileri gerekiyor.'
      });
      return;
    }

    this.viewingPrintDocumentId.set(item.documentId);
    this.printedStateUpdatingDocumentId.set(item.documentId);

    try {
      await this.printAndMarkViewingInvoice(item, 'direct-print-single');
      this.feedback.set({
        tone: 'success',
        title: 'Yazdirma kuyruguna gonderildi',
        message: `${item.invoiceId} yazdirildi olarak isaretlendi.`
      });
    } catch (error) {
      this.feedback.set({
        tone: 'error',
        title: 'Yazdirma tamamlanamadi',
        message: this.resolveErrorMessage(error, `${item.invoiceId} icin PDF yazdirilamadi.`)
      });
    } finally {
      this.viewingPrintDocumentId.set(null);
      this.printedStateUpdatingDocumentId.set(null);
    }
  }

  protected async printSelectedViewingInvoices(): Promise<void> {
    const items = this.selectedViewingItems().filter((item) => !item.isPrinted);

    if (!items.length || this.viewingBulkPrintLoading()) {
      return;
    }

    if (!this.canViewDetail() || !this.canUpdatePrinted()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki gerekli',
        message: 'Toplu yazdirma icin detail ve update yetkileri gerekiyor.'
      });
      return;
    }

    this.viewingBulkPrintLoading.set(true);

    const failedInvoices: string[] = [];

    for (const item of items) {
      this.viewingPrintDocumentId.set(item.documentId);
      this.printedStateUpdatingDocumentId.set(item.documentId);

      try {
        await this.printAndMarkViewingInvoice(item, 'direct-print-bulk');
      } catch {
        failedInvoices.push(item.invoiceId || item.documentId);
      }
    }

    this.viewingPrintDocumentId.set(null);
    this.printedStateUpdatingDocumentId.set(null);
    this.viewingBulkPrintLoading.set(false);

    if (failedInvoices.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Toplu yazdirma eksik tamamladi',
        message: `${items.length - failedInvoices.length}/${items.length} fatura yazdirildi. Hata: ${failedInvoices.join(', ')}`
      });
      return;
    }

    this.clearViewingSelection();
    this.feedback.set({
      tone: 'success',
      title: 'Toplu yazdirma tamamlandi',
      message: `${items.length} fatura yazdirildi olarak isaretlendi.`
    });
  }

  protected toggleViewingItemSelection(
    item: InvoiceViewingListItemDto,
    checked: boolean
  ): void {
    const currentSelection = new Set(this.selectedViewingDocumentIds());

    if (checked) {
      currentSelection.add(item.documentId);
    } else {
      currentSelection.delete(item.documentId);
    }

    this.selectedViewingDocumentIds.set(Array.from(currentSelection));
  }

  protected toggleAllVisibleViewingSelection(checked: boolean): void {
    if (!checked) {
      this.selectedViewingDocumentIds.set([]);
      return;
    }

    this.selectedViewingDocumentIds.set(
      this.selectableViewingItems().map((item) => item.documentId)
    );
  }

  protected clearViewingSelection(): void {
    this.selectedViewingDocumentIds.set([]);
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
      this.lastValidateResponse.set(null);
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
          this.lastValidateResponse.set(null);
          this.lastSendResponse.set(null);
          this.returnReferencePanelOpen.set(false);
          this.returnReferenceInvoiceContext.set(null);
          this.returnReferenceCandidates.set(null);
          this.returnReferenceSavingKey.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Gonderim listesi yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Giden fatura listesi su anda getirilemedi.'
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
    this.lastValidateResponse.set(null);
    this.lastSendResponse.set(null);
    this.returnReferencePanelOpen.set(false);
    this.returnReferenceInvoiceContext.set(null);
    this.returnReferenceCandidates.set(null);
    this.returnReferenceSavingKey.set(null);
  }

  protected setSendingQuickFilter(event: Event): void {
    this.sendingQuickFilter.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected dismissFeedback(): void {
    this.feedback.set(null);
  }

  protected changeSendingSort(key: SendingSortKey): void {
    this.sendingSort.update((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  protected getSendingSortIndicator(key: SendingSortKey): string {
    const sort = this.sendingSort();

    if (sort.key !== key) {
      return '';
    }

    return sort.direction === 'asc' ? ' ^' : ' v';
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
              'Secili giden fatura yeni render ayarlariyla gosterilemedi.'
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

  protected selectFilteredUnsentInvoices(): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Secim yetkisi gerekli',
        message: 'Toplu gonderim kuyrugu icin create yetkisi gerekiyor.'
      });
      return;
    }

    const keys = this.filteredUnsentSendingItems().map((item) =>
      this.buildSendingKey(item.documentSerie, item.documentOrderNo)
    );

    if (keys.length === 0) {
      this.feedback.set({
        tone: 'info',
        title: 'Secilecek bekleyen belge yok',
        message: 'Mevcut filtrede gonderilmemis fatura bulunmuyor.'
      });
      return;
    }

    this.selectedSendingKeys.set(keys);
  }

  protected validateSelectedInvoices(): void {
    this.validateSendingDocuments(this.selectedSendingItems());
  }

  protected sendSelectedInvoices(): void {
    this.submitSendingDocuments(this.selectedSendingItems());
  }

  protected validateCurrentInvoice(summary: InvoiceSendingListItemDto | null): void {
    if (!summary) {
      return;
    }

    this.validateSendingDocuments([summary]);
  }

  protected sendCurrentInvoice(summary: InvoiceSendingListItemDto | null): void {
    if (!summary) {
      return;
    }

    this.submitSendingDocuments([summary]);
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

  protected canPreviewSendingInvoice(
    summary: InvoiceSendingListItemDto | null | undefined
  ): boolean {
    return !!summary?.documentSerie?.trim() && typeof summary.documentOrderNo === 'number';
  }

  protected isReturnInvoice(item: InvoiceSendingListItemDto | null | undefined): boolean {
    return (item?.invoiceTypeCode ?? '').trim().toUpperCase() === 'IADE';
  }

  protected hasReturnReference(item: InvoiceSendingListItemDto | null | undefined): boolean {
    return !!item?.returnInvoiceNo?.trim();
  }

  protected hasReceiverAddress(item: InvoiceSendingListItemDto | null | undefined): boolean {
    return !!item?.targetAlias?.trim();
  }

  protected getReceiverAddressLabel(item: InvoiceSendingListItemDto | null | undefined): string {
    return item?.targetAlias?.trim() || 'Alici yok';
  }

  protected getReturnReferenceLabel(item: InvoiceSendingListItemDto): string {
    if (!this.isReturnInvoice(item)) {
      return '-';
    }

    return item.returnInvoiceNo?.trim() || 'Referans gerekli';
  }

  protected getSourceLineCountLabel(item: InvoiceSendingListItemDto): string {
    const count = item.sourceLineCount ?? null;

    if (count === null || count === undefined) {
      return '-';
    }

    return `${count} satir`;
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

  protected formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected isViewingCardSelected(item: InvoiceViewingListItemDto): boolean {
    return item.documentId === this.selectedViewingDocumentId();
  }

  protected isViewingItemSelected(item: InvoiceViewingListItemDto): boolean {
    return this.selectedViewingDocumentIds().includes(item.documentId);
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
  protected readonly trackByStat = (_index: number, stat: HeroStat): string => stat.label;
  protected readonly trackByMetric = (_index: number, metric: SummaryMetric): string =>
    metric.label;
  protected readonly trackByResponseMetric = (
    _index: number,
    metric: ResponseMetric
  ): string => metric.label;
  protected readonly trackByValidateResponseItem = (
    _index: number,
    item: ValidateInvoiceDocumentsResponseDto['items'][number]
  ): string => this.buildSendingKey(item.documentSerie, item.documentOrderNo);
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

  private openPdfBlobInDialog(blob: Blob, invoiceId: string): void {
    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], {
            type: 'application/pdf'
          });

    this.releaseViewingPdfUrl();

    const objectUrl = URL.createObjectURL(pdfBlob);
    this.viewingPdfObjectUrl = objectUrl;
    this.viewingPdfTitle.set(invoiceId?.trim() || 'Fatura PDF');
    this.viewingPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
    this.viewingPdfDialogOpen.set(true);
  }

  private async printAndMarkViewingInvoice(
    item: InvoiceViewingListItemDto,
    source: string
  ): Promise<void> {
    const invoiceUuid = item.documentId?.trim();

    if (!invoiceUuid) {
      throw new Error('Satirin teknik Uyumsoft UUID bilgisi bulunamadi.');
    }

    const blob = await firstValueFrom(
      this.faturaIslemleriService.getInvoiceViewingPdf(invoiceUuid)
    );

    await this.printPdfBlob(blob, item.invoiceId);

    const response = await firstValueFrom(
      this.faturaIslemleriService.updateInvoiceViewingPrintedState(item.documentId, {
        isPrinted: true,
        source
      })
    );

    this.mergeViewingSummary(response.summary);
  }

  private printPdfBlob(blob: Blob, invoiceId: string): Promise<void> {
    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], {
            type: 'application/pdf'
          });

    this.releasePrintFrame();

    const objectUrl = URL.createObjectURL(pdfBlob);
    const frame = document.createElement('iframe');
    this.printObjectUrl = objectUrl;
    this.printFrame = frame;

    frame.title = invoiceId?.trim() || 'Fatura PDF';
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.src = objectUrl;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let fallbackTimer = 0;
      let printDelayTimer = 0;
      let loadTimeoutTimer = 0;
      const cleanup = () => {
        frame.onload = null;
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(printDelayTimer);
        window.clearTimeout(loadTimeoutTimer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };
      const handleAfterPrint = () => finish();

      loadTimeoutTimer = window.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new Error('PDF yazdirma alani zamaninda yuklenemedi.'));
      }, 15000);

      frame.onload = () => {
        printDelayTimer = window.setTimeout(() => {
          try {
            window.addEventListener('afterprint', handleAfterPrint, { once: true });
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
            fallbackTimer = window.setTimeout(finish, 2500);
          } catch (error) {
            cleanup();
            reject(error);
          }
        }, 650);
      };

      document.body.appendChild(frame);
    }).finally(() => {
      window.setTimeout(() => this.releasePrintFrame(), 1500);
    });
  }

  private releasePrintFrame(): void {
    if (this.printFrame?.parentNode) {
      this.printFrame.parentNode.removeChild(this.printFrame);
    }

    this.printFrame = null;

    if (this.printObjectUrl) {
      URL.revokeObjectURL(this.printObjectUrl);
      this.printObjectUrl = null;
    }
  }

  private releaseViewingPdfUrl(): void {
    if (!this.viewingPdfObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.viewingPdfObjectUrl);
    this.viewingPdfObjectUrl = null;
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
            title: 'Giden fatura yuklenemedi',
            message: this.resolveErrorMessage(
              error,
              'Secilen giden fatura icin UBL onizleme getirilemedi.'
            )
          });
        }
      });
  }

  private validateSendingDocuments(documents: InvoiceSendingListItemDto[]): void {
    if (!this.canSendCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Kontrol yetkisi gerekli',
        message: 'Gonderim oncesi kontrol icin create yetkisi gerekiyor.'
      });
      return;
    }

    const request = this.buildSendingDocumentsRequest(documents);

    if (!request) {
      this.feedback.set({
        tone: 'info',
        title: 'Kontrol edilecek belge secilmedi',
        message: 'Gonderim oncesi kontrol icin en az bir gonderilmemis belge secmelisin.'
      });
      return;
    }

    this.sendingValidateLoading.set(true);
    this.lastValidateResponse.set(null);
    this.lastSendResponse.set(null);

    this.faturaIslemleriService
      .validateInvoiceDocuments(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingValidateLoading.set(false))
      )
      .subscribe({
        next: (response: ValidateInvoiceDocumentsResponseDto) => {
          this.lastValidateResponse.set(response);
          this.feedback.set({
            tone: response.invalidCount > 0 ? 'info' : 'success',
            title:
              response.invalidCount > 0
                ? 'Kontrol tamamlandi, gecersiz belge var'
                : 'Gonderim oncesi kontrol basarili',
            message: `${response.validCount} gecerli, ${response.invalidCount} gecersiz sonuc dondu.`
          });
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set({
            tone: 'error',
            title: 'Gonderim oncesi kontrol calismadi',
            message: this.resolveErrorMessage(
              error,
              'Secili bekleyen faturalar icin validate endpointi calismadi.'
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

    const request = this.buildSendingDocumentsRequest(unsentDocuments);

    if (!request) {
      return;
    }

    this.sendingRequestLoading.set(true);
    this.lastValidateResponse.set(null);
    this.lastSendResponse.set(null);

    this.faturaIslemleriService
      .validateInvoiceDocuments(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((validationResponse: ValidateInvoiceDocumentsResponseDto) => {
          this.lastValidateResponse.set(validationResponse);

          if (validationResponse.invalidCount > 0) {
            this.feedback.set({
              tone: 'error',
              title: 'Gonderim durduruldu',
              message: `${validationResponse.invalidCount} belge validate kontrolunden gecemedi. Canli gonderim baslatilmadi.`
            });
            return of(null);
          }

          return this.faturaIslemleriService.sendInvoiceDocuments(request);
        }),
        finalize(() => this.sendingRequestLoading.set(false))
      )
      .subscribe({
        next: (response: SendInvoiceDocumentsResponseDto | null) => {
          if (!response) {
            return;
          }

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

  private buildSendingDocumentsRequest(
    documents: InvoiceSendingListItemDto[]
  ): SendInvoiceDocumentsRequestDto | null {
    const unsentDocuments = documents.filter((item) => !item.isSent);

    if (unsentDocuments.length === 0) {
      return null;
    }

    return {
      scenario: this.resolveSendingScenario(unsentDocuments[0].scenario),
      documents: unsentDocuments.map((item) => ({
        documentSerie: item.documentSerie,
        documentOrderNo: item.documentOrderNo
      }))
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
    if (summary.isPrinted) {
      this.selectedViewingDocumentIds.set(
        this.selectedViewingDocumentIds().filter((documentId) => documentId !== summary.documentId)
      );
    }

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

  private pruneViewingSelection(response: InvoiceViewingListResponseDto): void {
    const validIds = new Set(
      response.items.filter((item) => !item.isPrinted).map((item) => item.documentId)
    );

    this.selectedViewingDocumentIds.set(
      this.selectedViewingDocumentIds().filter((documentId) => validIds.has(documentId))
    );
  }

  private sortViewingItems(
    items: InvoiceViewingListItemDto[],
    sort: ViewingSortState
  ): InvoiceViewingListItemDto[] {
    if (!sort.key || !sort.direction) {
      return [...items];
    }

    const sortKey = sort.key;
    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...items].sort((left, right) => {
      const result = this.compareSendingSortValue(
        this.getViewingSortValue(left, sortKey),
        this.getViewingSortValue(right, sortKey)
      );

      if (result !== 0) {
        return result * direction;
      }

      return this.compareSendingSortValue(left.invoiceId, right.invoiceId);
    });
  }

  private getViewingSortValue(
    item: InvoiceViewingListItemDto,
    key: ViewingSortKey
  ): string | number | boolean | null {
    switch (key) {
      case 'invoiceId':
        return item.invoiceId;
      case 'despatchId':
        return item.despatchId;
      case 'customerTitle':
        return item.customerTitle;
      case 'invoiceDate':
        return item.invoiceDate ? new Date(item.invoiceDate).getTime() : null;
      case 'invoiceType':
        return item.invoiceType;
      case 'status':
        return `${item.isProcessed ? '1' : '0'}|${item.statusCode ?? ''}|${item.status ?? ''}`;
      case 'invoiceTotal':
        return item.invoiceTotal;
      case 'isPrinted':
        return item.isPrinted;
    }
  }

  private sortSendingItems(
    items: InvoiceSendingListItemDto[],
    sort: SendingSortState
  ): InvoiceSendingListItemDto[] {
    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...items].sort((left, right) => {
      const result = this.compareSendingSortValue(
        this.getSendingSortValue(left, sort.key),
        this.getSendingSortValue(right, sort.key)
      );

      if (result !== 0) {
        return result * direction;
      }

      return this.compareSendingSortValue(left.invoiceId, right.invoiceId);
    });
  }

  private getSendingSortValue(
    item: InvoiceSendingListItemDto,
    key: SendingSortKey
  ): string | number | boolean | null {
    switch (key) {
      case 'invoiceId':
        return item.invoiceId;
      case 'customerTitle':
        return item.customerTitle;
      case 'documentDate':
        return item.documentDate ? new Date(item.documentDate).getTime() : null;
      case 'isSent':
        return item.isSent;
      case 'scenario':
        return this.getScenarioLabel(item.scenario);
      case 'profile':
        return item.invoiceProfileId;
      case 'sourceLine':
        return item.sourceLineCount ?? item.sourceLineSummary ?? null;
      case 'taxRate':
        return item.taxRateSummary ?? null;
      case 'returnReference':
        return this.isReturnInvoice(item) ? this.getReturnReferenceLabel(item) : '';
      case 'payableTotal':
        return item.payableTotal;
    }
  }

  private compareSendingSortValue(
    left: string | number | boolean | null | undefined,
    right: string | number | boolean | null | undefined
  ): number {
    if (left === right) {
      return 0;
    }

    if (left === null || left === undefined || left === '') {
      return 1;
    }

    if (right === null || right === undefined || right === '') {
      return -1;
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return Number(left) - Number(right);
    }

    return String(left).localeCompare(String(right), 'tr-TR', {
      numeric: true,
      sensitivity: 'base'
    });
  }

  private readNullableNumber(event: Event): number | null {
    const rawValue = (event.target as HTMLInputElement | null)?.value.trim() ?? '';

    if (!rawValue) {
      return null;
    }

    const parsedValue = Number(rawValue.replace(',', '.'));

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private buildSendingKey(documentSerie: string, documentOrderNo: number): string {
    return `${documentSerie}|${documentOrderNo}`;
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

  private scheduleFeedbackDismiss(feedback: PageFeedback | null): void {
    this.clearFeedbackDismissTimer();

    if (!feedback) {
      return;
    }

    const timeoutMs = feedback.tone === 'error' ? 8000 : 5000;

    this.feedbackDismissTimer = setTimeout(() => {
      if (this.feedback() === feedback) {
        this.feedback.set(null);
      }
    }, timeoutMs);
  }

  private clearFeedbackDismissTimer(): void {
    if (!this.feedbackDismissTimer) {
      return;
    }

    clearTimeout(this.feedbackDismissTimer);
    this.feedbackDismissTimer = null;
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

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    const httpError = error as HttpErrorResponse;

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error;
    }

    if (typeof httpError.error === 'object' && httpError.error !== null) {
      const problem = httpError.error as Record<string, unknown>;
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
