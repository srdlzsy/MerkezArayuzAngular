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
type FeedbackTone = 'success' | 'error' | 'info';

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
  response: ModuleActionScaffoldResponseDto;
}

const POS_ACCOUNTING_TABS: readonly PosAccountingTabDefinition[] = [
  {
    id: 'z-raporlari',
    label: 'Z Raporlari',
    subtitle: 'Staging import, detay inceleme ve ERP transfer iskeleti.',
    description:
      'Liste, detay, ice aktar, ERPye gonder ve staging silme aksiyonlari gelecekte bu tabda bulusacak.',
    routes: [
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari',
      'GET /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/{reportId}',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar',
      'POST /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder',
      'DELETE /api/entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari'
    ],
    toolbarActions: ['Ice aktar', 'Detay', 'ERPye gonder', 'Sil'],
    futureColumns: ['Durum', 'Tarih', 'Z No', 'Kasa No', 'Sube', 'Toplam'],
    notes: [
      'Sil aksiyonu staging kaydini temizler; ERPde olusan fis silme butonu gibi sunulmamalidir.',
      'ERPye gonder toplu secim mantigiyla tasarlanmistir.',
      'Detay akisi header + KDV satiri + odeme satiri panellerine bolunmelidir.'
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
      'Toplu ERP gonderim secimi ileride coklu secim modeline baglanacaktir.'
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
      'Business veri henuz yok; placeholder kartlari ile bos durum anlatilmalidir.'
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
      'Gercek veri gelene kadar create/update butonlari scaffold mesajiyla birlikte gorunmelidir.'
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
  protected readonly overview = signal<ModuleActionScaffoldResponseDto | null>(null);
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
    description: new FormControl<string>('Scaffold denemesi', { nonNullable: true })
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
    this.overview() ? this.formatJson(this.overview()) : ''
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
      value: this.overview()?.isImplemented === false ? 'Scaffold / 501' : 'Aktif'
    },
    {
      label: 'Son Aksiyon',
      value: this.activeTabAction()?.label || this.overviewAction()?.label || 'Henuz yok'
    }
  ]);
  protected readonly stagingLanguage = [
    'ice aktar = kaynaktan staginge cek',
    'ERPye gonder = stagingden muhasebe kaydina donustur',
    'sil = staging kaydini temizle',
    'guncelle = staging header verisini duzenle'
  ] as const;
  protected readonly criticalBoundaries = [
    'Bugun route, yetki ve HTTP contractlari acik; business response DTOlari henuz yok.',
    'Tum endpointler su an 501 Not Implemented donebilir; UI bunu hata degil scaffold bilgisi olarak anlatmalidir.',
    'Liste/detay kartlari bugunden cizilebilir, fakat veri alani yerine placeholder ve response mesaji gosterilmelidir.'
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
    this.executeScaffoldRequest(
      'overview',
      'Menu overview',
      null,
      {
        route: '/api/entegrasyon-islemleri/pos-muhasebe-aktarimi'
      },
      this.entegrasyonIslemleriService.getPosAccountingOverview(),
      (state: PosAccountingActionState) => {
        this.overview.set(state.response);
        this.overviewAction.set(state);
      }
    );
  }

  protected loadZReportsList(): void {
    const request = this.buildDateRangeRequest();

    this.executeScaffoldRequest(
      'z-list',
      'Z raporlari listele',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.getPosAccountingZReports(request)
    );
  }

  protected loadZReportDetail(): void {
    const reportId = this.detailForm.controls.reportId.value.trim();

    if (!reportId) {
      this.raiseMissingField('Report Id');
      return;
    }

    this.executeScaffoldRequest(
      'z-detail',
      'Z raporu detay',
      'z-raporlari',
      {
        reportId
      },
      this.entegrasyonIslemleriService.getPosAccountingZReportDetail(reportId)
    );
  }

  protected importZReports(): void {
    const request = this.buildZReportImportRequest();

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'z-delete',
      'Z raporu staging sil',
      'z-raporlari',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingZReports(request)
    );
  }

  protected loadInvoicesList(): void {
    const request = this.buildDateRangeRequest();

    this.executeScaffoldRequest(
      'invoice-list',
      'POS faturalar listele',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.getPosAccountingInvoices(request)
    );
  }

  protected loadInvoiceDetail(): void {
    const invoiceId = this.detailForm.controls.invoiceId.value.trim();

    if (!invoiceId) {
      this.raiseMissingField('Invoice Id');
      return;
    }

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'invoice-transfer',
      'POS fatura ERPye gonder',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.transferPosAccountingInvoices(request)
    );
  }

  protected updateInvoice(): void {
    const resourceId = this.updateForm.controls.resourceId.value.trim();

    if (!resourceId) {
      this.raiseMissingField('Invoice Id');
      return;
    }

    const request = this.buildUpdateRequest();

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'invoice-delete',
      'POS fatura staging sil',
      'pos-faturalar',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingInvoices(request)
    );
  }

  protected loadExpenseNotesList(): void {
    const request = this.buildDateRangeRequest();

    this.executeScaffoldRequest(
      'expense-list',
      'Gider pusulalari listele',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.getPosAccountingExpenseNotes(request)
    );
  }

  protected loadExpenseNoteDetail(): void {
    const expenseId = this.detailForm.controls.expenseId.value.trim();

    if (!expenseId) {
      this.raiseMissingField('Expense Id');
      return;
    }

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'expense-transfer',
      'Gider pusulasi ERPye gonder',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.transferPosAccountingExpenseNotes(request)
    );
  }

  protected updateExpenseNote(): void {
    const resourceId = this.updateForm.controls.resourceId.value.trim();

    if (!resourceId) {
      this.raiseMissingField('Expense Id');
      return;
    }

    const request = this.buildUpdateRequest();

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'expense-delete',
      'Gider pusulasi staging sil',
      'gider-pusulalari',
      request,
      this.entegrasyonIslemleriService.deletePosAccountingExpenseNotes(request)
    );
  }

  protected loadCashRegisterMappings(): void {
    const request = this.buildMappingListRequest();

    this.executeScaffoldRequest(
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

    this.executeScaffoldRequest(
      'mapping-create',
      'Kasa eslemesi olustur',
      'kasa-eslemeleri',
      request,
      this.entegrasyonIslemleriService.createPosAccountingCashRegisterMapping(request)
    );
  }

  protected updateCashRegisterMapping(): void {
    const mappingId = this.mappingForm.controls.mappingId.value.trim();

    if (!mappingId) {
      this.raiseMissingField('Mapping Id');
      return;
    }

    const request = this.buildMappingRequest();

    if (!request) {
      return;
    }

    this.executeScaffoldRequest(
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

    if (state.status >= 500 || state.response.isImplemented === false) {
      return 'status-pill-warn';
    }

    return 'status-pill-success';
  }

  private executeScaffoldRequest(
    actionKey: string,
    actionLabel: string,
    tabId: PosAccountingTabId | null,
    requestPreview: unknown,
    request$: Observable<ModuleActionScaffoldResponseDto>,
    onState?: (state: PosAccountingActionState) => void
  ): void {
    this.busyAction.set(actionKey);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: ModuleActionScaffoldResponseDto) => {
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

    const isScaffold = state.status === 501 || state.response.isImplemented === false;
    this.feedback.set({
      tone: isScaffold ? 'info' : 'success',
      title: isScaffold
        ? `${state.label}: backend scaffold modunda`
        : `${state.label}: basarili`,
      message: state.response.message
    });
  }

  private buildActionState(
    label: string,
    status: number,
    requestPreview: unknown,
    response: ModuleActionScaffoldResponseDto
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

    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    if (
      'moduleCode' in payload &&
      'menuCode' in payload &&
      'actionCode' in payload &&
      'httpMethod' in payload &&
      'permissionCode' in payload &&
      'route' in payload &&
      'isImplemented' in payload &&
      'message' in payload
    ) {
      return payload as ModuleActionScaffoldResponseDto;
    }

    return null;
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
      importMode: this.zReportImportForm.controls.importMode.value.trim() || null,
      sourceCode: this.zReportImportForm.controls.sourceCode.value.trim() || null,
      overwriteExisting: this.zReportImportForm.controls.overwriteExisting.value
    };
  }

  private buildDocumentImportRequest(): IImportPosDocumentsHttpRequestApiDto {
    return {
      warehouseNo: this.documentImportForm.controls.warehouseNo.value,
      businessDate: this.documentImportForm.controls.businessDate.value || null,
      includePreviouslyImported:
        this.documentImportForm.controls.includePreviouslyImported.value,
      overwriteExisting: this.documentImportForm.controls.overwriteExisting.value
    };
  }

  private buildTransferRequest(): IPosAccountingTransferHttpRequestApiDto | null {
    const documentIds = this.parseDocumentIds(this.transferForm.controls.documentIdsText.value);

    if (!documentIds.length) {
      this.raiseMissingField('Document Id listesi');
      return null;
    }

    return {
      warehouseNo: this.transferForm.controls.warehouseNo.value,
      documentIds,
      continueOnError: this.transferForm.controls.continueOnError.value
    };
  }

  private buildDeleteRequest(): IPosAccountingDeleteHttpRequestApiDto | null {
    const documentIds = this.parseDocumentIds(this.deleteForm.controls.documentIdsText.value);

    if (!documentIds.length) {
      this.raiseMissingField('Silinecek Document Id listesi');
      return null;
    }

    return {
      warehouseNo: this.deleteForm.controls.warehouseNo.value,
      documentIds
    };
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

  private parseDocumentIds(rawValue: string): string[] {
    return rawValue
      .split(/[\s,;\r\n]+/)
      .map((item) => item.trim())
      .filter((item, index, items) => !!item && items.indexOf(item) === index);
  }

  private normalizeOptionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private raiseMissingField(fieldLabel: string): void {
    this.feedback.set({
      tone: 'error',
      title: 'Gerekli alan eksik',
      message: `${fieldLabel} girmeden bu scaffold aksiyonu cagrilamaz.`
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
