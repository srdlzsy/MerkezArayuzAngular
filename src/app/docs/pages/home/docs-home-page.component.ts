import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  CreateFeedbackItemHttpRequest,
  FeedbackItemDto,
  FeedbackItemType,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackSummaryDto
} from '@interfaces';

import { OrtakIslemlerService } from '../../../core/api/module-services/ortak-islemler.service';
import { DocsTaskItem } from '../../models/docs.models';
import { DocsNavigationService } from '../../services/docs-navigation.service';

interface FeedbackOption<T extends string> {
  value: T;
  label: string;
}

interface FeedbackMessage {
  tone: 'error' | 'info' | 'success';
  title: string;
  text: string;
}

@Component({
  selector: 'app-docs-home-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './docs-home-page.component.html',
  styleUrl: './docs-home-page.component.scss'
})
export class DocsHomePageComponent {
  private readonly docsNavigationService = inject(DocsNavigationService);
  private readonly ortakIslemlerService = inject(OrtakIslemlerService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navGroups = this.docsNavigationService.menuGroups;
  protected readonly feedbackTypeOptions: readonly FeedbackOption<FeedbackItemType>[] = [
    { value: 'Complaint', label: 'Sikayet' },
    { value: 'Suggestion', label: 'Oneri' }
  ];
  protected readonly feedbackPriorityOptions: readonly FeedbackOption<FeedbackPriority>[] = [
    { value: 'Normal', label: 'Normal' },
    { value: 'High', label: 'Yuksek' },
    { value: 'Low', label: 'Dusuk' }
  ];
  protected readonly feedbackForm = new FormGroup({
    type: new FormControl<FeedbackItemType>('Complaint', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    priority: new FormControl<FeedbackPriority>('Normal', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)]
    }),
    message: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000)]
    })
  });

  protected readonly feedbackSummary = signal<FeedbackSummaryDto | null>(null);
  protected readonly myFeedbackItems = signal<FeedbackItemDto[]>([]);
  protected readonly selectedFeedback = signal<FeedbackItemDto | null>(null);
  protected readonly feedbackMessage = signal<FeedbackMessage | null>(null);
  protected readonly feedbackModalOpen = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly summaryLoading = signal(false);
  protected readonly historyLoading = signal(false);
  protected readonly submittingFeedback = signal(false);

  protected readonly apiCount = computed(() =>
    this.navGroups().reduce((total, group) => total + group.children.length, 0)
  );
  protected readonly latestStatusLabel = computed(() =>
    this.getStatusLabel(this.feedbackSummary()?.latestStatus ?? null)
  );
  protected readonly latestCreatedLabel = computed(() =>
    this.formatDateTime(this.feedbackSummary()?.latestCreatedAtUtc ?? null)
  );

  constructor() {
    this.loadFeedbackSummary();
  }

  protected getFirstRoute(items: DocsTaskItem[]): string {
    const route = items[0]?.route;

    if (route) {
      return route;
    }

    return '/dashboard';
  }

  protected getPreviewLabels(items: DocsTaskItem[]): string[] {
    return items
      .slice(0, 6)
      .map((item) => item.label)
      .filter((label) => !!label);
  }

  protected openFeedbackModal(): void {
    this.feedbackModalOpen.set(true);
    this.feedbackMessage.set(null);
  }

  protected closeFeedbackModal(): void {
    if (this.submittingFeedback()) {
      return;
    }

    this.feedbackModalOpen.set(false);
  }

  protected toggleHistory(): void {
    const nextOpen = !this.historyOpen();
    this.historyOpen.set(nextOpen);

    if (nextOpen) {
      this.loadMyFeedbackItems();
    }
  }

  protected selectFeedback(item: FeedbackItemDto): void {
    this.selectedFeedback.set(item);
  }

  protected submitFeedback(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.feedbackMessage.set({
        tone: 'error',
        title: 'Form eksik',
        text: 'Baslik ve mesaj alanlari zorunludur.'
      });
      return;
    }

    const formValue = this.feedbackForm.getRawValue();
    const request: CreateFeedbackItemHttpRequest = {
      type: formValue.type,
      priority: formValue.priority,
      title: formValue.title.trim(),
      message: formValue.message.trim()
    };

    this.submittingFeedback.set(true);
    this.feedbackMessage.set(null);

    this.ortakIslemlerService
      .createFeedbackItem(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submittingFeedback.set(false))
      )
      .subscribe({
        next: (item: FeedbackItemDto) => {
          this.feedbackModalOpen.set(false);
          this.feedbackForm.reset({
            type: 'Complaint',
            priority: 'Normal',
            title: '',
            message: ''
          });
          this.selectedFeedback.set(item);
          this.feedbackMessage.set({
            tone: 'success',
            title: 'Kayit alindi',
            text: `${item.typeName || 'Kayit'} ${item.statusName || 'Yeni'} durumunda acildi.`
          });
          this.loadFeedbackSummary();

          if (this.historyOpen()) {
            this.loadMyFeedbackItems();
          }
        },
        error: (error: unknown) => {
          this.feedbackMessage.set({
            tone: 'error',
            title: 'Kayit gonderilemedi',
            text: this.getErrorMessage(error, 'Sikayet / oneri kaydi olusturulurken hata olustu.')
          });
        }
      });
  }

  protected loadFeedbackSummary(): void {
    this.summaryLoading.set(true);

    this.ortakIslemlerService
      .getFeedbackSummary()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.summaryLoading.set(false))
      )
      .subscribe({
        next: (summary: FeedbackSummaryDto) => {
          this.feedbackSummary.set(summary);
        },
        error: (error: unknown) => {
          this.feedbackMessage.set({
            tone: 'info',
            title: 'Ozet alinamadi',
            text: this.getErrorMessage(error, 'Sikayet / oneri ozeti su an alinamadi.')
          });
        }
      });
  }

  protected loadMyFeedbackItems(): void {
    this.historyLoading.set(true);

    this.ortakIslemlerService
      .getMyFeedbackItems()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.historyLoading.set(false))
      )
      .subscribe({
        next: (items: FeedbackItemDto[]) => {
          this.myFeedbackItems.set(items ?? []);
          this.selectedFeedback.set(items?.[0] ?? null);
        },
        error: (error: unknown) => {
          this.myFeedbackItems.set([]);
          this.selectedFeedback.set(null);
          this.feedbackMessage.set({
            tone: 'error',
            title: 'Gecmis yuklenemedi',
            text: this.getErrorMessage(error, 'Sikayet / oneri gecmisi alinirken hata olustu.')
          });
        }
      });
  }

  protected getStatusLabel(status: FeedbackStatus | string | null): string {
    switch (status) {
      case 'New':
        return 'Yeni';
      case 'Read':
        return 'Okundu';
      case 'InProgress':
        return 'Islemde';
      case 'Resolved':
        return 'Cozuldu';
      case 'Closed':
        return 'Kapali';
      case 'Rejected':
        return 'Reddedildi';
      default:
        return 'Kayit yok';
    }
  }

  protected getStatusTone(status: FeedbackStatus | string | null): string {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'status-success';
      case 'Rejected':
        return 'status-danger';
      case 'InProgress':
        return 'status-info';
      case 'Read':
        return 'status-warn';
      case 'New':
      default:
        return 'status-neutral';
    }
  }

  protected getPriorityTone(priority: FeedbackPriority | string | null): string {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Low':
        return 'priority-low';
      default:
        return 'priority-normal';
    }
  }

  protected formatDateTime(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected readonly trackFeedback = (_index: number, item: FeedbackItemDto): string => item.id;

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }

    const httpError = error as { error?: unknown; message?: unknown };

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error;
    }

    if (typeof httpError.error === 'object' && httpError.error !== null) {
      const body = httpError.error as Record<string, unknown>;
      const bodyMessage = body['message'] ?? body['title'] ?? body['detail'];

      if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
        return bodyMessage;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message;
    }

    return fallback;
  }
}
