import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  ProductDistributionBalanceDto,
  ProductDistributionBalanceHttpRequest,
  ProductDistributionCenterDto,
  ProductDistributionDeleteDto,
  ProductDistributionDetailDto,
  ProductDistributionFinalizeDto,
  ProductDistributionLineDto,
  ProductDistributionListHttpRequest,
  ProductDistributionListItemDto,
  ProductDistributionNotificationDto,
  ProductDistributionNotificationRecipientDto,
  ProductDistributionOrderDto,
  ProductDistributionProposalDto,
  ProductLookupItemDto,
  ProductDistributionSaveHttpRequest,
  ProductDistributionStatusDto,
  ProductDistributionSummaryDto
} from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import type { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type FeedbackTone = 'error' | 'info' | 'success' | 'warning';
type DistributionAction = 'list' | 'detail' | 'create' | 'update' | 'delete';

interface DistributionFilters {
  startDate: string;
  endDate: string;
  documentNo: string;
  stockCode: string;
  distributionCenterWarehouseNo: number | null;
  statusCode: number | null;
  take: number;
}

interface DistributionProposalForm {
  stockCode: string;
  distributionCenterWarehouseNo: number | null;
  totalCaseQuantity: number | null;
  salesDayCount: number | null;
  referenceDate: string;
  includeBranchesWithoutSales: boolean;
  distributedBy: string;
}

interface DistributionNotifyForm {
  notifyBy: string;
  markStockOrderingStopped: boolean;
}

interface DistributionFinalizeForm {
  finalizeBy: string;
  orderDate: string;
  deliveryDate: string;
  allowFinalizeWithoutNotification: boolean;
}

interface DistributionFeedback {
  tone: FeedbackTone;
  message: string;
}

const TASK_ID = 'urun-dagilimlari';
const PERMISSION_PREFIX = 'operasyon-islemleri.urun-dagilimlari';

const STATUS_OPTIONS: readonly { value: number | null; label: string }[] = [
  { value: null, label: 'Tum Durumlar' },
  { value: 0, label: 'Kaydedildi' },
  { value: 1, label: 'Bilgilendirildi' },
  { value: 2, label: 'Dagilim Yapildi' }
];

@Component({
  selector: 'app-urun-dagilimlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './urun-dagilimlari-list.component.html',
  styleUrl: './urun-dagilimlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UrunDagilimlariListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly filters: DistributionFilters = {
    startDate: this.getToday(),
    endDate: this.getToday(),
    documentNo: '',
    stockCode: '',
    distributionCenterWarehouseNo: null,
    statusCode: null,
    take: 100
  };
  protected readonly proposalForm: DistributionProposalForm = {
    stockCode: '',
    distributionCenterWarehouseNo: null,
    totalCaseQuantity: null,
    salesDayCount: 42,
    referenceDate: this.getToday(),
    includeBranchesWithoutSales: false,
    distributedBy: 'MERKEZ'
  };
  protected readonly notifyForm: DistributionNotifyForm = {
    notifyBy: 'MERKEZ',
    markStockOrderingStopped: true
  };
  protected readonly finalizeForm: DistributionFinalizeForm = {
    finalizeBy: 'MERKEZ',
    orderDate: this.getToday(),
    deliveryDate: this.getToday(),
    allowFinalizeWithoutNotification: false
  };

  protected readonly centers = signal<ProductDistributionCenterDto[]>([]);
  protected readonly distributions = signal<ProductDistributionListItemDto[]>([]);
  protected readonly proposal = signal<ProductDistributionProposalDto | null>(null);
  protected readonly selectedDetail = signal<ProductDistributionDetailDto | null>(null);
  protected readonly filtersOpen = signal(false);
  protected readonly proposalDialogOpen = signal(false);
  protected readonly detailDialogOpen = signal(false);
  protected readonly feedback = signal<DistributionFeedback | null>(null);
  protected readonly centersLoading = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly proposalLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly balanceLoading = signal(false);
  protected readonly stockSearchResults = signal<ProductLookupItemDto[]>([]);
  protected readonly stockSearchLoading = signal(false);
  protected readonly stockSearchMessage = signal('');

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly aramaService = inject(AramaService);
  private readonly operasyonIslemleriService = inject(OperasyonIslemleriService);
  private listRequestId = 0;
  private detailRequestId = 0;
  private proposalRequestId = 0;
  private stockSearchRequestId = 0;
  private balanceRequestId = 0;

  protected readonly canList = computed(
    () => this.authService.hasTaskAccess(TASK_ID) || this.hasActionPermission('list')
  );
  protected readonly canDetail = computed(() => this.canList() || this.hasActionPermission('detail'));
  protected readonly canCreate = computed(() => this.hasActionPermission('create'));
  protected readonly canUpdate = computed(() => this.hasActionPermission('update'));
  protected readonly canDelete = computed(() => this.hasActionPermission('delete'));
  protected readonly proposalSummary = computed<ProductDistributionSummaryDto | null>(() => {
    const proposal = this.proposal();

    if (!proposal) {
      return null;
    }

    return this.buildSummary(
      proposal.summary,
      proposal.lines ?? [],
      this.resolveTargetCaseQuantity(
        this.proposalForm.totalCaseQuantity,
        proposal.summary?.targetCaseQuantity,
        proposal.summary?.totalCaseQuantity
      ),
      proposal.stock?.packageFactor
    );
  });
  protected readonly detailSummary = computed<ProductDistributionSummaryDto | null>(() => {
    const detail = this.selectedDetail();

    if (!detail) {
      return null;
    }

    return this.buildSummary(
      detail.summary ?? null,
      detail.lines ?? [],
      this.resolveTargetCaseQuantity(
        detail.targetCaseQuantity,
        detail.totalCaseQuantity,
        detail.summary?.targetCaseQuantity,
        detail.summary?.totalCaseQuantity
      ),
      detail.stock?.packageFactor
    );
  });
  protected readonly canSaveProposal = computed(
    () =>
      this.canCreate() &&
      !!this.proposal() &&
      !!this.proposalSummary()?.isBalanced &&
      !this.saving() &&
      !this.balanceLoading()
  );
  protected readonly canEditSelectedDetail = computed(() => {
    const detail = this.selectedDetail();

    return !!detail && this.canUpdate() && this.resolveStatusCode(detail.status) === 0;
  });
  protected readonly canBalanceProposal = computed(
    () =>
      this.canCreate() &&
      !!this.proposal() &&
      !!this.proposal()?.lines.length &&
      !this.proposalLoading() &&
      !this.balanceLoading()
  );
  protected readonly canBalanceSelectedDetail = computed(
    () =>
      this.canEditSelectedDetail() &&
      !!this.selectedDetail()?.lines.length &&
      !this.balanceLoading()
  );
  protected readonly canNotifySelectedDetail = computed(() => {
    const detail = this.selectedDetail();

    return !!detail && this.canUpdate() && this.resolveStatusCode(detail.status) === 0;
  });
  protected readonly canFinalizeSelectedDetail = computed(() => {
    const detail = this.selectedDetail();

    return !!detail && this.canUpdate() && this.resolveStatusCode(detail.status) === 1;
  });
  protected readonly canDeleteSelectedDetail = computed(() => {
    const detail = this.selectedDetail();

    return !!detail && this.canDelete() && this.resolveStatusCode(detail.status) === 0;
  });
  protected readonly listTotals = computed(() => {
    const rows = this.distributions();

    return {
      documentCount: rows.length,
      totalCases: rows.reduce((sum, row) => sum + this.toNumber(row.totalCaseQuantity), 0),
      totalUnits: rows.reduce((sum, row) => sum + this.toNumber(row.totalUnitQuantity), 0),
      pendingCount: rows.filter((row) => this.resolveStatusCode(row.status) === 0).length
    };
  });

  ngOnInit(): void {
    this.loadCenters();

    if (this.canList()) {
      this.loadList();
      return;
    }

    this.feedback.set({
      tone: 'error',
      message: 'Urun dagilimlari icin liste yetkisi bulunamadi.'
    });
  }

  @HostListener('document:keydown.escape')
  protected closeTopDialog(): void {
    if (this.filtersOpen()) {
      this.closeFilters();
      return;
    }

    if (this.proposalDialogOpen()) {
      this.closeProposalDialog();
      return;
    }

    if (this.detailDialogOpen()) {
      this.closeDetailDialog();
    }
  }

  protected loadCenters(): void {
    this.centersLoading.set(true);

    this.operasyonIslemleriService
      .getProductDistributionCenters()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.centersLoading.set(false))
      )
      .subscribe({
        next: (centers: ProductDistributionCenterDto[]) =>
          this.centers.set(
            [...centers].sort((left, right) => left.warehouseNo - right.warehouseNo)
          ),
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'warning',
            message: getErrorMessage(error, 'Dagitim merkezleri yuklenemedi.')
          })
      });
  }

  protected loadList(): boolean {
    if (!this.canList()) {
      return false;
    }

    const request = this.buildListRequest();
    if (!request) {
      return false;
    }

    const requestId = ++this.listRequestId;
    this.listLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .getProductDistributions(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.listRequestId) {
            this.listLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (rows: ProductDistributionListItemDto[]) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.distributions.set((rows ?? []).map((row) => this.normalizeListItem(row)));
        },
        error: (error: unknown) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.distributions.set([]);
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Urun dagilim kayitlari yuklenemedi.')
          });
        }
      });

    return true;
  }

  protected openFilters(): void {
    this.proposalDialogOpen.set(false);
    this.detailDialogOpen.set(false);
    this.feedback.set(null);
    this.filtersOpen.set(true);
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
  }

  protected applyFilters(): void {
    if (this.loadList()) {
      this.filtersOpen.set(false);
    }
  }

  protected resetFilters(): void {
    const today = this.getToday();

    this.filters.startDate = today;
    this.filters.endDate = today;
    this.filters.documentNo = '';
    this.filters.stockCode = '';
    this.filters.distributionCenterWarehouseNo = null;
    this.filters.statusCode = null;
    this.filters.take = 100;
  }

  protected openProposalDialog(): void {
    this.resetProposalDraft();
    this.filtersOpen.set(false);
    this.proposalDialogOpen.set(true);
    this.detailDialogOpen.set(false);
    this.feedback.set(null);
  }

  protected closeProposalDialog(): void {
    this.proposalDialogOpen.set(false);
    this.resetProposalDraft();
    this.feedback.set(null);
  }

  protected closeDetailDialog(): void {
    this.detailDialogOpen.set(false);
  }

  protected requestProposal(): void {
    if (!this.canCreate()) {
      this.feedback.set({ tone: 'error', message: 'Oneri uretmek icin create yetkisi gerekli.' });
      return;
    }

    const stockCode = this.normalizeText(this.proposalForm.stockCode);
    const distributionCenterWarehouseNo = this.toPositiveNumber(
      this.proposalForm.distributionCenterWarehouseNo
    );
    const targetCaseQuantity = this.toPositiveNumber(this.proposalForm.totalCaseQuantity);

    if (!stockCode || !distributionCenterWarehouseNo || !targetCaseQuantity) {
      this.feedback.set({
        tone: 'error',
        message: 'Stok kodu, dagitim merkezi ve hedef koli alanlarini doldurun.'
      });
      return;
    }

    const requestId = ++this.proposalRequestId;
    this.stockSearchRequestId++;
    this.stockSearchResults.set([]);
    this.stockSearchMessage.set('');
    this.proposalDialogOpen.set(true);
    this.proposalLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .createProductDistributionProposal({
        stockCode,
        distributionCenterWarehouseNo,
        totalCaseQuantity: targetCaseQuantity,
        targetCaseQuantity,
        allocatedCaseQuantity: targetCaseQuantity,
        salesDayCount: this.toPositiveNumber(this.proposalForm.salesDayCount) ?? 42,
        referenceDate: this.normalizeText(this.proposalForm.referenceDate) || this.getToday(),
        includeBranchesWithoutSales: this.proposalForm.includeBranchesWithoutSales
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.proposalRequestId) {
            this.proposalLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (proposal: ProductDistributionProposalDto) => {
          if (requestId !== this.proposalRequestId) {
            return;
          }

          const normalizedProposal = this.normalizeProposal(proposal, targetCaseQuantity);
          this.proposal.set(normalizedProposal);
          this.selectedDetail.set(null);
          this.detailDialogOpen.set(false);
          this.feedback.set({
            tone: normalizedProposal.summary.isBalanced ? 'success' : 'warning',
            message: normalizedProposal.summary.isBalanced
              ? 'Dagilim onerisi hazir.'
              : 'Dagilim onerisi hazir, hedef koli farkini sifirlayin.'
          });
        },
        error: (error: unknown) => {
          if (requestId !== this.proposalRequestId) {
            return;
          }

          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim onerisi uretilemedi.')
          });
        }
      });
  }

  protected saveProposal(): void {
    const request = this.buildSaveRequestFromProposal();

    if (!request) {
      return;
    }

    this.saving.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .createProductDistribution(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (detail: ProductDistributionDetailDto) => {
          this.selectedDetail.set(this.normalizeDetail(detail));
          this.proposal.set(null);
          this.proposalDialogOpen.set(false);
          this.detailDialogOpen.set(true);
          this.loadList();
          this.feedback.set({
            tone: 'success',
            message: `${detail.documentNo} dagilim kaydi olusturuldu.`
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim kaydi olusturulamadi.')
          })
      });
  }

  protected loadDetail(documentNo: string | number): void {
    if (!this.canDetail()) {
      this.feedback.set({ tone: 'error', message: 'Detay goruntuleme yetkisi bulunamadi.' });
      return;
    }

    const requestId = ++this.detailRequestId;
    this.selectedDetail.set(null);
    this.filtersOpen.set(false);
    this.detailDialogOpen.set(true);
    this.proposalDialogOpen.set(false);
    this.detailLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .getProductDistributionDetail(documentNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.detailRequestId) {
            this.detailLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (detail: ProductDistributionDetailDto) => {
          if (requestId !== this.detailRequestId) {
            return;
          }

          this.selectedDetail.set(this.normalizeDetail(detail));
        },
        error: (error: unknown) => {
          if (requestId !== this.detailRequestId) {
            return;
          }

          this.selectedDetail.set(null);
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim detayi yuklenemedi.')
          });
        }
      });
  }

  protected updateSelectedDetail(): void {
    const detail = this.selectedDetail();
    const request = detail ? this.buildSaveRequestFromDetail(detail) : null;

    if (!detail || !request) {
      return;
    }

    this.saving.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .updateProductDistribution(detail.documentNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (nextDetail: ProductDistributionDetailDto) => {
          this.selectedDetail.set(this.normalizeDetail(nextDetail));
          this.loadList();
          this.feedback.set({ tone: 'success', message: `${detail.documentNo} guncellendi.` });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim kaydi guncellenemedi.')
          })
      });
  }

  protected notifySelectedDetail(): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canNotifySelectedDetail()) {
      return;
    }

    this.actionLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .notifyProductDistribution(detail.documentNo, {
        notifyBy: this.normalizeText(this.notifyForm.notifyBy) || this.getDefaultUserText(),
        markStockOrderingStopped: this.notifyForm.markStockOrderingStopped
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (notification: ProductDistributionNotificationDto) => {
          this.mergeNotification(notification);
          this.loadList();
          this.feedback.set({
            tone: notification.recipients?.length ? 'success' : 'warning',
            message: notification.message || 'Bolge bilgilendirme ozeti hazirlandi.'
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Bilgilendirme hazirlanamadi.')
          })
      });
  }

  protected finalizeSelectedDetail(): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canFinalizeSelectedDetail()) {
      return;
    }

    this.actionLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .finalizeProductDistribution(detail.documentNo, {
        finalizeBy: this.normalizeText(this.finalizeForm.finalizeBy) || this.getDefaultUserText(),
        orderDate: this.normalizeText(this.finalizeForm.orderDate) || this.getToday(),
        deliveryDate: this.normalizeText(this.finalizeForm.deliveryDate) || this.getToday(),
        allowFinalizeWithoutNotification: this.finalizeForm.allowFinalizeWithoutNotification
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (result: ProductDistributionFinalizeDto) => {
          this.mergeFinalizeResult(result);
          this.loadList();
          this.feedback.set({
            tone: 'success',
            message:
              result.message ||
              `${result.createdDocumentCount} yeni, ${result.existingDocumentCount} mevcut siparis.`
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim kesinlestirilemedi.')
          })
      });
  }

  protected deleteSelectedDetail(): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canDeleteSelectedDetail()) {
      return;
    }

    if (!window.confirm(`${detail.documentNo} dagilim kaydi silinsin mi?`)) {
      return;
    }

    this.actionLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .deleteProductDistribution(detail.documentNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (response: ProductDistributionDeleteDto) => {
          this.selectedDetail.set(null);
          this.detailDialogOpen.set(false);
          this.loadList();
          this.feedback.set({
            tone: response.deleted ? 'success' : 'warning',
            message: response.message || `${detail.documentNo} silme islemi tamamlandi.`
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim kaydi silinemedi.')
          })
      });
  }

  protected filterStatusLabel(): string {
    return (
      STATUS_OPTIONS.find((status) => status.value === this.filters.statusCode)?.label ??
      'Tum Durumlar'
    );
  }

  protected setFilterCenter(value: number | null): void {
    this.filters.distributionCenterWarehouseNo = this.toPositiveNumber(value);
  }

  protected setFilterStatus(value: number | null): void {
    this.filters.statusCode = typeof value === 'number' ? value : null;
  }

  protected setProposalCenter(value: number | null): void {
    this.proposalForm.distributionCenterWarehouseNo = this.toPositiveNumber(value);
  }

  protected setProposalStockQuery(value: string): void {
    this.proposalForm.stockCode = value;
    this.stockSearchRequestId++;
    this.stockSearchResults.set([]);
    this.stockSearchMessage.set('');
    this.stockSearchLoading.set(false);
  }

  protected searchProposalStock(): void {
    const query = this.normalizeText(this.proposalForm.stockCode);

    if (this.stockSearchLoading()) {
      return;
    }

    this.stockSearchResults.set([]);
    this.stockSearchMessage.set('');

    if (query.length < 2) {
      this.stockSearchMessage.set('Stok aramak icin en az 2 karakter girin.');
      return;
    }

    const requestId = ++this.stockSearchRequestId;
    this.stockSearchLoading.set(true);

    this.aramaService
      .searchStock(query, 12)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.stockSearchRequestId) {
            this.stockSearchLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (results: ProductLookupItemDto[]) => {
          if (requestId !== this.stockSearchRequestId) {
            return;
          }

          const normalizedResults = this.normalizeStockSearchResults(results ?? []);
          this.stockSearchResults.set(normalizedResults);

          if (normalizedResults.length === 0) {
            this.stockSearchMessage.set('Aramana uygun stok bulunamadi.');
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.stockSearchRequestId) {
            return;
          }

          this.stockSearchMessage.set(getErrorMessage(error, 'Stok aramasi yapilamadi.'));
        }
      });
  }

  protected selectProposalStock(stock: ProductLookupItemDto): void {
    const stockCode = this.normalizeText(stock.stockCode);

    if (!stockCode) {
      return;
    }

    this.proposalForm.stockCode = stockCode;
    this.stockSearchRequestId++;
    this.stockSearchResults.set([]);
    this.stockSearchLoading.set(false);
    this.stockSearchMessage.set(stock.stockName ? stock.stockName + ' secildi.' : 'Stok secildi.');
  }

  protected balanceProposalLines(): void {
    const proposal = this.proposal();
    const summary = this.proposalSummary();

    if (!proposal || !summary) {
      return;
    }

    const request = this.buildBalanceRequest(
      proposal.stock?.stockCode || this.proposalForm.stockCode,
      summary.totalCaseQuantity,
      proposal.lines,
      this.proposalForm.salesDayCount,
      this.proposalForm.referenceDate
    );

    if (!request) {
      return;
    }

    const requestId = ++this.balanceRequestId;
    this.balanceLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .balanceProductDistribution(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.balanceRequestId) {
            this.balanceLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (balance: ProductDistributionBalanceDto) => {
          if (requestId !== this.balanceRequestId) {
            return;
          }

          const packageFactor =
            this.toPositiveNumber(balance.stock?.packageFactor) ??
            this.toPositiveNumber(proposal.stock?.packageFactor) ??
            1;
          const targetCaseQuantity = this.resolveTargetCaseQuantity(
            balance.summary?.targetCaseQuantity,
            balance.summary?.totalCaseQuantity,
            summary.totalCaseQuantity
          );
          const lines = this.normalizeBalanceLines(balance.lines ?? [], packageFactor);
          const nextSummary = this.buildSummary(
            balance.summary ?? proposal.summary,
            lines,
            targetCaseQuantity,
            packageFactor
          );

          this.proposalForm.totalCaseQuantity = targetCaseQuantity;
          this.proposal.set({
            ...proposal,
            stock: balance.stock ?? proposal.stock,
            lines,
            summary: nextSummary,
            warnings: balance.warnings ?? proposal.warnings
          });
          this.feedback.set({
            tone: nextSummary.isBalanced ? 'success' : 'warning',
            message: nextSummary.isBalanced
              ? 'Dagilim satirlari hedef koliye gore dengelendi.'
              : 'Dengeleme tamamlandi, kalan farki kontrol edin.'
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim satirlari dengelenemedi.')
          })
      });
  }

  protected balanceSelectedDetail(): void {
    const detail = this.selectedDetail();
    const summary = this.detailSummary();

    if (!detail || !summary || !this.canBalanceSelectedDetail()) {
      return;
    }

    const request = this.buildBalanceRequest(
      detail.stock?.stockCode || detail.stockCode,
      summary.totalCaseQuantity,
      detail.lines,
      detail.summary?.salesDayCount,
      detail.summary?.referenceDate
    );

    if (!request) {
      return;
    }

    const requestId = ++this.balanceRequestId;
    this.balanceLoading.set(true);
    this.feedback.set(null);

    this.operasyonIslemleriService
      .balanceProductDistribution(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.balanceRequestId) {
            this.balanceLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (balance: ProductDistributionBalanceDto) => {
          if (requestId !== this.balanceRequestId) {
            return;
          }

          const packageFactor =
            this.toPositiveNumber(balance.stock?.packageFactor) ??
            this.toPositiveNumber(detail.stock?.packageFactor) ??
            1;
          const targetCaseQuantity = this.resolveTargetCaseQuantity(
            balance.summary?.targetCaseQuantity,
            balance.summary?.totalCaseQuantity,
            summary.totalCaseQuantity
          );
          const lines = this.normalizeBalanceLines(balance.lines ?? [], packageFactor);
          const nextSummary = this.buildSummary(
            balance.summary ?? detail.summary,
            lines,
            targetCaseQuantity,
            packageFactor
          );

          this.selectedDetail.set({
            ...detail,
            stock: balance.stock ?? detail.stock,
            totalCaseQuantity: targetCaseQuantity,
            targetCaseQuantity,
            lines,
            summary: nextSummary
          });
          this.feedback.set({
            tone: nextSummary.isBalanced ? 'success' : 'warning',
            message: nextSummary.isBalanced
              ? 'Dagilim detayi hedef koliye gore dengelendi.'
              : 'Dengeleme tamamlandi, kalan farki kontrol edin.'
          });
        },
        error: (error: unknown) =>
          this.feedback.set({
            tone: 'error',
            message: getErrorMessage(error, 'Dagilim detayi dengelenemedi.')
          })
      });
  }

  protected setProposalLineCaseQuantity(index: number, value: number | string): void {
    const proposal = this.proposal();

    if (!proposal) {
      return;
    }

    const totalCaseQuantity = this.resolveTargetCaseQuantity(
      this.proposalForm.totalCaseQuantity,
      proposal.summary?.targetCaseQuantity,
      proposal.summary?.totalCaseQuantity
    );
    const packageFactor = this.toPositiveNumber(proposal.stock?.packageFactor) ?? 1;
    const lines = proposal.lines.map((line, lineIndex) =>
      lineIndex === index ? this.withManualCaseQuantity(line, value, packageFactor) : line
    );

    this.proposal.set({
      ...proposal,
      lines,
      summary: this.buildSummary(proposal.summary, lines, totalCaseQuantity, packageFactor)
    });
  }

  protected setDetailLineCaseQuantity(index: number, value: number | string): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canEditSelectedDetail()) {
      return;
    }

    const packageFactor = this.toPositiveNumber(detail.stock?.packageFactor) ?? 1;
    const lines = detail.lines.map((line, lineIndex) =>
      lineIndex === index ? this.withManualCaseQuantity(line, value, packageFactor) : line
    );

    this.selectedDetail.set({
      ...detail,
      lines,
      summary: this.buildSummary(
        detail.summary ?? null,
        lines,
        this.resolveTargetCaseQuantity(
          detail.targetCaseQuantity,
          detail.totalCaseQuantity,
          detail.summary?.targetCaseQuantity,
          detail.summary?.totalCaseQuantity
        ),
        packageFactor
      )
    });
  }

  protected setDetailTargetCaseQuantity(value: number | string | null): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canEditSelectedDetail()) {
      return;
    }

    const targetCaseQuantity = Math.max(0, this.roundQuantity(this.toNumber(value)));
    const packageFactor = this.toPositiveNumber(detail.stock?.packageFactor) ?? 1;
    const summary = this.buildSummary(
      detail.summary ?? null,
      detail.lines,
      targetCaseQuantity,
      packageFactor
    );

    this.selectedDetail.set({
      ...detail,
      totalCaseQuantity: targetCaseQuantity,
      targetCaseQuantity,
      summary
    });
  }

  protected toggleProposalLineLock(index: number): void {
    const proposal = this.proposal();

    if (!proposal) {
      return;
    }

    const lines = proposal.lines.map((line, lineIndex) =>
      lineIndex === index ? this.withLineLock(line, !line.isLocked) : line
    );
    const packageFactor = this.toPositiveNumber(proposal.stock?.packageFactor) ?? 1;
    const totalCaseQuantity = this.resolveTargetCaseQuantity(
      this.proposalForm.totalCaseQuantity,
      proposal.summary?.targetCaseQuantity,
      proposal.summary?.totalCaseQuantity
    );

    this.proposal.set({
      ...proposal,
      lines,
      summary: this.buildSummary(proposal.summary, lines, totalCaseQuantity, packageFactor)
    });
  }

  protected toggleDetailLineLock(index: number): void {
    const detail = this.selectedDetail();

    if (!detail || !this.canEditSelectedDetail()) {
      return;
    }

    const lines = detail.lines.map((line, lineIndex) =>
      lineIndex === index ? this.withLineLock(line, !line.isLocked) : line
    );
    const packageFactor = this.toPositiveNumber(detail.stock?.packageFactor) ?? 1;
    const totalCaseQuantity = this.resolveTargetCaseQuantity(
      detail.targetCaseQuantity,
      detail.totalCaseQuantity,
      detail.summary?.targetCaseQuantity,
      detail.summary?.totalCaseQuantity
    );

    this.selectedDetail.set({
      ...detail,
      lines,
      summary: this.buildSummary(detail.summary ?? null, lines, totalCaseQuantity, packageFactor)
    });
  }

  protected lineDeltaLabel(line: ProductDistributionLineDto): string {
    const caseDelta = this.toNumber(line.caseDelta);

    if (!caseDelta) {
      return 'Degisim yok';
    }

    return caseDelta > 0
      ? '+' + this.formatNumber(caseDelta, 0) + ' koli'
      : '-' + this.formatNumber(Math.abs(caseDelta), 0) + ' koli';
  }

  protected statusLabel(status: ProductDistributionStatusDto | null | undefined): string {
    const code = this.resolveStatusCode(status);

    if (status?.name) {
      return status.name;
    }

    switch (code) {
      case 0:
        return 'Kaydedildi';
      case 1:
        return 'Bilgilendirildi';
      case 2:
        return 'Dagilim Yapildi';
      default:
        return '-';
    }
  }

  protected statusClass(status: ProductDistributionStatusDto | null | undefined): string {
    const code = this.resolveStatusCode(status);

    switch (code) {
      case 0:
        return 'status-saved';
      case 1:
        return 'status-notified';
      case 2:
        return 'status-finalized';
      default:
        return 'status-unknown';
    }
  }

  protected balanceClass(summary: ProductDistributionSummaryDto | null | undefined): string {
    if (!summary) {
      return 'balance-neutral';
    }

    if (summary.isBalanced) {
      return 'balance-ok';
    }

    return summary.caseDifference > 0 ? 'balance-short' : 'balance-over';
  }

  protected balanceMessage(summary: ProductDistributionSummaryDto | null | undefined): string {
    if (!summary) {
      return '-';
    }

    const caseDifference = this.roundQuantity(summary.caseDifference);

    if (summary.isBalanced) {
      return 'Koli dengesi tamam';
    }

    const differenceText = this.formatNumber(Math.abs(caseDifference), 0);
    return caseDifference > 0 ? `${differenceText} koli eksik` : `${differenceText} koli fazla`;
  }

  protected isSelectedDistribution(documentNo: string | number | null | undefined): boolean {
    const selectedDocumentNo = this.selectedDetail()?.documentNo;

    return (
      selectedDocumentNo !== null &&
      selectedDocumentNo !== undefined &&
      documentNo !== null &&
      documentNo !== undefined &&
      String(selectedDocumentNo) === String(documentNo)
    );
  }

  protected isStatusStepDone(
    status: ProductDistributionStatusDto | null | undefined,
    stepCode: number
  ): boolean {
    const statusCode = this.resolveStatusCode(status);

    return typeof statusCode === 'number' && statusCode >= stepCode;
  }

  protected isStatusStepActive(
    status: ProductDistributionStatusDto | null | undefined,
    stepCode: number
  ): boolean {
    return this.resolveStatusCode(status) === stepCode;
  }

  protected reasonLabel(reason: string | null | undefined): string {
    switch (this.normalizeText(reason)) {
      case 'sales-share':
        return 'Satis payi';
      case 'equal-share':
        return 'Esit pay';
      case 'rounded-to-zero':
        return 'Yuvarlama';
      case 'no-period-sales':
        return 'Satis yok';
      case 'locked':
        return 'Kilitli';
      case 'balanced-up':
        return 'Denge artisi';
      case 'balanced-down':
        return 'Denge azalis';
      case 'unchanged':
        return 'Degismedi';
      default:
        return reason?.trim() || '-';
    }
  }

  protected centerLabel(warehouseNo: number | null | undefined): string {
    const center = this.centers().find((item) => item.warehouseNo === warehouseNo);

    return center ? `${center.warehouseNo} - ${center.warehouseName}` : `${warehouseNo ?? '-'}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(date);
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  protected formatNumber(value: number | null | undefined, digits = 0): string {
    return this.toNumber(value).toLocaleString('tr-TR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  protected recipientEmail(recipient: ProductDistributionNotificationRecipientDto): string {
    return recipient.email || recipient.recipientEmail || '-';
  }

  protected notificationRecipients(
    notification: ProductDistributionNotificationDto
  ): ProductDistributionNotificationRecipientDto[] {
    return notification.recipients ?? [];
  }

  protected finalizeOrders(result: ProductDistributionFinalizeDto): ProductDistributionOrderDto[] {
    return result.orders ?? [];
  }

  protected orderWarehouseLabel(order: ProductDistributionOrderDto): string {
    const inWarehouseNo = this.toNullableNumber(order.inWarehouseNo);
    const outWarehouseNo = this.toNullableNumber(order.outWarehouseNo);

    if (inWarehouseNo || outWarehouseNo) {
      const inWarehouse = `#${inWarehouseNo ?? '-'} ${order.inWarehouseName ?? ''}`.trim();
      const outWarehouse = `#${outWarehouseNo ?? '-'} ${order.outWarehouseName ?? ''}`.trim();

      return `${outWarehouse} -> ${inWarehouse}`;
    }

    return `#${order.warehouseNo ?? '-'} ${order.warehouseName ?? ''}`.trim();
  }

  protected trackByCenter = (_index: number, center: ProductDistributionCenterDto): number =>
    center.warehouseNo;
  protected trackByDistribution = (
    _index: number,
    distribution: ProductDistributionListItemDto
  ): string => distribution.documentNo;
  protected trackByLine = (index: number, line: ProductDistributionLineDto): string =>
    `${line.warehouseNo}-${index}`;
  protected trackByProposalStock = (index: number, stock: ProductLookupItemDto): string =>
    stock.stockCode?.trim() || stock.barcode?.trim() || `${index}`;
  protected trackByRecipient = (
    index: number,
    recipient: ProductDistributionNotificationRecipientDto
  ): string => `${recipient.regionCode ?? recipient.regionName ?? recipientEmailKey(recipient)}-${index}`;
  protected trackByOrder = (_index: number, order: ProductDistributionOrderDto): string =>
    `${order.documentSerie}-${order.documentOrderNo}-${this.resolveOrderWarehouseNo(order)}`;

  private resetProposalDraft(): void {
    this.proposalRequestId++;
    this.stockSearchRequestId++;
    this.proposal.set(null);
    this.proposalLoading.set(false);
    this.stockSearchLoading.set(false);
    this.stockSearchResults.set([]);
    this.stockSearchMessage.set('');
    this.proposalForm.stockCode = '';
    this.proposalForm.distributionCenterWarehouseNo = null;
    this.proposalForm.totalCaseQuantity = null;
    this.proposalForm.salesDayCount = 42;
    this.proposalForm.referenceDate = this.getToday();
    this.proposalForm.includeBranchesWithoutSales = false;
    this.proposalForm.distributedBy = this.getDefaultUserText();
  }

  private buildListRequest(): ProductDistributionListHttpRequest | null {
    if (!this.isDateInput(this.filters.startDate) || !this.isDateInput(this.filters.endDate)) {
      this.feedback.set({ tone: 'error', message: 'Liste icin gecerli tarih araligi secin.' });
      return null;
    }

    return {
      createdFrom: this.filters.startDate,
      createdTo: this.filters.endDate,
      documentNo: this.normalizeText(this.filters.documentNo) || null,
      stockCode: this.normalizeText(this.filters.stockCode) || null,
      distributionCenterWarehouseNo: this.filters.distributionCenterWarehouseNo,
      status: this.filters.statusCode,
      take: this.toPositiveNumber(this.filters.take) ?? 100
    };
  }

  private buildBalanceRequest(
    stockCode: string,
    targetCaseQuantity: number,
    lines: ProductDistributionLineDto[],
    salesDayCount?: number | null,
    referenceDate?: string | null
  ): ProductDistributionBalanceHttpRequest | null {
    const normalizedStockCode = this.normalizeText(stockCode);
    const normalizedTargetCaseQuantity = this.roundQuantity(this.toNumber(targetCaseQuantity));

    if (!normalizedStockCode || normalizedTargetCaseQuantity < 0 || !lines.length) {
      this.feedback.set({ tone: 'error', message: 'Dengeleme icin stok, hedef koli ve satirlar gerekli.' });
      return null;
    }

    return {
      stockCode: normalizedStockCode,
      targetCaseQuantity: normalizedTargetCaseQuantity,
      salesDayCount: this.toPositiveNumber(salesDayCount),
      referenceDate: this.normalizeText(referenceDate) || null,
      lines: lines.map((line) => ({
        warehouseNo: line.warehouseNo,
        warehouseName: line.warehouseName ?? null,
        regionCode: line.regionCode ?? null,
        lastSalesQuantity: this.toNumber(line.lastSalesQuantity),
        currentStockQuantity: this.toNumber(line.currentStockQuantity),
        companyAverageDailySales: this.toNumber(line.companyAverageDailySales),
        branchAverageDailySales: this.toNumber(line.branchAverageDailySales),
        caseQuantity: this.toNumber(line.caseQuantity),
        isLocked: !!line.isLocked
      }))
    };
  }

  private buildSaveRequestFromProposal(): ProductDistributionSaveHttpRequest | null {
    const proposal = this.proposal();
    const summary = this.proposalSummary();

    if (!proposal || !summary) {
      return null;
    }

    if (!summary.isBalanced) {
      this.feedback.set({ tone: 'error', message: 'Kaydetmeden once koli farki 0 olmali.' });
      return null;
    }

    return this.buildSaveRequest(
      proposal.stock?.stockCode || this.proposalForm.stockCode,
      proposal.distributionCenter?.warehouseNo ?? this.proposalForm.distributionCenterWarehouseNo,
      summary.totalCaseQuantity,
      this.proposalForm.distributedBy,
      proposal.lines,
      proposal.stock?.packageFactor
    );
  }

  private buildSaveRequestFromDetail(
    detail: ProductDistributionDetailDto
  ): ProductDistributionSaveHttpRequest | null {
    const summary = this.detailSummary();

    if (!summary?.isBalanced) {
      this.feedback.set({ tone: 'error', message: 'Guncellemeden once koli farki 0 olmali.' });
      return null;
    }

    return this.buildSaveRequest(
      detail.stock?.stockCode || detail.stockCode,
      detail.distributionCenter?.warehouseNo ?? detail.distributionCenterWarehouseNo,
      summary.totalCaseQuantity,
      detail.distributedBy || this.proposalForm.distributedBy,
      detail.lines,
      detail.stock?.packageFactor
    );
  }

  private buildSaveRequest(
    stockCode: string,
    distributionCenterWarehouseNo: number | null | undefined,
    totalCaseQuantity: number,
    distributedBy: string,
    lines: ProductDistributionLineDto[],
    packageFactor?: number | null
  ): ProductDistributionSaveHttpRequest | null {
    const normalizedStockCode = this.normalizeText(stockCode);
    const centerNo = this.toPositiveNumber(distributionCenterWarehouseNo);

    if (!normalizedStockCode || !centerNo || totalCaseQuantity < 0 || !lines.length) {
      this.feedback.set({ tone: 'error', message: 'Dagilim kaydi icin zorunlu alanlar eksik.' });
      return null;
    }

    return {
      stockCode: normalizedStockCode,
      distributionCenterWarehouseNo: centerNo,
      totalCaseQuantity,
      targetCaseQuantity: totalCaseQuantity,
      allocatedCaseQuantity: totalCaseQuantity,
      distributedBy: this.normalizeText(distributedBy) || this.getDefaultUserText(),
      lines: lines.map((line) => ({
        warehouseNo: line.warehouseNo,
        caseQuantity: this.toNumber(line.caseQuantity),
        unitQuantity: this.toNumber(line.unitQuantity) || this.calculateUnitQuantity(line.caseQuantity, packageFactor),
        lastSalesQuantity: this.toNumber(line.lastSalesQuantity),
        companyAverageDailySales: this.toNullableNumber(line.companyAverageDailySales),
        branchAverageDailySales: this.toNullableNumber(line.branchAverageDailySales)
      }))
    };
  }

  private normalizeStockSearchResults(results: ProductLookupItemDto[]): ProductLookupItemDto[] {
    const uniqueStocks = new Map<string, ProductLookupItemDto>();

    for (const stock of results) {
      const stockCode = this.normalizeText(stock.stockCode);

      if (!stockCode) {
        continue;
      }

      const key = stockCode.toLocaleUpperCase('tr-TR');

      if (uniqueStocks.has(key)) {
        continue;
      }

      uniqueStocks.set(key, {
        ...stock,
        stockCode,
        stockName: this.normalizeText(stock.stockName) || stockCode
      });
    }

    return [...uniqueStocks.values()].sort((left, right) =>
      (left.stockName || left.stockCode).localeCompare(right.stockName || right.stockCode, 'tr')
    );
  }

  private normalizeBalanceLines(
    lines: readonly ProductDistributionLineDto[] | null | undefined,
    packageFactor: number
  ): ProductDistributionLineDto[] {
    return (lines ?? []).map((line) =>
      this.withCaseQuantity(
        {
          ...line,
          originalCaseQuantity: this.toNumber(line.originalCaseQuantity),
          caseDelta: this.toNumber(line.caseDelta),
          isLocked: !!line.isLocked
        } as ProductDistributionLineDto,
        line.caseQuantity,
        packageFactor
      )
    );
  }

  private normalizeProposal(
    proposal: ProductDistributionProposalDto,
    fallbackTotalCaseQuantity: number
  ): ProductDistributionProposalDto {
    const packageFactor = this.toPositiveNumber(proposal.stock?.packageFactor) ?? 1;
    const lines = (proposal.lines ?? []).map((line) => this.withCaseQuantity(line, line.caseQuantity, packageFactor));

    return {
      ...proposal,
      lines,
      summary: this.buildSummary(
        proposal.summary,
        lines,
        this.resolveTargetCaseQuantity(
          proposal.summary?.targetCaseQuantity,
          proposal.summary?.totalCaseQuantity,
          fallbackTotalCaseQuantity
        ),
        packageFactor
      )
    };
  }

  private normalizeListItem(row: ProductDistributionListItemDto): ProductDistributionListItemDto {
    const stock = row.stock ?? null;
    const distributionCenter = row.distributionCenter ?? null;
    const totalCaseQuantity = this.resolveTargetCaseQuantity(row.targetCaseQuantity, row.totalCaseQuantity);

    return {
      ...row,
      documentNo: row.documentNo || '',
      documentDate: row.documentDate ?? row.createdAt ?? row.createdAtUtc ?? null,
      stockCode: row.stockCode || stock?.stockCode || '',
      stockName: row.stockName ?? stock?.stockName ?? null,
      distributionCenterWarehouseNo:
        row.distributionCenterWarehouseNo ?? distributionCenter?.warehouseNo ?? 0,
      distributionCenterWarehouseName:
        row.distributionCenterWarehouseName ?? distributionCenter?.warehouseName ?? null,
      totalCaseQuantity,
      targetCaseQuantity: totalCaseQuantity,
      totalUnitQuantity: this.toNumber(row.totalUnitQuantity),
      lineCount: this.toNumber(row.lineCount),
      status: row.status ?? { code: -1, name: '-' },
      stock,
      distributionCenter,
      createdAt: row.createdAt ?? row.createdAtUtc ?? null,
      finalizedAt: row.finalizedAt ?? row.finalizedAtUtc ?? null,
      createdAtUtc: row.createdAtUtc ?? row.createdAt ?? null,
      finalizedAtUtc: row.finalizedAtUtc ?? row.finalizedAt ?? null
    };
  }

  private normalizeDetail(detail: ProductDistributionDetailDto): ProductDistributionDetailDto {
    const header = detail.header ?? null;
    const stock = detail.stock ?? header?.stock ?? null;
    const distributionCenter = detail.distributionCenter ?? header?.distributionCenter ?? null;
    const flattenedDetail = this.normalizeListItem({
      ...detail,
      documentNo: detail.documentNo || header?.documentNo || '',
      status: detail.status ?? header?.status ?? { code: -1, name: '-' },
      stock,
      distributionCenter,
      distributedBy: detail.distributedBy ?? header?.distributedBy ?? null,
      createdAt: detail.createdAt ?? header?.createdAt ?? null,
      finalizedAt: detail.finalizedAt ?? header?.finalizedAt ?? null,
      createdAtUtc: detail.createdAtUtc ?? header?.createdAt ?? null,
      finalizedAtUtc: detail.finalizedAtUtc ?? header?.finalizedAt ?? null,
      targetCaseQuantity: detail.targetCaseQuantity ?? detail.summary?.targetCaseQuantity ?? null,
      totalCaseQuantity:
        detail.targetCaseQuantity ??
        detail.totalCaseQuantity ??
        detail.summary?.targetCaseQuantity ??
        detail.summary?.totalCaseQuantity ??
        0,
      totalUnitQuantity: detail.totalUnitQuantity ?? detail.summary?.totalUnitQuantity ?? 0,
      lineCount: detail.lineCount ?? detail.summary?.lineCount ?? detail.lines?.length ?? 0
    } as ProductDistributionListItemDto);
    const packageFactor = this.toPositiveNumber(flattenedDetail.stock?.packageFactor) ?? 1;
    const lines = (detail.lines ?? []).map((line) =>
      this.withCaseQuantity(line, line.caseQuantity, packageFactor)
    );
    const totalCaseQuantity = this.resolveTargetCaseQuantity(
      flattenedDetail.targetCaseQuantity,
      flattenedDetail.totalCaseQuantity,
      detail.summary?.targetCaseQuantity,
      detail.summary?.totalCaseQuantity
    );

    return {
      ...detail,
      ...flattenedDetail,
      header,
      stock: flattenedDetail.stock,
      distributionCenter: flattenedDetail.distributionCenter,
      lines,
      summary: this.buildSummary(detail.summary ?? null, lines, totalCaseQuantity, packageFactor)
    };
  }

  private mergeNotification(notification: ProductDistributionNotificationDto): void {
    const detail = this.selectedDetail();

    if (!detail) {
      return;
    }

    this.selectedDetail.set({
      ...detail,
      status: notification.status ?? { code: 1, name: 'Bilgilendirildi' },
      notification
    });
  }

  private mergeFinalizeResult(result: ProductDistributionFinalizeDto): void {
    const detail = this.selectedDetail();

    if (!detail) {
      return;
    }

    this.selectedDetail.set({
      ...detail,
      status: result.status ?? { code: 2, name: 'Dagilim Yapildi' },
      finalizeResult: this.normalizeFinalizeResult(result)
    });
  }

  private normalizeFinalizeResult(
    result: ProductDistributionFinalizeDto
  ): ProductDistributionFinalizeDto {
    return {
      ...result,
      orders: (result.orders ?? []).map((order) => this.normalizeOrder(order))
    };
  }

  private normalizeOrder(order: ProductDistributionOrderDto): ProductDistributionOrderDto {
    const warehouseNo = order.warehouseNo ?? order.inWarehouseNo ?? order.outWarehouseNo ?? null;
    const warehouseName = order.warehouseName ?? order.inWarehouseName ?? order.outWarehouseName ?? null;

    return {
      ...order,
      warehouseNo,
      warehouseName
    };
  }

  private buildSummary(
    originalSummary: ProductDistributionSummaryDto | null | undefined,
    lines: readonly ProductDistributionLineDto[],
    totalCaseQuantity: number,
    packageFactor?: number | null
  ): ProductDistributionSummaryDto {
    const allocatedCaseQuantity = this.roundQuantity(
      lines.reduce((sum, line) => sum + this.toNumber(line.caseQuantity), 0)
    );
    const totalUnitQuantity = this.roundQuantity(
      lines.reduce(
        (sum, line) =>
          sum +
          (this.toNumber(line.unitQuantity) ||
            this.calculateUnitQuantity(line.caseQuantity, packageFactor)),
        0
      )
    );
    const caseDifference = this.roundQuantity(totalCaseQuantity - allocatedCaseQuantity);

    return {
      totalCaseQuantity,
      targetCaseQuantity: totalCaseQuantity,
      allocatedCaseQuantity,
      caseDifference,
      totalUnitQuantity,
      lineCount: lines.length,
      branchCount: originalSummary?.branchCount ?? lines.length,
      salesDayCount: originalSummary?.salesDayCount ?? this.proposalForm.salesDayCount,
      referenceDate: originalSummary?.referenceDate ?? this.proposalForm.referenceDate,
      isBalanced: Math.abs(caseDifference) < 0.0001
    };
  }

  private withManualCaseQuantity(
    line: ProductDistributionLineDto,
    value: number | string,
    packageFactor: number
  ): ProductDistributionLineDto {
    return this.withLineLock(this.withCaseQuantity(line, value, packageFactor), true);
  }

  private withLineLock(line: ProductDistributionLineDto, isLocked: boolean): ProductDistributionLineDto {
    return {
      ...line,
      isLocked
    };
  }

  private withCaseQuantity(
    line: ProductDistributionLineDto,
    value: number | string,
    packageFactor: number
  ): ProductDistributionLineDto {
    const caseQuantity = this.roundQuantity(this.toNumber(value));

    return {
      ...line,
      caseQuantity,
      unitQuantity: this.calculateUnitQuantity(caseQuantity, packageFactor)
    };
  }

  private calculateUnitQuantity(caseQuantity: number | string | null | undefined, packageFactor?: number | null): number {
    return this.roundQuantity(this.toNumber(caseQuantity) * (this.toPositiveNumber(packageFactor) ?? 1));
  }

  private hasActionPermission(action: DistributionAction): boolean {
    const user = this.authService.currentUser();
    const normalizedAction = this.normalizeText(action);
    const fullPermission = this.normalizeText(`${PERMISSION_PREFIX}.${action}`);

    if (
      (user?.roller ?? []).some((role) => {
        const normalizedRole = this.normalizeText(role);
        return normalizedRole === 'admin' || normalizedRole === 'administrator';
      })
    ) {
      return true;
    }

    const permissionKeys = [
      ...(user?.permissions ?? []),
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => this.normalizeText(permission));

    return permissionKeys.some(
      (permission) =>
        permission === normalizedAction ||
        permission === fullPermission ||
        permission.endsWith(`.${normalizedAction}`)
    );
  }

  private resolveStatusCode(status: ProductDistributionStatusDto | null | undefined): number | null {
    return typeof status?.code === 'number' ? status.code : null;
  }

  private resolveOrderWarehouseNo(order: ProductDistributionOrderDto): number | string {
    return order.warehouseNo ?? order.inWarehouseNo ?? order.outWarehouseNo ?? '-';
  }

  private isDateInput(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }

  private toPositiveNumber(value: unknown): number | null {
    const numericValue = this.toNumber(value);

    return numericValue > 0 ? numericValue : null;
  }

  private resolveTargetCaseQuantity(...values: unknown[]): number {
    for (const value of values) {
      const numericValue = this.toNullableNumber(value);

      if (numericValue !== null && numericValue >= 0) {
        return numericValue;
      }
    }

    return 0;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private toNumber(value: unknown): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  private getDefaultUserText(): string {
    return this.authService.currentUser()?.displayName?.trim() || 'MERKEZ';
  }

  private getToday(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}

function recipientEmailKey(recipient: ProductDistributionNotificationRecipientDto): string {
  return recipient.email || recipient.recipientEmail || 'recipient';
}
