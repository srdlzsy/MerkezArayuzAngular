import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Directive, inject } from '@angular/core';

@Directive()
export abstract class DocsTaskDialogBase<TData = unknown> {
  protected readonly data = inject<TData | null>(DIALOG_DATA, { optional: true });

  private readonly dialogRef = inject(DialogRef<unknown>, { optional: true });

  protected close(result?: unknown): void {
    this.dialogRef?.close(result);
  }
}
