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
  ExpenseSlipBranchSummaryDto,
  ExpenseSlipCashRegisterSummaryDto,
  ExpenseSlipDetailItemDto,
  ExpenseSlipZoneSummaryDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

@Component({
  selector: 'app-kasa-raporlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kasa-raporlari-list.component.html',
  styleUrl: './kasa-raporlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KasaRaporlariListComponent implements OnInit {
  private readonly raporService = inject(RaporIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page: DocsContentPage =
    DOCS_PAGES['kasa-raporlari'] ?? {
      title: 'Kasa & Gider Raporları',
      subtitle: 'Bölge, şube, kasa ve kasiyer kırılımında gider pusulası toplamları ve detay fiş dökümü.',
      endpoints: []
    };

  // Filtreler
  protected readonly startDate = signal<string>(this.getDefaultStartDate());
  protected readonly endDate = signal<string>(this.getDefaultEndDate());
  protected readonly filterWarehouseNo = signal<number | null>(null);
  protected readonly filterCashRegisterNo = signal<number | null>(null);
  protected readonly filterCashierCode = signal<string>('');

  // Veriler
  protected readonly loading = signal<boolean>(false);
  protected readonly zoneSummaries = signal<ExpenseSlipZoneSummaryDto[]>([]);

  // Genişletilmiş Akordiyon Düğümleri
  protected readonly expandedZones = signal<Set<string>>(new Set<string>());
  protected readonly expandedBranches = signal<Set<number>>(new Set<number>());
  protected readonly expandedCashes = signal<Set<string>>(new Set<string>());

  // Detay Fiş Modalı
  protected readonly detailsModalOpen = signal<boolean>(false);
  protected readonly detailsLoading = signal<boolean>(false);
  protected readonly detailsTitle = signal<string>('');
  protected readonly slipDetails = signal<ExpenseSlipDetailItemDto[]>([]);

  // Toplam İstatistikler
  protected readonly grandTotalAmount = computed<number>(() =>
    this.zoneSummaries().reduce((sum, z) => sum + (z.totalExpenseAmount || 0), 0)
  );
  protected readonly grandTotalSlips = computed<number>(() =>
    this.zoneSummaries().reduce((sum, z) => sum + (z.slipCount || 0), 0)
  );
  protected readonly totalZonesCount = computed<number>(() =>
    this.zoneSummaries().length
  );
  protected readonly totalBranchesCount = computed<number>(() =>
    this.zoneSummaries().reduce((sum, z) => sum + (z.branches?.length || 0), 0)
  );
  protected readonly avgSlipAmount = computed<number>(() => {
    const slips = this.grandTotalSlips();
    return slips > 0 ? this.grandTotalAmount() / slips : 0;
  });

  // Sıralama
  protected readonly sortOption = signal<'amount-desc' | 'amount-asc' | 'slips-desc' | 'name-asc'>('amount-desc');

  protected readonly sortedZoneSummaries = computed<ExpenseSlipZoneSummaryDto[]>(() => {
    const list = [...this.zoneSummaries()];
    const opt = this.sortOption();

    const sortBranches = (branches: ExpenseSlipBranchSummaryDto[]): ExpenseSlipBranchSummaryDto[] => {
      const bList = [...branches];
      bList.sort((a, b) => {
        if (opt === 'amount-desc') return (b.totalExpenseAmount || 0) - (a.totalExpenseAmount || 0);
        if (opt === 'amount-asc') return (a.totalExpenseAmount || 0) - (b.totalExpenseAmount || 0);
        if (opt === 'slips-desc') return (b.slipCount || 0) - (a.slipCount || 0);
        return (a.branchName || '').localeCompare(b.branchName || '', 'tr');
      });
      return bList;
    };

    list.sort((a, b) => {
      if (opt === 'amount-desc') return (b.totalExpenseAmount || 0) - (a.totalExpenseAmount || 0);
      if (opt === 'amount-asc') return (a.totalExpenseAmount || 0) - (b.totalExpenseAmount || 0);
      if (opt === 'slips-desc') return (b.slipCount || 0) - (a.slipCount || 0);
      return (a.zoneName || a.zoneCode || '').localeCompare(b.zoneName || b.zoneCode || '', 'tr');
    });

    return list.map(z => ({
      ...z,
      branches: sortBranches(z.branches || [])
    }));
  });

  setSortOption(opt: 'amount-desc' | 'amount-asc' | 'slips-desc' | 'name-asc'): void {
    this.sortOption.set(opt);
  }

  expandAll(): void {
    const allZones = new Set<string>(this.zoneSummaries().map(z => z.zoneCode));
    const allBranches = new Set<number>();
    const allCashes = new Set<string>();

    for (const z of this.zoneSummaries()) {
      for (const b of z.branches || []) {
        allBranches.add(b.branchNo);
        for (const c of b.cashRegisters || []) {
          allCashes.add(`${b.branchNo}-${c.cashRegisterNo}`);
        }
      }
    }

    this.expandedZones.set(allZones);
    this.expandedBranches.set(allBranches);
    this.expandedCashes.set(allCashes);
  }

  collapseAll(): void {
    this.expandedZones.set(new Set<string>());
    this.expandedBranches.set(new Set<number>());
    this.expandedCashes.set(new Set<string>());
  }

  ngOnInit(): void {
    this.loadHierarchyReport();
  }

  loadHierarchyReport(): void {
    this.loading.set(true);
    this.raporService
      .getGiderPusulalariHiyerarsi({
        startDate: this.startDate(),
        endDate: this.endDate(),
        warehouseNo: this.filterWarehouseNo() ?? undefined,
        cashRegisterNo: this.filterCashRegisterNo() ?? undefined,
        cashierCode: this.filterCashierCode() || undefined
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: ExpenseSlipZoneSummaryDto[]) => {
          this.zoneSummaries.set(res ?? []);
          // İlk bölgeleri otomatik genişlet
          const allZones = new Set<string>((res ?? []).map((z: ExpenseSlipZoneSummaryDto) => z.zoneCode));
          this.expandedZones.set(allZones);
        },
        error: () => this.zoneSummaries.set([])
      });
  }

  toggleZone(zoneCode: string): void {
    const next = new Set(this.expandedZones());
    if (next.has(zoneCode)) {
      next.delete(zoneCode);
    } else {
      next.add(zoneCode);
    }
    this.expandedZones.set(next);
  }

  toggleBranch(branchNo: number): void {
    const next = new Set(this.expandedBranches());
    if (next.has(branchNo)) {
      next.delete(branchNo);
    } else {
      next.add(branchNo);
    }
    this.expandedBranches.set(next);
  }

  toggleCash(key: string): void {
    const next = new Set(this.expandedCashes());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedCashes.set(next);
  }

  openSlipDetails(branchNo: number, branchName: string, cashNo?: number, cashierCode?: string, cashierName?: string): void {
    let title = `${branchNo} - ${branchName}`;
    if (cashNo !== undefined) title += ` / Kasa ${cashNo}`;
    if (cashierName) title += ` / Kasiyer: ${cashierName}`;

    this.detailsTitle.set(title);
    this.detailsModalOpen.set(true);
    this.detailsLoading.set(true);

    this.raporService
      .getGiderPusulasiDetaylar({
        startDate: this.startDate(),
        endDate: this.endDate(),
        warehouseNo: branchNo,
        cashRegisterNo: cashNo,
        cashierCode: cashierCode
      })
      .pipe(
        finalize(() => this.detailsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: ExpenseSlipDetailItemDto[]) => this.slipDetails.set(res ?? []),
        error: () => this.slipDetails.set([])
      });
  }

  closeDetailsModal(): void {
    this.detailsModalOpen.set(false);
    this.slipDetails.set([]);
  }

  updateStartDate(d: string): void {
    this.startDate.set(d);
    this.loadHierarchyReport();
  }

  updateEndDate(d: string): void {
    this.endDate.set(d);
    this.loadHierarchyReport();
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
      return new Date(value).toLocaleDateString('tr-TR');
    } catch {
      return value;
    }
  }

  private getDefaultStartDate(): string {
    const now = new Date();
    return this.formatLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  private getDefaultEndDate(): string {
    return this.formatLocalIsoDate(new Date());
  }

  private formatLocalIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
