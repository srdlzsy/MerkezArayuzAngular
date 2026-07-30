import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  AnnouncementDto,
  AnnouncementManagementListHttpRequest,
  AnnouncementPriority,
  AnnouncementReadReceiptListDto,
  AnnouncementReadReceiptDto,
  AnnouncementReadSummaryDto,
  AnnouncementStatus,
  AnnouncementTargetType,
  AnnouncementTargetUserDto,
  SaveAnnouncementHttpRequest
} from '@interfaces';

import { OrtakIslemlerService } from '../../../../../core/api/module-services/ortak-islemler.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo
} from '../../../core/admin-warehouse.helpers';

interface Option<T extends string> {
  value: T | '';
  label: string;
}

interface StrictOption<T extends string> {
  value: T;
  label: string;
}

interface ActionFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

const ANNOUNCEMENT_CREATE_PERMISSION = 'ortak-islemler.duyurular.create';
const ANNOUNCEMENT_UPDATE_PERMISSION = 'ortak-islemler.duyurular.update';
const ANNOUNCEMENT_ARCHIVE_PERMISSION = 'ortak-islemler.duyurular.archive';
const ANNOUNCEMENT_ALL_WAREHOUSES_PERMISSION = 'ortak-islemler.duyurular.all-warehouses';

@Component({
  selector: 'app-duyurular-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './duyurular-list.component.html',
  styleUrl: './duyurular-list.component.scss'
})
export class DuyurularListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['duyurular'];
  protected readonly statusOptions: readonly Option<AnnouncementStatus>[] = [
    { value: '', label: 'Tum Durumlar' },
    { value: 'Published', label: 'Yayinda' },
    { value: 'Archived', label: 'Arsivde' }
  ];
  protected readonly targetTypeOptions: readonly Option<AnnouncementTargetType>[] = [
    { value: '', label: 'Tum Hedefler' },
    { value: 'AllWarehouses', label: 'Tum Depolar' },
    { value: 'Warehouse', label: 'Depo' },
    { value: 'User', label: 'Kullanici' }
  ];
  protected readonly saveTargetTypeOptions: readonly StrictOption<AnnouncementTargetType>[] = [
    { value: 'Warehouse', label: 'Depo' },
    { value: 'User', label: 'Kullanici' },
    { value: 'AllWarehouses', label: 'Tum Depolar' }
  ];
  protected readonly priorityOptions: readonly StrictOption<AnnouncementPriority>[] = [
    { value: 'Normal', label: 'Normal' },
    { value: 'Important', label: 'Onemli' },
    { value: 'Urgent', label: 'Acil' }
  ];

  protected readonly filterForm = new FormGroup({
    status: new FormControl<AnnouncementStatus | ''>('', { nonNullable: true }),
    targetType: new FormControl<AnnouncementTargetType | ''>('', { nonNullable: true }),
    targetWarehouseNo: new FormControl<number | null>(null),
    targetUserId: new FormControl<string>('', { nonNullable: true }),
    startDate: new FormControl<string>('', { nonNullable: true }),
    endDate: new FormControl<string>('', { nonNullable: true }),
    includeArchived: new FormControl<boolean>(false, { nonNullable: true }),
    take: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(500)]
    })
  });

  protected readonly announcementForm = new FormGroup({
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(140)]
    }),
    message: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(4000)]
    }),
    priority: new FormControl<AnnouncementPriority>('Normal', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    targetType: new FormControl<AnnouncementTargetType>('Warehouse', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    targetWarehouseNosText: new FormControl<string>('', { nonNullable: true }),
    startsAtLocal: new FormControl<string>('', { nonNullable: true }),
    expiresAtLocal: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly targetUserSearchControl = new FormControl<string>('', { nonNullable: true });
  protected readonly targetUserWarehouseControl = new FormControl<number | null>(null);

  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ortakIslemlerService = inject(OrtakIslemlerService);

  protected readonly rows = signal<AnnouncementDto[]>([]);
  protected readonly selectedItem = signal<AnnouncementDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly modalMessage = signal<ActionFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isDetailLoading = signal(false);
  protected readonly readReceiptsLoading = signal(false);
  protected readonly readReceiptsError = signal('');
  protected readonly modalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly archiving = signal(false);
  protected readonly editingItem = signal<AnnouncementDto | null>(null);
  protected readonly selectedTargetUsers = signal<AnnouncementTargetUserDto[]>([]);
  protected readonly targetUserResults = signal<AnnouncementTargetUserDto[]>([]);
  protected readonly targetUserSearchLoading = signal(false);
  protected readonly targetUserSearchMessage = signal('');
  private targetUserSearchRequestId = 0;

  protected readonly canCreate = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), ANNOUNCEMENT_CREATE_PERMISSION)
  );
  protected readonly canUpdate = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), ANNOUNCEMENT_UPDATE_PERMISSION)
  );
  protected readonly canArchive = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), ANNOUNCEMENT_ARCHIVE_PERMISSION)
  );
  protected readonly canUseAllWarehouses = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), ANNOUNCEMENT_ALL_WAREHOUSES_PERMISSION)
  );
  protected readonly currentWarehouseNo = computed(() => getCurrentWarehouseNo(this.authService.currentUser()));
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly publishedCount = computed(
    () => this.rows().filter((row) => row.status === 'Published').length
  );
  protected readonly archivedCount = computed(
    () => this.rows().filter((row) => row.status === 'Archived').length
  );
  protected readonly urgentCount = computed(
    () => this.rows().filter((row) => row.priority === 'Urgent').length
  );
  protected readonly selectedScopeLabel = computed(() => {
    if (this.canUseAllWarehouses()) {
      const warehouseNo = this.toOptionalNumber(this.filterForm.getRawValue().targetWarehouseNo);
      return warehouseNo ? `Depo ${warehouseNo}` : 'Yetkili kapsam';
    }

    return this.currentWarehouseLabel();
  });

  constructor() {
    effect(() => {
      if (this.canUseAllWarehouses()) {
        this.filterForm.controls.targetWarehouseNo.enable({ emitEvent: false });
        this.targetUserWarehouseControl.enable({ emitEvent: false });
        return;
      }

      this.filterForm.controls.targetWarehouseNo.setValue(null, { emitEvent: false });
      this.filterForm.controls.targetWarehouseNo.disable({ emitEvent: false });
      this.targetUserWarehouseControl.setValue(null, { emitEvent: false });
      this.targetUserWarehouseControl.disable({ emitEvent: false });
    });

    this.announcementForm.controls.targetType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((targetType: AnnouncementTargetType) => {
        if (targetType !== 'User') {
          this.targetUserResults.set([]);
          this.targetUserSearchMessage.set('');
        }
      });

    this.resetAnnouncementForm();
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
      .getAnnouncementManagementItems(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (rows: AnnouncementDto[]) => {
          const normalizedRows = (rows ?? []).map((row) => this.normalizeAnnouncement(row));
          this.rows.set(normalizedRows);
          this.selectedItem.set(normalizedRows[0] ?? null);

          if (!normalizedRows.length && clearFeedback) {
            this.feedback.set({
              tone: 'info',
              title: 'Duyuru bulunamadi',
              message: 'Secilen filtrelerle duyuru kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.rows.set([]);
          this.selectedItem.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Liste yuklenemedi',
            message: this.getErrorMessage(error, 'Duyurular alinirken hata olustu.')
          });
        }
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      status: '',
      targetType: '',
      targetWarehouseNo: null,
      targetUserId: '',
      startDate: '',
      endDate: '',
      includeArchived: false,
      take: 100
    });
    this.loadRows();
  }

  protected openDetail(item: AnnouncementDto): void {
    this.selectedItem.set(item);
    this.readReceiptsError.set('');
    this.isDetailLoading.set(true);

    this.ortakIslemlerService
      .getAnnouncementManagementDetail(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDetailLoading.set(false))
      )
      .subscribe({
        next: (detail: AnnouncementDto) => this.selectedItem.set(this.normalizeAnnouncement(detail)),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Detay yuklenemedi',
            message: this.getErrorMessage(error, 'Duyuru detayi alinirken hata olustu.')
          });
        }
      });
  }

  protected loadReadReceipts(item: AnnouncementDto): void {
    if (this.readReceiptsLoading()) {
      return;
    }

    this.readReceiptsLoading.set(true);
    this.readReceiptsError.set('');

    this.ortakIslemlerService
      .getAnnouncementReadReceipts(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.readReceiptsLoading.set(false))
      )
      .subscribe({
        next: (response: AnnouncementReadReceiptListDto) => {
          const normalized = this.normalizeAnnouncement({
            ...item,
            readSummary: response.summary,
            readReceipts: response.readers ?? []
          });

          this.selectedItem.set(normalized);
          this.rows.update((rows) =>
            rows.map((row) =>
              row.id === normalized.id
                ? this.normalizeAnnouncement({
                    ...row,
                    readSummary: normalized.readSummary,
                    readReceipts: row.readReceipts ?? []
                  })
                : row
            )
          );
        },
        error: (error: unknown) => {
          this.readReceiptsError.set(
            this.getErrorMessage(error, 'Okuyan kullanici listesi alinirken hata olustu.')
          );
        }
      });
  }

  protected openCreateModal(): void {
    if (!this.canCreate()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki gerekli',
        message: 'Yeni duyuru olusturmak icin create yetkisi gerekir.'
      });
      return;
    }

    this.editingItem.set(null);
    this.resetAnnouncementForm();
    this.modalMessage.set(null);
    this.modalOpen.set(true);
  }

  protected openEditModal(item: AnnouncementDto): void {
    if (!this.canUpdate()) {
      return;
    }

    this.editingItem.set(item);
    this.patchAnnouncementForm(item);
    this.modalMessage.set(null);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.modalMessage.set(null);
  }

  protected submitAnnouncement(): void {
    if (this.announcementForm.invalid) {
      this.announcementForm.markAllAsTouched();
      this.modalMessage.set({
        tone: 'error',
        title: 'Form hatali',
        message: 'Baslik, mesaj ve hedef bilgilerini kontrol edin.'
      });
      return;
    }

    const request = this.buildSaveRequest();

    if (!request) {
      return;
    }

    const editing = this.editingItem();
    this.saving.set(true);
    this.modalMessage.set(null);

    const request$ = editing
      ? this.ortakIslemlerService.updateAnnouncement(editing.id, request)
      : this.ortakIslemlerService.createAnnouncement(request);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (saved: AnnouncementDto) => {
          this.modalOpen.set(false);
          this.applySavedAnnouncement(saved, editing ? 'Duyuru guncellendi' : 'Duyuru olusturuldu');
        },
        error: (error: unknown) => {
          this.modalMessage.set({
            tone: 'error',
            title: editing ? 'Guncellenemedi' : 'Olusturulamadi',
            message: this.getErrorMessage(error, 'Duyuru kaydedilirken hata olustu.')
          });
        }
      });
  }
  protected archiveSelected(): void {
    const item = this.selectedItem();

    if (!item || !this.canArchive()) {
      return;
    }

    this.archiving.set(true);
    this.feedback.set(null);

    this.ortakIslemlerService
      .archiveAnnouncement(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.archiving.set(false))
      )
      .subscribe({
        next: (updated: AnnouncementDto) => this.applySavedAnnouncement(updated, 'Duyuru arsivlendi'),
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Arsivlenemedi',
            message: this.getErrorMessage(error, 'Duyuru arsivlenirken hata olustu.')
          });
        }
      });
  }

  protected currentFormTargetType(): AnnouncementTargetType {
    return this.announcementForm.controls.targetType.value;
  }

  protected targetTypeDisabled(type: AnnouncementTargetType): boolean {
    return type === 'AllWarehouses' && !this.canUseAllWarehouses();
  }

  protected getPriorityTone(priority: AnnouncementPriority | string | null): string {
    switch (priority) {
      case 'Urgent':
        return 'priority-urgent';
      case 'Important':
        return 'priority-important';
      default:
        return 'priority-normal';
    }
  }

  protected getStatusTone(status: AnnouncementStatus | string | null): string {
    return status === 'Archived' ? 'status-neutral' : 'status-success';
  }

  protected targetSummary(item: AnnouncementDto): string {
    const targets = item.targets ?? [];

    if (targets.some((target) => target.type === 'AllWarehouses')) {
      return 'Tum Depolar';
    }

    const warehouses = targets
      .filter((target) => target.type === 'Warehouse')
      .map((target) => target.warehouseName || (target.warehouseNo ? `Depo ${target.warehouseNo}` : 'Depo'));

    if (warehouses.length) {
      return warehouses.join(', ');
    }

    const users = targets
      .filter((target) => target.type === 'User')
      .map((target) => target.userFullName || target.username || target.userId || 'Kullanici');

    return users.length ? users.join(', ') : '-';
  }

  protected readSummary(item: AnnouncementDto): AnnouncementReadSummaryDto | null {
    return item.readSummary ?? null;
  }

  protected readReceipts(item: AnnouncementDto): AnnouncementReadReceiptDto[] {
    return item.readReceipts ?? [];
  }

  protected searchTargetUsers(): void {
    if (this.targetUserSearchLoading()) {
      return;
    }

    const search = this.targetUserSearchControl.value.trim();
    const warehouseNo = this.canUseAllWarehouses()
      ? this.toOptionalNumber(this.targetUserWarehouseControl.value)
      : null;

    if (search.length > 100) {
      this.targetUserSearchMessage.set('Arama en fazla 100 karakter olabilir.');
      return;
    }

    const requestId = ++this.targetUserSearchRequestId;
    this.targetUserSearchLoading.set(true);
    this.targetUserSearchMessage.set('');
    this.targetUserResults.set([]);

    this.ortakIslemlerService
      .searchAnnouncementTargetUsers({
        search: search || null,
        warehouseNo,
        take: 25
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.targetUserSearchRequestId) {
            this.targetUserSearchLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (users: AnnouncementTargetUserDto[]) => {
          if (requestId !== this.targetUserSearchRequestId) {
            return;
          }

          const selectedIds = new Set(this.selectedTargetUsers().map((user) => user.id));
          const nextUsers = (users ?? []).filter((user) => !selectedIds.has(user.id));
          this.targetUserResults.set(nextUsers);

          if (!nextUsers.length) {
            this.targetUserSearchMessage.set('Uygun aktif kullanici bulunamadi.');
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.targetUserSearchRequestId) {
            return;
          }

          this.targetUserSearchMessage.set(
            this.getErrorMessage(error, 'Kullanici aramasi yapilirken hata olustu.')
          );
        }
      });
  }

  protected selectTargetUser(user: AnnouncementTargetUserDto): void {
    const currentUsers = this.selectedTargetUsers();

    if (!currentUsers.some((item) => item.id === user.id)) {
      this.selectedTargetUsers.set([...currentUsers, user]);
    }

    this.targetUserResults.set(this.targetUserResults().filter((item) => item.id !== user.id));
    this.targetUserSearchMessage.set('');
  }

  protected removeTargetUser(userId: string): void {
    this.selectedTargetUsers.set(this.selectedTargetUsers().filter((user) => user.id !== userId));
  }

  protected targetUserLabel(user: AnnouncementTargetUserDto): string {
    const displayName = user.displayName?.trim();

    if (displayName) {
      return displayName;
    }

    return this.buildTargetUserDisplayName(user);
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

  protected readonly trackByAnnouncement = (_index: number, item: AnnouncementDto): string => item.id;
  protected readonly trackByReadReceipt = (_index: number, item: AnnouncementReadReceiptDto): string =>
    `${item.userId}_${item.readAtUtc}`;
  protected readonly trackByTargetUser = (_index: number, item: AnnouncementTargetUserDto): string => item.id;

  private buildListRequest(): AnnouncementManagementListHttpRequest | null {
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
      targetType: formValue.targetType || null,
      targetWarehouseNo: this.canUseAllWarehouses()
        ? this.toOptionalNumber(formValue.targetWarehouseNo)
        : null,
      targetUserId: formValue.targetUserId.trim() || null,
      startDate: formValue.startDate.trim() || null,
      endDate: formValue.endDate.trim() || null,
      includeArchived: formValue.includeArchived,
      take: this.toOptionalNumber(formValue.take) ?? 100
    };
  }

  private buildSaveRequest(): SaveAnnouncementHttpRequest | null {
    const formValue = this.announcementForm.getRawValue();
    const title = formValue.title.trim();
    const message = formValue.message.trim();

    if (!title || !message) {
      this.modalMessage.set({
        tone: 'error',
        title: 'Form hatali',
        message: 'Baslik ve mesaj bos birakilamaz.'
      });
      return null;
    }

    const targetType = formValue.targetType;
    let targetWarehouseNos: number[] | null = null;
    let targetUserIds: string[] | null = null;

    if (targetType === 'AllWarehouses') {
      if (!this.canUseAllWarehouses()) {
        this.modalMessage.set({
          tone: 'error',
          title: 'Yetki gerekli',
          message: 'Tum depolara duyuru icin all-warehouses yetkisi gerekir.'
        });
        return null;
      }
    }

    if (targetType === 'Warehouse') {
      targetWarehouseNos = this.parsePositiveNumberList(formValue.targetWarehouseNosText);

      if (!targetWarehouseNos.length && !this.canUseAllWarehouses()) {
        const currentWarehouseNo = this.currentWarehouseNo();
        targetWarehouseNos = currentWarehouseNo ? [currentWarehouseNo] : [];
      }

      if (!targetWarehouseNos.length) {
        this.modalMessage.set({
          tone: 'error',
          title: 'Hedef depo eksik',
          message: 'Depo hedefi icin en az bir depo no girin.'
        });
        return null;
      }

      if (!this.canUseAllWarehouses() && targetWarehouseNos.some((value) => value !== this.currentWarehouseNo())) {
        this.modalMessage.set({
          tone: 'error',
          title: 'Kapsam disi depo',
          message: 'Bu yetkiyle sadece kendi deponuza duyuru hedefleyebilirsiniz.'
        });
        return null;
      }
    }

    if (targetType === 'User') {
      targetUserIds = this.selectedTargetUsers()
        .map((user) => user.id.trim())
        .filter((id, index, ids) => !!id && ids.indexOf(id) === index);

      if (!targetUserIds.length) {
        this.modalMessage.set({
          tone: 'error',
          title: 'Hedef kullanici eksik',
          message: 'Kullanici hedefi icin aramadan en az bir kullanici secin.'
        });
        return null;
      }
    }

    return {
      title,
      message,
      priority: formValue.priority,
      targetType,
      targetWarehouseNos,
      targetUserIds,
      startsAtUtc: this.toOptionalUtc(formValue.startsAtLocal),
      expiresAtUtc: this.toOptionalUtc(formValue.expiresAtLocal)
    };
  }

  private resetAnnouncementForm(): void {
    this.announcementForm.reset({
      title: '',
      message: '',
      priority: 'Normal',
      targetType: 'Warehouse',
      targetWarehouseNosText: this.currentWarehouseNo()?.toString() ?? '',
      startsAtLocal: '',
      expiresAtLocal: ''
    });
    this.selectedTargetUsers.set([]);
    this.targetUserSearchControl.setValue('', { emitEvent: false });
    this.targetUserWarehouseControl.setValue(null, { emitEvent: false });
    this.targetUserResults.set([]);
    this.targetUserSearchMessage.set('');
  }

  private patchAnnouncementForm(item: AnnouncementDto): void {
    const targetType = this.resolveTargetType(item);
    const targetUsers = this.resolveTargetUsers(item);

    this.announcementForm.reset({
      title: item.title,
      message: item.message,
      priority: (item.priority as AnnouncementPriority | undefined) ?? 'Normal',
      targetType,
      targetWarehouseNosText: this.resolveTargetWarehouseNos(item).join(', '),
      startsAtLocal: this.toLocalInputValue(item.startsAtUtc),
      expiresAtLocal: this.toLocalInputValue(item.expiresAtUtc)
    });
    this.selectedTargetUsers.set(targetUsers);
    this.targetUserSearchControl.setValue('', { emitEvent: false });
    this.targetUserWarehouseControl.setValue(null, { emitEvent: false });
    this.targetUserResults.set([]);
    this.targetUserSearchMessage.set('');
  }

  private resolveTargetType(item: AnnouncementDto): AnnouncementTargetType {
    if (item.targets?.some((target) => target.type === 'AllWarehouses')) {
      return 'AllWarehouses';
    }

    if (item.targets?.some((target) => target.type === 'User')) {
      return 'User';
    }

    return 'Warehouse';
  }

  private resolveTargetWarehouseNos(item: AnnouncementDto): number[] {
    return (item.targets ?? [])
      .map((target) => target.warehouseNo)
      .filter((value, index, items): value is number =>
        value !== null && value !== undefined && items.indexOf(value) === index
      );
  }

  private resolveTargetUsers(item: AnnouncementDto): AnnouncementTargetUserDto[] {
    const users = new Map<string, AnnouncementTargetUserDto>();

    for (const target of item.targets ?? []) {
      const userId = target.userId?.trim() ?? '';

      if (target.type !== 'User' || !userId || users.has(userId)) {
        continue;
      }

      const username = target.username?.trim() ?? '';
      const fullName = target.userFullName?.trim() ?? '';
      const warehouseName = target.warehouseName?.trim() || null;
      const warehouseNo = target.warehouseNo ?? null;

      users.set(userId, {
        id: userId,
        username,
        fullName,
        email: '',
        warehouseNo,
        warehouseName,
        displayName: this.buildTargetUserDisplayName({
          id: userId,
          username,
          fullName,
          email: '',
          warehouseNo,
          warehouseName,
          displayName: ''
        })
      });
    }

    return Array.from(users.values());
  }

  private buildTargetUserDisplayName(user: AnnouncementTargetUserDto): string {
    const fullName = user.fullName?.trim();
    const username = user.username?.trim();
    const warehouse = user.warehouseNo
      ? `${user.warehouseNo}${user.warehouseName ? ` - ${user.warehouseName}` : ''}`
      : '';

    return [fullName || username || user.id, warehouse].filter(Boolean).join(' / ');
  }

  private applySavedAnnouncement(saved: AnnouncementDto, title: string): void {
    const normalized = this.normalizeAnnouncement(saved);
    this.selectedItem.set(normalized);
    this.rows.update((rows) => {
      const exists = rows.some((row) => row.id === normalized.id);
      const nextRows = exists
        ? rows.map((row) => (row.id === normalized.id ? normalized : row))
        : [normalized, ...rows];

      return nextRows;
    });
    this.feedback.set({
      tone: 'success',
      title,
      message: `${normalized.title} ${normalized.statusName || normalized.status} durumunda.`
    });
  }

  private normalizeAnnouncement(item: AnnouncementDto): AnnouncementDto {
    return {
      ...item,
      targets: item.targets ?? [],
      readSummary: item.readSummary ?? null,
      readReceipts: item.readReceipts ?? []
    };
  }

  private parsePositiveNumberList(value: string): number[] {
    const uniqueValues = new Set<number>();

    for (const part of value.split(/[\s,;]+/)) {
      const numericValue = Number(part.trim());

      if (Number.isFinite(numericValue) && numericValue > 0) {
        uniqueValues.add(Math.trunc(numericValue));
      }
    }

    return Array.from(uniqueValues);
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? Math.trunc(numericValue) : null;
  }

  private toOptionalUtc(value: string): string | null {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toLocalInputValue(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
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
