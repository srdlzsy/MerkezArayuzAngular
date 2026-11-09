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
  CiroHedefKarsilastirmaRaporDto,
  CiroHedefSubeKarsilastirmaDto,
  HedefTanimDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import {
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel
} from '../../../core/admin-warehouse.helpers';

const ALL_WAREHOUSES_PERMISSION = 'rapor-islemleri.ciro-hedef-raporlari.all-warehouses';

@Component({
  selector: 'app-ciro-hedef-raporlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiListTableComponent],
  templateUrl: './ciro-hedef-raporlari-list.component.html',
  styleUrl: './ciro-hedef-raporlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CiroHedefRaporlariListComponent implements OnInit {
  private readonly raporService = inject(RaporIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page: DocsContentPage =
    DOCS_PAGES['ciro-hedef-raporlari'] ?? {
      title: 'Ciro & Hedef Karşılaştırma',
      subtitle: 'Cari dönem ile geçen yılın aynı dönemi karşılaştırmalı ciro, müşteri sayısı, sepet ve hedef analizi.',
      endpoints: []
    };

  // Filtre sinyalleri
  protected readonly startDate = signal<string>(this.getDefaultStartDate());
  protected readonly endDate = signal<string>(this.getDefaultEndDate());
  protected readonly selectedRegion = signal<string>('all');
  protected readonly selectedWarehouseNo = signal<number | null>(null);

  // Veri sinyalleri
  protected readonly loading = signal<boolean>(false);
  protected readonly reportData = signal<CiroHedefKarsilastirmaRaporDto | null>(null);
  protected readonly goals = signal<HedefTanimDto[]>([]);
  protected readonly goalsModalOpen = signal<boolean>(false);
  protected readonly goalsLoading = signal<boolean>(false);
  protected readonly activeTab = signal<'comparison' | 'goals'>('comparison');
  protected readonly searchTerm = signal<string>('');

  // Yetki ve depo
  protected readonly isAdminUser = computed<boolean>(() =>
    currentUserCanUseAllWarehouses(this.authService.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );
  protected readonly currentWarehouseLabel = computed<string>(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );

  // Filtrelenmiş şubeler
  protected readonly filteredBranches = computed<CiroHedefSubeKarsilastirmaDto[]>(() => {
    const data = this.reportData();
    if (!data || !data.branches) return [];
    let list = data.branches;
    const reg = this.selectedRegion();
    if (reg !== 'all') {
      list = list.filter((b) => b.region === reg || b.region?.startsWith(reg) || b.region?.includes(reg));
    }
    const q = this.searchTerm().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.branchName.toLowerCase().includes(q) ||
          b.branchNo.toString().includes(q)
      );
    }
    return list;
  });

  // Hızlı sıralama
  protected readonly sortField = signal<'achievement' | 'turnover' | 'target' | 'customer' | 'custAchievement' | 'basket' | 'name'>('achievement');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected readonly sortedBranches = computed<CiroHedefSubeKarsilastirmaDto[]>(() => {
    const list = [...this.filteredBranches()];
    const field = this.sortField();
    const mult = this.sortDirection() === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      switch (field) {
        case 'achievement':
          return (a.turnoverAchievementRate - b.turnoverAchievementRate) * mult;
        case 'turnover':
          return (a.currentOverallTotal - b.currentOverallTotal) * mult;
        case 'target':
          return (a.targetTurnover - b.targetTurnover) * mult;
        case 'customer':
          return (a.currentCustomerCount - b.currentCustomerCount) * mult;
        case 'custAchievement':
          return (a.customerAchievementRate - b.customerAchievementRate) * mult;
        case 'basket':
          return (a.currentAverageBasketAmount - b.currentAverageBasketAmount) * mult;
        case 'name':
          return a.branchName.localeCompare(b.branchName, 'tr') * mult;
        default:
          return 0;
      }
    });
  });

  protected toggleSort(field: 'achievement' | 'turnover' | 'target' | 'customer' | 'custAchievement' | 'basket' | 'name'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }

  // Tablo kolonları
  protected readonly columns: ApiListTableColumn<CiroHedefSubeKarsilastirmaDto>[] = [
    { key: 'region', label: 'Bölge' },
    { key: 'branchNo', label: 'Şube No' },
    { key: 'branchName', label: 'Şube Adı' },
    {
      key: 'currentOverallTotal',
      label: 'Cari Ciro',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatCurrency(row.currentOverallTotal)
    },
    {
      key: 'previousOverallTotal',
      label: 'Geçen Yıl Ciro',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatCurrency(row.previousOverallTotal)
    },
    {
      key: 'targetTurnover',
      label: 'Hedef Ciro',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatCurrency(row.targetTurnover)
    },
    {
      key: 'turnoverAchievementRate',
      label: 'Ciro Başarı %',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => `%${row.turnoverAchievementRate.toFixed(1)}`
    },
    {
      key: 'currentCustomerCount',
      label: 'Cari Müşteri',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatNumber(row.currentCustomerCount)
    },
    {
      key: 'previousCustomerCount',
      label: 'Geçen Yıl Müşteri',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatNumber(row.previousCustomerCount)
    },
    {
      key: 'customerAchievementRate',
      label: 'Müşteri Başarı %',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => `%${row.customerAchievementRate.toFixed(1)}`
    },
    {
      key: 'currentAverageBasketAmount',
      label: 'Sepet Ortalaması',
      tableAlign: 'right',
      resolveValue: (row: CiroHedefSubeKarsilastirmaDto) => this.formatCurrency(row.currentAverageBasketAmount)
    }
  ];

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return;

    this.loading.set(true);
    this.raporService
      .getCiroHedefKarsilastirma({
        startDate: start,
        endDate: end,
        warehouseNo: this.selectedWarehouseNo() ?? undefined,
        region: this.selectedRegion() === 'all' ? undefined : this.selectedRegion()
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: CiroHedefKarsilastirmaRaporDto) => this.reportData.set(res),
        error: () => this.reportData.set(null)
      });
  }

  loadGoals(): void {
    this.goalsLoading.set(true);
    const year = new Date(this.startDate()).getFullYear();
    this.raporService
      .getHedefTanimlari(year)
      .pipe(
        finalize(() => this.goalsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: HedefTanimDto[]) => this.goals.set(res ?? []),
        error: () => this.goals.set([])
      });
  }

  openGoalsModal(): void {
    this.goalsModalOpen.set(true);
    this.loadGoals();
  }

  closeGoalsModal(): void {
    this.goalsModalOpen.set(false);
  }

  updateStartDate(date: string): void {
    this.startDate.set(date);
    this.loadReport();
  }

  updateEndDate(date: string): void {
    this.endDate.set(date);
    this.loadReport();
  }

  updateRegion(region: string): void {
    this.selectedRegion.set(region);
  }

  updateSearch(val: string): void {
    this.searchTerm.set(val);
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
