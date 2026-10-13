import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { CurrentUser } from '../../../../core/auth/models/auth.models';
import {
  BrowserCreateDraftStore,
  MAX_BROWSER_CREATE_DRAFTS_PER_MODULE,
  buildBrowserCreateDraftScope,
  type BrowserCreateDraftRecord,
  type BrowserCreateDraftScope
} from './browser-create-draft.store';

export interface BrowserCreateDraftConfig<TPayload> {
  user: CurrentUser | null | undefined;
  moduleCode: string;
  operationCode: string;
  changes$: Observable<unknown>;
  capture: () => TPayload;
  restore: (payload: TPayload) => void;
  reset: () => void;
  isMeaningful: (payload: TPayload) => boolean;
  title: (payload: TPayload) => string;
  lineCount: (payload: TPayload) => number;
  warehouseNo?: () => number | null | undefined;
}

interface InternalBrowserCreateDraftConfig {
  capture: () => unknown;
  restore: (payload: unknown) => void;
  reset: () => void;
  isMeaningful: (payload: unknown) => boolean;
  title: (payload: unknown) => string;
  lineCount: (payload: unknown) => number;
  warehouseNo?: () => number | null | undefined;
}

export class BrowserCreateDraftSession {
  readonly drafts = signal<BrowserCreateDraftRecord[]>([]);
  readonly moduleDraftCount = signal(0);
  readonly activeId = signal<string | null>(null);
  readonly status = signal('');
  readonly hasError = signal(false);

  private scope: BrowserCreateDraftScope | null = null;
  private config: InternalBrowserCreateDraftConfig | null = null;
  private restoring = false;
  private completed = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly store: BrowserCreateDraftStore,
    private readonly destroyRef: DestroyRef
  ) {}

  setup<TPayload>(config: BrowserCreateDraftConfig<TPayload>): void {
    this.scope = buildBrowserCreateDraftScope(
      config.user,
      config.moduleCode,
      config.operationCode,
      config.warehouseNo?.()
    );
    this.config = {
      capture: config.capture,
      restore: (payload) => config.restore(payload as TPayload),
      reset: config.reset,
      isMeaningful: (payload) => config.isMeaningful(payload as TPayload),
      title: (payload) => config.title(payload as TPayload),
      lineCount: (payload) => config.lineCount(payload as TPayload),
      warehouseNo: config.warehouseNo
    };
    this.refresh();
    this.setInitialStatus();

    config.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleSave());

    this.destroyRef.onDestroy(() => {
      this.cancelScheduledSave();
      if (!this.completed) {
        this.saveNow();
      }
    });
  }

  open(id: string): void {
    const scope = this.scope;
    const config = this.config;
    if (!scope || !config || !id || !this.saveNow()) {
      return;
    }

    const record = this.store.read<unknown>(scope, id);
    if (!record) {
      this.setError('Taslak bulunamadi veya bu tarayicidan silinmis.');
      this.refresh();
      return;
    }

    try {
      this.restoring = true;
      config.restore(record.payload);
      this.activeId.set(record.id);
      this.setStatus(`${record.title} acildi.`);
    } catch {
      this.setError('Taslak bu ekranin guncel yapisiyla acilamadi. Taslagi silip yeniden olustur.');
    } finally {
      this.restoring = false;
    }
  }

  delete(id: string): void {
    const scope = this.scope;
    const config = this.config;
    if (!scope || !config || !id) {
      return;
    }

    const deletingActiveDraft = this.activeId() === id;
    this.store.remove(scope, id);

    if (deletingActiveDraft) {
      this.runWhileRestoring(() => {
        config.reset();
        this.activeId.set(null);
      });
    }

    this.refresh();
    this.setStatus('Taslak silindi.');
  }

  startNew(): void {
    const config = this.config;
    if (!config || !this.saveNow()) {
      return;
    }

    if (this.moduleDraftCount() >= MAX_BROWSER_CREATE_DRAFTS_PER_MODULE) {
      this.setError(
        `Bu modulde ${MAX_BROWSER_CREATE_DRAFTS_PER_MODULE} taslak sinirina ulasildi. Yeni taslak icin once birini sil.`
      );
      return;
    }

    this.runWhileRestoring(() => {
      config.reset();
      this.activeId.set(null);
      this.setStatus('Yeni bos taslak hazir. Degisiklikler otomatik kaydedilecek.');
    });
  }

  complete(): void {
    const activeId = this.activeId();
    this.completed = true;
    this.cancelScheduledSave();

    if (this.scope && activeId) {
      this.store.remove(this.scope, activeId);
    }

    this.activeId.set(null);
    this.refresh();
  }

  saveNow(): boolean {
    if (!this.scope || !this.config || this.restoring || this.completed) {
      return true;
    }

    this.cancelScheduledSave();
    const payload = this.config.capture();
    if (!this.config.isMeaningful(payload)) {
      return true;
    }

    const result = this.store.save(
      {
        ...this.scope,
        warehouseNo: this.config.warehouseNo?.() ?? this.scope.warehouseNo
      },
      {
        id: this.activeId(),
        title: this.config.title(payload),
        lineCount: this.config.lineCount(payload),
        payload
      }
    );

    if (!result.ok) {
      this.setError(
        result.reason === 'limit'
          ? `Bu modulde ${MAX_BROWSER_CREATE_DRAFTS_PER_MODULE} taslak sinirina ulasildi. Kaydetmek icin once bir taslagi sil.`
          : 'Taslak tarayiciya kaydedilemedi. Tarayici depolama alanini kontrol et.'
      );
      this.refresh();
      return false;
    }

    this.activeId.set(result.record.id);
    this.refresh();
    const savedAt = new Date(result.record.updatedAtUtc).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    this.setStatus(`Otomatik kaydedildi ${savedAt}.`);
    return true;
  }

  private scheduleSave(): void {
    if (this.restoring || this.completed) {
      return;
    }

    this.cancelScheduledSave();
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 650);
  }

  private cancelScheduledSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private refresh(): void {
    if (!this.scope) {
      return;
    }

    this.drafts.set(this.store.listForOperation(this.scope));
    this.moduleDraftCount.set(this.store.countForModule(this.scope.userId, this.scope.moduleCode));
  }

  private setInitialStatus(): void {
    if (this.drafts().length > 0) {
      this.setStatus(`${this.drafts().length} uyumlu taslak bulundu. Secip Ac diyebilirsin.`);
    } else if (this.moduleDraftCount() > 0) {
      this.setStatus(`Bu modulde baska ekranlara ait ${this.moduleDraftCount()} taslak var.`);
    } else {
      this.setStatus('Degisiklikler bu tarayiciya otomatik kaydedilir.');
    }
  }

  private runWhileRestoring(action: () => void): void {
    this.restoring = true;
    try {
      action();
    } finally {
      this.restoring = false;
    }
  }

  private setStatus(message: string): void {
    this.hasError.set(false);
    this.status.set(message);
  }

  private setError(message: string): void {
    this.hasError.set(true);
    this.status.set(message);
  }
}
