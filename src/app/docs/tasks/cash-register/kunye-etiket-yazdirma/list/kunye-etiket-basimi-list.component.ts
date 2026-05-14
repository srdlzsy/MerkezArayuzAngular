import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IKunyeTag } from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KunyeEtiketPrintComponent } from './print/kunye-etiket-print.component';

interface FeedbackState {
  tone: 'info' | 'error' | 'success';
  message: string;
}

@Component({
  selector: 'app-kunye-etiket-basimi-list',
  standalone: true,
  imports: [CommonModule, FormsModule, KunyeEtiketPrintComponent],
  templateUrl: './kunye-etiket-basimi-list.component.html',
  styleUrl: './kunye-etiket-basimi-list.component.scss'
})
export class KunyeEtiketBasimiListComponent implements OnInit {
  @ViewChild(KunyeEtiketPrintComponent) private readonly printComponent?: KunyeEtiketPrintComponent;
  protected readonly page: DocsContentPage = DOCS_PAGES['kunye-etiket-yazdirma'];
  protected readonly tags = signal<IKunyeTag[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly selectedDate = signal(this.getTodayDate());
  protected readonly selection = new SelectionModel<IKunyeTag>(true, []);

  protected readonly selectedCount = signal(0);
  protected readonly selectedTags = signal<IKunyeTag[]>([]);

  constructor(private readonly kasaIslemleriService: KasaIslemleriService) {}

  ngOnInit(): void {
    this.loadTags();
  }

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.loadTags();
  }

  protected loadTags(): void {
    const selectedDate = this.selectedDate();

    if (!selectedDate) {
      this.setFeedback('error', 'Gecerli bir tarih secin.');
      return;
    }

    const formattedDate = this.formatDate(selectedDate);

    if (!formattedDate) {
      this.setFeedback('error', 'Tarih formati okunamadi.');
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService.getKunyeler(formattedDate).subscribe({
      next: (tags: IKunyeTag[]) => {
        this.tags.set(tags ?? []);
        this.selection.clear();
        this.syncSelectionCount();

        if (!tags || tags.length === 0) {
          this.setFeedback('info', 'Secilen tarihe ait etiket bulunamadi.');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.tags.set([]);
        this.selection.clear();
        this.syncSelectionCount();
        this.isLoading.set(false);
        this.setFeedback('error', 'Veri alinirken hata olustu.');
      }
    });
  }

  protected masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.tags().forEach((row) => this.selection.select(row));
    this.syncSelectionCount();
  }

  protected isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.tags().length;
    return numSelected === numRows && numRows > 0;
  }

  protected toggleRow(tag: IKunyeTag): void {
    this.selection.toggle(tag);
    this.syncSelectionCount();
  }

  protected hasData(): boolean {
    return this.tags().length > 0;
  }

  protected printSelected(): void {
    if (!this.selectedCount()) {
      this.setFeedback('info', 'Yazdirilacak etiket bulunamadi.');
      return;
    }

    this.printComponent?.forceRenderBarcodes();
    window.setTimeout(() => {
      this.printComponent?.forceRenderBarcodes();
      this.printWithStylesheet('/assets/tagLabel.css');
    }, 420);
  }

  protected readonly trackByTag = (_index: number, tag: IKunyeTag): string =>
    `${tag.takenTag}-${tag.productName}`;

  private setFeedback(tone: FeedbackState['tone'], message: string): void {
    this.feedback.set({ tone, message });
  }

  private syncSelectionCount(): void {
    this.selectedCount.set(this.selection.selected.length);
    this.selectedTags.set([...this.selection.selected]);
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day} 00:00:00`;
  }

  private printWithStylesheet(stylesheetHref: string): void {
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
        .kunye-print-hidden {
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
      this.printComponent?.forceRenderBarcodes();
    };

    const cleanup = () => {
      link.remove();
      shellStyle.remove();
      this.printState.set('idle');
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(link);
    document.head.appendChild(shellStyle);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', cleanup);

    window.setTimeout(() => {
      this.printComponent?.forceRenderBarcodes();
      window.print();
    }, 420);
  }
}

