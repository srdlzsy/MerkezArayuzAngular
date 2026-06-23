import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IManavKunyeTag } from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ManavKunyeEtiketPrintComponent } from './print/manav-kunye-etiket-print.component';

interface FeedbackState {
  tone: 'info' | 'error' | 'success';
  message: string;
}

@Component({
  selector: 'app-manav-kunye-etiket-basimi-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ManavKunyeEtiketPrintComponent],
  templateUrl: './manav-kunye-etiket-basimi-list.component.html',
  styleUrl: './manav-kunye-etiket-basimi-list.component.scss'
})
export class ManavKunyeEtiketBasimiListComponent implements OnInit {
  @ViewChild(ManavKunyeEtiketPrintComponent)
  private readonly printComponent?: ManavKunyeEtiketPrintComponent;

  protected readonly page: DocsContentPage = DOCS_PAGES['manav-kunye-etiket-yazdirma'];
  protected readonly tags = signal<IManavKunyeTag[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly selectedDate = signal('');
  protected readonly searchTerm = signal('');
  protected readonly warehouseNo = signal<number | null>(null);
  protected readonly selection = new SelectionModel<IManavKunyeTag>(true, []);
  protected readonly selectedCount = signal(0);
  protected readonly selectedTags = signal<IManavKunyeTag[]>([]);
  protected readonly filteredTags = computed(() => {
    const term = this.normalizeSearch(this.searchTerm());

    if (!term) {
      return this.tags();
    }

    return this.tags().filter((tag) =>
      [
        tag.stockCode,
        tag.stockName,
        tag.productName,
        tag.goodsGenus,
        tag.goodsType,
        tag.productUnit,
        tag.takenTag,
        tag.productionCity,
        tag.productionDistrict,
        tag.manufacturer,
        tag.buyer
      ]
        .map((value) => this.normalizeSearch(value))
        .some((value) => value.includes(term))
    );
  });

  constructor(
    private readonly authService: AuthService,
    private readonly kasaIslemleriService: KasaIslemleriService
  ) {
    this.warehouseNo.set(this.authService.currentUser()?.depoNo ?? null);
  }

  ngOnInit(): void {
    if (this.warehouseNo()) {
      this.loadTags();
    }
  }

  protected onWarehouseNoChange(value: number | string | null): void {
    const numericValue = Number(value);
    this.warehouseNo.set(Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null);
  }

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected loadTags(): void {
    const warehouseNo = this.warehouseNo();

    if (!warehouseNo || warehouseNo < 1) {
      this.setFeedback('error', 'Manav kunye etiketleri icin depo no zorunludur.');
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService
      .getManavKunyeEtiketleri(warehouseNo, this.selectedDate() || null)
      .subscribe({
        next: (tags: IManavKunyeTag[]) => {
          this.tags.set(tags ?? []);
          this.selection.clear();
          this.syncSelectionCount();

          if (!tags || tags.length === 0) {
            this.setFeedback('info', 'Secilen filtrelerle manav kunye etiketi bulunamadi.');
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.tags.set([]);
          this.selection.clear();
          this.syncSelectionCount();
          this.isLoading.set(false);
          this.setFeedback('error', 'Manav kunye etiketleri alinirken hata olustu.');
        }
      });
  }

  protected clearDate(): void {
    this.selectedDate.set('');
    this.loadTags();
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  protected clearList(): void {
    this.tags.set([]);
    this.selection.clear();
    this.clearSearch();
    this.feedback.set(null);
    this.syncSelectionCount();
  }

  protected masterToggle(): void {
    const visibleTags = this.filteredTags();

    this.isAllSelected()
      ? visibleTags.forEach((row) => this.selection.deselect(row))
      : visibleTags.forEach((row) => this.selection.select(row));
    this.syncSelectionCount();
  }

  protected isAllSelected(): boolean {
    const visibleTags = this.filteredTags();
    const numSelected = visibleTags.filter((tag) => this.selection.isSelected(tag)).length;
    const numRows = visibleTags.length;
    return numSelected === numRows && numRows > 0;
  }

  protected toggleRow(tag: IManavKunyeTag): void {
    this.selection.toggle(tag);
    this.syncSelectionCount();
  }

  protected async printSelected(): Promise<void> {
    if (this.printState() === 'preparing') {
      return;
    }

    if (!this.selectedCount()) {
      this.setFeedback('info', 'Yazdirilacak etiket secilmedi.');
      return;
    }

    try {
      await this.printWithStylesheet('/assets/manav-kunye-a5.css');
    } catch {
      this.setFeedback(
        'error',
        'Baski hazirlanamadi. Lutfen tarayicinin yazdirma iznini ve baglantinizi kontrol edip tekrar deneyin.'
      );
    }
  }

  protected readonly trackByTag = (_index: number, tag: IManavKunyeTag): string =>
    `${tag.stockCode}-${tag.takenTag}`;

  private setFeedback(tone: FeedbackState['tone'], message: string): void {
    this.feedback.set({ tone, message });
  }

  private syncSelectionCount(): void {
    this.selectedCount.set(this.selection.selected.length);
    this.selectedTags.set(this.tags().filter((tag) => this.selection.isSelected(tag)));
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .trim();
  }

  private async printWithStylesheet(stylesheetHref: string): Promise<void> {
    this.printState.set('preparing');

    const existingLink = document.getElementById('kunye-print-style');
    const existingStyle = document.getElementById('kunye-print-shell');

    existingLink?.remove();
    existingStyle?.remove();

    const link = document.createElement('link');
    link.id = 'kunye-print-style';
    link.rel = 'stylesheet';
    link.href = stylesheetHref;

    const shellStyle = document.createElement('style');
    shellStyle.id = 'kunye-print-shell';
    shellStyle.textContent = `
      @media print {
        .app-sidebar,
        .topbar,
        .topbar-mobile,
        .sidebar-backdrop,
        .kunye-print-hidden,
        .manav-kunye-screen {
          display: none !important;
        }

        .content-wrapper {
          padding: 0 !important;
        }

        .kunye-print-root {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          position: static !important;
          left: auto !important;
          visibility: visible !important;
        }
      }
    `;

    const beforePrint = () => {
      this.printComponent?.renderBarcodesNow();
    };

    let cleanedUp = false;
    let cleanupTimer: number | undefined;

    const cleanup = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      if (cleanupTimer !== undefined) {
        window.clearTimeout(cleanupTimer);
      }
      link.remove();
      shellStyle.remove();
      this.printState.set('idle');
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(shellStyle);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', cleanup);

    try {
      await this.appendStylesheet(link);
      await this.printComponent?.prepareForPrint();
      await this.waitForFonts();
      await this.waitForNextPaint();

      cleanupTimer = window.setTimeout(cleanup, 60_000);
      window.print();
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  private appendStylesheet(link: HTMLLinkElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(`Baski stili zamaninda yuklenemedi: ${link.href}`));
      }, 5_000);

      link.addEventListener(
        'load',
        () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
        { once: true }
      );
      link.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeoutId);
          reject(new Error(`Baski stili yuklenemedi: ${link.href}`));
        },
        { once: true }
      );

      document.head.appendChild(link);
    });
  }

  private async waitForFonts(): Promise<void> {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }
}
