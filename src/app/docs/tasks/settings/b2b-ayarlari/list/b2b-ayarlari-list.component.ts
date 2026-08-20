import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  B2BBulletinDto,
  B2BUserDetailDto,
  B2BUserDto,
  SaveB2BBulletinHttpRequest,
  UpdateB2BUserHttpRequest
} from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ActionFeedback, getErrorMessage, hasSettingsPermission } from '../../settings-task.helpers';

type B2BTab = 'bulletins' | 'users';
type B2BAction = 'load' | 'detail' | 'save' | 'delete' | null;

interface BulletinDraft {
  id: number | null;
  definition: string;
  link: string;
  createDate: string;
}

interface UserDraft {
  userId: string;
  userFullName: string;
  userMail: string;
  status: boolean;
  menus: string;
  userEndDate: string;
}

const TASK_ID = 'b2b-ayarlari';

function createBulletinDraft(): BulletinDraft {
  return {
    id: null,
    definition: '',
    link: '',
    createDate: new Date().toISOString().slice(0, 16)
  };
}

function createUserDraft(): UserDraft {
  return {
    userId: '',
    userFullName: '',
    userMail: '',
    status: true,
    menus: '',
    userEndDate: ''
  };
}

@Component({
  selector: 'app-b2b-ayarlari-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './b2b-ayarlari-list.component.html',
  styleUrl: './b2b-ayarlari-list.component.scss'
})
export class B2BAyarlariListComponent {
  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly activeTab = signal<B2BTab>('bulletins');
  protected readonly bulletins = signal<B2BBulletinDto[]>([]);
  protected readonly users = signal<B2BUserDto[]>([]);
  protected readonly selectedUser = signal<B2BUserDetailDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<B2BAction>(null);

  protected bulletinSearch = '';
  protected userSearch = '';
  protected includeInactiveUsers = false;
  protected take = 100;
  protected bulletinDraft: BulletinDraft = createBulletinDraft();
  protected userDraft: UserDraft = createUserDraft();

  protected readonly canList = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.b2b-ayarlari.list')
  );
  protected readonly canDetail = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.b2b-ayarlari.detail')
  );
  protected readonly canCreate = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.b2b-ayarlari.create')
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.b2b-ayarlari.update')
  );
  protected readonly canDelete = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.b2b-ayarlari.delete')
  );
  protected readonly activeUserCount = computed(
    () => this.users().filter((user) => user.status).length
  );

  constructor() {
    this.loadBulletins();
  }

  protected setTab(tab: B2BTab): void {
    this.activeTab.set(tab);
    this.feedback.set(null);

    if (tab === 'bulletins' && !this.bulletins().length) {
      this.loadBulletins();
    }

    if (tab === 'users' && !this.users().length) {
      this.loadUsers();
    }
  }

  protected loadBulletins(): void {
    if (!this.canList()) {
      this.setFeedback('error', 'Yetki yok', 'B2B bultenlerini listeleme yetkiniz bulunmuyor.');
      return;
    }

    this.loadingAction.set('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getB2BBulletins({ search: this.bulletinSearch, take: this.take })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (items: B2BBulletinDto[]) => {
          this.bulletins.set(this.sortBulletins(items ?? []));

          if (!items?.length) {
            this.setFeedback('info', 'Kayit yok', 'Arama kriterine uygun bulten bulunamadi.');
          }
        },
        error: (error: unknown) => {
          this.bulletins.set([]);
          this.setFeedback('error', 'Bultenler yuklenemedi', getErrorMessage(error, 'Liste alinamadi.'));
        }
      });
  }

  protected loadUsers(): void {
    if (!this.canList()) {
      this.setFeedback('error', 'Yetki yok', 'B2B kullanicilarini listeleme yetkiniz bulunmuyor.');
      return;
    }

    this.loadingAction.set('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getB2BUsers({
        search: this.userSearch,
        includeInactive: this.includeInactiveUsers,
        take: this.take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (items: B2BUserDto[]) => {
          this.users.set(this.sortUsers(items ?? []));

          if (!items?.length) {
            this.setFeedback('info', 'Kayit yok', 'Arama kriterine uygun B2B kullanicisi yok.');
          }
        },
        error: (error: unknown) => {
          this.users.set([]);
          this.setFeedback('error', 'Kullanicilar yuklenemedi', getErrorMessage(error, 'Liste alinamadi.'));
        }
      });
  }

  protected newBulletin(): void {
    this.bulletinDraft = createBulletinDraft();
  }

  protected selectBulletin(item: B2BBulletinDto): void {
    this.bulletinDraft = {
      id: item.id,
      definition: item.definition ?? '',
      link: item.link ?? '',
      createDate: this.toInputDateTime(item.createDate)
    };
  }

  protected saveBulletin(): void {
    const selectedId = this.bulletinDraft.id;

    if (selectedId && !this.canUpdate()) {
      return;
    }

    if (!selectedId && !this.canCreate()) {
      return;
    }

    const request = this.buildBulletinRequest();
    if (!request) {
      this.setFeedback('error', 'Form eksik', 'Bulten aciklamasi ve link zorunludur.');
      return;
    }

    this.loadingAction.set('save');
    this.feedback.set(null);

    const saveRequest = selectedId
      ? this.ayarIslemleriService.updateB2BBulletin(selectedId, request)
      : this.ayarIslemleriService.createB2BBulletin(request);

    saveRequest
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (item: B2BBulletinDto) => {
          this.upsertBulletin(item);
          this.selectBulletin(item);
          this.setFeedback('success', selectedId ? 'Bulten guncellendi' : 'Bulten olusturuldu', item.definition);
        },
        error: (error: unknown) => {
          this.setFeedback('error', 'Bulten kaydedilemedi', getErrorMessage(error, 'Kayit basarisiz.'));
        }
      });
  }

  protected async deleteBulletin(item?: B2BBulletinDto): Promise<void> {
    const id = item?.id ?? this.bulletinDraft.id;

    if (!id || !this.canDelete()) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Bulten silinsin mi?',
      message: 'Secili B2B bulteni silinecek.',
      confirmText: 'Sil',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.loadingAction.set('delete');

    this.ayarIslemleriService
      .deleteB2BBulletin(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: () => {
          this.bulletins.set(this.bulletins().filter((bulletin) => bulletin.id !== id));
          this.newBulletin();
          this.setFeedback('success', 'Bulten silindi', 'Kayit kaldirildi.');
        },
        error: (error: unknown) => {
          this.setFeedback('error', 'Silme basarisiz', getErrorMessage(error, 'Bulten silinemedi.'));
        }
      });
  }

  protected selectUser(user: B2BUserDto): void {
    this.applyUserDraft(user);

    if (!this.canDetail()) {
      return;
    }

    this.loadingAction.set('detail');

    this.ayarIslemleriService
      .getB2BUser(user.userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (detail: B2BUserDetailDto) => {
          this.selectedUser.set(detail);
          this.applyUserDraft(detail);
        },
        error: (error: unknown) => {
          this.setFeedback('error', 'Detay alinamadi', getErrorMessage(error, 'Kullanici detayi alinamadi.'));
        }
      });
  }

  protected saveUser(): void {
    if (!this.userDraft.userId || !this.canUpdate()) {
      return;
    }

    const request = this.buildUserRequest();
    if (!request) {
      this.setFeedback('error', 'Form eksik', 'Ad soyad ve gecerli e-posta zorunludur.');
      return;
    }

    this.loadingAction.set('save');
    this.feedback.set(null);

    this.ayarIslemleriService
      .updateB2BUser(this.userDraft.userId, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (detail: B2BUserDetailDto) => {
          this.selectedUser.set(detail);
          this.upsertUser(detail);
          this.applyUserDraft(detail);
          this.setFeedback('success', 'Kullanici guncellendi', detail.userFullName);
        },
        error: (error: unknown) => {
          this.setFeedback('error', 'Kullanici kaydedilemedi', getErrorMessage(error, 'Guncelleme basarisiz.'));
        }
      });
  }

  protected clearUserSelection(): void {
    this.selectedUser.set(null);
    this.userDraft = createUserDraft();
  }

  protected trackByBulletin = (_index: number, item: B2BBulletinDto): number => item.id;
  protected trackByUser = (_index: number, item: B2BUserDto): string => item.userId;
  protected trackByAccount = (_index: number, item: { id: number }): number => item.id;

  private buildBulletinRequest(): SaveB2BBulletinHttpRequest | null {
    const definition = this.bulletinDraft.definition.trim();
    const link = this.bulletinDraft.link.trim();

    if (!definition || !link) {
      return null;
    }

    return {
      definition,
      link,
      createDate: this.bulletinDraft.createDate ? new Date(this.bulletinDraft.createDate).toISOString() : null
    };
  }

  private buildUserRequest(): UpdateB2BUserHttpRequest | null {
    const userFullName = this.userDraft.userFullName.trim();
    const userMail = this.userDraft.userMail.trim();

    if (!userFullName || userFullName.length > 70 || userMail.length > 150 || !/^\S+@\S+\.\S+$/.test(userMail)) {
      return null;
    }

    return {
      userFullName,
      userMail,
      status: this.userDraft.status,
      menus: this.userDraft.menus.trim() || null,
      userEndDate: this.userDraft.userEndDate ? new Date(this.userDraft.userEndDate).toISOString() : null
    };
  }

  private applyUserDraft(user: B2BUserDto): void {
    this.userDraft = {
      userId: user.userId,
      userFullName: user.userFullName ?? '',
      userMail: user.userMail ?? '',
      status: !!user.status,
      menus: user.menus ?? '',
      userEndDate: this.toInputDateTime(user.userEndDate)
    };
  }

  private upsertBulletin(item: B2BBulletinDto): void {
    const rows = this.bulletins();
    const index = rows.findIndex((row) => row.id === item.id);
    const next = index >= 0 ? [...rows.slice(0, index), item, ...rows.slice(index + 1)] : [item, ...rows];
    this.bulletins.set(this.sortBulletins(next));
  }

  private upsertUser(item: B2BUserDto): void {
    const rows = this.users();
    const index = rows.findIndex((row) => row.userId === item.userId);
    const next = index >= 0 ? [...rows.slice(0, index), item, ...rows.slice(index + 1)] : [item, ...rows];
    this.users.set(this.sortUsers(next));
  }

  private sortBulletins(items: B2BBulletinDto[]): B2BBulletinDto[] {
    return [...items].sort((left, right) => Date.parse(right.createDate ?? '') - Date.parse(left.createDate ?? ''));
  }

  private sortUsers(items: B2BUserDto[]): B2BUserDto[] {
    return [...items].sort((left, right) => left.userFullName.localeCompare(right.userFullName, 'tr-TR'));
  }

  private toInputDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 16);
  }

  private setFeedback(tone: ActionFeedback['tone'], title: string, message: string): void {
    this.feedback.set({ tone, title, message });
  }
}
