import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';

export type CreateWorkflowStep = 'all' | 'document' | 'lines' | 'review';
export type CreateDialogView = 'header' | 'lines';

export interface CreateSummaryItem {
  label: string;
  value: string | number | null | undefined;
  tone?: 'default' | 'accent' | 'warning' | 'danger' | 'success';
}

@Component({
  selector: 'app-create-workflow-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-workflow-bar.component.html',
  styleUrl: './create-workflow-bar.component.scss'
})
export class CreateWorkflowBarComponent implements OnInit, OnChanges {
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly documentRef = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  @Input() documentTitle = 'Yeni Evrak';
  @Input() partnerLabel = 'Firma / Depo';
  @Input() partnerValue = '';
  @Input() warehouseLabel = 'Depo';
  @Input() warehouseValue = '';
  @Input() dateValue = '';
  @Input() documentNoValue = '';
  @Input() lineCount = 0;
  @Input() discrepancyCount = 0;
  @Input() totalQuantity: number | string | null = null;
  @Input() validationWarnings: readonly string[] = [];
  @Input() canSubmit = true;
  @Input() submitting = false;
  @Input() submitLabel = 'Evraki Kaydet';

  @Output() readonly stepChange = new EventEmitter<CreateWorkflowStep>();
  @Output() readonly submitRequested = new EventEmitter<void>();

  protected readonly activeView = signal<CreateDialogView>('header');
  protected readonly showReview = signal(false);

  private readonly onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'F2' || event.code === 'F2') {
      event.preventDefault();
      event.stopPropagation();
      this.focusStockSearch();
      return;
    }

    if (event.key === 'F4' || event.code === 'F4') {
      event.preventDefault();
      event.stopPropagation();
      this.focusEntitySearch();
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      (event.code === 'KeyS' || event.key === 's' || event.key === 'S')
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleReview();
    }
  };

  ngOnInit(): void {
    this.syncParentViewAttribute(this.activeView());
    this.documentRef.addEventListener('keydown', this.onDocumentKeyDown, true);
    this.destroyRef.onDestroy(() => {
      this.documentRef.removeEventListener('keydown', this.onDocumentKeyDown, true);
    });
  }

  ngOnChanges(): void {
    this.syncParentViewAttribute(this.activeView());
  }

  setView(view: CreateDialogView): void {
    this.activeView.set(view);
    this.showReview.set(false);
    this.syncParentViewAttribute(view);
    this.stepChange.emit(view === 'lines' ? 'lines' : 'document');
  }

  toggleReview(): void {
    const next = !this.showReview();
    this.showReview.set(next);
    this.stepChange.emit(next ? 'review' : this.activeView() === 'lines' ? 'lines' : 'document');
  }

  focusStockSearch(): void {
    if (this.activeView() !== 'lines') {
      this.setView('lines');
    }

    this.scheduleFocus(
      '[data-create-stock-search], .kalem-search-bar input[type="text"], .kalem-search-bar input[type="search"], .search-panel input[type="text"], .search-panel input[type="search"], input[placeholder*="Stok" i], input[placeholder*="Barkod" i], input[placeholder*="Sayilan" i]'
    );
  }

  focusEntitySearch(): void {
    if (this.activeView() !== 'header') {
      this.setView('header');
    }

    this.scheduleFocus(
      '[data-create-entity-search], .search-block input[type="text"], input[placeholder*="Cari" i], input[placeholder*="Firma" i], input[placeholder*="Depo" i], input[placeholder*="Seri" i], input[placeholder*="Sayim" i]'
    );
  }

  private scheduleFocus(selector: string): void {
    const run = (): void => {
      const dialogRoot = this.findDialogRoot();
      const target = dialogRoot?.querySelector<HTMLInputElement>(selector);
      if (target && !target.disabled) {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        target.focus();
        target.select?.();
      }
    };

    setTimeout(run, 0);
  }

  private syncParentViewAttribute(view: CreateDialogView): void {
    const host = this.hostRef.nativeElement;
    const container =
      host.closest<HTMLElement>('.form-shell') ??
      host.closest<HTMLElement>('.dialog-body') ??
      host.parentElement;

    if (container) {
      container.setAttribute('data-create-view', view);
    }
  }

  private findDialogRoot(): HTMLElement | null {
    const host = this.hostRef.nativeElement;
    return (
      host.closest<HTMLElement>('.dialog-page') ??
      host.closest<HTMLElement>('.form-shell') ??
      host.parentElement
    );
  }
}
