import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import type {
  ICashRegisterBranchMappingHttpRequestApiDto,
  ICashRegisterBranchMappingListHttpRequestApiDto,
  IImportPosDocumentsHttpRequestApiDto,
  IImportZReportsHttpRequestApiDto,
  IPosAccountingOperationResultApiDto,
  IPosAccountingOverviewApiDto,
  IPosAccountingDateRangeHttpRequestApiDto,
  IPosAccountingDeleteHttpRequestApiDto,
  IPosAccountingTransferHttpRequestApiDto,
  IUpdatePosAccountingDocumentHttpRequestApiDto
} from '@interfaces';

import {
  EntegrasyonIslemleriService,
  ModuleActionScaffoldResponseDto
} from '../../../../../core/api/module-services/entegrasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type PosAccountingTabId =
  | 'z-raporlari'
  | 'pos-faturalar'
  | 'gider-pusulalari'
  | 'kasa-eslemeleri';
type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

interface PosAccountingTabDefinition {
  id: PosAccountingTabId;
  label: string;
  subtitle: string;
  description: string;
  routes: readonly string[];
  toolbarActions: readonly string[];
  futureColumns: readonly string[];
  notes: readonly string[];
}

interface PosAccountingFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface PosAccountingActionState {
  label: string;
  status: number;
  occurredAt: string;
  requestPreview: unknown;
  response: unknown;
}

interface PosAccountingSummaryItem {
  label: string;
  value: string;
}

type PosAccountingIdPayload = Pick<
  IPosAccountingTransferHttpRequestApiDto,
  'documentIds' | 'totalIds' | 'invoiceIds' | 'expenseIds'
>;

const POS_ACCOUNTING_TABS: readonly PosAccountingTabDefinition[] = [
  {
    id: 'z-raporlari',
    label: 'Z Raporlari',
    subtitle: 'Staging liste, detay inceleme ve aktif ERP transfer akisi.',
    description:
      'Mevcut staging Z raporlari listelenir, detay incelenir, ERPye gonderilir ve staging kaydi temizlenebilir.',
    routes: [
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/{totalId}',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder',
      'DELETE /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari'
    ],
    toolbarActions: ['Ice aktar', 'Detay', 'ERPye gonder', 'Sil'],
    futureColumns: ['Durum', 'Tarih', 'Z No', 'Kasa No', 'Sube', 'Toplam'],
    notes: [
      'Sil aksiyonu staging kaydini temizler; ERPde olusan fis silme butonu gibi sunulmamalidir.',
      'ERPye gonder totalIds koleksiyonu ile calisir ve basarili kayitlarda IsSent bilgisini true yapar.',
      'Detay akisi header + KDV satiri + odeme satiri panellerine bolunmelidir.',
      'Z raporu dosya ice aktar endpointi parser hazir olana kadar basarisiz import satirlari dondurebilir.',
      'Batch result mesajlari fis no veya yevmiye no bilgisini satir bazli tasiyabilir.'
    ]
  },
  {
    id: 'pos-faturalar',
    label: 'POS Faturalar',
    subtitle: 'Liste, detay, import, update ve ERP transfer iskeleti.',
    description:
      'POS satis faturalarinin staginge alinmasi, header duzeyi guncellenmesi ve ERPye aktarilmasi bu tabin hedefidir.',
    routes: [
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar',
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/ice-aktar',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/erpye-gonder',
      'PUT /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/{invoiceId}',
      'DELETE /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar'
    ],
    toolbarActions: ['Ice aktar', 'Detay', 'Guncelle', 'ERPye gonder', 'Sil'],
    futureColumns: ['Tarih', 'Belge No', 'Musteri Vergi No', 'Odeme Tipi', 'Sube', 'Durum'],
    notes: [
      'Bu fazda satir duzeyi update kontrati yok; ekran header agirlikli tasarlanmalidir.',
      'Liste aksiyonu tarih bazli calisacakmis gibi simdiden kurulmalidir.',
      'Toplu ERP gonderim secimi invoiceIds koleksiyonu ile calisir.',
      'Import kaynagi Furpa/Mayday PosFaturas ve opsiyonel Vera FATURA verisini birlestirir.',
      'ERPye gonder odeme tipi, satis ve KDV satirlarini Mikro muhasebe fisine yazar.'
    ]
  },
  {
    id: 'gider-pusulalari',
    label: 'Gider Pusulalari',
    subtitle: 'POS faturalarla paralel staging ve ERP transfer omurgasi.',
    description:
      'Liste, detay, import, update ve ERPye gonder akisi POS faturalarla ayni deneyim dilinde ilerlemelidir.',
    routes: [
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari',
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/ice-aktar',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/erpye-gonder',
      'PUT /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/{expenseId}',
      'DELETE /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari'
    ],
    toolbarActions: ['Ice aktar', 'Detay', 'Guncelle', 'ERPye gonder', 'Sil'],
    futureColumns: ['Tarih', 'Belge No', 'Aciklama', 'Sube', 'Durum', 'Toplam'],
    notes: [
      'POS faturalar tabiyla ayni liste + detay deneyimi korunmalidir.',
      'Header agirlikli update semantigi bu tabda da korunur.',
      'Toplu ERP gonderim ve silme expenseIds koleksiyonu ile calisir.',
      'Import yalniz BelgeTuru = 4 Furpa kaynakli gider pusulalarini staginge yazar.',
      'ERPye gonder odeme, gider ve indirilecek KDV satirlarini Mikro muhasebe fisine yazar.'
    ]
  },
  {
    id: 'kasa-eslemeleri',
    label: 'Kasa Eslemeleri',
    subtitle: 'Kasa no ile sube arasindaki master-data bakim alani.',
    description:
      'Liste, create ve update kontratlari hazir; inline edit ya da drawer edit mantigi bu tab icin uygundur.',
    routes: [
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri',
      'PUT /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri/{mappingId}'
    ],
    toolbarActions: ['Listele', 'Olustur', 'Guncelle'],
    futureColumns: ['Cash Register No', 'Branch No', 'Branch Name', 'Description'],
    notes: [
      'Bu tab tarih filtresi istemez; master-data mantigiyla ele alinmalidir.',
      'Minimum alanlar cashRegisterNo ve branchNodur.',
      'Create ve update cevaplari CashRegisterBranchMappingDto olarak okunmalidir.'
    ]
  }
];

@Component({
  selector: 'app-pos-muhasebe-aktarimi-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pos-muhasebe-aktarimi-list.component.html',
  styleUrl: './pos-muhasebe-aktarimi-list.component.scss'
})
export class PosMuhasebeAktarimiListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['pos-muhasebe-aktarimi'];
  protected readonly tabs = POS_ACCOUNTING_TABS;
  protected readonly permissionCodes = [
    'entegrasyon-islemleri.pos-muhasebe-aktarimi.list',
    'entegrasyon-islemleri.pos-muhasebe-aktarimi.detail',
    'entegrasyon-islemleri.pos-muhasebe-aktarimi.create',
    'entegrasyon-islemleri.pos-muhasebe-aktarimi.update'
  ] as const;

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly entegrasyonIslemleriService = inject(EntegrasyonIslemleriService);
  private readonly defaultWarehouseNo = this.authService.currentUser()?.depoNo ?? null;

  protected readonly activeTab = signal<PosAccountingTabId>('z-raporlari');
  protected readonly overview = signal<IPosAccountingOverviewApiDto | null>(null);
  protected readonly overviewAction = signal<PosAccountingActionState | null>(null);
  protected readonly tabActions = signal<Record<PosAccountingTabId, PosAccountingActionState | null>>({
    'z-raporlari': null,
    'pos-faturalar': null,
    'gider-pusulalari': null,
    'kasa-eslemeleri': null
  });
  protected readonly feedback = signal<PosAccountingFeedback | null>(null);
  protected readonly busyAction = signal<string | null>(null);

  protected readonly rangeForm = new FormGroup({
    startDate: new FormControl<string>(this.getRelativeDate(6), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(this.defaultWarehouseNo),
    onlyPending: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });
  protected readonly detailForm = new FormGroup({
    reportId: new FormControl<string>('', { nonNullable: true }),
    invoiceId: new FormControl<string>('', { nonNullable: true }),
    expenseId: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly zReportImportForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(this.defaultWarehouseNo),
    businessDate: new FormControl<string>(this.getToday(), {
      nonNullable: true
    }),
    reportPath: new FormControl<string>('', { nonNullable: true }),
    importMode: new FormControl<string>('Daily', { nonNullable: true }),
    sourceCode: new FormControl<string>('POS', { nonNullable: true }),
    overwriteExisting: new FormControl<boolean>(false, { nonNullable: true })
  });
  protected readonly documentImportForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(this.defaultWarehouseNo),
    businessDate: new FormControl<string>(this.getToday(), {
      nonNullable: true
    }),
    includePreviouslyImported: new FormControl<boolean>(false, { nonNullable: true }),
    overwriteExisting: new FormControl<boolean>(false, { nonNullable: true })
  });
  protected readonly transferForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(this.defaultWarehouseNo),
    documentIdsText: new FormControl<string>('', { nonNullable: true }),
    continueOnError: new FormControl<boolean>(true, { nonNullable: true })
  });
  protected readonly deleteForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(this.defaultWarehouseNo),
    documentIdsText: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly updateForm = new FormGroup({
    resourceId: new FormControl<string>('', { nonNullable: true }),
    documentNo: new FormControl<string>('', { nonNullable: true }),
    customerTaxNo: new FormControl<string>('', { nonNullable: true }),
    paymentType: new FormControl<string>('', { nonNullable: true }),
    branchNo: new FormControl<number | null>(this.defaultWarehouseNo),
    description: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly mappingListForm = new FormGroup({
    branchNo: new FormControl<number | null>(this.defaultWarehouseNo),
    cashRegisterNo: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly mappingForm = new FormGroup({
    mappingId: new FormControl<string>('', { nonNullable: true }),
    cashRegisterNo: new FormControl<string>('CR-01', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    branchNo: new FormControl<number | null>(this.defaultWarehouseNo),
    branchName: new FormControl<string>('Kestel 1', { nonNullable: true }),
    description: new FormControl<string>('POS muhasebe esleme denemesi', { nonNullable: true })
  });

  protected readonly currentUserWarehouse = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly activeTabDefinition = computed(
    () =>
      this.tabs.find((tab: PosAccountingTabDefinition) => tab.id === this.activeTab()) ??
      this.tabs[0]
  );
  protected readonly activeTabAction = computed(
    () => this.tabActions()[this.activeTab()] ?? null
  );
  protected readonly activeActionJson = computed(() =>
    this.activeTabAction() ? this.formatJson(this.activeTabAction()!.response) : ''
  );
  protected readonly activeRequestJson = computed(() =>
    this.activeTabAction() ? this.formatJson(this.activeTabAction()!.requestPreview) : ''
  );
  protected readonly overviewJson = computed(() =>
    this.overviewAction() ? this.formatJson(this.overviewAction()!.response) : ''
  );
  protected readonly heroStats = computed(() => [
    {
      label: 'Tab Sayisi',
      value: `${this.tabs.length}`
    },
    {
      label: 'Aktif Sekme',
      value: this.activeTabDefinition().label
    },
    {
      label: 'Calisma Durumu',
      value: this.resolveOverviewStatus()
    },
    {
      label: 'Son Aksiyon',
      value: this.activeTabAction()?.label || this.overviewAction()?.label || 'Henuz yok'
    }
  ]);
  protected readonly stagingLanguage = [
    'ice aktar = kaynaktan staginge cek',
    'ERPye gonder = stagingden Mikro muhasebe fisi olustur',
    'sil = staging kaydini temizle',
    'guncelle = staging header verisini duzenle'
  ] as const;
  protected readonly criticalBoundaries = [
    'Bu menu artik scaffold response degil, belge tipine gore business DTO dondurur.',
    'Z raporu dosya parseri haric liste, detay, guncelleme, silme ve ERPye gonderme akislari aktif backend endpointlerine baglidir.',
    'Toplu gonderme ve silme requestlerinde belge tipine gore totalIds, invoiceIds veya expenseIds tercih edilir; documentIds geriye uyum alanidir.'
  ] as const;

  constructor() {
    this.loadOverview();
  }

  protected trackByTab(index: number, tab: PosAccountingTabDefinition): string {
    return `${index}-${tab.id}`;
  }

  protected selectTab(tabId: PosAccountingTabId): void {
    this.activeTab.set(tabId);
  }

  protected isBusy(actionKey: string): boolean {
    return this.busyAction() === actionKey;
  }

  protected loadOverview(): void {
    const request = this.buildDateRangeRequest();

    this.executeApiRequest(
      'overview',
      'Menu overview',
      null,
      request,
      this.entegrasyonIslemleriService.getPosAccountingOverview(request),
      (state: PosAccountingActionState) => {
        this.overview.set(
          this.isScaffoldResponse(state.response)
            ? null
            : (state.response as IPosAccountingOverviewApiDto)
        );
        this.overviewAction.set(state);
      }
    );
  }

  protected loadZReportsList(): void {
    const request = this.buildDateRangeRequest();

    this.executeApiRequest(
      'z-list',
      'Z raporlari listele',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.getPosAccountingZReports(request)
    );
  }

  protected loadZReportDetail(): void {
    const totalId = this.parsePositiveInt(this.detailForm.controls.reportId.value, 'Total Id');

    if (totalId === null) {
      return;
    }

    this.executeApiRequest(
      'z-detail',
      'Z raporu detay',
      'z-raporlari',
      {
        totalId
      },
      this.entegrasyonIslemleriService.getPosAccountingZReportDetail(totalId)
    );
  }

  protected importZReports(): void {
    const request = this.buildZReportImportRequest();

    this.executeApiRequest(
      'z-import',
      'Z raporu ice aktar',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.importPosAccountingZReports(request)
    );
  }

  protected transferZReports(): void {
    const request = this.buildTransferRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'z-transfer',
      'Z raporu ERPye gonder',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.transferPosAccountingZReports(request)
    );
  }

  protected deleteZReports(): void {
    const request = this.buildDeleteRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'z-delete',
      'Z raporu staging sil',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingZReports(request)
    );
  }

  protected loadInvoicesList(): void {
    const request = this.buildDateRangeRequest();

    this.executeApiRequest(
      'invoice-list',
      'POS faturalar listele',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.getPosAccountingInvoices(request)
    );
  }

  protected loadInvoiceDetail(): void {
    const invoiceId = this.parsePositiveInt(this.detailForm.controls.invoiceId.value, 'Invoice Id');

    if (invoiceId === null) {
      return;
    }

    this.executeApiRequest(
      'invoice-detail',
      'POS fatura detay',
      'pos-faturalar',
      {
        invoiceId
      },
      this.entegrasyonIslemleriService.getPosAccountingInvoiceDetail(invoiceId)
    );
  }

  protected importInvoices(): void {
    const request = this.buildDocumentImportRequest();

    this.executeApiRequest(
      'invoice-import',
      'POS fatura ice aktar',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.importPosAccountingInvoices(request)
    );
  }

  protected transferInvoices(): void {
    const request = this.buildTransferRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'invoice-transfer',
      'POS fatura ERPye gonder',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.transferPosAccountingInvoices(request)
    );
  }

  protected updateInvoice(): void {
    const resourceId = this.parsePositiveInt(this.updateForm.controls.resourceId.value, 'Invoice Id');

    if (resourceId === null) {
      return;
    }

    const request = this.buildUpdateRequest();

    this.executeApiRequest(
      'invoice-update',
      'POS fatura guncelle',
      'pos-faturalar',
      {
        invoiceId: resourceId,
        ...request
      },
      this.entegrasyonIslemleriService.updatePosAccountingInvoice(resourceId, request)
    );
  }

  protected deleteInvoices(): void {
    const request = this.buildDeleteRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'invoice-delete',
      'POS fatura staging sil',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingInvoices(request)
    );
  }

  protected loadExpenseNotesList(): void {
    const request = this.buildDateRangeRequest();

    this.executeApiRequest(
      'expense-list',
      'Gider pusulalari listele',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.getPosAccountingExpenseNotes(request)
    );
  }

  protected loadExpenseNoteDetail(): void {
    const expenseId = this.parsePositiveInt(this.detailForm.controls.expenseId.value, 'Expense Id');

    if (expenseId === null) {
      return;
    }

    this.executeApiRequest(
      'expense-detail',
      'Gider pusulasi detay',
      'gider-pusulalari',
      {
        expenseId
      },
      this.entegrasyonIslemleriService.getPosAccountingExpenseNoteDetail(expenseId)
    );
  }

  protected importExpenseNotes(): void {
    const request = this.buildDocumentImportRequest();

    this.executeApiRequest(
      'expense-import',
      'Gider pusulasi ice aktar',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.importPosAccountingExpenseNotes(request)
    );
  }

  protected transferExpenseNotes(): void {
    const request = this.buildTransferRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'expense-transfer',
      'Gider pusulasi ERPye gonder',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.transferPosAccountingExpenseNotes(request)
    );
  }

  protected updateExpenseNote(): void {
    const resourceId = this.parsePositiveInt(this.updateForm.controls.resourceId.value, 'Expense Id');

    if (resourceId === null) {
      return;
    }

    const request = this.buildUpdateRequest();

    this.executeApiRequest(
      'expense-update',
      'Gider pusulasi guncelle',
      'gider-pusulalari',
      {
        expenseId: resourceId,
        ...request
      },
      this.entegrasyonIslemleriService.updatePosAccountingExpenseNote(resourceId, request)
    );
  }

  protected deleteExpenseNotes(): void {
    const request = this.buildDeleteRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'expense-delete',
      'Gider pusulasi staging sil',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingExpenseNotes(request)
    );
  }

  protected loadCashRegisterMappings(): void {
    const request = this.buildMappingListRequest();

    this.executeApiRequest(
      'mapping-list',
      'Kasa eslemeleri listele',
      'kasa-eslemeleri',
      request,
      this.entegrasyonIslemleriService.getPosAccountingCashRegisterMappings(request)
    );
  }

  protected createCashRegisterMapping(): void {
    const request = this.buildMappingRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'mapping-create',
      'Kasa eslemesi olustur',
      'kasa-eslemeleri',
      request,
      this.entegrasyonIslemleriService.createPosAccountingCashRegisterMapping(request)
    );
  }

  protected updateCashRegisterMapping(): void {
    const mappingId = this.parsePositiveInt(this.mappingForm.controls.mappingId.value, 'Mapping Id');

    if (mappingId === null) {
      return;
    }

    const request = this.buildMappingRequest();

    if (!request) {
      return;
    }

    this.executeApiRequest(
      'mapping-update',
      'Kasa eslemesi guncelle',
      'kasa-eslemeleri',
      {
        mappingId,
        ...request
      },
      this.entegrasyonIslemleriService.updatePosAccountingCashRegisterMapping(mappingId, request)
    );
  }

  protected formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected formatTimestamp(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
  }

  protected getStatusClass(state: PosAccountingActionState | null): string {
    if (!state) {
      return 'status-pill-neutral';
    }

    if (
      state.status >= 500 ||
      this.isScaffoldResponse(state.response) ||
      this.hasFailedResults(state.response)
    ) {
      return 'status-pill-warn';
    }

    return 'status-pill-success';
  }

  protected getResponseSummaryItems(response: unknown): readonly PosAccountingSummaryItem[] {
    if (this.isScaffoldResponse(response)) {
      return [
        { label: 'Action', value: response.actionCode },
        { label: 'Method', value: response.httpMethod },
        { label: 'Route', value: response.route },
        { label: 'Implemented', value: response.isImplemented ? 'true' : 'false' }
      ];
    }

    if (Array.isArray(response)) {
      return [
        { label: 'Kayit', value: `${response.length}` },
        { label: 'DTO', value: this.resolveArrayResponseName(response) }
      ];
    }

    if (!this.isRecord(response)) {
      return [{ label: 'Response', value: this.formatValue(response) }];
    }

    if (this.isImportResponse(response)) {
      return [
        { label: 'Document Kind', value: this.formatValue(response['documentKind']) },
        { label: 'Imported', value: this.formatValue(response['importedCount']) },
        { label: 'Skipped', value: this.formatValue(response['skippedCount']) },
        { label: 'Errors', value: this.formatValue(response['errorCount']) }
      ];
    }

    if (this.isBatchResponse(response)) {
      return [
        { label: 'Document Kind', value: this.formatValue(response['documentKind']) },
        { label: 'Requested', value: this.formatValue(response['requestedCount']) },
        { label: 'Success', value: this.formatValue(response['successCount']) },
        { label: 'Errors', value: this.formatValue(response['errorCount']) }
      ];
    }

    if (this.isDetailResponse(response)) {
      return [
        { label: 'Header', value: response['header'] ? 'var' : '-' },
        { label: 'Lines', value: this.formatValue(response['lines']) },
        { label: 'Details', value: this.formatValue(response['details']) },
        { label: 'Bank Details', value: this.formatValue(response['bankDetails']) }
      ];
    }

    if ('cashRegisterNo' in response) {
      return [
        { label: 'Mapping Id', value: this.formatValue(response['id']) },
        { label: 'Kasa No', value: this.formatValue(response['cashRegisterNo']) },
        { label: 'Sube No', value: this.formatValue(response['branchNo']) },
        { label: 'Sube', value: this.formatValue(response['branchName']) }
      ];
    }

    return Object.entries(response)
      .filter(([, value]) => this.isSummaryValue(value))
      .slice(0, 4)
      .map(([key, value]) => ({
        label: this.toDisplayLabel(key),
        value: this.formatValue(value)
      }));
  }

  protected getResponseMessage(response: unknown, label: string): string {
    return this.resolveResponseMessage(response, label);
  }

  protected getPreviewRows(response: unknown): readonly Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isRecord(item)).slice(0, 8);
    }

    if (this.isRecord(response)) {
      const header = response['header'];

      if (this.isRecord(header)) {
        return [header];
      }

      if ('cashRegisterNo' in response || 'id' in response) {
        return [response];
      }
    }

    return [];
  }

  protected getPreviewColumns(response: unknown): readonly string[] {
    const firstRow = this.getPreviewRows(response)[0];

    return firstRow ? Object.keys(firstRow).slice(0, 8) : [];
  }

  protected getOperationResults(
    response: unknown
  ): readonly IPosAccountingOperationResultApiDto[] {
    if (!this.isRecord(response) || !Array.isArray(response['results'])) {
      return [];
    }

    return response['results'].filter((item): item is IPosAccountingOperationResultApiDto =>
      this.isOperationResult(item)
    );
  }

  protected formatCell(row: Record<string, unknown>, column: string): string {
    return this.formatValue(row[column]);
  }

  private executeApiRequest<TResponse>(
    actionKey: string,
    actionLabel: string,
    tabId: PosAccountingTabId | null,
    requestPreview: unknown,
    request$: Observable<TResponse>,
    onState?: (state: PosAccountingActionState) => void
  ): void {
    this.busyAction.set(actionKey);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: TResponse) => {
          const state = this.buildActionState(actionLabel, 200, requestPreview, response);
          this.applyActionState(tabId, state, onState);
        },
        error: (error: HttpErrorResponse) => {
          const scaffoldResponse = this.extractScaffoldResponse(error);

          if (scaffoldResponse) {
            const state = this.buildActionState(
              actionLabel,
              error.status || 501,
              requestPreview,
              scaffoldResponse
            );
            this.applyActionState(tabId, state, onState);
            return;
          }

          this.feedback.set({
            tone: 'error',
            title: `${actionLabel} basarisiz`,
            message: this.resolveErrorMessage(
              error,
              `${actionLabel} cagrisi su anda tamamlanamadi.`
            )
          });
        }
      });
  }

  private applyActionState(
    tabId: PosAccountingTabId | null,
    state: PosAccountingActionState,
    onState?: (state: PosAccountingActionState) => void
  ): void {
    if (tabId) {
      this.tabActions.update((value) => ({
        ...value,
        [tabId]: state
      }));
    }

    onState?.(state);

    const isScaffold = this.isScaffoldResponse(state.response);
    const tone = this.resolveResponseTone(state);
    this.feedback.set({
      tone,
      title: isScaffold
        ? `${state.label}: backend scaffold modunda`
        : tone === 'warning'
          ? `${state.label}: uyari var`
          : `${state.label}: basarili`,
      message: this.resolveResponseMessage(state.response, state.label)
    });
  }

  private buildActionState(
    label: string,
    status: number,
    requestPreview: unknown,
    response: unknown
  ): PosAccountingActionState {
    return {
      label,
      status,
      occurredAt: new Date().toISOString(),
      requestPreview,
      response
    };
  }

  private extractScaffoldResponse(
    error: HttpErrorResponse
  ): ModuleActionScaffoldResponseDto | null {
    const payload = error.error;

    return this.isScaffoldResponse(payload) ? payload : null;
  }

  private resolveOverviewStatus(): string {
    const response = this.overviewAction()?.response;

    if (this.isScaffoldResponse(response)) {
      return response.isImplemented === false ? 'Scaffold / 501' : 'Scaffold';
    }

    return this.overview() ? 'Business DTO' : 'Hazir';
  }

  private resolveResponseTone(state: PosAccountingActionState): FeedbackTone {
    if (state.status >= 400 && !this.isScaffoldResponse(state.response)) {
      return 'error';
    }

    if (this.isScaffoldResponse(state.response)) {
      return 'info';
    }

    if (this.hasFailedResults(state.response)) {
      return 'warning';
    }

    return 'success';
  }

  private resolveResponseMessage(response: unknown, label: string): string {
    if (this.isScaffoldResponse(response)) {
      return response.message;
    }

    if (Array.isArray(response)) {
      return `${label} ${response.length} kayit dondurdu.`;
    }

    if (!this.isRecord(response)) {
      return `${label} response alindi.`;
    }

    if (this.isImportResponse(response)) {
      return `${response['documentKind']} import sonucu: ${response['importedCount']} aktarildi, ${response['skippedCount']} atlandi, ${response['errorCount']} hata.`;
    }

    if (this.isBatchResponse(response)) {
      return `${response['documentKind']} batch sonucu: ${response['successCount']}/${response['requestedCount']} basarili, ${response['errorCount']} hata.`;
    }

    return `${label} business DTO response alindi.`;
  }

  private hasFailedResults(response: unknown): boolean {
    if (this.isRecord(response) && typeof response['errorCount'] === 'number' && response['errorCount'] > 0) {
      return true;
    }

    return this.getOperationResults(response).some((item) => item.success === false);
  }

  private isScaffoldResponse(value: unknown): value is ModuleActionScaffoldResponseDto {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      'moduleCode' in value &&
      'menuCode' in value &&
      'actionCode' in value &&
      'httpMethod' in value &&
      'permissionCode' in value &&
      'route' in value &&
      'isImplemented' in value &&
      'message' in value
    );
  }

  private isImportResponse(value: Record<string, unknown>): boolean {
    return (
      'importedCount' in value &&
      'skippedCount' in value &&
      'errorCount' in value &&
      'results' in value
    );
  }

  private isBatchResponse(value: Record<string, unknown>): boolean {
    return (
      'requestedCount' in value &&
      'successCount' in value &&
      'errorCount' in value &&
      'results' in value
    );
  }

  private isDetailResponse(value: Record<string, unknown>): boolean {
    return 'header' in value && ('lines' in value || 'details' in value || 'bankDetails' in value);
  }

  private isOperationResult(value: unknown): value is IPosAccountingOperationResultApiDto {
    return this.isRecord(value) && typeof value['success'] === 'boolean';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isSummaryValue(value: unknown): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private resolveArrayResponseName(value: readonly unknown[]): string {
    const firstItem = value.find((item) => this.isRecord(item));

    if (!this.isRecord(firstItem)) {
      return 'Liste';
    }

    if ('totalId' in firstItem) {
      return 'ZReportListItemDto[]';
    }

    if ('invoiceId' in firstItem) {
      return 'BranchInvoiceListItemDto[]';
    }

    if ('expenseId' in firstItem) {
      return 'ExpenseNoteListItemDto[]';
    }

    if ('cashRegisterNo' in firstItem) {
      return 'CashRegisterBranchMappingDto[]';
    }

    return 'Liste';
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (Array.isArray(value)) {
      return `${value.length} satir`;
    }

    if (typeof value === 'number') {
      return new Intl.NumberFormat('tr-TR', {
        maximumFractionDigits: 2
      }).format(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      return value;
    }

    return 'Object';
  }

  private toDisplayLabel(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase('tr-TR'));
  }

  private buildDateRangeRequest(): IPosAccountingDateRangeHttpRequestApiDto {
    return {
      startDate: this.rangeForm.controls.startDate.value,
      endDate: this.rangeForm.controls.endDate.value,
      warehouseNo: this.rangeForm.controls.warehouseNo.value,
      onlyPending: this.rangeForm.controls.onlyPending.value
    };
  }

  private buildZReportImportRequest(): IImportZReportsHttpRequestApiDto {
    return {
      warehouseNo: this.zReportImportForm.controls.warehouseNo.value,
      businessDate: this.zReportImportForm.controls.businessDate.value || null,
      reportPath: this.normalizeOptionalText(this.zReportImportForm.controls.reportPath.value),
      importMode: this.zReportImportForm.controls.importMode.value.trim() || null,
      sourceCode: this.zReportImportForm.controls.sourceCode.value.trim() || null,
      overwriteExisting: this.zReportImportForm.controls.overwriteExisting.value
    };
  }

  private buildDocumentImportRequest(): IImportPosDocumentsHttpRequestApiDto {
    const businessDate = this.documentImportForm.controls.businessDate.value || null;

    return {
      warehouseNo: this.documentImportForm.controls.warehouseNo.value,
      businessDate,
      dateToGet: businessDate,
      includePreviouslyImported:
        this.documentImportForm.controls.includePreviouslyImported.value,
      overwriteExisting: this.documentImportForm.controls.overwriteExisting.value
    };
  }

  private buildTransferRequest(): IPosAccountingTransferHttpRequestApiDto | null {
    const documentIds = this.parseDocumentIds(this.transferForm.controls.documentIdsText.value);

    if (documentIds === null) {
      return null;
    }

    if (!documentIds.length) {
      this.raiseMissingField(`${this.getActiveIdCollectionLabel()} listesi`);
      return null;
    }

    return {
      warehouseNo: this.transferForm.controls.warehouseNo.value,
      ...this.buildSelectedIdPayload(documentIds),
      continueOnError: this.transferForm.controls.continueOnError.value
    };
  }

  private buildDeleteRequest(): IPosAccountingDeleteHttpRequestApiDto | null {
    const documentIds = this.parseDocumentIds(this.deleteForm.controls.documentIdsText.value);

    if (documentIds === null) {
      return null;
    }

    if (!documentIds.length) {
      this.raiseMissingField(`Silinecek ${this.getActiveIdCollectionLabel()} listesi`);
      return null;
    }

    return {
      warehouseNo: this.deleteForm.controls.warehouseNo.value,
      ...this.buildSelectedIdPayload(documentIds)
    };
  }

  private buildSelectedIdPayload(documentIds: readonly number[]): PosAccountingIdPayload {
    switch (this.activeTab()) {
      case 'z-raporlari':
        return { totalIds: documentIds };
      case 'pos-faturalar':
        return { invoiceIds: documentIds };
      case 'gider-pusulalari':
        return { expenseIds: documentIds };
      default:
        return { documentIds };
    }
  }

  private getActiveIdCollectionLabel(): string {
    switch (this.activeTab()) {
      case 'z-raporlari':
        return 'Total Id';
      case 'pos-faturalar':
        return 'Invoice Id';
      case 'gider-pusulalari':
        return 'Expense Id';
      default:
        return 'Document Id';
    }
  }

  private buildUpdateRequest(): IUpdatePosAccountingDocumentHttpRequestApiDto {
    return {
      documentNo: this.normalizeOptionalText(this.updateForm.controls.documentNo.value),
      customerTaxNo: this.normalizeOptionalText(this.updateForm.controls.customerTaxNo.value),
      paymentType: this.normalizeOptionalText(this.updateForm.controls.paymentType.value),
      branchNo: this.updateForm.controls.branchNo.value,
      description: this.normalizeOptionalText(this.updateForm.controls.description.value)
    };
  }

  private buildMappingListRequest(): ICashRegisterBranchMappingListHttpRequestApiDto {
    return {
      branchNo: this.mappingListForm.controls.branchNo.value,
      cashRegisterNo: this.normalizeOptionalText(
        this.mappingListForm.controls.cashRegisterNo.value
      )
    };
  }

  private buildMappingRequest(): ICashRegisterBranchMappingHttpRequestApiDto | null {
    const cashRegisterNo = this.mappingForm.controls.cashRegisterNo.value.trim();

    if (!cashRegisterNo) {
      this.raiseMissingField('Cash Register No');
      return null;
    }

    return {
      cashRegisterNo,
      branchNo: this.mappingForm.controls.branchNo.value,
      branchName: this.normalizeOptionalText(this.mappingForm.controls.branchName.value),
      description: this.normalizeOptionalText(this.mappingForm.controls.description.value)
    };
  }

  private parseDocumentIds(rawValue: string): number[] | null {
    const tokens = rawValue
      .split(/[\s,;\r\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const invalidTokens = tokens.filter((item) => !/^\d+$/.test(item));

    if (invalidTokens.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Id listesi tipi hatali',
        message: `${this.getActiveIdCollectionLabel()} degerleri int koleksiyonu olmali. Gecersiz deger: ${invalidTokens[0]}`
      });
      return null;
    }

    return Array.from(new Set(tokens.map((item) => Number(item))));
  }

  private parsePositiveInt(rawValue: string, fieldLabel: string): number | null {
    const normalizedValue = rawValue.trim();

    if (!normalizedValue) {
      this.raiseMissingField(fieldLabel);
      return null;
    }

    if (!/^\d+$/.test(normalizedValue)) {
      this.feedback.set({
        tone: 'error',
        title: 'Id tipi hatali',
        message: `${fieldLabel} int tipinde olmalidir.`
      });
      return null;
    }

    return Number(normalizedValue);
  }

  private normalizeOptionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private raiseMissingField(fieldLabel: string): void {
    this.feedback.set({
      tone: 'error',
      title: 'Gerekli alan eksik',
      message: `${fieldLabel} girmeden bu aksiyon cagrilamaz.`
    });
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if ('detail' in error.error && typeof error.error.detail === 'string' && error.error.detail.trim()) {
        return error.error.detail;
      }

      if ('title' in error.error && typeof error.error.title === 'string' && error.error.title.trim()) {
        return error.error.title;
      }
    }

    return fallback;
  }

  private getToday(): string {
    const today = new Date();
    return this.formatDateForInput(today);
  }

  private getRelativeDate(daysBack: number): string {
    const value = new Date();
    value.setDate(value.getDate() - daysBack);
    return this.formatDateForInput(value);
  }

  private formatDateForInput(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
