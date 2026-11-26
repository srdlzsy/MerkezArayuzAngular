import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  B2BAccountLookupDto,
  B2BBulletinDto,
  B2BMenuOptionDto,
  B2BUserAccountInputHttpRequest,
  B2BUserDetailDto,
  B2BUserDto,
  CreateB2BUserHttpRequest,
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
type B2BAction = 'load' | 'detail' | 'save' | 'delete' | 'password' | 'accountSearch' | null;

interface BulletinDraft {
  id: number | null;
  definition: string;
  link: string;
  createDate: string;
}

interface UserAccountDraft {
  id?: number;
  accountId: string;
  category: string;
  accountCode?: string | null;
  accountTitle?: string | null;
}

interface UserDraft {
  userId: string;
  userFullName: string;
  userMail: string;
  password: string;
  passwordConfirm: string;
  status: boolean;
  menus: string;
  userEndDate: string;
  accounts: UserAccountDraft[];
}

interface B2BMenuGroupView {
  groupId: number;
  groupName: string;
  items: B2BMenuOptionDto[];
}

const TASK_ID = 'b2b-ayarlari';

function formatLocalDateTimeInput(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDefaultUserEndDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(23, 59, 0, 0);
  return formatLocalDateTimeInput(date);
}

function createBulletinDraft(): BulletinDraft {
  return {
    id: null,
    definition: '',
    link: '',
    createDate: formatLocalDateTimeInput(new Date())
  };
}

function createUserDraft(defaultMenus = ''): UserDraft {
  return {
    userId: '',
    userFullName: '',
    userMail: '',
    password: '',
    passwordConfirm: '',
    status: true,
    menus: defaultMenus,
    userEndDate: createDefaultUserEndDate(),
    accounts: []
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
  protected readonly menuOptions = signal<B2BMenuOptionDto[]>([]);
  protected readonly accountSearchResults = signal<B2BAccountLookupDto[]>([]);
  protected readonly accountSearchExecuted = signal<boolean>(false);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<B2BAction>(null);

  protected bulletinSearch = '';
  protected userSearch = '';
  protected includeInactiveUsers = false;
  protected take = 100;
  protected bulletinDraft: BulletinDraft = createBulletinDraft();
  protected userDraft: UserDraft = createUserDraft();
  protected resetPasswordDraft = '';
  protected resetPasswordConfirmDraft = '';
  protected accountSearch = '';
  protected newAccountCategory = '01';

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
  protected readonly menuGroups = computed<B2BMenuGroupView[]>(() => {
    const groups = new Map<number, B2BMenuGroupView>();
    for (const option of this.menuOptions()) {
      const existing = groups.get(option.menuGroupId);
      if (existing) {
        existing.items.push(option);
      } else {
        groups.set(option.menuGroupId, {
          groupId: option.menuGroupId,
          groupName: option.menuGroupName,
          items: [option]
        });
      }
    }
    return Array.from(groups.values());
  });

  constructor() {
    this.loadBulletins();
  }

  protected setTab(tab: B2BTab): void {
    this.activeTab.set(tab);
    this.feedback.set(null);

    if (tab === 'bulletins' && !this.bulletins().length) {
      this.loadBulletins();
    }

    if (tab === 'users') {
      if (!this.users().length) {
        this.loadUsers();
      }
      if (!this.menuOptions().length) {
        this.loadMenuOptions();
      }
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

  protected loadMenuOptions(): void {
    if (!this.canList()) {
      return;
    }

    this.ayarIslemleriService
      .getB2BMenus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: B2BMenuOptionDto[]) => {
          this.menuOptions.set(items ?? []);
        },
        error: () => {
          this.menuOptions.set([]);
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

  protected isEditUserMode(): boolean {
    return !!this.userDraft.userId;
  }

  protected canEditUserForm(): boolean {
    return this.isEditUserMode() ? this.canUpdate() : this.canCreate();
  }

  protected newUser(): void {
    this.selectedUser.set(null);
    const defaultMenus = this.menuOptions()
      .map((item) => String(item.id))
      .join(',');
    this.userDraft = createUserDraft(defaultMenus);
    this.resetPasswordDraft = '';
    this.resetPasswordConfirmDraft = '';
    this.accountSearch = '';
    this.newAccountCategory = '01';
    this.accountSearchResults.set([]);
    this.accountSearchExecuted.set(false);
    this.feedback.set(null);
  }

  protected selectUser(user: B2BUserDto): void {
    if (this.selectedUser()?.userId !== user.userId) {
      this.selectedUser.set(null);
    }
    this.applyUserDraft(user);
    this.resetPasswordDraft = '';
    this.resetPasswordConfirmDraft = '';
    this.accountSearchResults.set([]);
    this.accountSearchExecuted.set(false);

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
    const isEdit = this.isEditUserMode();

    if (isEdit && !this.canUpdate()) {
      return;
    }

    if (!isEdit && !this.canCreate()) {
      return;
    }

    const userFullName = this.userDraft.userFullName.trim();
    const userMail = this.userDraft.userMail.trim();

    if (!userFullName || userFullName.length > 70 || userMail.length > 150 || !/^\S+@\S+\.\S+$/.test(userMail)) {
      this.setFeedback('error', 'Form eksik', 'Ad soyad ve gecerli e-posta zorunludur.');
      return;
    }

    const endDateIso = this.toRequestIsoDate(this.userDraft.userEndDate);
    if (!endDateIso) {
      this.setFeedback('error', 'Form eksik', 'Gecerli bir bitis tarihi secmelisiniz.');
      return;
    }

    const accountsPayload: B2BUserAccountInputHttpRequest[] = this.userDraft.accounts.map((item) => ({
      accountId: item.accountId,
      category: item.category.trim() || '01'
    }));

    // Detay (bagli cariler) yuklenmeden guncelleme yapilirsa mevcut bagli carileri silmemek icin
    // accounts alanini null gonder; API null geldiginde UserAccounts kayitlarina dokunmaz.
    const accountsLoaded = !isEdit || this.selectedUser()?.userId === this.userDraft.userId;

    if (!isEdit) {
      if (this.userDraft.password.length < 6) {
        this.setFeedback('error', 'Sifre gecersiz', 'Yeni kullanici sifresi en az 6 karakter olmalidir.');
        return;
      }

      if (this.userDraft.password !== this.userDraft.passwordConfirm) {
        this.setFeedback('error', 'Sifre uyusmuyor', 'Sifre ve sifre tekrar alanlari ayni olmalidir.');
        return;
      }

      const createRequest: CreateB2BUserHttpRequest = {
        userFullName,
        userMail,
        password: this.userDraft.password,
        status: this.userDraft.status,
        menus: this.userDraft.menus.trim() || null,
        userEndDate: endDateIso,
        accounts: accountsPayload
      };

      this.loadingAction.set('save');
      this.feedback.set(null);

      this.ayarIslemleriService
        .createB2BUser(createRequest)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loadingAction.set(null))
        )
        .subscribe({
          next: (detail: B2BUserDetailDto) => {
            this.selectedUser.set(detail);
            this.upsertUser(detail);
            this.applyUserDraft(detail);
            this.setFeedback('success', 'Kullanici olusturuldu', `${detail.userFullName} (${detail.userMail})`);
          },
          error: (error: unknown) => {
            this.setFeedback('error', 'Kullanici olusturulamadi', getErrorMessage(error, 'Kayit basarisiz.'));
          }
        });

      return;
    }

    const updateRequest: UpdateB2BUserHttpRequest = {
      userFullName,
      userMail,
      status: this.userDraft.status,
      menus: this.userDraft.menus.trim() || null,
      userEndDate: endDateIso,
      accounts: accountsLoaded ? accountsPayload : null
    };

    this.loadingAction.set('save');
    this.feedback.set(null);

    this.ayarIslemleriService
      .updateB2BUser(this.userDraft.userId, updateRequest)
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

  protected resetUserPassword(): void {
    if (!this.userDraft.userId || !this.canUpdate()) {
      return;
    }

    if (this.resetPasswordDraft.length < 6) {
      this.setFeedback('error', 'Sifre gecersiz', 'Yeni sifre en az 6 karakter olmalidir.');
      return;
    }

    if (this.resetPasswordDraft !== this.resetPasswordConfirmDraft) {
      this.setFeedback('error', 'Sifre uyusmuyor', 'Yeni sifre ve tekrari ayni olmalidir.');
      return;
    }

    this.loadingAction.set('password');
    this.feedback.set(null);

    this.ayarIslemleriService
      .resetB2BUserPassword(this.userDraft.userId, { newPassword: this.resetPasswordDraft })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: () => {
          this.resetPasswordDraft = '';
          this.resetPasswordConfirmDraft = '';
          this.setFeedback('success', 'Sifre guncellendi', `${this.userDraft.userFullName} icin yeni sifre kaydedildi.`);
        },
        error: (error: unknown) => {
          this.setFeedback('error', 'Sifre guncellenemedi', getErrorMessage(error, 'Islem basarisiz.'));
        }
      });
  }

  protected isMenuSelected(menuId: number): boolean {
    return this.parseMenuTokens().includes(String(menuId));
  }

  protected selectedMenuCount(): number {
    const knownIds = new Set(this.menuOptions().map((item) => String(item.id)));
    return this.parseMenuTokens().filter((token) => knownIds.has(token)).length;
  }

  protected toggleMenu(menuId: number): void {
    if (!this.canEditUserForm()) {
      return;
    }

    const token = String(menuId);
    const current = this.parseMenuTokens();
    const next = current.includes(token)
      ? current.filter((item) => item !== token)
      : [...current, token];
    this.userDraft.menus = next.join(',');
  }

  protected selectAllMenus(): void {
    if (!this.canEditUserForm()) {
      return;
    }

    const knownIds = this.menuOptions().map((item) => String(item.id));
    const knownSet = new Set(knownIds);
    const extraLegacy = this.parseMenuTokens().filter((token) => !knownSet.has(token));
    this.userDraft.menus = [...knownIds, ...extraLegacy].join(',');
  }

  protected clearAllMenus(): void {
    if (!this.canEditUserForm()) {
      return;
    }

    this.userDraft.menus = '';
  }

  protected searchAccounts(): void {
    if (!this.canList()) {
      return;
    }

    this.loadingAction.set('accountSearch');

    this.ayarIslemleriService
      .searchB2BAccounts(this.accountSearch, 20)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (items: B2BAccountLookupDto[]) => {
          this.accountSearchResults.set(items ?? []);
          this.accountSearchExecuted.set(true);
        },
        error: (error: unknown) => {
          this.accountSearchResults.set([]);
          this.accountSearchExecuted.set(true);
          this.setFeedback('error', 'Cari aramasi basarisiz', getErrorMessage(error, 'Mikro carileri alinamadi.'));
        }
      });
  }

  protected isAccountAttached(accountId: string): boolean {
    const categoryKey = (this.newAccountCategory.trim() || '01').toUpperCase();
    return this.userDraft.accounts.some(
      (item) => item.accountId.toLowerCase() === accountId.toLowerCase() && item.category.trim().toUpperCase() === categoryKey
    );
  }

  protected addAccount(item: B2BAccountLookupDto): void {
    if (!this.canEditUserForm()) {
      return;
    }

    const category = this.newAccountCategory.trim() || '01';
    if (this.isAccountAttached(item.accountId)) {
      return;
    }

    this.userDraft.accounts = [
      ...this.userDraft.accounts,
      {
        accountId: item.accountId,
        category,
        accountCode: item.accountCode,
        accountTitle: item.accountTitle
      }
    ];
  }

  protected removeAccount(index: number): void {
    if (!this.canEditUserForm()) {
      return;
    }

    this.userDraft.accounts = this.userDraft.accounts.filter((_item, idx) => idx !== index);
  }

  protected trackByBulletin = (_index: number, item: B2BBulletinDto): number => item.id;
  protected trackByUser = (_index: number, item: B2BUserDto): string => item.userId;
  protected trackByAccountDraft = (_index: number, item: UserAccountDraft): string =>
    `${item.accountId}_${item.category}`;
  protected trackByAccountLookup = (_index: number, item: B2BAccountLookupDto): string => item.accountId;
  protected trackByMenuGroup = (_index: number, group: B2BMenuGroupView): number => group.groupId;
  protected trackByMenuOption = (_index: number, item: B2BMenuOptionDto): number => item.id;

  private parseMenuTokens(): string[] {
    return (this.userDraft.menus ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part, index, list) => part.length > 0 && list.indexOf(part) === index);
  }

  private buildBulletinRequest(): SaveB2BBulletinHttpRequest | null {
    const definition = this.bulletinDraft.definition.trim();
    const link = this.bulletinDraft.link.trim();

    if (!definition || !link) {
      return null;
    }

    return {
      definition,
      link,
      createDate: this.toRequestIsoDate(this.bulletinDraft.createDate)
    };
  }

  private applyUserDraft(user: B2BUserDto | B2BUserDetailDto): void {
    const accounts = 'accounts' in user && Array.isArray(user.accounts)
      ? user.accounts.map((item) => ({
          id: item.id,
          accountId: item.accountId,
          category: item.category ?? '01',
          accountCode: item.accountCode ?? null,
          accountTitle: item.accountTitle ?? null
        }))
      : this.userDraft.userId === user.userId
        ? this.userDraft.accounts
        : [];

    this.userDraft = {
      userId: user.userId,
      userFullName: user.userFullName ?? '',
      userMail: user.userMail ?? '',
      password: '',
      passwordConfirm: '',
      status: !!user.status,
      menus: user.menus ?? '',
      userEndDate: this.toInputDateTime(user.userEndDate),
      accounts
    };
  }

  private upsertBulletin(item: B2BBulletinDto): void {
    const rows = this.bulletins();
    const index = rows.findIndex((row) => row.id === item.id);
    const next = index >= 0 ? [...rows.slice(0, index), item, ...rows.slice(index + 1)] : [item, ...rows];
    this.bulletins.set(this.sortBulletins(next));
  }

  private upsertUser(detail: B2BUserDetailDto): void {
    const normalized: B2BUserDto = {
      userId: detail.userId,
      userFullName: detail.userFullName,
      userMail: detail.userMail,
      status: detail.status,
      createDate: detail.createDate,
      menus: detail.menus,
      userEndDate: detail.userEndDate,
      accountCount: detail.accounts?.length ?? detail.accountCount ?? 0,
      categories: detail.categories ?? Array.from(new Set((detail.accounts ?? []).map((item) => item.category ?? '01')))
    };

    const rows = this.users();
    const index = rows.findIndex((row) => row.userId === normalized.userId);
    const next = index >= 0 ? [...rows.slice(0, index), normalized, ...rows.slice(index + 1)] : [normalized, ...rows];
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

    return formatLocalDateTimeInput(date);
  }

  private toRequestIsoDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  private setFeedback(tone: ActionFeedback['tone'], title: string, message: string): void {
    this.feedback.set({ tone, title, message });
  }
}
