import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  IFurpaPermissionCatalogModuleApiDto,
  IFurpaPermissionListItemApiDto,
  IFurpaRoleApiDto,
  IFurpaSavePermissionRequestApiDto,
  IFurpaSaveRoleRequestApiDto,
  IFurpaUpdateUserRequestApiDto,
  IFurpaUserApiDto,
  IFurpaUserRoleAssignRequestApiDto
} from '@interfaces';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

import { KullaniciIslemleriService } from '../../../../../core/api/module-services/kullanici-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { injectDocsTaskContext } from '../../../core/task-permission-context';

type UserAdminPageMode = 'users' | 'roles' | 'permissions';

interface RolePermissionActionEditor {
  permissionId: string | null;
  code: string;
  label: string;
  description: string | null;
  selected: boolean;
  disabled: boolean;
}

interface RolePermissionMenuEditor {
  code: string;
  label: string;
  selected: boolean;
  actions: RolePermissionActionEditor[];
}

interface RolePermissionModuleEditor {
  code: string;
  label: string;
  selected: boolean;
  menus: RolePermissionMenuEditor[];
}

interface RolePermissionMenuView {
  menu: RolePermissionMenuEditor;
  actions: RolePermissionActionEditor[];
}

interface RolePermissionModuleView {
  module: RolePermissionModuleEditor;
  menus: RolePermissionMenuView[];
}

@Component({
  selector: 'app-kullanici-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kullanici-detail.component.html',
  styleUrl: './kullanici-detail.component.scss'
})
export class KullaniciDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly kullaniciIslemleriService = inject(KullaniciIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly docsTaskContext = injectDocsTaskContext();

  protected readonly pageId = this.docsTaskContext.taskId ?? 'kullanicilar';
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.pageId] ?? DOCS_PAGES['kullanicilar'];
  protected readonly mode: UserAdminPageMode = this.resolveMode(this.pageId);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly entitySearch = signal('');
  protected readonly detailSearch = signal('');
  protected readonly showSelectedOnly = signal(false);
  protected readonly users = signal<IFurpaUserApiDto[]>([]);
  protected readonly roles = signal<IFurpaRoleApiDto[]>([]);
  protected readonly permissions = signal<IFurpaPermissionListItemApiDto[]>([]);
  protected readonly permissionCatalog = signal<IFurpaPermissionCatalogModuleApiDto[]>([]);
  protected readonly activeUserId = signal<string | null>(null);
  protected readonly activeRoleId = signal<string | null>(null);
  protected readonly activePermissionId = signal<string | null>(null);
  protected readonly rolePermissionModules = signal<RolePermissionModuleEditor[]>([]);
  protected readonly selectedUser = computed(
    () => this.users().find((user: IFurpaUserApiDto) => user.id === this.activeUserId()) ?? null
  );
  protected readonly selectedRole = computed(
    () => this.roles().find((role: IFurpaRoleApiDto) => role.id === this.activeRoleId()) ?? null
  );
  protected readonly selectedPermission = computed(
    () =>
      this.permissions().find(
        (permission: IFurpaPermissionListItemApiDto) => permission.id === this.activePermissionId()
      ) ?? null
  );
  protected readonly filteredUsers = computed(() => {
    const query = this.normalizeText(this.entitySearch());

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
    const query = this.normalizeText(this.entitySearch());

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
    const query = this.normalizeText(this.entitySearch());

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
  protected readonly visibleRolePermissionModules = computed(() => {
    const query = this.normalizeText(this.detailSearch());
    const selectedOnly = this.showSelectedOnly();

    return this.rolePermissionModules().flatMap((module: RolePermissionModuleEditor) => {
      const moduleMatches = !query || this.matchesQuery(module.label, query) || this.matchesQuery(module.code, query);
      const menus = module.menus.flatMap((menu: RolePermissionMenuEditor) => {
        const menuMatches =
          moduleMatches || !query || this.matchesQuery(menu.label, query) || this.matchesQuery(menu.code, query);
        const actions = menu.actions.filter((action: RolePermissionActionEditor) => {
          const queryMatches =
            menuMatches ||
            !query ||
            this.matchesQuery(action.label, query) ||
            this.matchesQuery(action.code, query) ||
            this.matchesQuery(action.description, query);
          const selectionMatches = !selectedOnly || action.selected;

          return queryMatches && selectionMatches;
        });

        if ((query && !menuMatches && actions.length === 0) || (selectedOnly && actions.length === 0)) {
          return [];
        }

        return [
          {
            menu,
            actions
          }
        ];
      });

      if ((query && !moduleMatches && menus.length === 0) || (selectedOnly && menus.length === 0)) {
        return [];
      }

      return [
        {
          module,
          menus
        }
      ];
    });
  });
  protected readonly highlightedPermissionCode = computed(
    () => this.selectedPermission()?.code?.trim() ?? ''
  );

  protected readonly userControls = {
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    warehouseNo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    warehouseName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    isActive: new FormControl(true, { nonNullable: true }),
    roleIds: new FormControl<string[]>([], { nonNullable: true })
  };
  protected readonly userForm = new FormGroup(this.userControls);

  protected readonly roleControls = {
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  };
  protected readonly roleForm = new FormGroup(this.roleControls);

  protected readonly permissionControls = {
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true })
  };
  protected readonly permissionForm = new FormGroup(this.permissionControls);

  ngOnInit(): void {
    this.loadWorkspace(this.getRequestedId() ?? undefined);
  }

  protected loadWorkspace(preferredId?: string): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.clearSaveMessages();

    const request$ =
      this.mode === 'users'
        ? this.hydrateUsers(preferredId)
        : this.mode === 'roles'
          ? this.hydrateRoles(preferredId)
          : this.hydratePermissions(preferredId);

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => undefined,
        error: (error: HttpErrorResponse) => {
          this.error.set(this.resolveError(error, this.getLoadErrorMessage()));
        }
      });
  }

  protected selectUser(userId: string): void {
    this.activeUserId.set(userId);
    this.patchUserForm(this.selectedUser());
    this.navigateToSelection(userId);
    this.clearSaveMessages();
  }

  protected selectRole(roleId: string): void {
    this.activeRoleId.set(roleId);
    this.applySelectedRole(roleId);
    this.navigateToSelection(roleId);
    this.clearSaveMessages();
  }

  protected selectPermission(permissionId: string): void {
    this.activePermissionId.set(permissionId);
    this.patchPermissionForm(this.selectedPermission());
    this.navigateToSelection(permissionId);
    this.clearSaveMessages();
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }

    const activeForm =
      this.mode === 'users'
        ? this.userForm
        : this.mode === 'roles'
          ? this.roleForm
          : this.permissionForm;

    if (activeForm.invalid) {
      activeForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.clearSaveMessages();

    const request$ =
      this.mode === 'users'
        ? this.saveUser()
        : this.mode === 'roles'
          ? this.saveRole()
          : this.savePermission();

    request$
      .pipe(
        switchMap(() =>
          this.authService.refreshCurrentUser().pipe(
            map(() => null),
            catchError((error: HttpErrorResponse) => of(error))
          )
        ),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (refreshError: HttpErrorResponse | null) => {
          this.saveSuccess.set(this.getSaveSuccessMessage());

          if (refreshError) {
            this.saveError.set(
              this.resolveError(
                refreshError,
                'Kayit guncellendi ancak aktif kullanici yetkileri yenilenemedi.'
              )
            );
            return;
          }

          if (!this.authService.hasTaskAccess(this.page.id)) {
            void this.router.navigateByUrl('/dashboard');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.saveError.set(this.resolveError(error, this.getSaveErrorMessage()));
        }
      });
  }

  protected goBack(): void {
    void this.router.navigateByUrl(`/docs/api/${this.page.id}`);
  }

  protected setEntitySearch(event: Event): void {
    this.entitySearch.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected setDetailSearch(event: Event): void {
    this.detailSearch.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected clearDetailSearch(): void {
    this.detailSearch.set('');
  }

  protected toggleSelectedOnly(): void {
    this.showSelectedOnly.update((value) => !value);
  }

  protected onUserRoleSelectionChange(event: Event): void {
    const selectedRoleIds = Array.from(
      (event.target as HTMLSelectElement).selectedOptions,
      (option) => option.value.trim()
    ).filter(Boolean);

    this.userControls.roleIds.setValue(selectedRoleIds);
    this.userControls.roleIds.markAsDirty();
    this.userControls.roleIds.markAsTouched();
  }

  protected isRoleAssigned(roleId: string): boolean {
    return this.userControls.roleIds.value.includes(roleId);
  }

  protected getUserDisplayName(user: IFurpaUserApiDto | null): string {
    if (!user) {
      return '-';
    }

    const fullName = [user.firstName, user.lastName]
      .filter((value): value is string => !!value?.trim())
      .join(' ')
      .trim();

    return fullName || user.username || '-';
  }

  protected toggleModule(module: RolePermissionModuleEditor, checked: boolean): void {
    for (const menu of module.menus) {
      for (const action of menu.actions) {
        if (!action.disabled) {
          action.selected = checked;
        }
      }

      this.refreshMenuSelection(menu);
    }

    this.refreshModuleSelection(module);
    this.commitRolePermissionModules();
  }

  protected toggleMenu(
    module: RolePermissionModuleEditor,
    menu: RolePermissionMenuEditor,
    checked: boolean
  ): void {
    for (const action of menu.actions) {
      if (!action.disabled) {
        action.selected = checked;
      }
    }

    this.refreshMenuSelection(menu);
    this.refreshModuleSelection(module);
    this.commitRolePermissionModules();
  }

  protected toggleAction(
    module: RolePermissionModuleEditor,
    menu: RolePermissionMenuEditor,
    action: RolePermissionActionEditor,
    checked: boolean
  ): void {
    if (!action.disabled) {
      action.selected = checked;
    }

    this.refreshMenuSelection(menu);
    this.refreshModuleSelection(module);
    this.commitRolePermissionModules();
  }

  protected countSelectedRolePermissions(): number {
    return this.rolePermissionModules().reduce(
      (count, module) =>
        count +
        module.menus.reduce(
          (menuCount, menu) =>
            menuCount + menu.actions.filter((action) => action.selected).length,
          0
        ),
      0
    );
  }

  protected countCatalogModules(modules: IFurpaPermissionCatalogModuleApiDto[]): number {
    return modules.length;
  }

  protected countCatalogMenus(modules: IFurpaPermissionCatalogModuleApiDto[]): number {
    return modules.reduce((count, module) => count + (module.menus?.length ?? 0), 0);
  }

  protected countCatalogActions(modules: IFurpaPermissionCatalogModuleApiDto[]): number {
    return modules.reduce(
      (count, module) =>
        count +
        (module.menus ?? []).reduce(
          (menuCount, menu) => menuCount + (menu.actions?.length ?? 0),
          0
        ),
      0
    );
  }

  protected getVisibleCatalogModules(): IFurpaPermissionCatalogModuleApiDto[] {
    if (this.mode === 'users') {
      return this.selectedUser()?.modules ?? [];
    }

    if (this.mode === 'permissions') {
      const selectedPermissionCode = this.highlightedPermissionCode();

      if (!selectedPermissionCode) {
        return this.permissionCatalog();
      }

      return this.permissionCatalog().filter((module: IFurpaPermissionCatalogModuleApiDto) =>
        (module.menus ?? []).some((menu) =>
          (menu.actions ?? []).some((action) => action.permissionCode === selectedPermissionCode)
        )
      );
    }

    return [];
  }

  protected isCatalogActionHighlighted(permissionCode: string): boolean {
    return permissionCode === this.highlightedPermissionCode();
  }

  protected readonly trackByUser = (_index: number, user: IFurpaUserApiDto): string => user.id;
  protected readonly trackByRole = (_index: number, role: IFurpaRoleApiDto): string => role.id;
  protected readonly trackByPermission = (
    _index: number,
    permission: IFurpaPermissionListItemApiDto
  ): string => permission.id;
  protected readonly trackByModule = (_index: number, module: RolePermissionModuleView): string =>
    module.module.code;
  protected readonly trackByMenu = (_index: number, menu: RolePermissionMenuView): string =>
    menu.menu.code;
  protected readonly trackByAction = (_index: number, action: RolePermissionActionEditor): string =>
    action.permissionId ?? action.code;

  private hydrateUsers(preferredId?: string) {
    return this.kullaniciIslemleriService.listUsers().pipe(
      switchMap((users: IFurpaUserApiDto[]) =>
        this.kullaniciIslemleriService.listRoles().pipe(
          map((roles: IFurpaRoleApiDto[]) => {
          const sortedUsers = [...users].sort((left, right) =>
            this.getUserDisplayName(left).localeCompare(this.getUserDisplayName(right), 'tr')
          );
          const sortedRoles = [...roles].sort((left, right) =>
            (left.name ?? '').localeCompare(right.name ?? '', 'tr')
          );
          const nextId = this.resolveNextId(
            preferredId,
            this.activeUserId(),
            sortedUsers.map((user) => user.id)
          );

          this.users.set(sortedUsers);
          this.roles.set(sortedRoles);
          this.permissions.set([]);
          this.permissionCatalog.set([]);
          this.rolePermissionModules.set([]);
          this.activeUserId.set(nextId);
          this.patchUserForm(
            sortedUsers.find((user: IFurpaUserApiDto) => user.id === nextId) ?? null
          );
          })
        )
      )
    );
  }

  private hydrateRoles(preferredId?: string) {
    return this.kullaniciIslemleriService.listRoles().pipe(
      switchMap((roles: IFurpaRoleApiDto[]) =>
        this.kullaniciIslemleriService.listPermissionCatalog().pipe(
          switchMap((catalog: IFurpaPermissionCatalogModuleApiDto[]) =>
            this.kullaniciIslemleriService.listPermissions().pipe(
              map((permissions: IFurpaPermissionListItemApiDto[]) => {
          const sortedRoles = [...roles].sort((left, right) =>
            (left.name ?? '').localeCompare(right.name ?? '', 'tr')
          );
          const sortedPermissions = [...permissions].sort((left, right) =>
            (left.code ?? '').localeCompare(right.code ?? '', 'tr')
          );
          const nextId = this.resolveNextId(
            preferredId,
            this.activeRoleId(),
            sortedRoles.map((role) => role.id)
          );

          this.users.set([]);
          this.roles.set(sortedRoles);
          this.permissions.set(sortedPermissions);
          this.permissionCatalog.set(catalog);
          this.activeRoleId.set(nextId);
          this.applySelectedRole(nextId);
              })
            )
          )
        )
      )
    );
  }

  private hydratePermissions(preferredId?: string) {
    return this.kullaniciIslemleriService.listPermissions().pipe(
      switchMap((permissions: IFurpaPermissionListItemApiDto[]) =>
        this.kullaniciIslemleriService.listPermissionCatalog().pipe(
          map((catalog: IFurpaPermissionCatalogModuleApiDto[]) => {
          const sortedPermissions = [...permissions].sort((left, right) =>
            (left.code ?? '').localeCompare(right.code ?? '', 'tr')
          );
          const nextId = this.resolveNextId(
            preferredId,
            this.activePermissionId(),
            sortedPermissions.map((permission) => permission.id)
          );

          this.users.set([]);
          this.roles.set([]);
          this.permissions.set(sortedPermissions);
          this.permissionCatalog.set(catalog);
          this.rolePermissionModules.set([]);
          this.activePermissionId.set(nextId);
          this.patchPermissionForm(
            sortedPermissions.find(
              (permission: IFurpaPermissionListItemApiDto) => permission.id === nextId
            ) ?? null
          );
          })
        )
      )
    );
  }

  private saveUser() {
    const user = this.selectedUser();

    if (!user) {
      return of(null);
    }

    const updateRequest: IFurpaUpdateUserRequestApiDto = {
      username: this.userControls.username.value.trim(),
      email: this.userControls.email.value.trim(),
      firstName: this.userControls.firstName.value.trim(),
      lastName: this.userControls.lastName.value.trim(),
      warehouseNo: this.userControls.warehouseNo.value.trim(),
      warehouseName: this.userControls.warehouseName.value.trim(),
      isActive: this.userControls.isActive.value
    };
    const roleAssignRequest: IFurpaUserRoleAssignRequestApiDto = {
      roleIds: this.userControls.roleIds.value.filter(Boolean)
    };

    return this.kullaniciIslemleriService.updateUser(user.id, updateRequest).pipe(
      switchMap(() =>
        this.kullaniciIslemleriService.assignUserRoles(user.id, roleAssignRequest)
      ),
      switchMap(() => this.hydrateUsers(user.id))
    );
  }

  private saveRole() {
    const role = this.selectedRole();

    if (!role) {
      return of(null);
    }

    const updateRequest: IFurpaSaveRoleRequestApiDto = {
      name: this.roleControls.name.value.trim(),
      description: this.normalizeOptionalText(this.roleControls.description.value),
      isActive: this.roleControls.isActive.value
    };
    const permissionIds = this.rolePermissionModules()
      .flatMap((module) => module.menus)
      .flatMap((menu) => menu.actions)
      .filter((action) => action.selected && !!action.permissionId)
      .map((action) => action.permissionId as string);

    return this.kullaniciIslemleriService.updateRole(role.id, updateRequest).pipe(
      switchMap(() =>
        this.kullaniciIslemleriService.assignRolePermissions(role.id, {
          permissionIds
        })
      ),
      switchMap(() => this.hydrateRoles(role.id))
    );
  }

  private savePermission() {
    const permission = this.selectedPermission();

    if (!permission) {
      return of(null);
    }

    const updateRequest: IFurpaSavePermissionRequestApiDto = {
      code: this.permissionControls.code.value.trim(),
      name: this.permissionControls.name.value.trim(),
      description: this.normalizeOptionalText(this.permissionControls.description.value)
    };

    return this.kullaniciIslemleriService.updatePermission(permission.id, updateRequest).pipe(
      switchMap(() => this.hydratePermissions(permission.id))
    );
  }

  private applySelectedRole(roleId: string | null): void {
    const role = this.roles().find((item: IFurpaRoleApiDto) => item.id === roleId) ?? null;
    this.patchRoleForm(role);
    this.rolePermissionModules.set(
      role
        ? this.buildRolePermissionModules(
            this.permissionCatalog(),
            this.permissions(),
            role.permissions ?? []
          )
        : []
    );
  }

  private buildRolePermissionModules(
    catalog: IFurpaPermissionCatalogModuleApiDto[],
    permissions: IFurpaPermissionListItemApiDto[],
    selectedPermissions: IFurpaPermissionListItemApiDto[]
  ): RolePermissionModuleEditor[] {
    const selectedPermissionCodes = new Set(
      (selectedPermissions ?? []).map((permission) => permission.code?.trim()).filter(Boolean)
    );

    return (catalog ?? []).map((module: IFurpaPermissionCatalogModuleApiDto) => {
      const menus = (module.menus ?? []).map((menu) => {
        const actions = (menu.actions ?? []).map((action) => {
          const permission = permissions.find(
            (item: IFurpaPermissionListItemApiDto) => item.code === action.permissionCode
          );

          return {
            permissionId: permission?.id ?? null,
            code: action.permissionCode || action.code,
            label: action.name || permission?.name || action.code,
            description: action.description ?? permission?.description ?? null,
            selected: selectedPermissionCodes.has(action.permissionCode),
            disabled: !permission?.id
          };
        });
        const selected = actions.length > 0 && actions.every((action) => action.selected);

        return {
          code: menu.code,
          label: menu.name || menu.code,
          selected,
          actions
        };
      });
      const selected = menus.length > 0 && menus.every((menu) => menu.selected);

      return {
        code: module.code,
        label: module.name || module.code,
        selected,
        menus
      };
    });
  }

  private patchUserForm(user: IFurpaUserApiDto | null): void {
    this.userForm.reset({
      username: user?.username ?? '',
      email: user?.email ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      warehouseNo: user?.warehouseNo ?? '',
      warehouseName: user?.warehouseName ?? '',
      isActive: user?.isActive ?? true,
      roleIds: [...(user?.roles ?? [])]
        .map((roleName) =>
          this.roles().find((role: IFurpaRoleApiDto) => role.name === roleName)?.id ?? ''
        )
        .filter(Boolean)
    });
  }

  private patchRoleForm(role: IFurpaRoleApiDto | null): void {
    this.roleForm.reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      isActive: role?.isActive ?? true
    });
  }

  private patchPermissionForm(permission: IFurpaPermissionListItemApiDto | null): void {
    this.permissionForm.reset({
      code: permission?.code ?? '',
      name: permission?.name ?? '',
      description: permission?.description ?? ''
    });
  }

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

  private resolveNextId(
    preferredId: string | undefined | null,
    currentId: string | null,
    availableIds: string[]
  ): string | null {
    return availableIds.find((id) => id === preferredId)
      ?? availableIds.find((id) => id === currentId)
      ?? availableIds[0]
      ?? null;
  }

  private refreshMenuSelection(menu: RolePermissionMenuEditor): void {
    menu.selected = menu.actions.length > 0 && menu.actions.every((action) => action.selected);
  }

  private refreshModuleSelection(module: RolePermissionModuleEditor): void {
    module.selected = module.menus.length > 0 && module.menus.every((menu) => menu.selected);
  }

  private commitRolePermissionModules(): void {
    this.rolePermissionModules.update((modules) => [...modules]);
  }

  private navigateToSelection(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { id },
      queryParamsHandling: 'merge'
    });
  }

  private getRequestedId(): string | null {
    return this.activatedRoute.snapshot.queryParamMap.get('id');
  }

  private clearSaveMessages(): void {
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private normalizeOptionalText(value: string): string | null {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private matchesQuery(value: string | null | undefined, query: string): boolean {
    return this.normalizeText(value).includes(query);
  }

  private getLoadErrorMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol ve permission katalogu yuklenemedi.';
      case 'permissions':
        return 'Permission detaylari yuklenemedi.';
      default:
        return 'Kullanici detaylari yuklenemedi.';
    }
  }

  private getSaveSuccessMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol bilgileri ve permission atamalari kaydedildi.';
      case 'permissions':
        return 'Permission kaydi guncellendi.';
      default:
        return 'Kullanici bilgileri guncellendi.';
    }
  }

  private getSaveErrorMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol kaydi guncellenemedi.';
      case 'permissions':
        return 'Permission kaydi guncellenemedi.';
      default:
        return 'Kullanici kaydi guncellenemedi.';
    }
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
