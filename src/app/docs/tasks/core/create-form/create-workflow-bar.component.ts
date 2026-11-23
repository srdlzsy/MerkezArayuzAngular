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

  protected readonly activeStep = signal<CreateWorkflowStep>('all');

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
      this.setStep(this.activeStep() === 'review' ? 'all' : 'review');
    }
  };

  ngOnInit(): void {
    this.syncParentStepAttribute(this.activeStep());
    this.documentRef.addEventListener('keydown', this.onDocumentKeyDown, true);
    this.destroyRef.onDestroy(() => {
      this.documentRef.removeEventListener('keydown', this.onDocumentKeyDown, true);
    });
  }

  ngOnChanges(): void {
    this.syncParentStepAttribute(this.activeStep());
  }

  setStep(step: CreateWorkflowStep): void {
    this.activeStep.set(step);
    this.syncParentStepAttribute(step);
    this.stepChange.emit(step);
  }

  focusStockSearch(): void {
    if (this.activeStep() === 'document' || this.activeStep() === 'review') {
      this.setStep('lines');
    }

    this.scheduleFocus(
      '[data-create-stock-search], .search-panel input[type="text"], .search-panel input[type="search"], .dual-search .search-block:last-child input[type="text"], .dual-search .search-block:last-child input[type="search"], input[placeholder*="Stok" i], input[placeholder*="Barkod" i], input[placeholder*="Sayilan" i]'
    );
  }

  focusEntitySearch(): void {
    if (this.activeStep() === 'lines' || this.activeStep() === 'review') {
      this.setStep('document');
    }

    this.scheduleFocus(
      '[data-create-entity-search], .dual-search .search-block:first-child input[type="text"], .dual-search .search-block:first-child input[type="search"], input[placeholder*="Cari" i], input[placeholder*="Firma" i], input[placeholder*="Depo" i], input[placeholder*="Seri" i], input[placeholder*="Sayim" i]'
    );
  }

  private scheduleFocus(selector: string): void {
    const run = (): void => {
      const dialogRoot = this.findDialogRoot();
      if (!dialogRoot) {
        return;
      }

      const candidates = Array.from(dialogRoot.querySelectorAll<HTMLElement>(selector));
      const target =
        candidates.find((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null) ??
        candidates.find((el) => !(el as HTMLInputElement).disabled);

      if (!target) {
        return;
      }

      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.focus();

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.select();
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      run();
    }
  }

  private findDialogRoot(): HTMLElement | null {
    return (
      this.hostRef.nativeElement.closest('.dialog-page, .create-page, .task-page') ??
      this.hostRef.nativeElement.parentElement
    );
  }

  private syncParentStepAttribute(step: CreateWorkflowStep): void {
    const formShell = this.hostRef.nativeElement.closest('.form-shell, .dialog-body');
    if (formShell) {
      formShell.setAttribute('data-create-step', step);
    }
  }
}
