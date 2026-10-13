import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import {
  MAX_BROWSER_CREATE_DRAFTS_PER_MODULE,
  type BrowserCreateDraftRecord
} from './browser-create-draft.store';

@Component({
  selector: 'app-browser-create-draft-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './browser-create-draft-bar.component.html',
  styleUrl: './browser-create-draft-bar.component.scss'
})
export class BrowserCreateDraftBarComponent implements OnChanges {
  @Input() records: BrowserCreateDraftRecord[] = [];
  @Input() moduleDraftCount = 0;
  @Input() activeDraftId: string | null = null;
  @Input() status = '';
  @Input() hasError = false;

  @Output() readonly openDraft = new EventEmitter<string>();
  @Output() readonly deleteDraft = new EventEmitter<string>();
  @Output() readonly newDraft = new EventEmitter<void>();

  protected readonly maxDraftCount = MAX_BROWSER_CREATE_DRAFTS_PER_MODULE;
  protected selectedDraftId = '';

  ngOnChanges(): void {
    const selectedStillExists = this.records.some((record) => record.id === this.selectedDraftId);
    if (selectedStillExists) {
      return;
    }

    this.selectedDraftId = this.activeDraftId && this.records.some((record) => record.id === this.activeDraftId)
      ? this.activeDraftId
      : (this.records[0]?.id ?? '');
  }

  protected selectDraft(value: string): void {
    this.selectedDraftId = value;
  }

  protected openSelectedDraft(): void {
    if (this.selectedDraftId) {
      this.openDraft.emit(this.selectedDraftId);
    }
  }

  protected deleteSelectedDraft(): void {
    if (this.selectedDraftId) {
      this.deleteDraft.emit(this.selectedDraftId);
    }
  }

  protected getRecordLabel(record: BrowserCreateDraftRecord): string {
    const updatedAt = new Date(record.updatedAtUtc);
    const dateLabel = Number.isNaN(updatedAt.getTime())
      ? ''
      : updatedAt.toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
    return `${record.title} | ${record.lineCount} kalem${dateLabel ? ` | ${dateLabel}` : ''}`;
  }
}
