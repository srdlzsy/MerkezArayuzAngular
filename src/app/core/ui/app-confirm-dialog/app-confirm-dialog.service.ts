import { Injectable, signal } from '@angular/core';

export type AppConfirmDialogTone = 'info' | 'warning' | 'danger';

export interface AppConfirmDialogInputOptions {
  label?: string;
  placeholder?: string;
  helpText?: string;
  expectedValue?: string;
  required?: boolean;
}

export interface AppConfirmDialogOptions {
  title?: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: AppConfirmDialogTone;
}

export interface AppPromptDialogOptions extends AppConfirmDialogOptions {
  input?: AppConfirmDialogInputOptions;
}

export interface AppConfirmDialogRequest extends AppPromptDialogOptions {
  id: number;
  mode: 'confirm' | 'prompt';
}

interface PendingDialogRequest extends AppConfirmDialogRequest {
  resolve: (value: boolean | string | null) => void;
}

@Injectable({ providedIn: 'root' })
export class AppConfirmDialogService {
  private readonly activeRequest = signal<PendingDialogRequest | null>(null);
  private readonly queue: PendingDialogRequest[] = [];
  private nextId = 1;

  readonly request = this.activeRequest.asReadonly();

  confirm(messageOrOptions: string | AppConfirmDialogOptions): Promise<boolean> {
    const options =
      typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

    return this.open({
      ...options,
      mode: 'confirm'
    }).then((value) => value === true);
  }

  prompt(options: AppPromptDialogOptions): Promise<string | null> {
    return this.open({
      ...options,
      mode: 'prompt'
    }).then((value) => (typeof value === 'string' ? value : null));
  }

  accept(value?: string): void {
    const request = this.activeRequest();

    if (!request) {
      return;
    }

    this.close(request.mode === 'prompt' ? value ?? '' : true);
  }

  cancel(): void {
    const request = this.activeRequest();

    if (!request) {
      return;
    }

    this.close(request.mode === 'prompt' ? null : false);
  }

  private open(
    request: Omit<PendingDialogRequest, 'id' | 'resolve'>
  ): Promise<boolean | string | null> {
    return new Promise((resolve) => {
      const pendingRequest: PendingDialogRequest = {
        ...request,
        id: this.nextId++,
        tone: request.tone ?? 'warning',
        confirmText: request.confirmText ?? 'Onayla',
        cancelText: request.cancelText ?? 'Vazgec',
        resolve
      };

      if (this.activeRequest()) {
        this.queue.push(pendingRequest);
        return;
      }

      this.activeRequest.set(pendingRequest);
    });
  }

  private close(value: boolean | string | null): void {
    const request = this.activeRequest();

    if (!request) {
      return;
    }

    request.resolve(value);
    this.activeRequest.set(this.queue.shift() ?? null);
  }
}
