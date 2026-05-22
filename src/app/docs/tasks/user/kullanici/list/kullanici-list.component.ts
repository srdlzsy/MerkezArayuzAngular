import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type {
  IFurpaPermissionListItemApiDto,
  IFurpaRoleApiDto,
  IFurpaUserApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { KullaniciIslemleriService } from '../../../../../core/api/module-services/kullanici-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { injectDocsTaskContext } from '../../../core/task-permission-context';

type UserAdminPageMode = 'users' | 'roles' | 'permissions';

@Component({
  selector: 'app-kullanici-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kullanici-list.component.html',
  styleUrl: './kullanici-list.component.scss'
})
export class KullaniciListComponent implements OnInit {
  protected readonly taskPermissionContext = injectDocsTaskContext();
  protected readonly pageId = this.taskPermissionContext.taskId ?? 'kullanicilar';
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.pageId] ?? DOCS_PAGES['kullanicilar'];
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly users = signal<IFurpaUserApiDto[]>([]);
  protected readonly roles = signal<IFurpaRoleApiDto[]>([]);
  protected readonly permissions = signal<IFurpaPermissionListItemApiDto[]>([]);
  protected readonly mode: UserAdminPageMode = this.resolveMode(this.pageId);
  protected readonly filteredUsers = computed(() => {
    const query = this.normalizeText(this.search());

    if (!query) {
      return this.users();
    }

    return this.users().filter((user: IFurpaUserApiDto) =>
      [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.warehouseNo,
        user.warehouseName,
        ...(user.roles ?? [])
      ].some((value) => this.normalizeText(value).includes(query))
    );
  });
  protected readonly filteredRoles = computed(() => {
    const query = this.normalizeText(this.search());

    if (!query) {
      return this.roles();
    }

    return this.roles().filter((role: IFurpaRoleApiDto) =>
      [role.name, role.description, role.id].some((value) =>
        this.normalizeText(value).includes(query)
      )
    );
  });
  protected readonly filteredPermissions = computed(() => {
    const query = this.normalizeText(this.search());

    if (!query) {
      return this.permissions();
    }

    return this.permissions().filter((permission: IFurpaPermissionListItemApiDto) =>
      [
        permission.code,
        permission.name,
        permission.description,
        permission.moduleName,
        permission.menuName,
        permission.actionName
      ].some((value) => this.normalizeText(value).includes(query))
    );
  });
  private readonly router = inject(Router);
  private readonly kullaniciIslemleriService = inject(KullaniciIslemleriService);

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const request$ =
      this.mode === 'users'
        ? this.kullaniciIslemleriService.listUsers()
        : this.mode === 'roles'
          ? this.kullaniciIslemleriService.listRoles()
          : this.kullaniciIslemleriService.listPermissions();

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (
          response:
            | IFurpaUserApiDto[]
            | IFurpaRoleApiDto[]
            | IFurpaPermissionListItemApiDto[]
        ) => {
          this.users.set(this.mode === 'users' ? (response as IFurpaUserApiDto[]) : []);
          this.roles.set(this.mode === 'roles' ? (response as IFurpaRoleApiDto[]) : []);
          this.permissions.set(
            this.mode === 'permissions'
              ? (response as IFurpaPermissionListItemApiDto[])
              : []
          );
        },
        error: (error: HttpErrorResponse) => {
          this.users.set([]);
          this.roles.set([]);
          this.permissions.set([]);
          this.error.set(this.resolveError(error, this.getLoadErrorMessage()));
        }
      });
  }

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected canCreate(): boolean {
    return true;
  }

  protected getPageDescription(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rolleri, aktiflik durumlarini ve yetki kapsamlarini tek listeden yonet.';
      case 'permissions':
        return 'Yetki kayitlarini modul, menu ve aksiyon baglaminda kontrol et.';
      default:
        return 'Kullanicilari, depo bilgilerini, rollerini ve aktiflik durumlarini takip et.';
    }
  }

  protected getListHeading(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol Listesi';
      case 'permissions':
        return 'Yetki Listesi';
      default:
        return 'Kullanici Listesi';
    }
  }

  protected getSearchPlaceholder(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol adi veya aciklama ara';
      case 'permissions':
        return 'Kod, modul, menu veya aksiyon ara';
      default:
        return 'Kullanici, e-posta, depo veya rol ara';
    }
  }

  protected totalRecordCount(): number {
    switch (this.mode) {
      case 'roles':
        return this.roles().length;
      case 'permissions':
        return this.permissions().length;
      default:
        return this.users().length;
    }
  }

  protected visibleRecordCount(): number {
    switch (this.mode) {
      case 'roles':
        return this.filteredRoles().length;
      case 'permissions':
        return this.filteredPermissions().length;
      default:
        return this.filteredUsers().length;
    }
  }

  protected activeRecordCount(): number {
    switch (this.mode) {
      case 'roles':
        return this.roles().filter((role) => role.isActive).length;
      case 'permissions':
        return new Set(this.permissions().map((permission) => permission.moduleName)).size;
      default:
        return this.users().filter((user) => user.isActive).length;
    }
  }

  protected activeRecordLabel(): string {
    return this.mode === 'permissions' ? 'Modul' : 'Aktif';
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(`/docs/api/${this.page.id}/ekle`);
  }

  protected openDetail(id?: string): void {
    void this.router.navigate([`/docs/api/${this.page.id}/detay`], {
      queryParams: id ? { id } : undefined
    });
  }

  protected getUserDisplayName(user: IFurpaUserApiDto): string {
    const fullName = [user.firstName, user.lastName]
      .filter((value): value is string => !!value?.trim())
      .join(' ')
      .trim();

    return fullName || user.username || '-';
  }

  protected getUserWarehouseLabel(user: IFurpaUserApiDto): string {
    const warehouseNo = user.warehouseNo?.trim();
    const warehouseName = user.warehouseName?.trim();

    if (warehouseNo && warehouseName) {
      return `${warehouseNo} - ${warehouseName}`;
    }

    return warehouseName || warehouseNo || '-';
  }

  protected readonly trackByUser = (_index: number, user: IFurpaUserApiDto): string => user.id;
  protected readonly trackByRole = (_index: number, role: IFurpaRoleApiDto): string => role.id;
  protected readonly trackByPermission = (
    _index: number,
    permission: IFurpaPermissionListItemApiDto
  ): string => permission.id;

  private resolveMode(pageId: string): UserAdminPageMode {
    switch (pageId) {
      case 'roller':
        return 'roles';
      case 'yetkiler':
        return 'permissions';
      default:
        return 'users';
    }
  }

  private getLoadErrorMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol listesi yuklenemedi.';
      case 'permissions':
        return 'Yetki listesi yuklenemedi.';
      default:
        return 'Kullanici listesi yuklenemedi.';
    }
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private resolveError(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string' &&
      error.error.message.trim()
    ) {
      return error.error.message;
    }

    return fallback;
  }
}
