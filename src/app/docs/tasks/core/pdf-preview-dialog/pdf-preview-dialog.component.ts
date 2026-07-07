import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

export interface PdfPreviewDialogData {
  blob: Blob;
  title: string;
}

@Component({
  selector: 'app-pdf-preview-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-preview-dialog.component.html',
  styleUrl: './pdf-preview-dialog.component.scss'
})
export class PdfPreviewDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogData = inject<PdfPreviewDialogData | null>(DIALOG_DATA, {
    optional: true
  });
  private readonly dialogRef = inject<DialogRef<void> | null>(DialogRef, { optional: true });

  readonly blob = input<Blob | null>(null);
  readonly title = input('PDF Onizleme');
  readonly closed = output<void>();

  protected readonly resourceUrl = signal<SafeResourceUrl | null>(null);
  protected readonly effectiveBlob = computed(() => this.dialogData?.blob ?? this.blob());
  protected readonly effectiveTitle = computed(() => this.dialogData?.title ?? this.title());

  constructor() {
    effect((onCleanup) => {
      const sourceBlob = this.effectiveBlob();

      if (!sourceBlob) {
        this.resourceUrl.set(null);
        return;
      }

      const pdfBlob =
        sourceBlob.type === 'application/pdf'
          ? sourceBlob
          : new Blob([sourceBlob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);

      this.resourceUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
      onCleanup(() => URL.revokeObjectURL(objectUrl));
    });
  }

  protected close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      return;
    }

    this.closed.emit();
  }
}
