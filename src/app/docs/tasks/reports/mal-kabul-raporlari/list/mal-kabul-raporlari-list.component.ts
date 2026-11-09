import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type {
  CompanyDocumentByCustomerItemDto,
  LazyBranchDocumentDetailDto,
  LazyBranchReceivingItemDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';

@Component({
  selector: 'app-mal-kabul-raporlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiListTableComponent],
  templateUrl: './mal-kabul-raporlari-list.component.html',
  styleUrl: './mal-kabul-raporlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MalKabulRaporlariListComponent implements OnInit {
  private readonly raporService = inject(RaporIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page: DocsContentPage =
    DOCS_PAGES['mal-kabul-raporlari'] ?? {
      title: 'Mal Kabul Raporları',
      subtitle: 'Tembel şubeler açık depo irsaliyesi ve tedarikçi mal kabul hacim dökümü.',
      endpoints: []
    };

  // Aktif sekme: 'lazy-branches' (Tembel Şubeler) | 'supplier-volume' (Tedarikçi Hacim)
  protected readonly activeTab = signal<'lazy-branches' | 'supplier-volume'>('lazy-branches');

  // Filtreler
  protected readonly startDate = signal<string>(this.getDefaultStartDate());
  protected readonly endDate = signal<string>(this.getDefaultEndDate());
  protected readonly selectedRegion = signal<string>('all');
  protected readonly searchTerm = signal<string>('');
  protected readonly supplierLimit = signal<number>(100);

  // Veri sinyalleri
  protected readonly loading = signal<boolean>(false);
  protected readonly lazyBranches = signal<LazyBranchReceivingItemDto[]>([]);
  protected readonly supplierVolume = signal<CompanyDocumentByCustomerItemDto[]>([]);

  // Evrak detay modalı
  protected readonly selectedBranchForDocs = signal<LazyBranchReceivingItemDto | null>(null);
  protected readonly branchDocuments = signal<LazyBranchDocumentDetailDto[]>([]);
  protected readonly docsLoading = signal<boolean>(false);
  protected readonly docsModalOpen = signal<boolean>(false);

  // Filtrelenmiş Tembel Şubeler
  protected readonly filteredLazyBranches = computed<LazyBranchReceivingItemDto[]>(() => {
    let list = this.lazyBranches();
    const reg = this.selectedRegion();
    if (reg !== 'all') {
      list = list.filter((x) => x.region === reg);
    }
    const q = this.searchTerm().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.warehouseName.toLowerCase().includes(q) ||
          x.warehouseNo.toString().includes(q)
      );
    }
    return list;
  });

  // Filtrelenmiş Tedarikçi Hacim
  protected readonly filteredSupplierVolume = computed<CompanyDocumentByCustomerItemDto[]>(() => {
    let list = this.supplierVolume();
    const q = this.searchTerm().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.customerName.toLowerCase().includes(q) ||
          x.customerCode.toLowerCase().includes(q) ||
          x.customerTitle.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Tembel Şubeler Kolonları
  protected readonly lazyBranchesColumns: ApiListTableColumn<LazyBranchReceivingItemDto>[] = [
    { key: 'region', label: 'Bölge' },
    { key: 'warehouseNo', label: 'Şube No' },
    { key: 'warehouseName', label: 'Şube Adı' },
    {
      key: 'notAcceptedCount',
      label: 'Bekleyen İrsaliye',
      tableAlign: 'right',
      resolveValue: (row: LazyBranchReceivingItemDto) => `${row.notAcceptedCount} Evrak`
    },
    {
      key: 'totalQuantity',
      label: 'Toplam Miktar',
      tableAlign: 'right',
      resolveValue: (row: LazyBranchReceivingItemDto) => this.formatNumber(row.totalQuantity)
    },
    {
      key: 'oldestShipmentDate',
      label: 'En Eski Sevk Tarihi',
      tableAlign: 'center',
      resolveValue: (row: LazyBranchReceivingItemDto) => this.formatDate(row.oldestShipmentDate)
    },
    {
      key: 'latestShipmentDate',
      label: 'Son Sevk Tarihi',
      tableAlign: 'center',
      resolveValue: (row: LazyBranchReceivingItemDto) => this.formatDate(row.latestShipmentDate)
    }
  ];

  // Tedarikçi Hacim Kolonları
  protected readonly supplierVolumeColumns: ApiListTableColumn<CompanyDocumentByCustomerItemDto>[] = [
    { key: 'customerCode', label: 'Cari Kodu' },
    { key: 'customerName', label: 'Tedarikçi Adı' },
    { key: 'customerTitle', label: 'Ünvan' },
    {
      key: 'documentCount',
      label: 'Evrak Sayısı',
      tableAlign: 'right',
      resolveValue: (row: CompanyDocumentByCustomerItemDto) => `${row.documentCount} Evrak`
    },
    {
      key: 'totalAmount',
      label: 'Brüt Tutar',
      tableAlign: 'right',
      resolveValue: (row: CompanyDocumentByCustomerItemDto) => this.formatCurrency(row.totalAmount)
    },
    {
      key: 'totalTaxAmount',
      label: 'KDV Tutarı',
      tableAlign: 'right',
      resolveValue: (row: CompanyDocumentByCustomerItemDto) => this.formatCurrency(row.totalTaxAmount)
    },
    {
      key: 'totalDiscountAmount',
      label: 'İskonto',
      tableAlign: 'right',
      resolveValue: (row: CompanyDocumentByCustomerItemDto) => this.formatCurrency(row.totalDiscountAmount)
    },
    {
      key: 'netAmount',
      label: 'Net Tutar',
      tableAlign: 'right',
      resolveValue: (row: CompanyDocumentByCustomerItemDto) => this.formatCurrency(row.netAmount)
    }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  setTab(tab: 'lazy-branches' | 'supplier-volume'): void {
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.loadData();
  }

  loadData(): void {
    if (this.activeTab() === 'lazy-branches') {
      this.loadLazyBranches();
    } else {
      this.loadSupplierVolume();
    }
  }

  loadLazyBranches(): void {
    this.loading.set(true);
    this.raporService
      .getTembelSubeler({
        startDate: this.startDate() || undefined,
        endDate: this.endDate() || undefined,
        region: this.selectedRegion() === 'all' ? undefined : this.selectedRegion()
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: LazyBranchReceivingItemDto[]) => this.lazyBranches.set(res ?? []),
        error: () => this.lazyBranches.set([])
      });
  }

  loadSupplierVolume(): void {
    this.loading.set(true);
    this.raporService
      .getTedarikciHacimAnalizi({
        startDate: this.startDate(),
        endDate: this.endDate(),
        take: this.supplierLimit()
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: CompanyDocumentByCustomerItemDto[]) => this.supplierVolume.set(res ?? []),
        error: () => this.supplierVolume.set([])
      });
  }

  openBranchDocs(branch: LazyBranchReceivingItemDto): void {
    this.selectedBranchForDocs.set(branch);
    this.docsModalOpen.set(true);
    this.docsLoading.set(true);
    this.raporService
      .getTembelSubeEvraklari({
        warehouseNo: branch.warehouseNo,
        region: branch.region
      })
      .pipe(
        finalize(() => this.docsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: LazyBranchDocumentDetailDto[]) => this.branchDocuments.set(res ?? []),
        error: () => this.branchDocuments.set([])
      });
  }

  closeDocsModal(): void {
    this.docsModalOpen.set(false);
    this.selectedBranchForDocs.set(null);
    this.branchDocuments.set([]);
  }

  updateStartDate(date: string): void {
    this.startDate.set(date);
    this.loadData();
  }

  updateEndDate(date: string): void {
    this.endDate.set(date);
    this.loadData();
  }

  updateRegion(reg: string): void {
    this.selectedRegion.set(reg);
    if (this.activeTab() === 'lazy-branches') {
      this.loadLazyBranches();
    }
  }

  updateSearch(q: string): void {
    this.searchTerm.set(q);
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '₺0,00';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(value);
  }

  protected formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('tr-TR').format(value);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    try {
      const d = new Date(value);
      return d.toLocaleDateString('tr-TR');
    } catch {
      return value;
    }
  }

  private getDefaultStartDate(): string {
    const now = new Date();
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return past.toISOString().substring(0, 10);
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
