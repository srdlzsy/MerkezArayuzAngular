import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { AppConfirmDialogService } from './app-confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-confirm-dialog.component.html',
  styleUrl: './app-confirm-dialog.component.scss'
})
export class AppConfirmDialogComponent {
  protected readonly dialogService = inject(AppConfirmDialogService);
  protected readonly request = this.dialogService.request;
  protected readonly inputValue = signal('');
  protected readonly canConfirm = computed(() => {
    const request = this.request();

    if (!request || request.mode !== 'prompt') {
      return true;
    }

    const value = this.inputValue().trim();
    const input = request.input;

    if (input?.required && !value) {
      return false;
    }

    if (input?.expectedValue) {
      return value === input.expectedValue;
    }

    return true;
  });

  constructor() {
    effect(() => {
      this.request();
      this.inputValue.set('');
    });
  }

  protected getDialogTitle(): string {
    const request = this.request();

    if (request?.title) {
      return request.title;
    }

    return request?.tone === 'danger' ? 'Islem onayi' : 'Devam edilsin mi?';
  }

  protected getIconClass(): string {
    switch (this.request()?.tone) {
      case 'danger':
        return 'fa-solid fa-triangle-exclamation';
      case 'info':
        return 'fa-solid fa-circle-info';
      default:
        return 'fa-solid fa-circle-exclamation';
    }
  }

  protected updateInputValue(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
  }

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }

    this.dialogService.accept(this.inputValue().trim());
  }

  protected cancel(): void {
    this.dialogService.cancel();
  }
}
