import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  CreateFeedbackItemHttpRequest,
  FeedbackItemDto,
  FeedbackItemType,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackSummaryDto,
  HomePriorityItemDto,
  HomePriorityMetricDto,
  HomeWarehousePrioritiesDto
} from '@interfaces';

import { HomeService } from '../../../core/api/module-services/home.service';
import { OrtakIslemlerService } from '../../../core/api/module-services/ortak-islemler.service';
import { AuthService } from '../../../core/auth/services/auth.service';

interface FeedbackOption<T extends string> {
  value: T;
  label: string;
}

interface FeedbackMessage {
  tone: 'error' | 'info' | 'success';
  title: string;
  text: string;
}

const BACKEND_ROUTE_MAP: Readonly<Record<string, string>> = {
  '/operasyon-islemleri/belge-akis-takibi': '/docs/api/belge-akis-takibi',
  '/operasyon-islemleri/urun-dagilimlari': '/docs/api/urun-dagilimlari',
  '/stok-islemleri/stok-anomali-merkezi': '/docs/api/stok-anomali-merkezi',
  '/ortak-islemler/sikayet-oneri': '/docs/api/sikayet-oneri',
  '/yonetim/sikayet-oneri': '/docs/api/sikayet-oneri'
};

@Component({
  selector: 'app-docs-home-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './docs-home-page.component.html',
  styleUrl: './docs-home-page.component.scss'
})
export class DocsHomePageComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly ortakIslemlerService = inject(OrtakIslemlerService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly priorityDate = signal(this.getToday());
  protected readonly priorityWarehouseNoInput = signal('');
  protected readonly warehousePriorities = signal<HomeWarehousePrioritiesDto | null>(null);
  protected readonly prioritiesLoading = signal(false);
  protected readonly prioritiesMessage = signal<FeedbackMessage | null>(null);

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

  protected readonly latestStatusLabel = computed(() =>
    this.getStatusLabel(this.feedbackSummary()?.latestStatus ?? null)
  );
  protected readonly latestCreatedLabel = computed(() =>
    this.formatDateTime(this.feedbackSummary()?.latestCreatedAtUtc ?? null)
  );
  protected readonly isAdminUser = computed(() => this.hasRole('Admin') || this.hasRole('Administrator'));
  protected readonly priorityScopeLabel = computed(() => {
    const priorities = this.warehousePriorities();

    if (priorities?.warehouseName?.trim() && priorities.warehouseNo) {
      return `${priorities.warehouseName.trim()} (${priorities.warehouseNo})`;
    }

    if (priorities?.warehouseName?.trim()) {
      return priorities.warehouseName.trim();
    }

    if (priorities?.warehouseNo) {
      return `Depo ${priorities.warehouseNo}`;
    }

    return this.isAdminUser() ? 'Tum Depolar' : this.currentWarehouseLabel();
  });
  constructor() {
    this.applyHomeQueryActions();
    this.loadWarehousePriorities();
    this.loadFeedbackSummary();
  }

  protected loadWarehousePriorities(): void {
    const date = this.priorityDate().trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.prioritiesMessage.set({
        tone: 'error',
        title: 'Tarih hatali',
        text: 'Depo oncelikleri icin gecerli bir tarih secin.'
      });
      return;
    }

    this.prioritiesLoading.set(true);
    this.prioritiesMessage.set(null);

    this.homeService
      .getWarehousePriorities({
        date,
        warehouseNo: this.isAdminUser() ? this.toOptionalNumber(this.priorityWarehouseNoInput()) : null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.prioritiesLoading.set(false))
      )
      .subscribe({
        next: (priorities: HomeWarehousePrioritiesDto) => {
          this.warehousePriorities.set({
            ...priorities,
            metrics: priorities.metrics ?? [],
            priorities: priorities.priorities ?? []
          });
        },
        error: (error: unknown) => {
          this.warehousePriorities.set(null);
          this.prioritiesMessage.set({
            tone: 'error',
            title: 'Oncelikler alinamadi',
            text: this.getErrorMessage(error, 'Depo oncelikleri yuklenirken hata olustu.')
          });
        }
      });
  }

  protected setPriorityDate(value: string): void {
    this.priorityDate.set(value);
  }

  protected setPriorityWarehouseNo(value: string): void {
    if (this.isAdminUser()) {
      this.priorityWarehouseNoInput.set(value);
    }
  }

  protected openPriorityRoute(route: string | null | undefined): void {
    const routeText = route?.trim();

    if (!routeText) {
      return;
    }

    const parsedRoute = new URL(routeText, 'http://furpa.local');

    if (parsedRoute.pathname === '/home/sikayet-oneri') {
      this.openFeedbackModal();
      return;
    }

    if (parsedRoute.pathname === '/home/sikayet-oneri/benim') {
      this.historyOpen.set(true);
      this.loadMyFeedbackItems();
      return;
    }

    const targetPath = BACKEND_ROUTE_MAP[parsedRoute.pathname] ?? parsedRoute.pathname;
    const queryParams = this.toQueryParams(parsedRoute.searchParams);

    if (
      parsedRoute.pathname === '/operasyon-islemleri/belge-akis-takibi' &&
      !queryParams['date'] &&
      !queryParams['startDate']
    ) {
      queryParams['date'] = this.warehousePriorities()?.date ?? this.priorityDate();
    }

    void this.router.navigate([targetPath], { queryParams });
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
    const title = formValue.title.trim();
    const message = formValue.message.trim();

    if (!title || !message) {
      this.feedbackForm.markAllAsTouched();
      this.feedbackMessage.set({
        tone: 'error',
        title: 'Form eksik',
        text: 'Baslik ve mesaj alanlari bos birakilamaz.'
      });
      return;
    }

    const request: CreateFeedbackItemHttpRequest = {
      type: formValue.type,
      priority: formValue.priority,
      title,
      message
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
          this.loadWarehousePriorities();

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

  protected severityClass(severity: string | null | undefined): string {
    return `severity-${this.normalize(severity) || 'healthy'}`;
  }

  protected overallStatusLabel(status: string | null | undefined): string {
    switch (this.normalize(status)) {
      case 'critical':
        return 'Kritik';
      case 'warning':
        return 'Uyari';
      case 'info':
        return 'Bilgi';
      case 'healthy':
        return 'Saglikli';
      default:
        return status?.trim() || '-';
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

  protected readonly trackPriorityMetric = (
    _index: number,
    item: HomePriorityMetricDto
  ): string => item.code;
  protected readonly trackPriorityItem = (
    _index: number,
    item: HomePriorityItemDto
  ): string => item.code;
  protected readonly trackFeedback = (_index: number, item: FeedbackItemDto): string => item.id;

  private applyHomeQueryActions(): void {
    const feedbackAction = this.activatedRoute.snapshot.queryParamMap.get('feedback')?.trim();

    if (feedbackAction === 'new') {
      this.openFeedbackModal();
      return;
    }

    if (feedbackAction === 'history') {
      this.historyOpen.set(true);
      this.loadMyFeedbackItems();
    }
  }

  private currentWarehouseLabel(): string {
    const user = this.authService.currentUser();

    if (!user) {
      return 'JWT deposu okunamadi';
    }

    if (user.depoIsmi?.trim() && user.depoNo !== null && user.depoNo !== undefined) {
      return `${user.depoIsmi.trim()} (${user.depoNo})`;
    }

    if (user.depoIsmi?.trim()) {
      return user.depoIsmi.trim();
    }

    return user.depoNo !== null && user.depoNo !== undefined
      ? `Depo ${user.depoNo}`
      : 'JWT deposu okunamadi';
  }

  private hasRole(role: string): boolean {
    return (this.authService.currentUser()?.roller ?? []).some(
      (value) => value.toLocaleLowerCase('tr-TR') === role.toLocaleLowerCase('tr-TR')
    );
  }

  private toOptionalNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? Math.trunc(numericValue) : null;
  }

  private toQueryParams(searchParams: URLSearchParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    return queryParams;
  }

  private normalize(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private getToday(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

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
