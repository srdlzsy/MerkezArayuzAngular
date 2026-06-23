import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, switchMap, takeWhile, timer } from 'rxjs';
import type {
  IAxataInboundAtfCompanyReceivingBatchRequestApiDto,
  IAxataInboundAtfCompanyReceivingRequestApiDto,
  IAxataIntegrationAuditOperationApiDto,
  IAxataAuditOutboundDeliveryApiDto,
  IAxataOrderLifecycleApiDto,
  IAxataOrderRecommendedActionApiDto,
  IAxataManualIncomingCompanyReceivingBatchRequestApiDto,
  IAxataManualIncomingCompanyReceivingRequestApiDto,
  IAxataManualIncomingInventoryCountBatchRequestApiDto,
  IAxataManualIncomingInventoryCountRequestApiDto,
  IAxataOutboundDeliveryBatchRequestApiDto,
  IAxataOutboundDeliveryByDateItemApiDto,
  IAxataOutboundDeliveryDocumentImportExecuteRequestApiDto,
  IAxataOutboundDeliveryImportExecuteRequestApiDto,
  IAxataOutboundDeliveryQueueDocumentApiDto,
  IAxataOutboundDeliveryRequestApiDto,
  IAxataPendingOutboundDeliveryApiDto,
  IAxataProductSynchronizationItemApiDto,
  IAxataProductSynchronizationResultApiDto,
  IAxataSentWarehouseOrderMissingShipmentApiDto,
  IAxataExecutionMode,
  IAxataSynchronizationFetchProfileApiDto,
  IAxataSynchronizationJobApiDto,
  IAxataSynchronizationJobArtifactApiDto,
  IAxataSynchronizationManualDocumentBatchRequestApiDto,
  IAxataSynchronizationManualDocumentCandidateItemApiDto,
  IAxataSynchronizationManualDocumentItemApiDto,
  IAxataSynchronizationProbeApiDto,
  IAxataSynchronizationPreviewItemApiDto,
  IAxataSynchronizationTaskApiDto,
  IAxataUnsyncedWarehouseOrderApiDto,
  IFurpaAcceptWarehouseReceivingRequestApiDto
} from '@interfaces';

import {
  AxataInboundAtfCompanyReceivingBatchResponseDto,
  AxataInboundAtfCompanyReceivingResponseDto,
  AxataIntegrationAuditDto,
  AxataManualIncomingCompanyReceivingBatchResponseDto,
  AxataManualIncomingCompanyReceivingResponseDto,
  AxataManualIncomingInventoryCountBatchResponseDto,
  AxataManualIncomingInventoryCountResponseDto,
  AxataManualOutboundDeliveryBatchResponseDto,
  AxataManualIncomingWarehouseReceivingAcceptResponseDto,
  AxataManualIncomingWarehouseReceivingBatchResponseDto,
  AxataManualIncomingWarehouseReceivingDetailDto,
  AxataManualIncomingWarehouseReceivingListItemDto,
  AxataOutboundDeliveriesByDateDto,
  AxataOutboundDeliveryImportExecuteDto,
  AxataOutboundDeliveryImportPreviewDto,
  AxataOutboundDeliveryQueuePreviewDto,
  AxataOutboundDeliveryResponseDto,
  AxataProductSynchronizationExecuteDto,
  AxataProductSynchronizationPreviewDto,
  AxataSynchronizationFetchProfilesOverviewDto,
  AxataSynchronizationHealthDto,
  AxataSynchronizationJobDetailDto,
  AxataSynchronizationJobDto,
  AxataSynchronizationManualDispatchBatchDto,
  AxataSynchronizationManualDispatchDto,
  AxataSynchronizationManualDocumentBatchDto,
  AxataSynchronizationManualDocumentCandidatesDto,
  AxataSynchronizationManualDocumentDto,
  AxataSynchronizationOverviewDto,
  AxataSynchronizationTaskPreviewDto,
  EntegrasyonIslemleriService,
  isAxataJobTerminalStatus
} from '../../../../../core/api/module-services/entegrasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type FeedbackTone = 'success' | 'error' | 'info';
type AxataQueueMovementType = 'C02' | 'C03' | 'C4';
type AuditInsightTone = 'success' | 'warn' | 'danger' | 'neutral';
type AxataFlowAction = 'products' | 'manual' | 'incoming' | 'queue' | 'technical';

interface PageFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface AuditInsightCard {
  label: string;
  value: string;
  detail: string;
  tone: AuditInsightTone;
}

interface AxataFlowCard {
  title: string;
  label: string;
  description: string;
  actionText: string;
  action: AxataFlowAction;
  tone: AuditInsightTone;
}

interface MissingShipmentVisibleSummary {
  documentCount: number;
  missingLineCount: number;
  missingQuantity: number;
  linkedLineCount: number;
  totalLineCount: number;
}

interface MissingShipmentWarehouseGroup extends MissingShipmentVisibleSummary {
  warehouseNo: number;
  totalQuantity: number;
}

interface ShipmentDifferenceVisibleSummary {
  documentCount: number;
  differenceLineCount: number;
  differenceQuantity: number;
  linkedLineCount: number;
  totalLineCount: number;
}

interface IncomingWarehouseLineDraft {
  movementGuid: string;
  stockCode: string;
  stockName: string;
  shippedQuantity: number;
  receivedQuantity: number;
}

interface IncomingWarehouseBatchQueueItem {
  reference: string;
  documentSerie: string;
  documentOrderNo: number;
  allowDiscrepancy: boolean;
  lines: IFurpaAcceptWarehouseReceivingRequestApiDto['lines'];
}

const DEFAULT_TASK_CODE = 'product-master-sync';
const DEFAULT_EXECUTION_MODE: IAxataExecutionMode = 'DryRun';
const DOCUMENT_TASK_CODES = new Set([
  'issued-warehouse-order-sync',
  'company-receiving-sync',
  'inventory-count-sync'
]);

@Component({
  selector: 'app-axata-senkronizasyonu-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './axata-senkronizasyonu-list.component.html',
  styleUrl: './axata-senkronizasyonu-list.component.scss'
})
export class AxataSenkronizasyonuListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['axata-senkronizasyonu'];
  protected readonly executionModes: readonly IAxataExecutionMode[] = ['DryRun', 'Outbox'];
  protected readonly productExecutionModes: readonly IAxataExecutionMode[] = ['DryRun', 'Outbox'];
  protected readonly queueMovementTypes = ['C02', 'C03', 'C4'] as const;
  protected readonly overview = signal<AxataSynchronizationOverviewDto | null>(null);
  protected readonly health = signal<AxataSynchronizationHealthDto | null>(null);
  protected readonly fetchProfiles = signal<AxataSynchronizationFetchProfilesOverviewDto | null>(null);
  protected readonly audit = signal<AxataIntegrationAuditDto | null>(null);
  protected readonly preview = signal<AxataSynchronizationTaskPreviewDto | null>(null);
  protected readonly activeJob = signal<AxataSynchronizationJobDetailDto | null>(null);
  protected readonly manualCandidates =
    signal<AxataSynchronizationManualDocumentCandidatesDto | null>(null);
  protected readonly manualDocumentResult =
    signal<AxataSynchronizationManualDocumentDto | null>(null);
  protected readonly manualDispatchResult =
    signal<AxataSynchronizationManualDispatchDto | null>(null);
  protected readonly manualDispatchBatchResult =
    signal<AxataSynchronizationManualDispatchBatchDto | null>(null);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly selectedTab = signal<'tasks' | 'monitor' | 'manual' | 'incoming'>('tasks');
  protected readonly overviewLoading = signal(false);
  protected readonly healthLoading = signal(false);
  protected readonly fetchProfilesLoading = signal(false);
  protected readonly auditLoading = signal(false);
  protected readonly previewLoading = signal(false);
  protected readonly executeLoading = signal(false);
  protected readonly manualLoading = signal(false);
  protected readonly dispatchLoading = signal(false);
  protected readonly candidateLoading = signal(false);
  protected readonly batchLoading = signal(false);
  protected readonly incomingCompanyLoading = signal(false);
  protected readonly incomingInventoryLoading = signal(false);
  protected readonly incomingWarehouseLoading = signal(false);
  protected readonly incomingWarehouseDetailLoading = signal(false);
  protected readonly incomingWarehouseAcceptLoading = signal(false);
  protected readonly axataOutboundLoading = signal(false);
  protected readonly axataInboundAtfLoading = signal(false);
  protected readonly queuePreviewLoading = signal(false);
  protected readonly outboundDeliveriesByDateLoading = signal(false);
  protected readonly c01PreviewLoading = signal(false);
  protected readonly c01ImportLoading = signal(false);
  protected readonly c01DocumentRescueLoading = signal(false);
  protected readonly genericJobLoading = signal(false);
  protected readonly productPreviewLoading = signal(false);
  protected readonly productDispatchLoading = signal(false);

  protected readonly form = new FormGroup({
    taskCode: new FormControl<string>(DEFAULT_TASK_CODE, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(null),
    take: new FormControl<number>(10, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(100)]
    }),
    executionMode: new FormControl<IAxataExecutionMode>(DEFAULT_EXECUTION_MODE, {
      nonNullable: true
    }),
    candidateStartDate: new FormControl<string>(this.getRelativeDate(6), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    candidateEndDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    candidateSkip: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.min(0)]
    }),
    candidateTake: new FormControl<number>(25, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(100)]
    }),
    manualDocumentSerie: new FormControl<string>('', {
      nonNullable: true
    }),
    manualDocumentOrderNo: new FormControl<number | null>(null),
    manualDocumentNo: new FormControl<number | null>(null),
    manualDocumentDate: new FormControl<string>(this.getToday(), {
      nonNullable: true
    })
  });
  protected readonly batchForm = new FormGroup({
    continueOnError: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly productSynchronizationForm = new FormGroup({
    productCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)]
    }),
    productCodes: new FormControl<string>('', {
      nonNullable: true
    }),
    take: new FormControl<number>(20, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(100000)]
    }),
    continueOnError: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly auditForm = new FormGroup({
    startDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(null),
    documentSerie: new FormControl<string>('', {
      nonNullable: true
    }),
    documentOrderNo: new FormControl<number | null>(null),
    statuses: new FormControl<string>('0,1', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    take: new FormControl<number>(50, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(200)]
    })
  });
  protected readonly incomingJsonForm = new FormGroup({
    companyReceivingJson: new FormControl<string>(this.getManualIncomingCompanyReceivingTemplate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    companyReceivingBatchJson: new FormControl<string>(
      this.getManualIncomingCompanyReceivingBatchTemplate(),
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    ),
    inventoryCountJson: new FormControl<string>(this.getManualIncomingInventoryCountTemplate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    inventoryCountBatchJson: new FormControl<string>(
      this.getManualIncomingInventoryCountBatchTemplate(),
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    )
  });
  protected readonly axataBridgeForm = new FormGroup({
    outboundDeliveryJson: new FormControl<string>(this.getAxataOutboundDeliveryTemplate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    outboundDeliveryBatchJson: new FormControl<string>(
      this.getAxataOutboundDeliveryBatchTemplate(),
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    ),
    inboundAtfJson: new FormControl<string>(this.getAxataInboundAtfCompanyReceivingTemplate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    inboundAtfBatchJson: new FormControl<string>(
      this.getAxataInboundAtfCompanyReceivingBatchTemplate(),
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    )
  });
  protected readonly c01ImportForm = new FormGroup({
    take: new FormControl<number>(20, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(200)]
    }),
    continueOnError: new FormControl<boolean>(true, {
      nonNullable: true
    }),
    acknowledge: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly c01DocumentRescueForm = new FormGroup({
    documentSerie: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentOrderNo: new FormControl<number | null>(null, {
      validators: [Validators.min(0)]
    }),
    status: new FormControl<string>('', {
      nonNullable: true
    }),
    acknowledge: new FormControl<boolean>(false, {
      nonNullable: true
    })
  });
  protected readonly queuePreviewForm = new FormGroup({
    movementType: new FormControl<AxataQueueMovementType>('C02', {
      nonNullable: true
    }),
    take: new FormControl<number>(20, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(200)]
    })
  });
  protected readonly outboundDeliveriesByDateForm = new FormGroup({
    date: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    })
  });
  protected readonly incomingWarehouseForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(null),
    startDate: new FormControl<string>(this.getRelativeDate(6), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    detailSerie: new FormControl<string>('', {
      nonNullable: true
    }),
    detailOrderNo: new FormControl<number | null>(null),
    allowDiscrepancy: new FormControl<boolean>(false, {
      nonNullable: true
    }),
    continueOnError: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly entegrasyonIslemleriService = inject(EntegrasyonIslemleriService);
  protected readonly selectedTaskCode = signal(this.form.controls.taskCode.value);
  protected readonly selectedBatchDocuments = signal<IAxataSynchronizationManualDocumentItemApiDto[]>([]);
  protected readonly batchResult = signal<AxataSynchronizationManualDocumentBatchDto | null>(null);
  protected readonly incomingCompanyReceivingResult =
    signal<AxataManualIncomingCompanyReceivingResponseDto | null>(null);
  protected readonly incomingCompanyReceivingBatchResult =
    signal<AxataManualIncomingCompanyReceivingBatchResponseDto | null>(null);
  protected readonly incomingInventoryCountResult =
    signal<AxataManualIncomingInventoryCountResponseDto | null>(null);
  protected readonly incomingInventoryCountBatchResult =
    signal<AxataManualIncomingInventoryCountBatchResponseDto | null>(null);
  protected readonly axataOutboundResult =
    signal<AxataOutboundDeliveryResponseDto | null>(null);
  protected readonly axataOutboundBatchResult =
    signal<AxataManualOutboundDeliveryBatchResponseDto | null>(null);
  protected readonly axataInboundAtfResult =
    signal<AxataInboundAtfCompanyReceivingResponseDto | null>(null);
  protected readonly axataInboundAtfBatchResult =
    signal<AxataInboundAtfCompanyReceivingBatchResponseDto | null>(null);
  protected readonly c01OutboundDeliveryPreview =
    signal<AxataOutboundDeliveryImportPreviewDto | null>(null);
  protected readonly c01OutboundDeliveryImportResult =
    signal<AxataOutboundDeliveryImportExecuteDto | null>(null);
  protected readonly c01DocumentRescuePreview =
    signal<AxataOutboundDeliveryImportPreviewDto | null>(null);
  protected readonly c01DocumentRescueImportResult =
    signal<AxataOutboundDeliveryImportExecuteDto | null>(null);
  protected readonly outboundDeliveryQueuePreview =
    signal<AxataOutboundDeliveryQueuePreviewDto | null>(null);
  protected readonly outboundDeliveriesByDate =
    signal<AxataOutboundDeliveriesByDateDto | null>(null);
  protected readonly incomingWarehouseReceivings =
    signal<AxataManualIncomingWarehouseReceivingListItemDto[]>([]);
  protected readonly incomingWarehouseReceivingDetail =
    signal<AxataManualIncomingWarehouseReceivingDetailDto | null>(null);
  protected readonly incomingWarehouseLineDrafts = signal<IncomingWarehouseLineDraft[]>([]);
  protected readonly incomingWarehouseAcceptResult =
    signal<AxataManualIncomingWarehouseReceivingAcceptResponseDto | null>(null);
  protected readonly incomingWarehouseBatchQueue = signal<IncomingWarehouseBatchQueueItem[]>([]);
  protected readonly incomingWarehouseBatchResult =
    signal<AxataManualIncomingWarehouseReceivingBatchResponseDto | null>(null);
  protected readonly productSynchronizationPreview =
    signal<AxataProductSynchronizationPreviewDto | null>(null);
  protected readonly productSynchronizationResult =
    signal<AxataProductSynchronizationExecuteDto | null>(null);

  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly tasks = computed(() => this.overview()?.tasks ?? []);
  protected readonly selectedTask = computed(
    () =>
      this.tasks().find(
        (task: IAxataSynchronizationTaskApiDto) => task.code === this.selectedTaskCode()
      ) ?? null
  );
  protected readonly selectedTaskDescription = computed(
    () => this.selectedTask()?.description || 'Task secildiginde preview ve execute akislarini buradan yonetebilirsin.'
  );
  protected readonly recentJobs = computed(() => this.overview()?.recentJobs ?? []);
  protected readonly requiresWarehouseNo = computed(() => {
    const selectedTask = this.selectedTask();

    if (selectedTask) {
      return selectedTask.requiresWarehouseNo;
    }

    return DOCUMENT_TASK_CODES.has(this.selectedTaskCode());
  });
  protected readonly supportsManualDocuments = computed(() => {
    const selectedTask = this.selectedTask();

    if (typeof selectedTask?.supportsManualDocuments === 'boolean') {
      return selectedTask.supportsManualDocuments;
    }

    return DOCUMENT_TASK_CODES.has(this.selectedTaskCode());
  });
  protected readonly supportsLiveDispatch = computed(
    () => this.selectedTask()?.supportsLiveDispatch ?? false
  );
  protected readonly selectedTaskLiveOperationName = computed(
    () => this.selectedTask()?.liveOperationName?.trim() || null
  );
  protected readonly taskWarehouseLabel = computed(() =>
    this.selectedTaskCode() === 'issued-warehouse-order-sync' ? 'Kaynak Depo No' : 'Depo No'
  );
  protected readonly taskWarehousePlaceholder = computed(() =>
    this.selectedTaskCode() === 'issued-warehouse-order-sync'
      ? 'AXATA kaynak/cikis deposu'
      : 'JWT deposu veya manuel'
  );
  protected readonly isDocumentTask = computed(() => this.supportsManualDocuments());
  protected readonly isInventoryCountTask = computed(
    () => this.selectedTaskCode() === 'inventory-count-sync'
  );
  protected readonly isProductMasterTask = computed(
    () => this.selectedTaskCode() === 'product-master-sync'
  );
  protected readonly taskExecutionModes = computed<readonly IAxataExecutionMode[]>(() =>
    this.isProductMasterTask() ? this.productExecutionModes : this.executionModes
  );
  protected readonly isBusy = computed(
    () =>
      this.overviewLoading() ||
      this.healthLoading() ||
      this.fetchProfilesLoading() ||
      this.auditLoading() ||
      this.previewLoading() ||
      this.executeLoading() ||
      this.manualLoading() ||
      this.dispatchLoading() ||
      this.candidateLoading() ||
      this.batchLoading() ||
      this.incomingCompanyLoading() ||
      this.incomingInventoryLoading() ||
      this.incomingWarehouseLoading() ||
      this.incomingWarehouseDetailLoading() ||
      this.incomingWarehouseAcceptLoading() ||
      this.axataOutboundLoading() ||
      this.axataInboundAtfLoading() ||
      this.queuePreviewLoading() ||
      this.outboundDeliveriesByDateLoading() ||
      this.c01PreviewLoading() ||
      this.c01ImportLoading() ||
      this.c01DocumentRescueLoading() ||
      this.genericJobLoading() ||
      this.productPreviewLoading() ||
      this.productDispatchLoading()
  );
  protected readonly selectedBatchCount = computed(() => this.selectedBatchDocuments().length);
  protected readonly enabledTaskCount = computed(
    () => this.tasks().filter((task: IAxataSynchronizationTaskApiDto) => task.enabled).length
  );
  protected readonly manualTaskCount = computed(
    () =>
      this.tasks().filter(
        (task: IAxataSynchronizationTaskApiDto) => task.supportsManualDocuments
      ).length
  );
  protected readonly liveDispatchTaskCount = computed(
    () =>
      this.tasks().filter(
        (task: IAxataSynchronizationTaskApiDto) => task.supportsLiveDispatch
      ).length
  );
  protected readonly selectedTaskCapabilities = computed(() => {
    const selectedTask = this.selectedTask();

    if (!selectedTask) {
      return [];
    }

    const capabilities = [
      selectedTask.requiresWarehouseNo ? 'Warehouse zorunlu' : 'Depodan bagimsiz',
      selectedTask.supportsManualDocuments ? 'Manual documents var' : 'Manual documents yok',
      selectedTask.supportsLiveDispatch ? 'Canli dispatch var' : 'Canli dispatch yok',
      selectedTask.scheduleEnabled
        ? `Scheduler ${selectedTask.intervalMinutes} dk`
        : 'Scheduler pasif'
    ];

    if (selectedTask.liveOperationName?.trim()) {
      capabilities.push(`Live op ${selectedTask.liveOperationName.trim()}`);
    }

    return capabilities;
  });
  protected readonly selectedTaskLimits = computed(() => {
    const selectedTask = this.selectedTask();

    if (!selectedTask) {
      return [];
    }

    const notes = [
      'C01 canli fetch/import, AXATA -> Mikro sekmesinde ayrica yonetilir.',
      'C02/C03/C4 icin sadece AXATA kuyruk preview vardir; Mikro yazma ve ack yoktur.',
      'Outbox basarisi AXATA kabul etti degil, payload dosyalandi anlamina gelir.'
    ];

    switch (selectedTask.code) {
      case 'firm-master-sync':
        notes.unshift('Bu task icin UI sadece preview, job ve outbox deneyimi sunmalidir.');
        break;
      case 'product-master-sync':
        notes.unshift(
          'Urun master icin task preview/job/outbox yaninda tekli veya toplu addSKUMaster canli dispatch kullanilabilir.'
        );
        notes.push(
          'Otomatik zamanli aktarim icin Worker, Scheduler ve product-master-sync Schedule ayarlarinin ucu de aktif olmalidir.'
        );
        break;
      case 'issued-warehouse-order-sync':
        notes.unshift(
          'Canli dispatch mevcut Mikro evragini yeniden gonderir; AXATAdan otomatik belge cekmez.'
        );
        notes.unshift(
          'Bu taskta warehouseNo hedef depo degil, AXATA kaynak/cikis deposudur; Mikro ssip_cikdepo filtresi kullanilir.'
        );
        notes.push(
          'Depolar-arasi-sevk belge detayi icin ayri AXATA dispatch butonu acilmamalidir.'
        );
        break;
      case 'company-receiving-sync':
        notes.unshift(
          'Canli dispatch sadece mevcut Mikro firma mal kabul evragini tekrar gonderir.'
        );
        break;
      case 'inventory-count-sync':
        notes.unshift('inventory-count-sync icin canli dispatch butonu gosterilmemelidir.');
        notes.push(
          'Inventory count taski AXATA -> Mikro manual incoming tarafinda ayrica kullanilabilir.'
        );
        break;
      default:
        break;
    }

    return notes.filter((note, index, items) => items.indexOf(note) === index);
  });
  protected readonly primaryFlowCards = computed<AxataFlowCard[]>(() => [
    {
      title: 'Urun master',
      label: 'Mikro -> AXATA',
      description:
        'Once urunleri onizle, sonra tek urun veya secili kodlari canli AXATA addSKUMaster operasyonuna gonder.',
      actionText: 'Urunleri Ac',
      action: 'products',
      tone: 'success'
    },
    {
      title: 'Evrak kurtarma',
      label: 'Mikro -> AXATA',
      description:
        'Aday evragi bul, payloadi onizle, gercek gonderim gerekiyorsa dispatch ile AXATAya yaz.',
      actionText: 'Adaylari Ac',
      action: 'manual',
      tone: 'warn'
    },
    {
      title: 'C01 sevk aktarimi',
      label: 'AXATA -> Mikro',
      description:
        'C01 teslimatlarini onizle, uygun kayitlari Mikro sevk fisine isle ve acknowledge kararini acik sec.',
      actionText: 'Mikroya Isle',
      action: 'incoming',
      tone: 'danger'
    },
    {
      title: 'C02/C03/C4 kuyruklari',
      label: 'Sadece kontrol',
      description:
        'Bu profillerde sadece bekleyen AXATA sevklerini goruntule; Mikro yazma veya AXATA ack aksiyonu yok.',
      actionText: 'Kuyrugu Gor',
      action: 'queue',
      tone: 'neutral'
    },
    {
      title: 'Manuel JSON araclari',
      label: 'Operasyon destegi',
      description:
        'Ham body ile import/gonderim araclari normal akis degil, kurtarma ve teknik destek icin gelismis alandadir.',
      actionText: 'Teknik Alani Ac',
      action: 'technical',
      tone: 'neutral'
    }
  ]);
  protected readonly currentIncomingWarehouseReference = computed(() => {
    const detail = this.incomingWarehouseReceivingDetail();
    const header = detail?.header;

    if (!header) {
      return '-';
    }

    return `${header.documentSerie}.${header.documentOrderNo}`;
  });
  protected readonly currentIncomingWarehouseLineTotal = computed(() =>
    this.incomingWarehouseLineDrafts().reduce(
      (total: number, item: IncomingWarehouseLineDraft) => total + item.receivedQuantity,
      0
    )
  );
  protected readonly statusSummary = computed(() => {
    const overview = this.overview();

    if (!overview) {
      return [];
    }

    return [
      {
        label: 'Modul',
        value: overview.enabled ? 'Aktif' : 'Kapali',
        tone: overview.enabled ? 'status-pill-success' : 'status-pill-danger'
      },
      {
        label: 'Worker',
        value: overview.workerEnabled ? 'Calisiyor' : 'Kapali',
        tone: overview.workerEnabled ? 'status-pill-success' : 'status-pill-warn'
      },
      {
        label: 'Scheduler',
        value: overview.schedulerEnabled ? 'Planli' : 'Pasif',
        tone: overview.schedulerEnabled ? 'status-pill-success' : 'status-pill-neutral'
      }
    ];
  });
  protected readonly previewJson = computed(() =>
    this.preview()
      ? this.formatJson(
          this.preview()!.items.map((item: IAxataSynchronizationPreviewItemApiDto) => ({
            key: item.key,
            summary: item.summary,
            payloadJson: this.tryParseJson(item.payloadJson)
          }))
        )
      : ''
  );
  protected readonly manualResultJson = computed(() =>
    this.manualDocumentResult()
      ? this.formatJson({
          documentReference: this.manualDocumentResult()!.documentReference,
          payloadJson: this.tryParseJson(this.manualDocumentResult()!.payloadJson),
          notes: this.manualDocumentResult()!.notes,
          artifacts: this.manualDocumentResult()!.artifacts
        })
      : ''
  );
  protected readonly auditJson = computed(() => (this.audit() ? this.formatJson(this.audit()) : ''));
  protected readonly c01PreviewJson = computed(() =>
    this.c01OutboundDeliveryPreview() ? this.formatJson(this.c01OutboundDeliveryPreview()) : ''
  );
  protected readonly c01ImportJson = computed(() =>
    this.c01OutboundDeliveryImportResult()
      ? this.formatJson(this.c01OutboundDeliveryImportResult())
      : ''
  );
  protected readonly c01DocumentRescuePreviewJson = computed(() =>
    this.c01DocumentRescuePreview() ? this.formatJson(this.c01DocumentRescuePreview()) : ''
  );
  protected readonly c01DocumentRescueImportJson = computed(() =>
    this.c01DocumentRescueImportResult()
      ? this.formatJson(this.c01DocumentRescueImportResult())
      : ''
  );
  protected readonly queuePreviewJson = computed(() =>
    this.outboundDeliveryQueuePreview()
      ? this.formatJson(this.outboundDeliveryQueuePreview())
      : ''
  );
  protected readonly outboundDeliveriesByDateJson = computed(() =>
    this.outboundDeliveriesByDate()
      ? this.formatJson(this.outboundDeliveriesByDate())
      : ''
  );
  protected readonly productSynchronizationPreviewJson = computed(() =>
    this.productSynchronizationPreview()
      ? this.formatJson(
          this.productSynchronizationPreview()!.products.map(
            (item: IAxataProductSynchronizationItemApiDto) => ({
              ...item,
              payloadJson: this.tryParseJson(item.payloadJson)
            })
          )
        )
      : ''
  );
  protected readonly productSynchronizationResultJson = computed(() =>
    this.productSynchronizationResult()
      ? this.formatJson(this.productSynchronizationResult())
      : ''
  );
  protected readonly auditSummaryCards = computed(() => {
    const summary = this.audit()?.summary;

    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Mikro Siparis',
        value: summary.mikroWarehouseOrderDocumentCount
      },
      {
        label: 'Tam Giden',
        value: summary.sentWarehouseOrderDocumentCount
      },
      {
        label: 'Eksik Giden',
        value: summary.unsentWarehouseOrderDocumentCount
      },
      {
        label: 'Sevk Linki Eksik',
        value: summary.sentWarehouseOrderMissingMikroShipmentDocumentCount
      },
      {
        label: 'Kismi Fark',
        value: summary.sentWarehouseOrderShipmentDifferenceDocumentCount
      },
      {
        label: 'AXATA Sevk',
        value: summary.axataOutboundDeliveryDocumentCount ?? summary.pendingOutboundDeliveryDocumentCount
      },
      {
        label: 'C01 Pending',
        value: summary.c01PendingDocumentCount
      },
      {
        label: 'Ack Bekleyen',
        value: summary.c01MikroExistsPendingAckDocumentCount
      },
      {
        label: 'Tamamlanan Sevk',
        value: summary.axataCompletedOutboundDeliveryDocumentCount ?? 0
      },
      {
        label: 'Iptal / Zero',
        value: summary.axataCancelledOutboundDeliveryDocumentCount ?? 0
      },
      {
        label: 'Satirsiz AXATA',
        value: summary.axataEmptyOutboundDeliveryDocumentCount ?? 0
      }
    ];
  });
  protected readonly workflowSummaryCards = computed<AuditInsightCard[]>(() => {
    const summary = this.audit()?.workflowSummary;

    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Mikro Siparis Evreni',
        value: `${summary.mikroOrderDocumentCount}`,
        detail: `${summary.axataOrderDocumentCount} siparis AXATA ENT000/ENT001 tarafinda bulundu`,
        tone: summary.axataOrderMissingDocumentCount > 0 ? 'warn' : 'success'
      },
      {
        label: 'AXATA Siparis Eksigi',
        value: `${summary.axataOrderMissingDocumentCount}`,
        detail: `${summary.axataOrderUnknownDocumentCount} baglanti nedeniyle dogrulanamadi`,
        tone:
          summary.axataOrderMissingDocumentCount > 0 ||
          summary.axataOrderUnknownDocumentCount > 0
            ? 'danger'
            : 'success'
      },
      {
        label: 'AXATA SEV Belgeleri',
        value: `${summary.axataShipmentDocumentCount}`,
        detail: `${summary.partiallyShippedDocumentCount} kismi / ${summary.fullyShippedDocumentCount} tam / ${summary.overShippedDocumentCount} fazla`,
        tone: summary.overShippedDocumentCount > 0 ? 'danger' : 'neutral'
      },
      {
        label: 'Mikro Sevk Baglantisi',
        value: `${summary.mikroLinkedShipmentDocumentCount}`,
        detail: `${summary.waitingForMikroTransferDocumentCount} bekliyor / ${summary.partiallyLinkedInMikroDocumentCount} kismi`,
        tone:
          summary.waitingForMikroTransferDocumentCount > 0 ||
          summary.partiallyLinkedInMikroDocumentCount > 0
            ? 'warn'
            : 'success'
      },
      {
        label: 'Tam Senkron',
        value: `${summary.fullySynchronizedDocumentCount}`,
        detail: `${summary.mikroOrderDocumentCount} Mikro siparisinden miktar bazli tamamlanan`,
        tone:
          summary.fullySynchronizedDocumentCount === summary.mikroOrderDocumentCount
            ? 'success'
            : 'neutral'
      },
      {
        label: 'Manuel Aksiyon',
        value: `${summary.manualActionRequiredDocumentCount}`,
        detail: 'Evrak bazli onerilen mudahale karari bulunan siparis',
        tone: summary.manualActionRequiredDocumentCount > 0 ? 'danger' : 'success'
      }
    ];
  });
  protected readonly criticalAuditOperation = computed(
    () =>
      this.audit()?.operations.find(
        (operation: IAxataIntegrationAuditOperationApiDto) =>
          operation.code === 'sent-to-axata-missing-mikro-shipment'
      ) ?? null
  );
  protected readonly auditInsightCards = computed<AuditInsightCard[]>(() => {
    const summary = this.audit()?.summary;

    if (!summary) {
      return [];
    }

    return [
      {
        label: 'AXATA Gonderim',
        value: `${summary.sentWarehouseOrderDocumentCount}/${summary.mikroWarehouseOrderDocumentCount}`,
        detail:
          summary.unsentWarehouseOrderDocumentCount > 0
            ? `${summary.unsentWarehouseOrderDocumentCount} belge henuz gitmemis`
            : 'Mikro siparisleri AXATA gonderim bayraginda tamam',
        tone: summary.unsentWarehouseOrderDocumentCount > 0 ? 'warn' : 'success'
      },
      {
        label: 'AXATA Sevk Evreni',
        value: `${summary.axataOutboundDeliveryDocumentCount ?? summary.pendingOutboundDeliveryDocumentCount}`,
        detail: `${summary.axataCompletedOutboundDeliveryDocumentCount ?? 0} tamamlanan / ${summary.axataCancelledOutboundDeliveryDocumentCount ?? 0} iptal-zero`,
        tone:
          (summary.axataEmptyOutboundDeliveryDocumentCount ?? 0) > 0 ? 'warn' : 'neutral'
      },
      {
        label: 'AXATA Pending',
        value: `${summary.pendingOutboundDeliveryDocumentCount}`,
        detail: `${summary.pendingOutboundDeliveryLineCount} satir / ${summary.pendingOutboundDeliveryQuantity.toLocaleString('tr-TR')} miktar`,
        tone: summary.pendingOutboundDeliveryDocumentCount > 0 ? 'warn' : 'success'
      },
      {
        label: 'Mikro Sevk Linki',
        value: `${summary.sentWarehouseOrderMissingMikroShipmentDocumentCount}`,
        detail: `${summary.sentWarehouseOrderMissingMikroShipmentLineCount.toLocaleString('tr-TR')} satir / ${summary.sentWarehouseOrderMissingMikroShipmentQuantity.toLocaleString('tr-TR')} miktar eksik`,
        tone:
          summary.sentWarehouseOrderMissingMikroShipmentDocumentCount > 0
            ? 'danger'
            : 'success'
      },
      {
        label: 'Kismi Sevk / Fark',
        value: `${summary.sentWarehouseOrderShipmentDifferenceDocumentCount}`,
        detail:
          summary.sentWarehouseOrderShipmentDifferenceDocumentCount > 0
            ? `${summary.sentWarehouseOrderShipmentDifferenceLineCount.toLocaleString('tr-TR')} satir / ${summary.sentWarehouseOrderShipmentDifferenceQuantity.toLocaleString('tr-TR')} miktar fark`
            : 'Kismi sevk veya siparis-sevk farki yok',
        tone:
          summary.sentWarehouseOrderShipmentDifferenceDocumentCount > 0
            ? 'warn'
            : 'success'
      },
      {
        label: 'C01 Kuyruk',
        value: `${summary.c01PendingDocumentCount}`,
        detail:
          summary.c01MikroExistsPendingAckDocumentCount > 0
            ? `${summary.c01MikroExistsPendingAckDocumentCount} belge ack bekliyor`
            : 'C01 pending ve ack bekleyen belge yok',
        tone:
          summary.c01PendingDocumentCount > 0 ||
          summary.c01MikroExistsPendingAckDocumentCount > 0
            ? 'warn'
            : 'success'
      },
      {
        label: 'AXATA Sevki Bulunamayan',
        value: `${summary.sentWarehouseOrderMissingAxataOutboundDeliveryDocumentCount ?? 0}`,
        detail: 'Mikroda gonderildi gorunup secili AXATA status evreninde karsiligi bulunmayan ikincil kontrol',
        tone:
          (summary.sentWarehouseOrderMissingAxataOutboundDeliveryDocumentCount ?? 0) > 0
            ? 'warn'
            : 'success'
      }
    ];
  });
  protected readonly missingShipmentVisibleSummary =
    computed<MissingShipmentVisibleSummary>(() => {
      const items = this.audit()?.sentWarehouseOrdersMissingMikroShipments ?? [];

      return items.reduce(
        (summary: MissingShipmentVisibleSummary, item) => ({
          documentCount: summary.documentCount + 1,
          missingLineCount: summary.missingLineCount + item.missingMovementLinkLineCount,
          missingQuantity: summary.missingQuantity + item.missingMovementLinkQuantity,
          linkedLineCount: summary.linkedLineCount + item.linkedMovementLineCount,
          totalLineCount: summary.totalLineCount + item.lineCount
        }),
        {
          documentCount: 0,
          missingLineCount: 0,
          missingQuantity: 0,
          linkedLineCount: 0,
          totalLineCount: 0
        }
      );
    });
  protected readonly missingShipmentWarehouseGroups = computed<
    MissingShipmentWarehouseGroup[]
  >(() => {
    const groups = new Map<number, MissingShipmentWarehouseGroup>();

    for (const item of this.audit()?.sentWarehouseOrdersMissingMikroShipments ?? []) {
      const current =
        groups.get(item.inWarehouseNo) ??
        {
          warehouseNo: item.inWarehouseNo,
          documentCount: 0,
          missingLineCount: 0,
          missingQuantity: 0,
          linkedLineCount: 0,
          totalLineCount: 0,
          totalQuantity: 0
        };

      groups.set(item.inWarehouseNo, {
        ...current,
        documentCount: current.documentCount + 1,
        missingLineCount: current.missingLineCount + item.missingMovementLinkLineCount,
        missingQuantity: current.missingQuantity + item.missingMovementLinkQuantity,
        linkedLineCount: current.linkedLineCount + item.linkedMovementLineCount,
        totalLineCount: current.totalLineCount + item.lineCount,
        totalQuantity: current.totalQuantity + item.totalQuantity
      });
    }

    return Array.from(groups.values())
      .sort(
        (left: MissingShipmentWarehouseGroup, right: MissingShipmentWarehouseGroup) =>
          right.missingQuantity - left.missingQuantity
      )
      .slice(0, 6);
  });
  protected readonly shipmentDifferenceVisibleSummary =
    computed<ShipmentDifferenceVisibleSummary>(() => {
      const items = this.audit()?.sentWarehouseOrdersWithShipmentDifferences ?? [];

      return items.reduce(
        (summary: ShipmentDifferenceVisibleSummary, item) => ({
          documentCount: summary.documentCount + 1,
          differenceLineCount: summary.differenceLineCount + item.differenceLineCount,
          differenceQuantity: summary.differenceQuantity + item.differenceQuantity,
          linkedLineCount: summary.linkedLineCount + item.linkedMovementLineCount,
          totalLineCount: summary.totalLineCount + item.lineCount
        }),
        {
          documentCount: 0,
          differenceLineCount: 0,
          differenceQuantity: 0,
          linkedLineCount: 0,
          totalLineCount: 0
        }
      );
    });
  protected readonly firstMissingShipment = computed(
    () => this.audit()?.sentWarehouseOrdersMissingMikroShipments[0] ?? null
  );

  constructor() {
    this.form.controls.taskCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taskCode: string) => {
        this.selectedTaskCode.set(taskCode);
        this.preview.set(null);
        this.manualCandidates.set(null);
        this.manualDocumentResult.set(null);
        this.manualDispatchResult.set(null);
        this.manualDispatchBatchResult.set(null);
        this.batchResult.set(null);
        this.productSynchronizationPreview.set(null);
        this.productSynchronizationResult.set(null);
        this.selectedBatchDocuments.set([]);
        this.form.controls.candidateSkip.setValue(0, { emitEvent: false });
        if (taskCode !== 'product-master-sync' && this.form.controls.executionMode.value === 'Live') {
          this.form.controls.executionMode.setValue('DryRun', { emitEvent: false });
        }
        this.feedback.set(null);
      });

    effect(() => {
      const tasks = this.tasks();

      if (!tasks.length) {
        return;
      }

      const currentTaskCode = this.selectedTaskCode();

      if (tasks.some((task: IAxataSynchronizationTaskApiDto) => task.code === currentTaskCode)) {
        return;
      }

      const fallbackTaskCode =
        tasks.find((task: IAxataSynchronizationTaskApiDto) => task.enabled)?.code ?? tasks[0].code;

      this.form.controls.taskCode.setValue(fallbackTaskCode, { emitEvent: false });
      this.selectedTaskCode.set(fallbackTaskCode);
    });

    effect(() => {
      if (!this.requiresWarehouseNo()) {
        return;
      }

      const warehouseNo = this.toPositiveNumber(this.form.controls.warehouseNo.value);
      const currentWarehouseNo = this.currentWarehouseNo();

      if (!warehouseNo && currentWarehouseNo) {
        this.form.controls.warehouseNo.setValue(currentWarehouseNo, { emitEvent: false });
      }
    });

    effect(() => {
      const warehouseNo = this.toPositiveNumber(this.incomingWarehouseForm.controls.warehouseNo.value);
      const currentWarehouseNo = this.currentWarehouseNo();

      if (!warehouseNo && currentWarehouseNo) {
        this.incomingWarehouseForm.controls.warehouseNo.setValue(currentWarehouseNo, {
          emitEvent: false
        });
      }
    });

    this.loadOverview();
    this.loadHealth();
    this.loadFetchProfiles();
  }

  protected selectTab(tab: string): void {
    const tabName = tab as 'tasks' | 'monitor' | 'manual' | 'incoming';
    this.selectedTab.set(tabName);
  }

  protected openTaskOverview(): void {
    if (this.selectedTaskCode() === 'product-master-sync') {
      const fallbackTask = this.tasks().find(
        (task: IAxataSynchronizationTaskApiDto) => task.code !== 'product-master-sync'
      );

      if (fallbackTask) {
        this.form.controls.taskCode.setValue(fallbackTask.code);
        this.selectedTaskCode.set(fallbackTask.code);
      }
    }

    this.selectedTab.set('tasks');
  }

  protected openProductSynchronization(): void {
    this.form.controls.taskCode.setValue('product-master-sync');
    this.selectedTaskCode.set('product-master-sync');
    this.selectedTab.set('tasks');
  }

  protected openManualDispatchFlow(): void {
    const documentTask =
      this.tasks().find(
        (task: IAxataSynchronizationTaskApiDto) =>
          task.code === 'issued-warehouse-order-sync' && task.supportsManualDocuments
      ) ??
      this.tasks().find(
        (task: IAxataSynchronizationTaskApiDto) => task.supportsManualDocuments
      );

    if (!documentTask) {
      this.openTaskOverview();
      this.feedback.set({
        tone: 'info',
        title: 'Manuel evrak taski yok',
        message: 'Mikro -> AXATA manuel kurtarma icin once supportsManualDocuments olan bir task gelmeli.'
      });
      return;
    }

    this.form.controls.taskCode.setValue(documentTask.code);
    this.selectedTaskCode.set(documentTask.code);
    this.selectedTab.set('manual');
  }

  protected openAxataIncomingFlow(): void {
    this.selectedTab.set('incoming');
  }

  protected openQueuePreviewFlow(): void {
    this.queuePreviewForm.controls.movementType.setValue('C02', { emitEvent: false });
    this.selectedTab.set('incoming');
  }

  protected openTechnicalFlow(): void {
    this.selectedTab.set('incoming');
  }

  protected openPrimaryFlow(action: AxataFlowAction): void {
    switch (action) {
      case 'products':
        this.openProductSynchronization();
        break;
      case 'manual':
        this.openManualDispatchFlow();
        break;
      case 'incoming':
        this.openAxataIncomingFlow();
        break;
      case 'queue':
        this.openQueuePreviewFlow();
        break;
      case 'technical':
        this.openTechnicalFlow();
        break;
      default:
        this.openTaskOverview();
        break;
    }
  }

  protected loadCandidates(): void {
    this.loadManualCandidates();
  }

  protected loadPreviousCandidatePage(): void {
    const previousSkip = Math.max(0, this.getCandidateSkip() - this.getCandidateTake());

    this.form.controls.candidateSkip.setValue(previousSkip, { emitEvent: false });
    this.loadManualCandidates();
  }

  protected loadNextCandidatePage(
    candidates: AxataSynchronizationManualDocumentCandidatesDto
  ): void {
    const nextSkip = this.getCandidateSkippedRecordCount(candidates) + this.getCandidateTake();

    this.form.controls.candidateSkip.setValue(nextSkip, { emitEvent: false });
    this.loadManualCandidates();
  }

  protected canLoadPreviousCandidatePage(): boolean {
    return !this.candidateLoading() && this.getCandidateSkip() > 0;
  }

  protected canLoadNextCandidatePage(
    candidates: AxataSynchronizationManualDocumentCandidatesDto
  ): boolean {
    return (
      !this.candidateLoading() &&
      this.getCandidateSkippedRecordCount(candidates) + candidates.returnedRecordCount <
        candidates.totalRecordCount
    );
  }

  protected formatCandidatePageSummary(
    candidates: AxataSynchronizationManualDocumentCandidatesDto
  ): string {
    const skippedRecordCount = this.getCandidateSkippedRecordCount(candidates);

    if (!candidates.returnedRecordCount) {
      return `0 / ${candidates.totalRecordCount} kayit`;
    }

    const firstRecordNo = skippedRecordCount + 1;
    const lastRecordNo = skippedRecordCount + candidates.returnedRecordCount;

    return `${firstRecordNo}-${lastRecordNo} / ${candidates.totalRecordCount} kayit`;
  }

  protected loadOverview(): void {
    this.overviewLoading.set(true);

    this.entegrasyonIslemleriService
      .getAxataSynchronizationOverview()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.overviewLoading.set(false))
      )
      .subscribe({
        next: (overview: AxataSynchronizationOverviewDto) => {
          this.overview.set(overview);
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Overview okunamadi',
            message: 'Axata senkronizasyon overview endpointi su anda cevap vermedi.'
          });
        }
      });
  }

  protected loadHealth(): void {
    this.healthLoading.set(true);

    this.entegrasyonIslemleriService
      .getAxataSynchronizationHealth()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.healthLoading.set(false))
      )
      .subscribe({
        next: (health: AxataSynchronizationHealthDto) => {
          this.health.set(health);
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Health probe okunamadi',
            message: 'Baglanti testi sonuclari getirilemedi. Endpoint ve SQL erisimlerini sonra tekrar kontrol et.'
          });
        }
      });
  }

  protected loadFetchProfiles(): void {
    this.fetchProfilesLoading.set(true);

    this.entegrasyonIslemleriService
      .getAxataSynchronizationFetchProfiles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.fetchProfilesLoading.set(false))
      )
      .subscribe({
        next: (profiles: AxataSynchronizationFetchProfilesOverviewDto) => {
          this.fetchProfiles.set(profiles);
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Fetch profile listesi okunamadi',
            message:
              'Eski worker parity profilleri getirilemedi. AXATA fetch/import konfigurasyonunu kontrol et.'
          });
        }
      });
  }

  protected loadAuditOverview(): void {
    const startDate = this.auditForm.controls.startDate.value.trim();
    const endDate = this.auditForm.controls.endDate.value.trim();
    const statuses = this.normalizeAuditStatuses(this.auditForm.controls.statuses.value);

    if (!startDate || !endDate || !statuses) {
      this.feedback.set({
        tone: 'error',
        title: 'Audit tarih araligi eksik',
        message: 'Baslangic, bitis tarihi ve AXATA status evreni zorunlu. Ornek: 0,1.'
      });
      return;
    }

    this.auditLoading.set(true);

    this.entegrasyonIslemleriService
      .getAxataIntegrationAuditOverview({
        startDate,
        endDate,
        warehouseNo: this.toPositiveNumber(this.auditForm.controls.warehouseNo.value) ?? undefined,
        documentSerie: this.auditForm.controls.documentSerie.value.trim() || undefined,
        documentOrderNo:
          this.toPositiveNumber(this.auditForm.controls.documentOrderNo.value) ?? undefined,
        statuses,
        take: this.toPositiveNumber(this.auditForm.controls.take.value) ?? 50
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.auditLoading.set(false))
      )
      .subscribe({
        next: (audit: AxataIntegrationAuditDto) => {
          this.audit.set(audit);
          this.feedback.set({
            tone: audit.isInSync ? 'success' : 'info',
            title: audit.isInSync ? 'Sistem es zamanli gorunuyor' : 'Fark analizi hazir',
            message: audit.isInSync
              ? 'Mikro siparis bayraklari tamam; pending kuyruk, AXATA sevk donusu ve Mikro link kontrolleri uyumlu.'
              : `${audit.unsyncedWarehouseOrders.length} Mikro siparis problemi, ${audit.pendingOutboundDeliveries.length} pending sevk ve ${audit.sentWarehouseOrdersMissingMikroShipments.length} kritik sevk donusu eksigi raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Fark analizi alinamadi',
            message: 'live/audit/overview endpointi cevap vermedi veya filtreleri kabul etmedi.'
          });
        }
      });
  }

  protected loadC01OutboundDeliveryPreview(): void {
    this.c01PreviewLoading.set(true);
    this.c01OutboundDeliveryPreview.set(null);

    this.entegrasyonIslemleriService
      .previewAxataC01OutboundDeliveryImport(
        this.toPositiveNumber(this.c01ImportForm.controls.take.value) ?? 20
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.c01PreviewLoading.set(false))
      )
      .subscribe({
        next: (preview: AxataOutboundDeliveryImportPreviewDto) => {
          this.c01OutboundDeliveryPreview.set(preview);
          this.feedback.set({
            tone: 'info',
            title: 'C01 live preview hazir',
            message: `${preview.returnedDocumentCount}/${preview.totalFetchedDocumentCount} AXATA pending C01 evraki listelendi. Veri yazilmadi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'C01 preview alinamadi',
            message: 'AXATA C01 live preview endpointi hata dondu.'
          });
        }
      });
  }

  protected loadOutboundDeliveryQueuePreview(): void {
    const movementType = this.normalizeQueueMovementType(
      this.queuePreviewForm.controls.movementType.value
    );
    const take = this.toPositiveNumber(this.queuePreviewForm.controls.take.value) ?? 20;

    this.queuePreviewLoading.set(true);
    this.outboundDeliveryQueuePreview.set(null);

    this.entegrasyonIslemleriService
      .previewAxataOutboundDeliveryQueue({
        movementType,
        take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.queuePreviewLoading.set(false))
      )
      .subscribe({
        next: (preview: AxataOutboundDeliveryQueuePreviewDto) => {
          this.outboundDeliveryQueuePreview.set(preview);
          this.feedback.set({
            tone: 'info',
            title: `${preview.movementType} kuyruk preview hazir`,
            message: `${preview.returnedDocumentCount}/${preview.totalFetchedDocumentCount} AXATA pending evraki listelendi. Bu cagri Mikro'ya yazmaz ve AXATA ack atmaz.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Kuyruk preview alinamadi',
            message:
              'AXATA outbound-deliveries/preview endpointi hata dondu. Movement type ve take degerlerini kontrol et.'
          });
        }
      });
  }

  protected loadOutboundDeliveriesByDate(): void {
    if (this.outboundDeliveriesByDateForm.invalid) {
      this.outboundDeliveriesByDateForm.markAllAsTouched();
      return;
    }

    const date = this.outboundDeliveriesByDateForm.controls.date.value.trim();

    if (!date) {
      this.feedback.set({
        tone: 'error',
        title: 'Sevk tarihi eksik',
        message: 'AXATA sevk tarihi sorgusu icin date zorunlu.'
      });
      return;
    }

    this.outboundDeliveriesByDateLoading.set(true);
    this.outboundDeliveriesByDate.set(null);

    this.entegrasyonIslemleriService
      .getAxataOutboundDeliveriesByDate({ date })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.outboundDeliveriesByDateLoading.set(false))
      )
      .subscribe({
        next: (result: AxataOutboundDeliveriesByDateDto) => {
          this.outboundDeliveriesByDate.set(result);
          this.feedback.set({
            tone: 'info',
            title: 'AXATA sevk tarihi listesi hazir',
            message: `${result.totalDocumentCount} belge, ${result.totalLineCount} satir ve ${result.totalQuantity} toplam miktar listelendi. Bu cagri veri yazmaz.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'AXATA sevkleri alinamadi',
            message:
              'outbound-deliveries/by-date endpointi cevap vermedi. Tarihi yyyy-MM-dd formatinda kontrol et.'
          });
        }
      });
  }

  protected executeC01OutboundDeliveryImport(): void {
    const request: IAxataOutboundDeliveryImportExecuteRequestApiDto = {
      take: this.toPositiveNumber(this.c01ImportForm.controls.take.value) ?? 20,
      continueOnError: this.c01ImportForm.controls.continueOnError.value,
      acknowledge: this.c01ImportForm.controls.acknowledge.value
    };

    this.c01ImportLoading.set(true);
    this.c01OutboundDeliveryImportResult.set(null);

    this.entegrasyonIslemleriService
      .executeAxataC01OutboundDeliveryImport(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.c01ImportLoading.set(false))
      )
      .subscribe({
        next: (result: AxataOutboundDeliveryImportExecuteDto) => {
          this.c01OutboundDeliveryImportResult.set(result);
          this.feedback.set({
            tone: result.failedDocumentCount > 0 ? 'info' : 'success',
            title: 'C01 import tamamlandi',
            message: `${result.succeededDocumentCount} basarili, ${result.failedDocumentCount} hatali, ${result.skippedDocumentCount} atlanan evrak raporlandi.`
          });
          this.loadAuditOverview();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'C01 import basarisiz',
            message: 'AXATA C01 import endpointi Mikro yazim veya AXATA ack sirasinda hata dondu.'
          });
        }
      });
  }

  protected previewC01DocumentRescue(): void {
    const reference = this.buildC01DocumentRescueReference();

    if (!reference) {
      return;
    }

    this.c01DocumentRescueLoading.set(true);
    this.c01DocumentRescuePreview.set(null);

    this.entegrasyonIslemleriService
      .previewAxataC01OutboundDeliveryDocumentImport(
        reference.documentSerie,
        reference.documentOrderNo,
        reference.status
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.c01DocumentRescueLoading.set(false))
      )
      .subscribe({
        next: (preview: AxataOutboundDeliveryImportPreviewDto) => {
          this.c01DocumentRescuePreview.set(preview);
          this.feedback.set({
            tone: 'info',
            title: 'C01 belge rescue preview hazir',
            message: `${reference.documentSerie}.${reference.documentOrderNo} icin ${preview.returnedDocumentCount} AXATA teslimat kaydi kontrol edildi. Veri yazilmadi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'C01 belge rescue preview alinamadi',
            message: 'Belge bazli AXATA teslimat preview endpointi cevap vermedi.'
          });
        }
      });
  }

  protected executeC01DocumentRescue(): void {
    const reference = this.buildC01DocumentRescueReference();

    if (!reference) {
      return;
    }

    const request: IAxataOutboundDeliveryDocumentImportExecuteRequestApiDto = {
      status: reference.status,
      acknowledge: this.c01DocumentRescueForm.controls.acknowledge.value
    };

    this.c01DocumentRescueLoading.set(true);
    this.c01DocumentRescueImportResult.set(null);

    this.entegrasyonIslemleriService
      .executeAxataC01OutboundDeliveryDocumentImport(
        reference.documentSerie,
        reference.documentOrderNo,
        request
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.c01DocumentRescueLoading.set(false))
      )
      .subscribe({
        next: (result: AxataOutboundDeliveryImportExecuteDto) => {
          this.c01DocumentRescueImportResult.set(result);
          this.feedback.set({
            tone: result.failedDocumentCount > 0 ? 'info' : 'success',
            title: 'C01 belge rescue import tamamlandi',
            message: `${result.succeededDocumentCount} basarili, ${result.failedDocumentCount} hatali, ${result.skippedDocumentCount} atlanan evrak raporlandi.`
          });
          this.loadAuditOverview();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'C01 belge rescue import basarisiz',
            message: 'Belge bazli AXATA teslimat import endpointi islemi tamamlayamadi.'
          });
        }
      });
  }

  protected applyUnsyncedWarehouseOrderToManual(
    item: IAxataUnsyncedWarehouseOrderApiDto
  ): void {
    this.form.controls.taskCode.setValue('issued-warehouse-order-sync');
    this.form.patchValue(
      {
        warehouseNo: item.outWarehouseNo,
        candidateStartDate: item.documentDate.slice(0, 10),
        candidateEndDate: item.documentDate.slice(0, 10),
        manualDocumentSerie: item.documentSerie,
        manualDocumentOrderNo: item.documentOrderNo
      },
      { emitEvent: false }
    );
    this.selectedTaskCode.set('issued-warehouse-order-sync');
    this.selectedTab.set('manual');
    this.feedback.set({
      tone: 'info',
      title: 'C01 dispatch formu hazir',
      message: `${item.documentSerie}.${item.documentOrderNo} kaynak depo ${item.outWarehouseNo} ile Mikro -> AXATA formuna tasindi.`
    });
  }

  protected applyMissingShipmentToC01Rescue(
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): void {
    this.c01DocumentRescueForm.patchValue(
      {
        documentSerie: item.documentSerie,
        documentOrderNo: item.documentOrderNo,
        status: '1',
        acknowledge: false
      },
      { emitEvent: false }
    );
    this.selectedTab.set('incoming');
    this.feedback.set({
      tone: 'info',
      title: 'C01 belge rescue formu hazir',
      message: `${item.documentSerie}.${item.documentOrderNo} status=1 ve ack kapali olarak AXATA -> Mikro rescue formuna tasindi.`
    });
  }

  protected applyPendingDeliveryToC01Rescue(item: IAxataPendingOutboundDeliveryApiDto): void {
    if (!this.canApplyPendingDeliveryToC01Rescue(item)) {
      this.feedback.set({
        tone: 'error',
        title: 'C01 rescue uygun degil',
        message: 'Belge bazli aksiyon yalnizca C01 ve guvenli durumdaki Mikro evrak referanslari icin kullanilir.'
      });
      return;
    }

    const isAckOnly = this.isMikroShipmentExistsPendingAck(item);

    this.c01DocumentRescueForm.patchValue(
      {
        documentSerie: item.documentSerie,
        documentOrderNo: item.documentOrderNo,
        status: this.normalizeAxataStatus(item.status) ?? '0',
        acknowledge: isAckOnly
      },
      { emitEvent: false }
    );
    this.selectedTab.set('incoming');
    this.feedback.set({
      tone: 'info',
      title: isAckOnly ? 'C01 ACK formuna tasindi' : 'C01 rescue formuna tasindi',
      message: isAckOnly
        ? `${item.documentSerie}.${item.documentOrderNo} icin yeni fis uretmeden ACK/onarma kontrolu yapilmalidir.`
        : `${item.documentSerie}.${item.documentOrderNo} icin belge bazli preview veya import calistirilabilir.`
    });
  }

  protected applyLifecycleRecommendedAction(item: IAxataOrderLifecycleApiDto): void {
    const code = item.recommendedAction.code;

    if (code === 'RESEND_ORDER_TO_AXATA') {
      this.form.controls.taskCode.setValue('issued-warehouse-order-sync');
      this.form.patchValue(
        {
          warehouseNo: item.sourceWarehouseNo,
          candidateStartDate: item.documentDate.slice(0, 10),
          candidateEndDate: item.documentDate.slice(0, 10),
          manualDocumentSerie: item.documentSerie,
          manualDocumentOrderNo: item.documentOrderNo
        },
        { emitEvent: false }
      );
      this.selectedTaskCode.set('issued-warehouse-order-sync');
      this.selectedTab.set('manual');
    } else {
      const status =
        code === 'IMPORT_PENDING_C01' || code === 'ACK_AXATA_ONLY' ? '0' : '1';
      this.c01DocumentRescueForm.patchValue(
        {
          documentSerie: item.documentSerie,
          documentOrderNo: item.documentOrderNo,
          status,
          acknowledge: code === 'ACK_AXATA_ONLY'
        },
        { emitEvent: false }
      );
      this.selectedTab.set('incoming');
    }

    this.feedback.set({
      tone: 'info',
      title: 'Onerilen aksiyon formu hazir',
      message: `${item.documentSerie}.${item.documentOrderNo}: ${item.recommendedAction.title}`
    });
  }

  protected selectTask(taskCode: string): void {
    this.form.controls.taskCode.setValue(taskCode);
  }

  protected previewProductSynchronization(): void {
    if (this.productSynchronizationForm.invalid) {
      this.productSynchronizationForm.markAllAsTouched();
      return;
    }

    const productCode = this.productSynchronizationForm.controls.productCode.value.trim();
    const take = this.toPositiveNumber(this.productSynchronizationForm.controls.take.value) ?? 20;

    this.productPreviewLoading.set(true);
    this.productSynchronizationPreview.set(null);

    this.entegrasyonIslemleriService
      .previewAxataProducts({
        productCode: productCode || undefined,
        take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.productPreviewLoading.set(false))
      )
      .subscribe({
        next: (preview: AxataProductSynchronizationPreviewDto) => {
          this.productSynchronizationPreview.set(preview);
          this.feedback.set({
            tone: 'info',
            title: 'Urun master preview hazir',
            message: `${preview.returnedRecordCount}/${preview.totalRecordCount} aktif Mikro urunu addSKUMaster paketiyle onizlendi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Urun preview alinamadi',
            message: 'Urun kodunu ve take degerini kontrol et.'
          });
        }
      });
  }

  protected dispatchSingleProduct(): void {
    const productCode = this.productSynchronizationForm.controls.productCode.value.trim();

    if (!productCode) {
      this.feedback.set({
        tone: 'error',
        title: 'Urun kodu gerekli',
        message: 'Tek urun canli dispatch icin Mikro urun kodunu gir.'
      });
      return;
    }

    this.dispatchProductCode(productCode);
  }

  protected dispatchProductCode(productCode: string): void {
    this.runProductDispatch(
      this.entegrasyonIslemleriService.dispatchAxataProduct(productCode),
      `${productCode} canli addSKUMaster`
    );
  }

  protected dispatchSelectedProducts(): void {
    const productCodes = this.parseProductCodes(
      this.productSynchronizationForm.controls.productCodes.value
    );

    if (!productCodes.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Urun listesi bos',
        message: 'Secili urun dispatch icin kodlari virgul veya yeni satirla ayirarak gir.'
      });
      return;
    }

    this.runProductDispatch(
      this.entegrasyonIslemleriService.dispatchAxataProducts({
        productCodes,
        continueOnError: this.productSynchronizationForm.controls.continueOnError.value
      }),
      `${productCodes.length} secili urun`
    );
  }

  protected dispatchProductBatch(): void {
    const take = this.toPositiveNumber(this.productSynchronizationForm.controls.take.value) ?? 20;

    this.runProductDispatch(
      this.entegrasyonIslemleriService.dispatchAxataProducts({
        productCodes: [],
        take,
        continueOnError: this.productSynchronizationForm.controls.continueOnError.value
      }),
      `Sirali ilk ${take} aktif urun`
    );
  }

  protected previewSelectedTask(): void {
    const taskCode = this.selectedTaskCode();
    const warehouseNo = this.resolveWarehouseNo();

    if (this.requiresWarehouseNo() && !warehouseNo) {
      return;
    }

    this.previewLoading.set(true);
    this.preview.set(null);

    this.entegrasyonIslemleriService
      .getAxataSynchronizationTaskPreview(
        taskCode,
        warehouseNo,
        this.toPositiveNumber(this.form.controls.take.value) ?? 10
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.previewLoading.set(false))
      )
      .subscribe({
        next: (preview: AxataSynchronizationTaskPreviewDto) => {
          this.preview.set(preview);
          this.feedback.set({
            tone: 'info',
            title: 'Preview hazir',
            message: `${preview.taskName} icin ${preview.returnedRecordCount} kayitlik payload getirildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Preview alinamadi',
            message: 'Secili task icin preview olusturulamadi. Warehouse ve task secimini kontrol et.'
          });
        }
      });
  }

  protected executeSelectedTask(): void {
    const taskCode = this.selectedTaskCode();
    const warehouseNo = this.resolveWarehouseNo();

    if (this.requiresWarehouseNo() && !warehouseNo) {
      return;
    }

    this.executeLoading.set(true);

    this.entegrasyonIslemleriService
      .executeAxataSynchronizationTask(taskCode, {
        executionMode: this.form.controls.executionMode.value,
        warehouseNo: warehouseNo ?? undefined
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.executeLoading.set(false))
      )
      .subscribe({
        next: (job: IAxataSynchronizationJobApiDto) => {
          this.activeJob.set(this.createPendingJobDetail(job));
          this.feedback.set({
            tone: 'success',
            title: 'Job kuyruga alindi',
            message: `${job.taskName} ${job.executionMode} modunda calistiriliyor. Durum otomatik izlenecek.`
          });
          this.pollJob(job.jobId);
          this.loadOverview();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Job baslatilamadi',
            message: 'Secili task execute edilirken hata alindi. DryRun/Outbox ve warehouse degerlerini kontrol et.'
          });
        }
      });
  }

  protected executeSelectedTaskViaJobsEndpoint(): void {
    const taskCode = this.selectedTaskCode();
    const warehouseNo = this.resolveWarehouseNo();

    if (this.requiresWarehouseNo() && !warehouseNo) {
      return;
    }

    this.genericJobLoading.set(true);

    this.entegrasyonIslemleriService
      .createAxataSynchronizationJob({
        taskCode,
        executionMode: this.form.controls.executionMode.value,
        warehouseNo: warehouseNo ?? undefined
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.genericJobLoading.set(false))
      )
      .subscribe({
        next: (job: AxataSynchronizationJobDto) => {
          this.activeJob.set(this.createPendingJobDetail(job));
          this.feedback.set({
            tone: 'success',
            title: 'Genel jobs endpointi ile kuyruga alindi',
            message: `${job.taskName} jobs endpointi uzerinden calistirildi. Durum otomatik izlenecek.`
          });
          this.pollJob(job.jobId);
          this.loadOverview();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Jobs endpointi basarisiz',
            message: 'POST /integrations/axata-sync/jobs cagrisi tamamlanamadi.'
          });
        }
      });
  }

  protected isBatchCandidateSelected(
    candidate: IAxataSynchronizationManualDocumentCandidateItemApiDto
  ): boolean {
    const item = this.mapCandidateToBatchItem(candidate);

    if (!item) {
      return false;
    }

    return this.selectedBatchDocuments().some((selected) =>
      this.isSameDocumentSelection(selected, item)
    );
  }

  protected toggleBatchCandidate(
    candidate: IAxataSynchronizationManualDocumentCandidateItemApiDto
  ): void {
    const item = this.mapCandidateToBatchItem(candidate);

    if (!item) {
      this.feedback.set({
        tone: 'error',
        title: 'Aday batch secimine uygun degil',
        message: 'Secili task icin aday kayitta gerekli belge alanlari eksik.'
      });
      return;
    }

    this.selectedBatchDocuments.update((items: IAxataSynchronizationManualDocumentItemApiDto[]) => {
      const exists = items.some((selected) => this.isSameDocumentSelection(selected, item));

      if (exists) {
        return items.filter((selected) => !this.isSameDocumentSelection(selected, item));
      }

      return [...items, item];
    });
  }

  protected addCurrentManualDocumentToBatch(): void {
    const item = this.buildCurrentManualDocumentItem();

    if (!item) {
      return;
    }

    this.selectedBatchDocuments.update((items: IAxataSynchronizationManualDocumentItemApiDto[]) => {
      if (items.some((selected) => this.isSameDocumentSelection(selected, item))) {
        return items;
      }

      return [...items, item];
    });

    this.feedback.set({
      tone: 'info',
      title: 'Belge batch listesine eklendi',
      message: 'Manual formdaki evrak toplu preview/execute listesine tasindi.'
    });
  }

  protected removeBatchDocument(index: number): void {
    this.selectedBatchDocuments.update((items: IAxataSynchronizationManualDocumentItemApiDto[]) =>
      items.filter((_item, itemIndex) => itemIndex !== index)
    );
  }

  protected clearBatchDocuments(): void {
    this.selectedBatchDocuments.set([]);
    this.batchResult.set(null);
  }

  protected previewManualDocumentBatch(): void {
    if (!this.isDocumentTask()) {
      return;
    }

    const request = this.buildBatchDocumentRequest();

    if (!request) {
      return;
    }

    this.batchLoading.set(true);
    this.batchResult.set(null);

    this.entegrasyonIslemleriService
      .previewAxataManualDocumentBatch(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.batchLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDocumentBatchDto) => {
          this.batchResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'Batch preview hazir',
            message: `${result.requestedDocumentCount} evrak icin toplu preview sonucu dondu.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Batch preview alinamadi',
            message: 'Toplu preview cagrisi su anda tamamlanamadi.'
          });
        }
      });
  }

  protected executeManualDocumentBatch(): void {
    if (!this.isDocumentTask()) {
      return;
    }

    const request = this.buildBatchDocumentExecuteRequest();

    if (!request) {
      return;
    }

    this.batchLoading.set(true);

    this.entegrasyonIslemleriService
      .executeAxataManualDocumentBatch(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.batchLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDocumentBatchDto) => {
          this.batchResult.set(result);
          this.feedback.set({
            tone: result.failedDocumentCount > 0 ? 'info' : 'success',
            title: 'Batch execute tamamlandi',
            message: `${result.succeededDocumentCount} basarili, ${result.failedDocumentCount} hatali evrak raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Batch execute basarisiz',
            message: 'Toplu execute cagrisi tamamlanamadi.'
          });
        }
      });
  }

  protected submitManualIncomingCompanyReceiving(): void {
    const request =
      this.parseJsonText<IAxataManualIncomingCompanyReceivingRequestApiDto>(
        this.incomingJsonForm.controls.companyReceivingJson.value,
        'Firma mal kabul single JSON'
      );

    if (!request) {
      return;
    }

    this.incomingCompanyLoading.set(true);

    this.entegrasyonIslemleriService
      .createManualIncomingCompanyReceiving(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingCompanyLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingCompanyReceivingResponseDto) => {
          this.incomingCompanyReceivingResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'Firma mal kabul olusturuldu',
            message: `${result.documentSerie}.${result.documentOrderNo} basariyla kaydedildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Firma mal kabul olusturulamadi',
            message: 'Manual incoming company receiving single endpointi hata dondu.'
          });
        }
      });
  }

  protected submitManualIncomingCompanyReceivingBatch(): void {
    const request =
      this.parseJsonText<IAxataManualIncomingCompanyReceivingBatchRequestApiDto>(
        this.incomingJsonForm.controls.companyReceivingBatchJson.value,
        'Firma mal kabul batch JSON'
      );

    if (!request) {
      return;
    }

    this.incomingCompanyLoading.set(true);

    this.entegrasyonIslemleriService
      .createManualIncomingCompanyReceivingBatch(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingCompanyLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingCompanyReceivingBatchResponseDto) => {
          this.incomingCompanyReceivingBatchResult.set(result);
          this.feedback.set({
            tone: result.failedCount > 0 ? 'info' : 'success',
            title: 'Firma mal kabul batch tamamlandi',
            message: `${result.succeededCount} basarili, ${result.failedCount} hatali kayit raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Firma mal kabul batch basarisiz',
            message: 'Manual incoming company receivings batch endpointi hata dondu.'
          });
        }
      });
  }

  protected submitManualIncomingInventoryCount(): void {
    const request = this.parseJsonText<IAxataManualIncomingInventoryCountRequestApiDto>(
      this.incomingJsonForm.controls.inventoryCountJson.value,
      'Sayim single JSON'
    );

    if (!request) {
      return;
    }

    this.incomingInventoryLoading.set(true);

    this.entegrasyonIslemleriService
      .createManualIncomingInventoryCount(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingInventoryLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingInventoryCountResponseDto) => {
          this.incomingInventoryCountResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'Sayim sonucu olusturuldu',
            message: `${result.documentNo} nolu sayim sonucu basariyla kaydedildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Sayim sonucu olusturulamadi',
            message: 'Manual incoming inventory count single endpointi hata dondu.'
          });
        }
      });
  }

  protected submitManualIncomingInventoryCountBatch(): void {
    const request = this.parseJsonText<IAxataManualIncomingInventoryCountBatchRequestApiDto>(
      this.incomingJsonForm.controls.inventoryCountBatchJson.value,
      'Sayim batch JSON'
    );

    if (!request) {
      return;
    }

    this.incomingInventoryLoading.set(true);

    this.entegrasyonIslemleriService
      .createManualIncomingInventoryCountBatch(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingInventoryLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingInventoryCountBatchResponseDto) => {
          this.incomingInventoryCountBatchResult.set(result);
          this.feedback.set({
            tone: result.failedCount > 0 ? 'info' : 'success',
            title: 'Sayim batch tamamlandi',
            message: `${result.succeededCount} basarili, ${result.failedCount} hatali kayit raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Sayim batch basarisiz',
            message: 'Manual incoming inventory counts batch endpointi hata dondu.'
          });
        }
      });
  }

  protected loadIncomingWarehouseReceivings(): void {
    const warehouseNo = this.toPositiveNumber(this.incomingWarehouseForm.controls.warehouseNo.value);
    const startDate = this.incomingWarehouseForm.controls.startDate.value.trim();
    const endDate = this.incomingWarehouseForm.controls.endDate.value.trim();

    if (!warehouseNo || !startDate || !endDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Depo mal kabul filtreleri eksik',
        message: 'Warehouse, baslangic ve bitis tarihleri zorunlu.'
      });
      return;
    }

    this.incomingWarehouseLoading.set(true);

    this.entegrasyonIslemleriService
      .getManualIncomingWarehouseReceivings(warehouseNo, startDate, endDate)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingWarehouseLoading.set(false))
      )
      .subscribe({
        next: (items: AxataManualIncomingWarehouseReceivingListItemDto[]) => {
          this.incomingWarehouseReceivings.set(items ?? []);
          this.feedback.set({
            tone: 'info',
            title: 'Bekleyen depo kabulleri listelendi',
            message: `${items.length} kayit getirildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Bekleyen depo kabulleri getirilemedi',
            message: 'manual/incoming/warehouse-receivings list endpointi hata dondu.'
          });
        }
      });
  }

  protected loadIncomingWarehouseReceivingDetail(
    item?: AxataManualIncomingWarehouseReceivingListItemDto
  ): void {
    if (item) {
      this.incomingWarehouseForm.patchValue(
        {
          detailSerie: item.documentSerie,
          detailOrderNo: item.documentOrderNo
        },
        { emitEvent: false }
      );
    }

    const warehouseNo = this.toPositiveNumber(this.incomingWarehouseForm.controls.warehouseNo.value);
    const detailSerie = this.incomingWarehouseForm.controls.detailSerie.value.trim();
    const detailOrderNo = this.toPositiveNumber(this.incomingWarehouseForm.controls.detailOrderNo.value);

    if (!warehouseNo || !detailSerie || !detailOrderNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Detay referansi eksik',
        message: 'Warehouse, seri ve sira bilgisi ile detay getirilmelidir.'
      });
      return;
    }

    this.incomingWarehouseDetailLoading.set(true);

    this.entegrasyonIslemleriService
      .getManualIncomingWarehouseReceivingDetail(detailSerie, detailOrderNo, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingWarehouseDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: AxataManualIncomingWarehouseReceivingDetailDto) => {
          this.incomingWarehouseReceivingDetail.set(detail);
          this.incomingWarehouseLineDrafts.set(
            (detail.items ?? []).map((line) => ({
              movementGuid: line.movementGuid,
              stockCode: line.stockCode,
              stockName: line.stockName,
              shippedQuantity: line.quantity,
              receivedQuantity: line.quantity
            }))
          );
          this.feedback.set({
            tone: 'info',
            title: 'Depo kabul detayi hazir',
            message: `${detail.header.documentSerie}.${detail.header.documentOrderNo} kabul formuna tasindi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Depo kabul detayi okunamadi',
            message: 'manual/incoming/warehouse-receivings detay endpointi hata dondu.'
          });
        }
      });
  }

  protected updateIncomingWarehouseReceivedQuantity(
    movementGuid: string,
    rawValue: string
  ): void {
    const nextValue = Math.max(0, Number(rawValue) || 0);

    this.incomingWarehouseLineDrafts.update((items: IncomingWarehouseLineDraft[]) =>
      items.map((item: IncomingWarehouseLineDraft) =>
        item.movementGuid === movementGuid
          ? {
              ...item,
              receivedQuantity: nextValue
            }
          : item
      )
    );
  }

  protected acceptIncomingWarehouseReceiving(): void {
    const request = this.buildIncomingWarehouseAcceptRequest();
    const detail = this.incomingWarehouseReceivingDetail();

    if (!request || !detail?.header) {
      return;
    }

    this.incomingWarehouseAcceptLoading.set(true);

    this.entegrasyonIslemleriService
      .acceptManualIncomingWarehouseReceiving(
        detail.header.documentSerie,
        detail.header.documentOrderNo,
        request
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingWarehouseAcceptLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingWarehouseReceivingAcceptResponseDto) => {
          this.incomingWarehouseAcceptResult.set(result);
          this.feedback.set({
            tone: result.hasDiscrepancy ? 'info' : 'success',
            title: 'Depo kabul tamamlandi',
            message: `${result.documentSerie}.${result.documentOrderNo} icin kabul sonucu kaydedildi.`
          });
          this.loadIncomingWarehouseReceivings();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Depo kabul basarisiz',
            message: 'Tekli incoming warehouse receiving accept endpointi hata dondu.'
          });
        }
      });
  }

  protected enqueueIncomingWarehouseReceivingBatch(): void {
    const request = this.buildIncomingWarehouseAcceptRequest();
    const detail = this.incomingWarehouseReceivingDetail();

    if (!request || !detail?.header) {
      return;
    }

    const queueItem: IncomingWarehouseBatchQueueItem = {
      reference: `${detail.header.documentSerie}.${detail.header.documentOrderNo}`,
      documentSerie: detail.header.documentSerie,
      documentOrderNo: detail.header.documentOrderNo,
      allowDiscrepancy: request.allowDiscrepancy,
      lines: request.lines
    };

    this.incomingWarehouseBatchQueue.update((items: IncomingWarehouseBatchQueueItem[]) => {
      const nextItems = items.filter((item) => item.reference !== queueItem.reference);
      return [...nextItems, queueItem];
    });

    this.feedback.set({
      tone: 'info',
      title: 'Depo kabul batch sirasina eklendi',
      message: `${queueItem.reference} toplu kabul listesine tasindi.`
    });
  }

  protected removeIncomingWarehouseBatchItem(reference: string): void {
    this.incomingWarehouseBatchQueue.update((items: IncomingWarehouseBatchQueueItem[]) =>
      items.filter((item) => item.reference !== reference)
    );
  }

  protected clearIncomingWarehouseBatchQueue(): void {
    this.incomingWarehouseBatchQueue.set([]);
    this.incomingWarehouseBatchResult.set(null);
  }

  protected acceptIncomingWarehouseReceivingBatch(): void {
    const items = this.incomingWarehouseBatchQueue();

    if (!items.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Batch kabul listesi bos',
        message: 'Toplu kabul icin once en az bir evragi kuyruga eklemelisin.'
      });
      return;
    }

    this.incomingWarehouseAcceptLoading.set(true);

    this.entegrasyonIslemleriService
      .acceptManualIncomingWarehouseReceivingBatch({
        continueOnError: this.incomingWarehouseForm.controls.continueOnError.value,
        items: items.map((item: IncomingWarehouseBatchQueueItem) => ({
          documentSerie: item.documentSerie,
          documentOrderNo: item.documentOrderNo,
          allowDiscrepancy: item.allowDiscrepancy,
          lines: item.lines
        }))
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.incomingWarehouseAcceptLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualIncomingWarehouseReceivingBatchResponseDto) => {
          this.incomingWarehouseBatchResult.set(result);
          this.feedback.set({
            tone: result.failedCount > 0 ? 'info' : 'success',
            title: 'Depo kabul batch tamamlandi',
            message: `${result.succeededCount} basarili, ${result.failedCount} hatali kayit raporlandi.`
          });
          this.loadIncomingWarehouseReceivings();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Depo kabul batch basarisiz',
            message: 'Toplu incoming warehouse receiving accept endpointi hata dondu.'
          });
        }
      });
  }

  protected loadManualCandidates(): void {
    if (!this.isDocumentTask()) {
      this.feedback.set({
        tone: 'info',
        title: 'Manuel evrak adayi yok',
        message: 'Manuel aday listesi yalnizca evrak bazli tasklar icin kullanilir.'
      });
      return;
    }

    const warehouseNo = this.resolveWarehouseNo(true);
    const startDate = this.form.controls.candidateStartDate.value.trim();
    const endDate = this.form.controls.candidateEndDate.value.trim();
    const skip = this.getCandidateSkip();
    const take = this.getCandidateTake();

    if (!warehouseNo || !startDate || !endDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Aday filtreleri eksik',
        message: 'Warehouse, baslangic ve bitis tarihlerini doldurman gerekiyor.'
      });
      return;
    }

    this.candidateLoading.set(true);
    this.manualCandidates.set(null);

    this.entegrasyonIslemleriService
      .getAxataManualDocumentCandidates(this.selectedTaskCode(), {
        warehouseNo,
        startDate,
        endDate,
        skip,
        take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.candidateLoading.set(false))
      )
      .subscribe({
        next: (candidates: AxataSynchronizationManualDocumentCandidatesDto) => {
          this.manualCandidates.set(candidates);
          this.form.controls.candidateSkip.setValue(
            this.getCandidateSkippedRecordCount(candidates),
            { emitEvent: false }
          );
          this.feedback.set({
            tone: 'info',
            title: 'Adaylar hazir',
            message: `${this.formatCandidatePageSummary(candidates)} araliginda ${candidates.returnedRecordCount} evrak listelendi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Aday liste alinamadi',
            message: 'Manuel kurtarma adaylari getirilemedi. Tarih araligi ve warehouse bilgisini kontrol et.'
          });
        }
      });
  }

  protected applyCandidate(candidate: IAxataSynchronizationManualDocumentCandidateItemApiDto): void {
    this.form.patchValue(
      {
        manualDocumentSerie: candidate.documentSerie ?? '',
        manualDocumentOrderNo: candidate.documentOrderNo,
        manualDocumentNo: candidate.documentNo,
        manualDocumentDate: candidate.documentDate?.slice(0, 10) || this.getToday()
      },
      { emitEvent: false }
    );

    this.feedback.set({
      tone: 'info',
      title: 'Aday forma tasindi',
      message: `${candidate.documentReference} icin manuel preview veya execute adimina gecilebilir.`
    });
  }

  protected previewManualDocument(): void {
    if (!this.isDocumentTask()) {
      return;
    }

    const request = this.buildManualDocumentRequest();

    if (!request) {
      return;
    }

    this.manualLoading.set(true);
    this.manualDocumentResult.set(null);

    this.entegrasyonIslemleriService
      .previewAxataManualDocument(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.manualLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDocumentDto) => {
          this.manualDocumentResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'Manuel preview hazir',
            message: `${result.documentReference} icin payload uretilip kontrol paneline yansitildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Manuel preview alinamadi',
            message: 'Secilen evrak icin manuel preview olusturulamadi.'
          });
        }
      });
  }

  protected executeManualDocument(): void {
    if (!this.isDocumentTask()) {
      return;
    }

    const request = this.buildManualDocumentExecuteRequest();

    if (!request) {
      return;
    }

    this.manualLoading.set(true);

    this.entegrasyonIslemleriService
      .executeAxataManualDocument(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.manualLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDocumentDto) => {
          this.manualDocumentResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'Manuel execute tamamlandi',
            message: `${result.documentReference} ${result.executionMode} modunda islenip sonucu ekrana yazildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Manuel execute basarisiz',
            message: 'Secilen evrak tekli kurtarma akisi ile islenemedi.'
          });
        }
      });
  }

  protected dispatchManualDocument(): void {
    if (!this.isDocumentTask() || !this.supportsLiveDispatch()) {
      return;
    }

    const request = this.buildManualDocumentRequest();

    if (!request) {
      return;
    }

    this.dispatchLoading.set(true);
    this.manualDispatchResult.set(null);

    this.entegrasyonIslemleriService
      .dispatchAxataManualDocument(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.dispatchLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDispatchDto) => {
          this.manualDispatchResult.set(result);
          this.feedback.set({
            tone: result.isSuccess ? 'success' : 'info',
            title: result.isSuccess ? 'Canli dispatch tamamlandi' : 'Canli dispatch cevap verdi',
            message:
              result.serviceMessage?.trim() ||
              `${result.documentReference} icin AXATA canli dispatch sonucu ekrana yazildi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Canli dispatch basarisiz',
            message: 'Secili evrak AXATA canli dispatch endpointi ile gonderilemedi.'
          });
        }
      });
  }

  protected dispatchManualDocumentBatch(): void {
    if (!this.isDocumentTask() || !this.supportsLiveDispatch()) {
      return;
    }

    const request = this.buildBatchDocumentRequest();

    if (!request) {
      return;
    }

    this.dispatchLoading.set(true);
    this.manualDispatchBatchResult.set(null);

    this.entegrasyonIslemleriService
      .dispatchAxataManualDocumentBatch(this.selectedTaskCode(), request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.dispatchLoading.set(false))
      )
      .subscribe({
        next: (result: AxataSynchronizationManualDispatchBatchDto) => {
          this.manualDispatchBatchResult.set(result);
          this.feedback.set({
            tone: result.failedDocumentCount > 0 ? 'info' : 'success',
            title: 'Canli dispatch batch tamamlandi',
            message: `${result.succeededDocumentCount} basarili, ${result.failedDocumentCount} hatali dispatch raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Canli dispatch batch basarisiz',
            message: 'Toplu AXATA dispatch cagrisi su anda tamamlanamadi.'
          });
        }
      });
  }

  protected submitAxataOutboundDelivery(): void {
    const request = this.parseJsonText<IAxataOutboundDeliveryRequestApiDto>(
      this.axataBridgeForm.controls.outboundDeliveryJson.value,
      'AXATA outbound delivery single JSON'
    );

    if (!request) {
      return;
    }

    this.axataOutboundLoading.set(true);

    this.entegrasyonIslemleriService
      .createAxataOutboundDeliveryInterWarehouseShipment(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.axataOutboundLoading.set(false))
      )
      .subscribe({
        next: (result: AxataOutboundDeliveryResponseDto) => {
          this.axataOutboundResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'AXATA outbound delivery islendi',
            message: `${result.documentSerie}.${result.documentOrderNo} nolu depolar arasi sevk olusturuldu.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'AXATA outbound delivery basarisiz',
            message: 'Tekli outbound delivery -> inter warehouse shipment donusumu tamamlanamadi.'
          });
        }
      });
  }

  protected submitAxataOutboundDeliveryBatch(): void {
    const request = this.parseJsonText<IAxataOutboundDeliveryBatchRequestApiDto>(
      this.axataBridgeForm.controls.outboundDeliveryBatchJson.value,
      'AXATA outbound delivery batch JSON'
    );

    if (!request) {
      return;
    }

    this.axataOutboundLoading.set(true);

    this.entegrasyonIslemleriService
      .createAxataOutboundDeliveryInterWarehouseShipmentBatch(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.axataOutboundLoading.set(false))
      )
      .subscribe({
        next: (result: AxataManualOutboundDeliveryBatchResponseDto) => {
          this.axataOutboundBatchResult.set(result);
          this.feedback.set({
            tone: result.failedCount > 0 ? 'info' : 'success',
            title: 'AXATA outbound delivery batch tamamlandi',
            message: `${result.succeededCount} basarili, ${result.failedCount} hatali kayit raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'AXATA outbound delivery batch basarisiz',
            message: 'Coklu outbound delivery -> shipment donusumu tamamlanamadi.'
          });
        }
      });
  }

  protected submitAxataInboundAtfCompanyReceiving(): void {
    const request = this.parseJsonText<IAxataInboundAtfCompanyReceivingRequestApiDto>(
      this.axataBridgeForm.controls.inboundAtfJson.value,
      'AXATA inbound ATF single JSON'
    );

    if (!request) {
      return;
    }

    this.axataInboundAtfLoading.set(true);

    this.entegrasyonIslemleriService
      .createAxataInboundAtfCompanyReceiving(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.axataInboundAtfLoading.set(false))
      )
      .subscribe({
        next: (result: AxataInboundAtfCompanyReceivingResponseDto) => {
          this.axataInboundAtfResult.set(result);
          this.feedback.set({
            tone: 'success',
            title: 'AXATA inbound ATF islendi',
            message: `${result.documentSerie}.${result.documentOrderNo} nolu firma mal kabul kaydi olusturuldu.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'AXATA inbound ATF basarisiz',
            message: 'Tekli inbound ATF -> company receiving donusumu tamamlanamadi.'
          });
        }
      });
  }

  protected submitAxataInboundAtfCompanyReceivingBatch(): void {
    const request = this.parseJsonText<IAxataInboundAtfCompanyReceivingBatchRequestApiDto>(
      this.axataBridgeForm.controls.inboundAtfBatchJson.value,
      'AXATA inbound ATF batch JSON'
    );

    if (!request) {
      return;
    }

    this.axataInboundAtfLoading.set(true);

    this.entegrasyonIslemleriService
      .createAxataInboundAtfCompanyReceivingBatch(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.axataInboundAtfLoading.set(false))
      )
      .subscribe({
        next: (result: AxataInboundAtfCompanyReceivingBatchResponseDto) => {
          this.axataInboundAtfBatchResult.set(result);
          this.feedback.set({
            tone: result.failedCount > 0 ? 'info' : 'success',
            title: 'AXATA inbound ATF batch tamamlandi',
            message: `${result.succeededCount} basarili, ${result.failedCount} hatali kayit raporlandi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'AXATA inbound ATF batch basarisiz',
            message: 'Coklu inbound ATF -> company receiving donusumu tamamlanamadi.'
          });
        }
      });
  }

  protected formatStatus(status: string | null | undefined): string {
    const normalizedStatus = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

    switch (normalizedStatus) {
      case 'queued':
        return 'Kuyrukta';
      case 'running':
        return 'Calisiyor';
      case 'succeeded':
        return 'Basarili';
      case 'failed':
        return 'Basarisiz';
      case 'cancelled':
        return 'Iptal';
      case 'healthy':
        return 'Saglikli';
      case 'warning':
        return 'Uyari';
      case 'unhealthy':
        return 'Sorunlu';
      default:
        return status?.trim() || 'Bilinmiyor';
    }
  }

  protected getStatusTone(status: string | null | undefined): string {
    const normalizedStatus = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (
      normalizedStatus === 'succeeded' ||
      normalizedStatus === 'healthy' ||
      normalizedStatus === 'enabled'
    ) {
      return 'status-pill-success';
    }

    if (
      normalizedStatus === 'queued' ||
      normalizedStatus === 'running' ||
      normalizedStatus === 'warning'
    ) {
      return 'status-pill-warn';
    }

    if (
      normalizedStatus === 'failed' ||
      normalizedStatus === 'cancelled' ||
      normalizedStatus === 'unhealthy' ||
      normalizedStatus === 'disabled'
    ) {
      return 'status-pill-danger';
    }

    return 'status-pill-neutral';
  }

  protected getAuditOperationTone(
    operation: IAxataIntegrationAuditOperationApiDto
  ): string {
    const normalizedSeverity = operation.severity?.trim().toLocaleLowerCase('tr-TR') ?? '';
    const normalizedState = operation.state?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (
      normalizedSeverity === 'critical' ||
      normalizedSeverity === 'error' ||
      normalizedSeverity === 'danger'
    ) {
      return 'status-pill-danger';
    }

    if (
      normalizedSeverity === 'warning' ||
      normalizedSeverity === 'warn' ||
      normalizedState.includes('missing') ||
      normalizedState.includes('pending')
    ) {
      return 'status-pill-warn';
    }

    if (
      normalizedSeverity === 'success' ||
      normalizedSeverity === 'ok' ||
      normalizedState === 'ok' ||
      normalizedState === 'insync'
    ) {
      return 'status-pill-success';
    }

    return 'status-pill-neutral';
  }

  protected getAuditInsightClass(tone: AuditInsightTone): string {
    switch (tone) {
      case 'success':
        return 'audit-card-success';
      case 'warn':
        return 'audit-card-warn';
      case 'danger':
        return 'audit-card-danger';
      default:
        return 'audit-card-neutral';
    }
  }

  protected formatAuditState(value: string | null | undefined): string {
    const normalizedValue = value?.trim().toLocaleLowerCase('tr-TR') ?? '';

    switch (normalizedValue) {
      case 'ok':
        return 'Sorun yok';
      case 'actionrequired':
        return 'Aksiyon gerekli';
      case 'warning':
        return 'Kontrol gerekli';
      default:
        return value?.trim() || '-';
    }
  }

  protected getAuditOutboundDeliveryTone(
    item: IAxataAuditOutboundDeliveryApiDto
  ): string {
    const status = item.status?.trim();
    const state = item.mikroCheckState?.trim();

    if (
      item.isCancelled ||
      item.cancellationCode ||
      state === 'CancelledInAxata' ||
      state === 'EmptyAxataDelivery'
    ) {
      return 'status-pill-neutral';
    }

    if (status === '1' && state === 'Synchronized') {
      return 'status-pill-success';
    }

    if (
      (status === '0' && state === 'ReadyForImport') ||
      state === 'MikroShipmentExistsPendingAck'
    ) {
      return 'status-pill-warn';
    }

    if (status === '1' && state === 'ReadyForImport') {
      return 'status-pill-danger';
    }

    if (
      state === 'OrderNotFound' ||
      state === 'OrderLineMismatch' ||
      state === 'Blocked'
    ) {
      return 'status-pill-danger';
    }

    return status === '0' ? 'status-pill-warn' : 'status-pill-neutral';
  }

  protected formatAuditShipmentState(item: IAxataAuditOutboundDeliveryApiDto): string {
    const state = item.mikroCheckState?.trim();
    const status = item.status?.trim();

    if (item.isCancelled || state === 'CancelledInAxata') {
      return item.cancellationCode
        ? `Iptal (${item.cancellationCode})`
        : 'Iptal / zero sevk';
    }

    if (state === 'EmptyAxataDelivery') {
      return 'Bos sevk';
    }

    if (status === '1' && state === 'Synchronized') {
      return 'Tamamlandi';
    }

    if (status === '0' && state === 'ReadyForImport') {
      return 'Aktarilabilir';
    }

    if (state === 'MikroShipmentExistsPendingAck') {
      return 'ACK bekliyor';
    }

    if (status === '1' && state === 'ReadyForImport') {
      return 'Mikro donus eksik';
    }

    if (
      state === 'OrderNotFound' ||
      state === 'OrderLineMismatch' ||
      state === 'Blocked'
    ) {
      return 'Manuel inceleme';
    }

    return item.axataShipmentState?.trim() || (status === '0' ? 'Bekliyor' : 'Tamamlandi');
  }

  protected getAuditOutboundDeliveryActionLabel(
    item: IAxataPendingOutboundDeliveryApiDto
  ): string {
    if (this.isMikroShipmentExistsPendingAck(item)) {
      return 'ACK Formu';
    }

    return item.status?.trim() === '1' ? 'Rescue Formu' : 'Import Formu';
  }

  protected canApplyPendingDeliveryToC01Rescue(
    item: IAxataPendingOutboundDeliveryApiDto
  ): boolean {
    const state = item.mikroCheckState?.trim();

    return (
      item.movementType === 'C01' &&
      !!item.documentOrderNo &&
      (item.canIntervene ||
        state === 'ReadyForImport' ||
        state === 'MikroShipmentExistsPendingAck')
    );
  }

  protected formatMikroCheckState(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      Synchronized: 'Senkron',
      ReadyForImport: 'Aktarilabilir',
      MikroShipmentExistsPendingAck: 'Mikro var, ACK bekliyor',
      OrderNotFound: 'Siparis bulunamadi',
      OrderLineMismatch: 'Satir eslesmedi',
      Blocked: 'Blokeli',
      CancelledInAxata: 'AXATA iptal / zero',
      EmptyAxataDelivery: 'Bos sevk'
    };

    return value ? labels[value] ?? value : '-';
  }

  private isMikroShipmentExistsPendingAck(
    item: IAxataPendingOutboundDeliveryApiDto
  ): boolean {
    return item.mikroCheckState?.trim() === 'MikroShipmentExistsPendingAck';
  }

  protected getRecommendedActionTone(
    action: IAxataOrderRecommendedActionApiDto
  ): string {
    const severity = action.severity?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (severity === 'critical' || severity === 'error') {
      return 'status-pill-danger';
    }

    if (severity === 'warning' || severity === 'warn') {
      return 'status-pill-warn';
    }

    if (severity === 'success') {
      return 'status-pill-success';
    }

    return 'status-pill-neutral';
  }

  protected formatWorkflowState(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      Found: 'Bulundu',
      NotFound: 'Bulunamadi',
      Unknown: 'Dogrulanamadi',
      QuantityMismatch: 'Miktar farki',
      WaitingForAxataShipment: 'AXATA sevki bekleniyor',
      PartiallyShipped: 'Kismi sevk',
      FullyShipped: 'Tam sevk',
      OverShipped: 'Fazla sevk',
      CancelledInAxata: 'AXATA iptal / zero',
      WaitingForMikroTransfer: 'Mikro aktarimi bekliyor',
      PartiallyLinked: 'Kismi Mikro linki',
      FullyLinked: 'Mikro linki tamam',
      FullySynchronized: 'Tam senkron'
    };

    return value ? labels[value] ?? value : '-';
  }

  protected getMissingShipmentLineRate(
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): number {
    return this.toPercent(item.missingMovementLinkLineCount, item.lineCount);
  }

  protected getMissingShipmentQuantityRate(
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): number {
    return this.toPercent(item.missingMovementLinkQuantity, item.totalQuantity);
  }

  protected getMissingShipmentGroupRate(group: MissingShipmentWarehouseGroup): number {
    return this.toPercent(group.missingLineCount, group.totalLineCount);
  }

  protected getShipmentDifferenceLineRate(
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): number {
    return this.toPercent(item.differenceLineCount, item.lineCount);
  }

  protected getShipmentDifferenceQuantityRate(
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): number {
    return this.toPercent(item.differenceQuantity, item.totalQuantity);
  }

  protected formatShipmentDifferenceReason(value: string | null | undefined): string {
    const normalizedValue = value?.trim().toLocaleLowerCase('tr-TR') ?? '';

    switch (normalizedValue) {
      case 'missingmovementlinkandquantitydifference':
        return 'Link ve miktar farki';
      case 'missingmovementlink':
        return 'Link eksigi';
      case 'quantitydifference':
        return 'Miktar farki';
      case 'none':
        return 'Fark yok';
      default:
        return value?.trim() || '-';
    }
  }

  protected formatTimestamp(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(parsedValue);
  }

  protected formatDuration(durationMs: number | null | undefined): string {
    if (!durationMs || durationMs <= 0) {
      return '-';
    }

    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }

    return `${(durationMs / 1000).toFixed(1)} sn`;
  }

  protected formatExecutionMode(mode: string | null | undefined): string {
    if (mode === 'DryRun') {
      return 'Dry Run';
    }

    if (mode === 'Outbox') {
      return 'Outbox';
    }

    return mode?.trim() || '-';
  }

  protected formatFlow(value: string | null | undefined): string {
    return value?.trim().replace(/->/g, ' -> ') || '-';
  }

  protected formatQueueMovementType(value: string | null | undefined): string {
    if (value === 'C4') {
      return 'C4 (C04)';
    }

    return value?.trim() || '-';
  }

  protected formatArtifactLabel(artifact: IAxataSynchronizationJobArtifactApiDto): string {
    return `${artifact.kind}: ${artifact.name}`;
  }

  protected formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected formatSelectedBatchDocument(
    item: IAxataSynchronizationManualDocumentItemApiDto
  ): string {
    if (this.isInventoryCountTask()) {
      return `${item.documentNo ?? '-'} / ${item.documentDate ?? '-'}`;
    }

    return `${item.documentSerie ?? '-'} / ${item.documentOrderNo ?? '-'}`;
  }

  protected trackByTask = (_index: number, task: IAxataSynchronizationTaskApiDto): string =>
    task.code;

  protected trackByJob = (_index: number, job: IAxataSynchronizationJobApiDto): string =>
    job.jobId;

  protected trackByProbe = (_index: number, probe: IAxataSynchronizationProbeApiDto): string =>
    probe.name;

  protected trackByRecentJob = (_index: number, job: IAxataSynchronizationJobApiDto): string =>
    job.jobId;

  protected trackByFetchProfile = (
    _index: number,
    profile: IAxataSynchronizationFetchProfileApiDto
  ): string => profile.code;

  protected trackByPreviewItem = (
    _index: number,
    item: IAxataSynchronizationPreviewItemApiDto
  ): string => item.key;

  protected trackByCandidate = (
    _index: number,
    item: IAxataSynchronizationManualDocumentCandidateItemApiDto
  ): string => item.documentReference;
  protected trackBySelectedBatchDocument = (
    _index: number,
    item: IAxataSynchronizationManualDocumentItemApiDto
  ): string => this.formatSelectedBatchDocument(item);
  protected trackByIncomingWarehouseReceiving = (
    _index: number,
    item: AxataManualIncomingWarehouseReceivingListItemDto
  ): string => `${item.documentSerie}|${item.documentOrderNo}`;
  protected trackByIncomingWarehouseLine = (
    _index: number,
    item: IncomingWarehouseLineDraft
  ): string => item.movementGuid;
  protected trackByIncomingWarehouseBatchItem = (
    _index: number,
    item: IncomingWarehouseBatchQueueItem
  ): string => item.reference;
  protected trackByQueuePreviewDocument = (
    _index: number,
    item: IAxataOutboundDeliveryQueueDocumentApiDto
  ): string => `${item.movementType}|${item.axataSequenceNo}|${item.axataDeliveryNo}`;
  protected trackByOutboundDeliveryByDate = (
    _index: number,
    item: IAxataOutboundDeliveryByDateItemApiDto
  ): string => `${item.axataSequenceNo}|${item.axataDeliveryNo}|${item.documentSerie}|${item.documentOrderNo ?? ''}`;
  protected trackByAuditOperation = (
    _index: number,
    item: IAxataIntegrationAuditOperationApiDto
  ): string => item.code;
  protected trackByAuditInsightCard = (_index: number, item: AuditInsightCard): string =>
    item.label;
  protected trackByMissingShipmentWarehouseGroup = (
    _index: number,
    item: MissingShipmentWarehouseGroup
  ): string => `${item.warehouseNo}`;
  protected trackByUnsyncedWarehouseOrder = (
    _index: number,
    item: IAxataUnsyncedWarehouseOrderApiDto
  ): string => `${item.documentSerie}|${item.documentOrderNo}`;
  protected trackByMissingShipment = (
    _index: number,
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): string => `${item.documentSerie}|${item.documentOrderNo}`;
  protected trackByShipmentDifference = (
    _index: number,
    item: IAxataSentWarehouseOrderMissingShipmentApiDto
  ): string => `${item.documentSerie}|${item.documentOrderNo}|${item.differenceReason}`;
  protected trackByPendingDelivery = (
    _index: number,
    item: IAxataPendingOutboundDeliveryApiDto
  ): string => `${item.movementType}|${item.axataSequenceNo}|${item.axataDeliveryNo}`;
  protected trackByAuditOutboundDelivery = (
    _index: number,
    item: IAxataAuditOutboundDeliveryApiDto
  ): string => `${item.status}|${item.movementType}|${item.axataSequenceNo}|${item.axataDeliveryNo}`;
  protected trackByOrderLifecycle = (
    _index: number,
    item: IAxataOrderLifecycleApiDto
  ): string => `${item.documentSerie}|${item.documentOrderNo}`;
  protected trackByProductSynchronizationItem = (
    _index: number,
    item: IAxataProductSynchronizationItemApiDto
  ): string => item.productCode;
  protected trackByProductSynchronizationResult = (
    _index: number,
    item: IAxataProductSynchronizationResultApiDto
  ): string => item.productCode;

  private mapCandidateToBatchItem(
    candidate: IAxataSynchronizationManualDocumentCandidateItemApiDto
  ): IAxataSynchronizationManualDocumentItemApiDto | null {
    if (this.isInventoryCountTask()) {
      if (!candidate.documentNo || !candidate.documentDate) {
        return null;
      }

      return {
        documentNo: candidate.documentNo,
        documentDate: candidate.documentDate
      };
    }

    if (!candidate.documentSerie || !candidate.documentOrderNo) {
      return null;
    }

    return {
      documentSerie: candidate.documentSerie,
      documentOrderNo: candidate.documentOrderNo
    };
  }

  private runProductDispatch(
    request$: ReturnType<EntegrasyonIslemleriService['dispatchAxataProducts']>,
    operationLabel: string
  ): void {
    this.productDispatchLoading.set(true);
    this.productSynchronizationResult.set(null);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.productDispatchLoading.set(false))
      )
      .subscribe({
        next: (result: AxataProductSynchronizationExecuteDto) => {
          this.productSynchronizationResult.set(result);
          this.feedback.set({
            tone: result.failedProductCount ? 'info' : 'success',
            title: result.failedProductCount
              ? 'Urun dispatch kismi tamamlandi'
              : 'Urun dispatch tamamlandi',
            message: `${operationLabel}: ${result.succeededProductCount} basarili, ${result.failedProductCount} hatali.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Canli urun dispatch basarisiz',
            message: `${operationLabel} AXATA addSKUMaster operasyonuna gonderilemedi.`
          });
        }
      });
  }

  private parseProductCodes(value: string): string[] {
    return value
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter((item, index, items) => !!item && items.indexOf(item) === index);
  }

  private buildCurrentManualDocumentItem(): IAxataSynchronizationManualDocumentItemApiDto | null {
    if (this.isInventoryCountTask()) {
      const documentNo = this.toPositiveNumber(this.form.controls.manualDocumentNo.value);
      const documentDate = this.form.controls.manualDocumentDate.value.trim();

      if (!documentNo || !documentDate) {
        this.feedback.set({
          tone: 'error',
          title: 'Batch evrak referansi eksik',
          message: 'Inventory count batch secimi icin document no ve document date gerekli.'
        });
        return null;
      }

      return {
        documentNo,
        documentDate
      };
    }

    const documentSerie = this.form.controls.manualDocumentSerie.value.trim();
    const documentOrderNo = this.toPositiveNumber(this.form.controls.manualDocumentOrderNo.value);

    if (!documentSerie || !documentOrderNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Batch evrak referansi eksik',
        message: 'Batch secimi icin document serie ve order no gerekli.'
      });
      return null;
    }

    return {
      documentSerie,
      documentOrderNo
    };
  }

  private isSameDocumentSelection(
    left: IAxataSynchronizationManualDocumentItemApiDto,
    right: IAxataSynchronizationManualDocumentItemApiDto
  ): boolean {
    return (
      (left.documentSerie ?? '') === (right.documentSerie ?? '') &&
      (left.documentOrderNo ?? null) === (right.documentOrderNo ?? null) &&
      (left.documentNo ?? null) === (right.documentNo ?? null) &&
      (left.documentDate ?? '') === (right.documentDate ?? '')
    );
  }

  private buildBatchDocumentRequest(): IAxataSynchronizationManualDocumentBatchRequestApiDto | null {
    const warehouseNo = this.resolveWarehouseNo(true);

    if (!warehouseNo) {
      return null;
    }

    const documents = this.selectedBatchDocuments();

    if (!documents.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Batch secimi bos',
        message: 'Toplu preview veya execute icin en az bir evrak secmelisin.'
      });
      return null;
    }

    return {
      warehouseNo,
      continueOnError: this.batchForm.controls.continueOnError.value,
      documents
    };
  }

  private buildBatchDocumentExecuteRequest():
    | (IAxataSynchronizationManualDocumentBatchRequestApiDto & {
        executionMode: IAxataExecutionMode;
      })
    | null {
    const request = this.buildBatchDocumentRequest();

    if (!request) {
      return null;
    }

    return {
      ...request,
      executionMode: this.form.controls.executionMode.value
    };
  }

  private buildIncomingWarehouseAcceptRequest(): IFurpaAcceptWarehouseReceivingRequestApiDto | null {
    const drafts = this.incomingWarehouseLineDrafts();

    if (!drafts.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Kabul satiri yok',
        message: 'Accept islemi icin once bir depo kabul detayi yuklenmeli.'
      });
      return null;
    }

    return {
      allowDiscrepancy: this.incomingWarehouseForm.controls.allowDiscrepancy.value,
      lines: drafts.map((item: IncomingWarehouseLineDraft) => ({
        movementGuid: item.movementGuid,
        receivedQuantity: item.receivedQuantity
      }))
    };
  }

  private parseJsonText<T>(value: string, label: string): T | null {
    if (!value.trim()) {
      this.feedback.set({
        tone: 'error',
        title: 'JSON bos',
        message: `${label} alani bos birakilamaz.`
      });
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      this.feedback.set({
        tone: 'error',
        title: 'JSON parse edilemedi',
        message: `${label} icindeki JSON formati gecersiz.`
      });
      return null;
    }
  }

  private pollJob(jobId: string): void {
    timer(0, 3000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.entegrasyonIslemleriService.getAxataSynchronizationJobDetail(jobId)),
        takeWhile(
          (job: AxataSynchronizationJobDetailDto) => !isAxataJobTerminalStatus(job.status),
          true
        )
      )
      .subscribe({
        next: (job: AxataSynchronizationJobDetailDto) => {
          this.activeJob.set(job);

          if (!isAxataJobTerminalStatus(job.status)) {
            return;
          }

          this.feedback.set({
            tone: job.status?.trim().toLocaleLowerCase('tr-TR') === 'succeeded' ? 'success' : 'error',
            title:
              job.status?.trim().toLocaleLowerCase('tr-TR') === 'succeeded'
                ? 'Job tamamlandi'
                : 'Job hata ile bitti',
            message:
              job.message?.trim() ||
              job.errorMessage?.trim() ||
              `${job.taskName} icin durum ${this.formatStatus(job.status)} olarak dondu.`
          });
          this.loadOverview();
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Job durumu okunamadi',
            message: 'Arka plandaki job icin detay endpointi okunamadi.'
          });
        }
      });
  }

  private createPendingJobDetail(
    job: IAxataSynchronizationJobApiDto
  ): AxataSynchronizationJobDetailDto {
    return {
      ...job,
      requestedByUserId: null,
      startedAtUtc: null,
      completedAtUtc: null,
      affectedRecordCount: 0,
      message: null,
      errorMessage: null,
      artifacts: []
    };
  }

  private buildC01DocumentRescueReference():
    | {
        documentSerie: string;
        documentOrderNo: number;
        status?: string;
      }
    | null {
    const documentSerie = this.c01DocumentRescueForm.controls.documentSerie.value.trim();
    const documentOrderNo = this.toPositiveNumber(
      this.c01DocumentRescueForm.controls.documentOrderNo.value
    );
    const status = this.normalizeAxataStatus(this.c01DocumentRescueForm.controls.status.value);

    if (!documentSerie || !documentOrderNo) {
      this.feedback.set({
        tone: 'error',
        title: 'C01 belge referansi eksik',
        message: 'Belge bazli rescue icin seri ve sira bilgisi zorunlu.'
      });
      return null;
    }

    if (this.c01DocumentRescueForm.controls.status.value.trim() && !status) {
      this.feedback.set({
        tone: 'error',
        title: 'AXATA status gecersiz',
        message: 'Belge bazli rescue status alani bos, 0 veya 1 olmalidir.'
      });
      return null;
    }

    return {
      documentSerie,
      documentOrderNo,
      status: status ?? undefined
    };
  }

  private buildManualDocumentRequest(
  ):
    | {
        warehouseNo?: number;
        documentSerie?: string;
        documentOrderNo?: number;
        documentNo?: number;
        documentDate?: string;
      }
    | null {
    const warehouseNo = this.resolveWarehouseNo(true);

    if (!warehouseNo) {
      return null;
    }

    if (this.isInventoryCountTask()) {
      const documentNo = this.toPositiveNumber(this.form.controls.manualDocumentNo.value);
      const documentDate = this.form.controls.manualDocumentDate.value.trim();

      if (!documentNo || !documentDate) {
        this.feedback.set({
          tone: 'error',
          title: 'Sayim evragi eksik',
          message: 'Inventory count manual islemi icin document no ve document date zorunlu.'
        });
        return null;
      }

      return {
        warehouseNo,
        documentNo,
        documentDate
      };
    }

    const documentSerie = this.form.controls.manualDocumentSerie.value.trim();
    const documentOrderNo = this.toPositiveNumber(this.form.controls.manualDocumentOrderNo.value);

    if (!documentSerie || !documentOrderNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Evrak referansi eksik',
        message: 'Manual preview/execute icin seri ve sira bilgisi zorunlu.'
      });
      return null;
    }

    return {
      warehouseNo,
      documentSerie,
      documentOrderNo
    };
  }

  private buildManualDocumentExecuteRequest():
    | {
        warehouseNo?: number;
        documentSerie?: string;
        documentOrderNo?: number;
        documentNo?: number;
        documentDate?: string;
        executionMode: IAxataExecutionMode;
      }
    | null {
    const request = this.buildManualDocumentRequest();

    if (!request) {
      return null;
    }

    return {
      ...request,
      executionMode: this.form.controls.executionMode.value
    };
  }

  private resolveWarehouseNo(isRequired = this.requiresWarehouseNo()): number | null {
    const warehouseNo =
      this.toPositiveNumber(this.form.controls.warehouseNo.value) ??
      this.toPositiveNumber(this.currentWarehouseNo());

    if (isRequired && !warehouseNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Warehouse gerekli',
        message: 'Secili task warehouseNo istiyor. JWT deposunu kullan veya alani doldur.'
      });
      return null;
    }

    return warehouseNo;
  }

  private normalizeQueueMovementType(value: string): AxataQueueMovementType {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue === 'C04') {
      return 'C4';
    }

    if (this.queueMovementTypes.includes(normalizedValue as AxataQueueMovementType)) {
      return normalizedValue as AxataQueueMovementType;
    }

    return 'C02';
  }

  private normalizeAxataStatus(value: string | null | undefined): string | null {
    const normalizedValue = value?.trim();

    if (normalizedValue === '0' || normalizedValue === '1') {
      return normalizedValue;
    }

    return null;
  }

  private normalizeAuditStatuses(value: string | null | undefined): string | null {
    const statuses = (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item, index, items) => (item === '0' || item === '1') && items.indexOf(item) === index);

    return statuses.length ? statuses.join(',') : null;
  }

  private getCandidateTake(): number {
    return Math.min(this.toPositiveNumber(this.form.controls.candidateTake.value) ?? 25, 100);
  }

  private getCandidateSkip(): number {
    return this.toNonNegativeNumber(this.form.controls.candidateSkip.value) ?? 0;
  }

  private getCandidateSkippedRecordCount(
    candidates: AxataSynchronizationManualDocumentCandidatesDto
  ): number {
    return this.toNonNegativeNumber(candidates.skippedRecordCount) ?? this.getCandidateSkip();
  }

  private toPositiveNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }

    return null;
  }

  private toNonNegativeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        return parsedValue;
      }
    }

    return null;
  }

  private toPercent(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (value / total) * 100));
  }

  protected tryParseJson(value: string | null | undefined): unknown {
    if (!value?.trim()) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getRelativeDate(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getManualIncomingCompanyReceivingTemplate(): string {
    return this.formatJson({
      clientRequestId: 'd8d0f3d6-5c62-4c67-b6b7-0f5d76b81b6f',
      customerCode: '120.01.03106',
      movementDate: this.getToday(),
      documentDate: this.getToday(),
      documentNo: 'ST12026000002395',
      deliverer: 'Teslim Eden',
      receiver: 'Teslim Alan',
      description: '',
      allowOrderOverReceiving: false,
      autoCreateReturnForPartialAcceptance: true,
      lines: [
        {
          stockCode: '015792',
          dispatchQuantity: 10,
          acceptedQuantity: 8,
          unitPrice: 0,
          unitPointer: 1,
          lastConsumingDate: '2026-12-31',
          orderGuid: '1bb2b4fe-b722-4e67-9d4b-050b6d87e800',
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: '',
          customerResponsibilityCenter: '',
          productResponsibilityCenter: ''
        }
      ]
    });
  }

  private getManualIncomingCompanyReceivingBatchTemplate(): string {
    return this.formatJson({
      continueOnError: true,
      items: [
        JSON.parse(this.getManualIncomingCompanyReceivingTemplate())
      ]
    });
  }

  private getManualIncomingInventoryCountTemplate(): string {
    return this.formatJson({
      name: 'Nisan 2026 Genel Sayim',
      documentDate: this.getToday(),
      lines: [
        {
          stockCode: '015792',
          quantity: 24,
          barcode: '8690000000012',
          unitPointer: 1
        }
      ]
    });
  }

  private getManualIncomingInventoryCountBatchTemplate(): string {
    return this.formatJson({
      continueOnError: true,
      items: [
        JSON.parse(this.getManualIncomingInventoryCountTemplate())
      ]
    });
  }

  private getAxataOutboundDeliveryTemplate(): string {
    return this.formatJson({
      sourceWarehouseNo: 110,
      targetWarehouseNo: 50,
      transitWarehouseNo: 60,
      movementDate: this.getToday(),
      documentDate: this.getToday(),
      documentNo: 'AXT-OUT-0001',
      axataDeliveryNo: 'AXATA-DEL-1001',
      movementCode: 'C01',
      description: '',
      lines: [
        {
          lineNo: 1,
          stockCode: '015550',
          quantity: 10,
          unitPrice: 0,
          unitPointer: 1,
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: '',
          customerResponsibilityCenter: '',
          productResponsibilityCenter: ''
        }
      ]
    });
  }

  private getAxataOutboundDeliveryBatchTemplate(): string {
    return this.formatJson({
      continueOnError: true,
      items: [
        JSON.parse(this.getAxataOutboundDeliveryTemplate())
      ]
    });
  }

  private getAxataInboundAtfCompanyReceivingTemplate(): string {
    return this.formatJson({
      warehouseNo: 110,
      customerCode: '120.01.03106',
      movementDate: this.getToday(),
      documentDate: this.getToday(),
      documentNo: 'ATF-000123',
      axataOrderNo: 'AXATA-ORDER-1001',
      invoiceNo: 'IRS-000123',
      deliverer: 'Teslim Eden',
      receiver: 'Teslim Alan',
      description: '',
      allowOrderOverReceiving: false,
      lines: [
        {
          lineNo: 1,
          stockCode: '015792',
          quantity: 6,
          unitPrice: 0,
          unitPointer: 1,
          lastConsumingDate: '2026-12-31',
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: '',
          customerResponsibilityCenter: '',
          productResponsibilityCenter: ''
        }
      ]
    });
  }

  private getAxataInboundAtfCompanyReceivingBatchTemplate(): string {
    return this.formatJson({
      continueOnError: true,
      items: [
        JSON.parse(this.getAxataInboundAtfCompanyReceivingTemplate())
      ]
    });
  }
}
