import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DestroyRef, Directive, inject } from '@angular/core';

import { BrowserCreateDraftStore } from './browser-create-draft/browser-create-draft.store';
import {
  BrowserCreateDraftSession,
  type BrowserCreateDraftConfig
} from './browser-create-draft/browser-create-draft.session';

@Directive()
export abstract class DocsTaskDialogBase<TData = unknown> {
  protected readonly data = inject<TData | null>(DIALOG_DATA, { optional: true });

  private readonly dialogRef = inject(DialogRef<unknown>, { optional: true });
  private readonly browserDraftSession = new BrowserCreateDraftSession(
    inject(BrowserCreateDraftStore),
    inject(DestroyRef)
  );

  protected readonly browserDrafts = this.browserDraftSession.drafts;
  protected readonly browserDraftModuleCount = this.browserDraftSession.moduleDraftCount;
  protected readonly browserDraftActiveId = this.browserDraftSession.activeId;
  protected readonly browserDraftStatus = this.browserDraftSession.status;
  protected readonly browserDraftHasError = this.browserDraftSession.hasError;

  protected setupBrowserDraft<TPayload>(config: BrowserCreateDraftConfig<TPayload>): void {
    this.browserDraftSession.setup(config);
  }

  protected openBrowserDraft(id: string): void {
    this.browserDraftSession.open(id);
  }

  protected deleteBrowserDraft(id: string): void {
    this.browserDraftSession.delete(id);
  }

  protected startNewBrowserDraft(): void {
    this.browserDraftSession.startNew();
  }

  protected completeBrowserDraft(): void {
    this.browserDraftSession.complete();
  }

  protected saveBrowserDraftNow(): boolean {
    return this.browserDraftSession.saveNow();
  }

  protected close(result?: unknown): void {
    this.browserDraftSession.saveNow();
    this.dialogRef?.close(result);
  }
}
