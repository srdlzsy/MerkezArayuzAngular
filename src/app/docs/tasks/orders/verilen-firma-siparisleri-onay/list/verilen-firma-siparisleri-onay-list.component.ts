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
  BatchApproveCompanyOrdersResultDto,
  PendingApprovalCompanyOrderItemDto
} from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

@Component({
  selector: 'app-verilen-firma-siparisleri-onay-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verilen-firma-siparisleri-onay-list.component.html',
  styleUrl: './verilen-firma-siparisleri-onay-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerilenFirmaSiparisleriOnayListComponent implements OnInit {
  private readonly siparisService = inject(SiparisIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page: DocsContentPage =
    DOCS_PAGES['verilen-firma-siparisleri-onay'] ?? {
      title: 'Sipariş Onay & Takip',
      subtitle: 'Satın alma onayını bekleyen siparişleri filtreler, tekil veya toplu onaylar.',
      endpoints: []
    };

  // Filtreler
  protected readonly filterPerCode = signal<string>('');
  protected readonly filterCustomerCode = signal<string>('');
  protected readonly filterWarehouseNo = signal<number | null>(null);
  protected readonly startDate = signal<string>('');
  protected readonly endDate = signal<string>('');
  protected readonly searchTerm = signal<string>('');

  // Veriler
  protected readonly loading = signal<boolean>(false);
  protected readonly approving = signal<boolean>(false);
  protected readonly orders = signal<PendingApprovalCompanyOrderItemDto[]>([]);
  protected readonly selectedKeys = signal<Set<string>>(new Set<string>());
  protected readonly lastBatchResult = signal<BatchApproveCompanyOrdersResultDto | null>(null);

  // Filtrelenmiş Liste
  protected readonly filteredOrders = computed<PendingApprovalCompanyOrderItemDto[]>(() => {
    let list = this.orders();
    const q = this.searchTerm().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.documentSerie.toLowerCase().includes(q) ||
          o.documentOrderNo.toString().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerCode.toLowerCase().includes(q) ||
          o.branchName.toLowerCase().includes(q) ||
          (o.purchasingPersonName && o.purchasingPersonName.toLowerCase().includes(q))
      );
    }
    return list;
  });

  // Seçim durumu
  protected readonly isAllSelected = computed<boolean>(() => {
    const list = this.filteredOrders();
    if (list.length === 0) return false;
    const selected = this.selectedKeys();
    return list.every((o) => selected.has(`${o.documentSerie}-${o.documentOrderNo}`));
  });

  protected readonly selectedCount = computed<number>(() => this.selectedKeys().size);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.siparisService
      .getOnayBekleyenVerilenFirmaSiparisleri({
        userDefPerCode: this.filterPerCode() || undefined,
        customerCode: this.filterCustomerCode() || undefined,
        warehouseNo: this.filterWarehouseNo() ?? undefined,
        startDate: this.startDate() || undefined,
        endDate: this.endDate() || undefined,
        take: 500
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: PendingApprovalCompanyOrderItemDto[]) => {
          this.orders.set(res ?? []);
          this.selectedKeys.set(new Set<string>());
        },
        error: () => this.orders.set([])
      });
  }

  toggleSelectAll(): void {
    const next = new Set<string>();
    if (!this.isAllSelected()) {
      this.filteredOrders().forEach((o) => next.add(`${o.documentSerie}-${o.documentOrderNo}`));
    }
    this.selectedKeys.set(next);
  }

  toggleSelect(o: PendingApprovalCompanyOrderItemDto): void {
    const key = `${o.documentSerie}-${o.documentOrderNo}`;
    const next = new Set(this.selectedKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.selectedKeys.set(next);
  }

  approveSingle(o: PendingApprovalCompanyOrderItemDto): void {
    this.executeApproval([{ documentSerie: o.documentSerie, documentOrderNo: o.documentOrderNo }]);
  }

  approveSelected(): void {
    const selected = this.selectedKeys();
    if (selected.size === 0) return;

    const list = this.orders()
      .filter((o) => selected.has(`${o.documentSerie}-${o.documentOrderNo}`))
      .map((o) => ({ documentSerie: o.documentSerie, documentOrderNo: o.documentOrderNo }));

    this.executeApproval(list);
  }

  private executeApproval(items: Array<{ documentSerie: string; documentOrderNo: number }>): void {
    this.approving.set(true);
    this.lastBatchResult.set(null);

    this.siparisService
      .batchApproveCompanyOrders({ orders: items })
      .pipe(
        finalize(() => this.approving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: BatchApproveCompanyOrdersResultDto) => {
          this.lastBatchResult.set(res);
          this.loadOrders();
        },
        error: () => {
          this.lastBatchResult.set(null);
        }
      });
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

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('tr-TR');
    } catch {
      return value;
    }
  }
}
