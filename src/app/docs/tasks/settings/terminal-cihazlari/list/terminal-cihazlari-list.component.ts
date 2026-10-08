import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  TerminalInstallationDto,
  TerminalInstallationSummaryDto,
  TerminalVersionDistributionDto,
  TerminalWarehouseDistributionDto,
  WarehouseLookupItemDto
} from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo
} from '../../../core/admin-warehouse.helpers';
import {
  ActionFeedback,
  getErrorMessage,
  hasSettingsPermission
} from '../../settings-task.helpers';

type VersionFilter = 'all' | 'current' | 'outdated';

const TASK_ID = 'terminal-cihazlari';
const PERMISSION_PREFIX = 'ayar-islemleri.terminal-cihazlari';
const ALL_WAREHOUSES_PERMISSION = `${PERMISSION_PREFIX}.all-warehouses`;

@Component({
  selector: 'app-terminal-cihazlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terminal-cihazlari-list.component.html',
  styleUrl: './terminal-cihazlari-list.component.scss'
})
export class TerminalCihazlariListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly summary = signal<TerminalInstallationSummaryDto | null>(null);
  protected readonly installations = signal<TerminalInstallationDto[]>([]);
  protected readonly warehouses = signal<WarehouseLookupItemDto[]>([]);
  protected readonly selectedInstallation = signal<TerminalInstallationDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly isSummaryLoading = signal(false);
  protected readonly isListLoading = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly isWarehouseLoading = signal(false);

  protected selectedWarehouseNo: number | null = null;
  protected search = '';
  protected appVersion = '';
  protected versionFilter: VersionFilter = 'all';
  protected activeWithinDays: number | null = null;
  protected take = 100;

  private readonly authService = inject(AuthService);
  private readonly api = inject(AyarIslemleriService);
  private readonly searchApi = inject(AramaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canList = computed(() => this.hasPermission(`${PERMISSION_PREFIX}.list`));
  protected readonly canDetail = computed(() =>
    this.hasPermission(`${PERMISSION_PREFIX}.detail`)
  );
  protected readonly canUseAllWarehouses = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      ALL_WAREHOUSES_PERMISSION
    )
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly versions = computed<TerminalVersionDistributionDto[]>(
    () => this.summary()?.versions ?? []
  );
  protected readonly warehouseDistribution = computed<TerminalWarehouseDistributionDto[]>(
    () => this.summary()?.warehouses ?? []
  );
  protected readonly isLoading = computed(
    () => this.isSummaryLoading() || this.isListLoading()
  );

  ngOnInit(): void {
    if (!this.canList()) {
      this.showError(
        'Yetki gerekli',
        'Terminal cihazlarini listeleme yetkiniz bulunmuyor.'
      );
      return;
    }

    if (!this.canUseAllWarehouses()) {
      this.selectedWarehouseNo = getCurrentWarehouseNo(this.authService.currentUser());
    }

    this.loadWarehouses();
    this.loadWorkspace();
  }

  protected applyFilters(): void {
    this.feedback.set(null);
    this.selectedInstallation.set(null);
    this.loadWorkspace();
  }

  protected clearFilters(): void {
    this.search = '';
    this.appVersion = '';
    this.versionFilter = 'all';
    this.activeWithinDays = null;
    this.take = 100;
    this.selectedWarehouseNo = this.canUseAllWarehouses()
      ? null
      : getCurrentWarehouseNo(this.authService.currentUser());
    this.applyFilters();
  }

  protected refresh(): void {
    if (!this.isLoading()) {
      this.loadWorkspace(true);
    }
  }

  protected selectVersion(version: TerminalVersionDistributionDto): void {
    this.appVersion = version.appVersion?.trim() || '';
    this.versionFilter = 'all';
    this.applyFilters();
  }

  protected selectWarehouse(warehouseNo: number): void {
    if (!this.canUseAllWarehouses()) {
      return;
    }

    this.selectedWarehouseNo = warehouseNo;
    this.applyFilters();
  }

  protected selectInstallation(installation: TerminalInstallationDto): void {
    this.selectedInstallation.set(installation);

    if (!this.canDetail() || this.isDetailLoading()) {
      return;
    }

    this.isDetailLoading.set(true);
    this.api
      .getTerminalInstallation(installation.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: TerminalInstallationDto) => this.selectedInstallation.set(detail),
        error: (error: unknown) =>
          this.showError(
            'Cihaz detayi alinamadi',
            getErrorMessage(error, 'Terminal kurulum detayi okunamadi.')
          )
      });
  }

  protected closeDetail(): void {
    this.selectedInstallation.set(null);
  }

  protected getWarehouseLabel(warehouseNo: number | null | undefined): string {
    if (warehouseNo === null || warehouseNo === undefined) {
      return '-';
    }

    const warehouse = this.warehouses().find((item) => item.warehouseNo === warehouseNo);
    return warehouse ? `${warehouseNo} - ${warehouse.warehouseName}` : `Depo ${warehouseNo}`;
  }

  protected getDeviceLabel(installation: TerminalInstallationDto): string {
    const brand = installation.manufacturer?.trim();
    const model = installation.deviceModel?.trim();
    return [brand, model].filter(Boolean).join(' ') || 'Cihaz bilgisi yok';
  }

  protected getVersionLabel(
    appVersion: string | null | undefined,
    buildNumber: number | null | undefined
  ): string {
    const version = appVersion?.trim() || '-';
    return buildNumber ? `${version} (${buildNumber})` : version;
  }

  protected getVersionStatusLabel(value: boolean | null | undefined): string {
    if (value === true) {
      return 'Guncel';
    }

    if (value === false) {
      return 'Eski surum';
    }

    return 'Bilinmiyor';
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('tr-TR');
  }

  protected formatRelativeDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const timestamp = new Date(value).getTime();
    const difference = Date.now() - timestamp;

    if (!Number.isFinite(timestamp) || difference < 0) {
      return this.formatDate(value);
    }

    const minutes = Math.floor(difference / 60000);
    if (minutes < 1) {
      return 'Simdi';
    }

    if (minutes < 60) {
      return `${minutes} dk once`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} saat once`;
    }

    const days = Math.floor(hours / 24);
    return `${days} gun once`;
  }

  protected trackByInstallation(_: number, installation: TerminalInstallationDto): string {
    return installation.id;
  }

  protected trackByVersion(_: number, version: TerminalVersionDistributionDto): string {
    return `${version.appVersion ?? ''}-${version.buildNumber}`;
  }

  protected trackByWarehouse(_: number, warehouse: WarehouseLookupItemDto): number {
    return warehouse.warehouseNo;
  }

  protected trackByWarehouseDistribution(
    _: number,
    warehouse: TerminalWarehouseDistributionDto
  ): number {
    return warehouse.warehouseNo;
  }

  private loadWorkspace(showFeedback = false): void {
    this.loadSummary();
    this.loadInstallations(showFeedback);
  }

  private loadSummary(): void {
    if (this.isSummaryLoading()) {
      return;
    }

    this.isSummaryLoading.set(true);
    this.api
      .getTerminalInstallationSummary(this.resolveWarehouseNo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSummaryLoading.set(false))
      )
      .subscribe({
        next: (summary: TerminalInstallationSummaryDto) => this.summary.set(summary),
        error: (error: unknown) =>
          this.showError(
            'Ozet alinamadi',
            getErrorMessage(error, 'Terminal cihaz ozeti okunamadi.')
          )
      });
  }

  private loadInstallations(showFeedback = false): void {
    if (this.isListLoading()) {
      return;
    }

    this.isListLoading.set(true);
    this.api
      .getTerminalInstallations({
        warehouseNo: this.resolveWarehouseNo(),
        search: this.search,
        appVersion: this.appVersion,
        isCurrentVersion: this.resolveVersionFilter(),
        activeWithinDays: this.activeWithinDays,
        take: this.take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isListLoading.set(false))
      )
      .subscribe({
        next: (installations: TerminalInstallationDto[]) => {
          this.installations.set(installations ?? []);
          if (showFeedback) {
            this.feedback.set({
              tone: 'success',
              title: 'Liste yenilendi',
              message: `${installations?.length ?? 0} terminal kurulumu listelendi.`
            });
          }
        },
        error: (error: unknown) => {
          this.installations.set([]);
          this.showError(
            'Cihazlar alinamadi',
            getErrorMessage(error, 'Terminal kurulumlari listelenemedi.')
          );
        }
      });
  }

  private loadWarehouses(): void {
    if (!this.canUseAllWarehouses()) {
      return;
    }

    this.isWarehouseLoading.set(true);
    this.searchApi
      .listAllWarehouses(100)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isWarehouseLoading.set(false))
      )
      .subscribe({
        next: (warehouses: WarehouseLookupItemDto[]) => this.warehouses.set(warehouses ?? []),
        error: () => this.warehouses.set([])
      });
  }

  private resolveWarehouseNo(): number | null {
    if (!this.canUseAllWarehouses()) {
      return getCurrentWarehouseNo(this.authService.currentUser());
    }

    return this.selectedWarehouseNo;
  }

  private resolveVersionFilter(): boolean | null {
    if (this.versionFilter === 'current') {
      return true;
    }

    if (this.versionFilter === 'outdated') {
      return false;
    }

    return null;
  }

  private hasPermission(permissionCode: string): boolean {
    return hasSettingsPermission(this.authService, TASK_ID, permissionCode);
  }

  private showError(title: string, message: string): void {
    this.feedback.set({ tone: 'error', title, message });
  }
}
