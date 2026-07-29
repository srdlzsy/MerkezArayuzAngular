import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-excel-export-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="excel-export-button"
      title="Excel'e aktar"
      [disabled]="disabled() || exporting()"
      (click)="requestExport()"
    >
      <i
        class="fa-solid"
        [ngClass]="exporting() ? 'fa-circle-notch fa-spin' : 'fa-file-excel'"
      ></i>
      <span>{{ exporting() ? exportingLabel() : label() }}</span>
      <small *ngIf="summary()">{{ summary() }}</small>
    </button>
  `,
  styleUrl: './excel-export-button.component.scss'
})
export class ExcelExportButtonComponent {
  readonly disabled = input(false);
  readonly exporting = input(false);
  readonly label = input("Excel'e Aktar");
  readonly exportingLabel = input('Aktariliyor...');
  readonly summary = input('');
  readonly exportRequested = output<void>();

  protected requestExport(): void {
    if (this.disabled() || this.exporting()) {
      return;
    }

    this.exportRequested.emit();
  }
}
