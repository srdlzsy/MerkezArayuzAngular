import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type {
  IFurpaPermissionListItemApiDto,
  IFurpaAuthResponseApiDto,
  IFurpaRegisterRequestApiDto,
  IFurpaRoleApiDto,
  IFurpaSavePermissionRequestApiDto,
  IFurpaSaveRoleRequestApiDto,
  IFurpaUserApiDto,
  IFurpaUserRoleAssignRequestApiDto
} from '@interfaces';
import { finalize, map, of, switchMap } from 'rxjs';

import { KullaniciIslemleriService } from '../../../../../core/api/module-services/kullanici-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { injectDocsTaskContext } from '../../../core/task-permission-context';

type UserAdminPageMode = 'users' | 'roles' | 'permissions';

@Component({
  selector: 'app-kullanici-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kullanici-create.component.html',
  styleUrl: './kullanici-create.component.scss'
})
export class KullaniciCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly kullaniciIslemleriService = inject(KullaniciIslemleriService);
  private readonly docsTaskContext = injectDocsTaskContext();

  protected readonly pageId = this.docsTaskContext.taskId ?? 'kullanicilar';
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.pageId] ?? DOCS_PAGES['kullanicilar'];
  protected readonly mode: UserAdminPageMode = this.resolveMode(this.pageId);
  protected readonly availableRoles = signal<IFurpaRoleApiDto[]>([]);
  protected readonly permissions = signal<IFurpaPermissionListItemApiDto[]>([]);
  protected readonly loadingDependencies = signal(false);
  protected readonly dependencyError = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');
  protected readonly pageHeading = computed(() => this.resolvePageHeading());

  protected readonly userControls = {
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    warehouseNo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    warehouseName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
    this.loadDependencies();
  }

  protected submit(): void {
    if (this.submitting()) {
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

    this.submitError.set('');
    this.submitSuccess.set('');
    this.submitting.set(true);

    const request$ =
      this.mode === 'users'
        ? this.createUser()
        : this.mode === 'roles'
          ? this.kullaniciIslemleriService.createRole(this.buildRoleRequest())
          : this.kullaniciIslemleriService.createPermission(this.buildPermissionRequest());

    request$
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.submitSuccess.set(this.getSuccessMessage());
          this.resetActiveForm();

          if (this.mode === 'users') {
            return;
          }

          this.loadDependencies();
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, this.getSubmitErrorMessage()));
        }
      });
  }

  protected goBack(): void {
    void this.router.navigateByUrl(`/docs/api/${this.page.id}`);
  }

  protected onRoleSelectionChange(event: Event): void {
    const selectedRoleIds = Array.from(
      (event.target as HTMLSelectElement).selectedOptions,
      (option) => option.value.trim()
    ).filter(Boolean);

    this.userControls.roleIds.setValue(selectedRoleIds);
    this.userControls.roleIds.markAsDirty();
    this.userControls.roleIds.markAsTouched();
  }

  protected isRoleSelected(roleId: string): boolean {
    return this.userControls.roleIds.value.includes(roleId);
  }

  protected selectedRoleCount(): number {
    return this.userControls.roleIds.value.length;
  }

  protected suggestedPermissionCode(): string {
    const code = this.permissionControls.code.value.trim();

    if (!code) {
      return '-';
    }

    return code;
  }

  private loadDependencies(): void {
    if (this.loadingDependencies()) {
      return;
    }

    this.loadingDependencies.set(true);
    this.dependencyError.set('');

    const request$ =
      this.mode === 'users'
        ? this.kullaniciIslemleriService.listRoles().pipe(
            map((roles: IFurpaRoleApiDto[]) => ({ roles, permissions: [] as IFurpaPermissionListItemApiDto[] }))
          )
        : this.mode === 'permissions'
          ? this.kullaniciIslemleriService.listPermissions().pipe(
              map((permissions: IFurpaPermissionListItemApiDto[]) => ({
                roles: [] as IFurpaRoleApiDto[],
                permissions
              }))
            )
          : of({ roles: [] as IFurpaRoleApiDto[], permissions: [] as IFurpaPermissionListItemApiDto[] });

    request$
      .pipe(finalize(() => this.loadingDependencies.set(false)))
      .subscribe({
        next: ({
          roles,
          permissions
        }: {
          roles: IFurpaRoleApiDto[];
          permissions: IFurpaPermissionListItemApiDto[];
        }) => {
          this.availableRoles.set(
            [...roles].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '', 'tr'))
          );
          this.permissions.set(
            [...permissions].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '', 'tr'))
          );
        },
        error: (error: HttpErrorResponse) => {
          this.availableRoles.set([]);
          this.permissions.set([]);
          this.dependencyError.set(this.resolveErrorMessage(error, this.getDependencyErrorMessage()));
        }
      });
  }

  private createUser() {
    const request = this.buildUserRequest();
    const selectedRoleIds = this.userControls.roleIds.value.filter(Boolean);

    return this.kullaniciIslemleriService.registerUser(request).pipe(
      switchMap((response: IFurpaAuthResponseApiDto) => {
        if (selectedRoleIds.length === 0) {
          return of(response);
        }

        const assignRequest: IFurpaUserRoleAssignRequestApiDto = {
          roleIds: selectedRoleIds
        };

        return this.kullaniciIslemleriService.assignUserRoles(
          response.user.id,
          assignRequest
        );
      })
    );
  }

  private buildUserRequest(): IFurpaRegisterRequestApiDto {
    const rawValue = this.userForm.getRawValue();

    return {
      username: rawValue.username.trim(),
      email: rawValue.email.trim(),
      password: rawValue.password,
      firstName: rawValue.firstName.trim(),
      lastName: rawValue.lastName.trim(),
      warehouseNo: rawValue.warehouseNo.trim(),
      warehouseName: rawValue.warehouseName.trim()
    };
  }

  private buildRoleRequest(): IFurpaSaveRoleRequestApiDto {
    const rawValue = this.roleForm.getRawValue();

    return {
      name: rawValue.name.trim(),
      description: this.normalizeOptionalText(rawValue.description),
      isActive: rawValue.isActive
    };
  }

  private buildPermissionRequest(): IFurpaSavePermissionRequestApiDto {
    const rawValue = this.permissionForm.getRawValue();

    return {
      code: rawValue.code.trim(),
      name: rawValue.name.trim(),
      description: this.normalizeOptionalText(rawValue.description)
    };
  }

  private resetActiveForm(): void {
    switch (this.mode) {
      case 'roles':
        this.roleForm.reset({
          name: '',
          description: '',
          isActive: true
        });
        break;
      case 'permissions':
        this.permissionForm.reset({
          code: '',
          name: '',
          description: ''
        });
        break;
      default:
        this.userForm.reset({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          warehouseNo: '',
          warehouseName: '',
          roleIds: []
        });
        break;
    }
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

  private resolvePageHeading(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol Olustur';
      case 'permissions':
        return 'Yetki Olustur';
      default:
        return 'Kullanici Olustur';
    }
  }

  private getSuccessMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol basariyla olusturuldu.';
      case 'permissions':
        return 'Yetki basariyla olusturuldu.';
      default:
        return 'Kullanici basariyla olusturuldu.';
    }
  }

  private getSubmitErrorMessage(): string {
    switch (this.mode) {
      case 'roles':
        return 'Rol olusturulurken beklenmeyen bir hata olustu.';
      case 'permissions':
        return 'Yetki olusturulurken beklenmeyen bir hata olustu.';
      default:
        return 'Kullanici olusturulurken beklenmeyen bir hata olustu.';
    }
  }

  private getDependencyErrorMessage(): string {
    switch (this.mode) {
      case 'permissions':
        return 'Yetki listesi yuklenemedi.';
      case 'users':
        return 'Rol listesi yuklenemedi.';
      default:
        return 'Gerekli destek verileri yuklenemedi.';
    }
  }

  private normalizeOptionalText(value: string): string | null {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
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
