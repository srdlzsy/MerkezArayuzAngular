import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  ChangeFeedbackStatusHttpRequest,
  CreateFeedbackItemHttpRequest,
  FeedbackItemDto,
  FeedbackItemType,
  FeedbackManagementListHttpRequest,
  FeedbackPriority,
  FeedbackStatus
} from '@interfaces';

import { OrtakIslemlerService } from '../../../../../core/api/module-services/ortak-islemler.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

interface FeedbackOption<T extends string> {
  value: T;
  label: string;
}

interface Option<T extends string> {
  value: T | '';
  label: string;
}

interface ActionFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

@Component({
  selector: 'app-sikayet-oneri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sikayet-oneri-list.component.html',
  styleUrl: './sikayet-oneri-list.component.scss'
})
export class SikayetOneriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['sikayet-oneri'];
  protected readonly statusOptions: readonly Option<FeedbackStatus>[] = [
    { value: '', label: 'Tum Durumlar' },
    { value: 'New', label: 'Yeni' },
    { value: 'Read', label: 'Okundu' },
    { value: 'InProgress', label: 'Islemde' },
    { value: 'Resolved', label: 'Cozuldu' },
    { value: 'Closed', label: 'Kapali' },
    { value: 'Rejected', label: 'Reddedildi' }
  ];
  protected readonly typeOptions: readonly Option<FeedbackItemType>[] = [
    { value: '', label: 'Tum Tipler' },
    { value: 'Complaint', label: 'Sikayet' },
    { value: 'Suggestion', label: 'Oneri' }
  ];
  protected readonly updateStatusOptions: readonly Option<FeedbackStatus>[] = [
    { value: 'Read', label: 'Okundu' },
    { value: 'InProgress', label: 'Islemde' },
    { value: 'Resolved', label: 'Cozuldu' },
    { value: 'Closed', label: 'Kapali' },
    { value: 'Rejected', label: 'Reddedildi' },
    { value: 'New', label: 'Yeni' }
  ];
  protected readonly filterForm = new FormGroup({
    status: new FormControl<FeedbackStatus | ''>('', { nonNullable: true }),
    type: new FormControl<FeedbackItemType | ''>('', { nonNullable: true }),
    warehouseNo: new FormControl<number | null>(null),
    startDate: new FormControl<string>(new Date().toISOString().split('T')[0], { nonNullable: true }),
    endDate: new FormControl<string>(new Date().toISOString().split('T')[0], { nonNullable: true }),
    take: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(500)]
    })
  });
  protected readonly statusForm = new FormGroup({
    status: new FormControl<FeedbackStatus>('InProgress', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    adminNote: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)]
    })
  });

  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ortakIslemlerService = inject(OrtakIslemlerService);

  protected readonly rows = signal<FeedbackItemDto[]>([]);
  protected readonly selectedItem = signal<FeedbackItemDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly createModalOpen = signal(false);
  protected readonly createModelMessage = signal<ActionFeedback | null>(null);
  protected readonly submittingFeedback = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly updatingAction = signal<'read' | 'status' | null>(null);

  protected readonly isAdminUser = computed(() => this.hasRole('Admin') || this.hasRole('Administrator'));
  protected readonly canViewAll = computed(() => this.isAdminUser());
  protected readonly canUpdate = computed(() => this.isAdminUser());
  protected readonly openCount = computed(
    () => this.rows().filter((row) => !this.isFinalStatus(row.status)).length
  );
  protected readonly newCount = computed(
    () => this.rows().filter((row) => row.status === 'New').length
  );
  protected readonly finalCount = computed(
    () => this.rows().filter((row) => this.isFinalStatus(row.status)).length
  );
  protected readonly selectedScopeLabel = computed(() => {
    if (this.canViewAll()) {
      const warehouseNo = this.toOptionalNumber(this.filterForm.getRawValue().warehouseNo);
      return warehouseNo ? `Depo ${warehouseNo}` : 'Tum Depolar';
    }

    return 'Kendi Kayitlarim';
  });

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

  constructor() {
    if (!this.canViewAll()) {
      this.filterForm.controls.warehouseNo.disable({ emitEvent: false });
    }

    this.loadRows();
  }

  protected loadRows(clearFeedback = true): void {
    const request = this.buildListRequest();

    if (!request) {
      return;
    }

    this.isLoading.set(true);
    if (clearFeedback) {
      this.feedback.set(null);
    }

    this.ortakIslemlerService
      .getFeedbackManagementItems(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (rows: FeedbackItemDto[]) => {
          this.rows.set(rows ?? []);
          this.selectedItem.set(rows?.[0] ?? null);
          this.patchStatusForm(rows?.[0] ?? null);

          if (!rows?.length && clearFeedback) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit bulunamadi',
              message: 'Secilen filtrelerle sikayet/oneri kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.rows.set([]);
          this.selectedItem.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Liste yuklenemedi',
            message: this.getErrorMessage(error, 'Sikayet/oneri listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      status: '',
      type: '',
      warehouseNo: null,
      startDate: '',
      endDate: '',
      take: 100
    });
    this.loadRows();
  }

  protected openDetail(item: FeedbackItemDto): void {
    this.selectedItem.set(item);
    this.patchStatusForm(item);
    this.isDetailLoading.set(true);

    this.ortakIslemlerService
      .getFeedbackManagementDetail(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: FeedbackItemDto) => {
          this.selectedItem.set(detail);
          this.patchStatusForm(detail);
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Detay yuklenemedi',
            message: this.getErrorMessage(error, 'Kayit detayi alinirken hata olustu.')
          });
        }
      });
  }

  protected openCreateModal(): void {
    this.createModalOpen.set(true);
    this.createModelMessage.set(null);
  }

  protected closeCreateModal(): void {
    if (this.submittingFeedback()) {
      return;
    }

    this.createModalOpen.set(false);
    this.createModelMessage.set(null);
  }

  protected submitCreateForm(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.createModelMessage.set({
        tone: 'error',
        title: 'Form hatali',
        message: 'Lutfen tum zorunlu alanlari doldurunuz.'
      });
      return;
    }

    const formValue = this.feedbackForm.getRawValue();
    const title = formValue.title.trim();
    const message = formValue.message.trim();

    if (!title || !message) {
      this.feedbackForm.markAllAsTouched();
      this.createModelMessage.set({
        tone: 'error',
        title: 'Form hatali',
        message: 'Baslik ve mesaj alanlari bos birakilamaz.'
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
    this.createModelMessage.set(null);

    this.ortakIslemlerService
      .createFeedbackItem(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submittingFeedback.set(false))
      )
      .subscribe({
        next: (created: FeedbackItemDto) => {
          this.feedbackForm.reset({
            type: 'Complaint',
            priority: 'Normal',
            title: '',
            message: ''
          });
          this.createModalOpen.set(false);
          this.feedback.set({
            tone: 'success',
            title: 'Kayit olusturuldu',
            message: `${created.typeName || 'Kayit'} ${created.statusName || 'Yeni'} durumunda acildi.`
          });
          this.loadRows(false);
        },
        error: (error: unknown) => {
          this.createModelMessage.set({
            tone: 'error',
            title: 'Kayit olusturulamadi',
            message: this.getErrorMessage(error, 'Sikayet/oneri kaydi olusturulurken hata olustu.')
          });
        }
      });
  }

  protected markAsRead(): void {
    const item = this.selectedItem();

    if (!item || !this.canUpdate()) {
      return;
    }

    this.updatingAction.set('read');
    this.feedback.set(null);

    this.ortakIslemlerService
      .markFeedbackAsRead(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingAction.set(null))
      )
      .subscribe({
        next: (updated: FeedbackItemDto) => this.applyUpdatedItem(updated, 'Okundu isaretlendi'),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Okundu isaretlenemedi',
            message: this.getErrorMessage(error, 'Okundu aksiyonu basarisiz oldu.')
          });
        }
      });
  }

  protected changeStatus(): void {
    const item = this.selectedItem();

    if (!item || !this.canUpdate()) {
      return;
    }

    if (this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Durum eksik',
        message: 'Durum secimi zorunludur.'
      });
      return;
    }

    const formValue = this.statusForm.getRawValue();
    const request: ChangeFeedbackStatusHttpRequest = {
      status: formValue.status,
      adminNote: formValue.adminNote.trim()
    };

    this.updatingAction.set('status');
    this.feedback.set(null);

    this.ortakIslemlerService
      .changeFeedbackStatus(item.id, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingAction.set(null))
      )
      .subscribe({
        next: (updated: FeedbackItemDto) => this.applyUpdatedItem(updated, 'Durum guncellendi'),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Durum guncellenemedi',
            message: this.getErrorMessage(error, 'Durum degisikligi basarisiz oldu.')
          });
        }
      });
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

  protected readonly trackByFeedback = (_index: number, item: FeedbackItemDto): string => item.id;

  private buildListRequest(): FeedbackManagementListHttpRequest | null {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Filtre hatali',
        message: 'Take degeri 1 ile 500 arasinda olmalidir.'
      });
      return null;
    }

    const formValue = this.filterForm.getRawValue();

    return {
      status: formValue.status || null,
      type: formValue.type || null,
      warehouseNo: this.canViewAll() ? this.toOptionalNumber(formValue.warehouseNo) : null,
      startDate: formValue.startDate.trim() || null,
      endDate: formValue.endDate.trim() || null,
      take: this.toOptionalNumber(formValue.take) ?? 100
    };
  }

  private patchStatusForm(item: FeedbackItemDto | null): void {
    this.statusForm.reset({
      status: (item?.status as FeedbackStatus | undefined) ?? 'InProgress',
      adminNote: item?.adminNote ?? ''
    });
  }

  private applyUpdatedItem(updated: FeedbackItemDto, title: string): void {
    this.selectedItem.set(updated);
    this.patchStatusForm(updated);
    this.rows.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    this.feedback.set({
      tone: 'success',
      title,
      message: `${updated.title} kaydi ${updated.statusName || updated.status} durumunda.`
    });
  }

  private isFinalStatus(status: FeedbackStatus | string | null): boolean {
    return status === 'Resolved' || status === 'Closed' || status === 'Rejected';
  }

  private hasRole(role: string): boolean {
    return (this.authService.currentUser()?.roller ?? []).some(
      (value) => value.toLocaleLowerCase('tr-TR') === role.toLocaleLowerCase('tr-TR')
    );
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
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
