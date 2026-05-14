import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { KullaniciEkleDto } from '@interfaces/KullaniciEkleDto';
import {
  IFurpaAuthResponseApiDto,
  IFurpaPermissionCatalogActionApiDto,
  IFurpaPermissionCatalogMenuApiDto,
  IFurpaPermissionCatalogModuleApiDto,
  IFurpaPermissionListItemApiDto,
  IFurpaRegisterRequestApiDto,
  IFurpaRoleApiDto,
  IFurpaRolePermissionAssignRequestApiDto,
  IFurpaSavePermissionRequestApiDto,
  IFurpaSaveRoleRequestApiDto,
  IFurpaUpdateUserRequestApiDto,
  IFurpaUserApiDto,
  IFurpaUserRoleAssignRequestApiDto,
  UserDto,
  RoleDto,
  PermissionModuleDto,
  RoleSorumlulukGorevYetkilerAtaDto,
  SorumlulukGorevVeYetkiResponseModel,
  RolBilgiResponseModel,
  KullaniciRolleriResponseModel
} from '@interfaces';

import { buildProblemError, toStringValue } from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class KullaniciIslemleriService extends BaseApiService {

  private guidToNumericPermissionId = new Map<string, number>();
  private numericPermissionIdToGuid = new Map<number, string>();
  private nextSyntheticPermissionId = 1;


  listPermissionCatalog(): Observable<IFurpaPermissionCatalogModuleApiDto[]> {
    return this.get<IFurpaPermissionCatalogModuleApiDto[]>('permissions/catalog');
  }

  listPermissions(): Observable<IFurpaPermissionListItemApiDto[]> {
    return this.get<IFurpaPermissionListItemApiDto[]>('permissions');
  }

  createPermission(
    request: IFurpaSavePermissionRequestApiDto
  ): Observable<IFurpaPermissionListItemApiDto> {
    return this.post<IFurpaPermissionListItemApiDto, IFurpaSavePermissionRequestApiDto>(
      'permissions',
      request
    );
  }

  updatePermission(
    id: string,
    request: IFurpaSavePermissionRequestApiDto
  ): Observable<IFurpaPermissionListItemApiDto> {
    return this.put<IFurpaPermissionListItemApiDto, IFurpaSavePermissionRequestApiDto>(
      `permissions/${encodeURIComponent(id)}`,
      request
    );
  }

  createRole(request: IFurpaSaveRoleRequestApiDto): Observable<IFurpaRoleApiDto> {
    return this.post<IFurpaRoleApiDto, IFurpaSaveRoleRequestApiDto>('roles', request);
  }

  updateRole(id: string, request: IFurpaSaveRoleRequestApiDto): Observable<IFurpaRoleApiDto> {
    return this.put<IFurpaRoleApiDto, IFurpaSaveRoleRequestApiDto>(`roles/${encodeURIComponent(id)}`, request);
  }

  ekle<TResponse = unknown>(request: KullaniciEkleDto): Observable<TResponse> {
    const registerRequest: IFurpaRegisterRequestApiDto = {
      username: request.userName.trim(),
      email: request.email?.trim() || '',
      password: request.password,
      firstName: request.ad?.trim() || '',
      lastName: request.soyad?.trim() || '',
      warehouseNo: request.mikroDepoNo ? String(request.mikroDepoNo) : '',
      warehouseName: request.mikroDepoIsmi?.trim() || ''
    };

    return this.post<TResponse, typeof registerRequest>('auth/register', registerRequest).pipe(
      switchMap((response: TResponse) => {
        const selectedRoles = request.kullaniciRolleri?.map((role) => role.trim()).filter(Boolean) ?? [];

        if (!selectedRoles.length) {
          return of(response);
        }

        return this.listRoles().pipe(
          switchMap((roles: IFurpaRoleApiDto[]) =>
            this.listUsers().pipe(
              switchMap((users: IFurpaUserApiDto[]) => {
            const createdUser = users.find(
              (user: IFurpaUserApiDto) =>
                user.username?.trim().toLocaleLowerCase('tr-TR') === request.userName.trim().toLocaleLowerCase('tr-TR') ||
                (!!request.email &&
                  user.email?.trim().toLocaleLowerCase('tr-TR') === request.email.trim().toLocaleLowerCase('tr-TR'))
            );

            if (!createdUser) {
              return of(response);
            }

            const roleIds = roles
              .filter((role: IFurpaRoleApiDto) => selectedRoles.includes(role.name?.trim() ?? ''))
              .map((role: IFurpaRoleApiDto) => role.id);

            if (!roleIds.length) {
              return of(response);
            }

            const assignRequest: IFurpaUserRoleAssignRequestApiDto = {
              roleIds
            };

            return this.post<unknown, IFurpaUserRoleAssignRequestApiDto>(
              `users/${createdUser.id}/roles`,
              assignRequest
            ).pipe(map(() => response));
              })
            )
          )
        );
      })
    );
  }

  registerUser<TResponse = unknown>(request: KullaniciEkleDto | IFurpaRegisterRequestApiDto): Observable<TResponse> {
    if ('userName' in request) {
      return this.ekle<TResponse>(request);
    }

    return this.post<TResponse, IFurpaRegisterRequestApiDto>('auth/register', request);
  }

  getTumRolleri(): Observable<RolBilgiResponseModel[]> {
    return this.listRoles().pipe(
      map((roles: IFurpaRoleApiDto[]) =>
        roles.map((role: IFurpaRoleApiDto) => ({
          id: role.id,
          rol: role.name
        }))
      )
    );
  }

  getSorumlulukGorevVeYetkiler(): Observable<SorumlulukGorevVeYetkiResponseModel[]> {
    return this.listPermissionCatalog().pipe(
      switchMap((catalog: IFurpaPermissionCatalogModuleApiDto[]) =>
        this.listPermissions().pipe(
          map((permissions: IFurpaPermissionListItemApiDto[]) => this.mapPermissionTree(catalog, permissions))
        )
      )
    );
  }

  getKullaniciRolleri(id: string): Observable<KullaniciRolleriResponseModel[]> {
    return this.listRoles().pipe(
      switchMap((roles: IFurpaRoleApiDto[]) =>
        this.listPermissionCatalog().pipe(
          switchMap((catalog: IFurpaPermissionCatalogModuleApiDto[]) =>
            this.listPermissions().pipe(
              map((permissions: IFurpaPermissionListItemApiDto[]) => {
        const role = roles.find((item: IFurpaRoleApiDto) => item.id === id);

        if (!role) {
          return [];
        }

        const selectedPermissionCodes = this.extractRolePermissionCodes(role.permissions ?? []);
        const tree = this.mapSelectedRoleTree(catalog, permissions, selectedPermissionCodes);

        return [
          {
            rol: {
              id: role.id,
              rol: role.name
            },
            rolSorumluluklari: tree
          }
        ];
              })
            )
          )
        )
      )
    );
  }

  ataRoleSorumlulukGorevVeYetkiler(request: RoleSorumlulukGorevYetkilerAtaDto): Observable<unknown> {
    const permissionIds = (request.yetkiIds ?? [])
      .map((id: number) => this.numericPermissionIdToGuid.get(id))
      .filter((id): id is string => !!id);

    const assignRequest: IFurpaRolePermissionAssignRequestApiDto = {
      permissionIds
    };

    return this.assignRolePermissions(request.roleId, assignRequest);
  }

  private mapPermissionTree(
    catalog: IFurpaPermissionCatalogModuleApiDto[],
    permissions: IFurpaPermissionListItemApiDto[]
  ): SorumlulukGorevVeYetkiResponseModel[] {
    return (catalog ?? []).map((module: IFurpaPermissionCatalogModuleApiDto) => ({
      isim: module.name,
      sebike: module.code,
      gorevler: (module.menus ?? []).map((menu: IFurpaPermissionCatalogMenuApiDto) => ({
        isim: menu.name,
        sebike: menu.code,
        yetkiler: (menu.actions ?? []).map((action: IFurpaPermissionCatalogActionApiDto) => {
          const permission = permissions.find(
            (item: IFurpaPermissionListItemApiDto) => item.code === action.permissionCode
          );
          const numericId = permission?.id ? this.getOrCreateSyntheticPermissionId(permission.id) : undefined;

          return {
            id: numericId,
            isim: action.name || permission?.name || action.code,
            sebike: action.permissionCode
          };
        })
      }))
    }));
  }

  private mapSelectedRoleTree(
    catalog: IFurpaPermissionCatalogModuleApiDto[],
    permissions: IFurpaPermissionListItemApiDto[],
    selectedPermissionCodes: string[]
  ): SorumlulukGorevVeYetkiResponseModel[] {
    return (catalog ?? [])
      .map((module: IFurpaPermissionCatalogModuleApiDto) => ({
        isim: module.name,
        sebike: module.code,
        gorevler: (module.menus ?? [])
          .map((menu: IFurpaPermissionCatalogMenuApiDto) => ({
            isim: menu.name,
            sebike: menu.code,
            yetkiler: (menu.actions ?? [])
              .filter((action: IFurpaPermissionCatalogActionApiDto) =>
                selectedPermissionCodes.includes(action.permissionCode)
              )
              .map((action: IFurpaPermissionCatalogActionApiDto) => {
                const permission = permissions.find(
                  (item: IFurpaPermissionListItemApiDto) => item.code === action.permissionCode
                );

                return {
                  id: permission?.id ? this.getOrCreateSyntheticPermissionId(permission.id) : undefined,
                  isim: action.name || permission?.name || action.code,
                  sebike: action.permissionCode
                };
              })
          }))
          .filter((menu) => menu.yetkiler.length > 0)
      }))
      .filter((module) => module.gorevler.length > 0);
  }

  private extractRolePermissionCodes(permissions: unknown[]): string[] {
    return permissions
      .map((item: unknown) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return '';
        }

        const record = item as Record<string, unknown>;
        return (
          toStringValue(record['code']) ||
          toStringValue(record['permissionCode']) ||
          toStringValue(record['name'])
        );
      })
      .filter(Boolean);
  }

  private getOrCreateSyntheticPermissionId(guid: string): number {
    const existingId = this.guidToNumericPermissionId.get(guid);

    if (existingId) {
      return existingId;
    }

    const nextId = this.nextSyntheticPermissionId++;
    this.guidToNumericPermissionId.set(guid, nextId);
    this.numericPermissionIdToGuid.set(nextId, guid);
    return nextId;
  }

  // ========================================
  // Yeni API v1.0 metodları (FurpaMerkezApi)
  // ========================================

  /**
   * Kullanıcıları Listele
   */
  listUsers(): Observable<UserDto[]> {
    return this.get<UserDto[]>('users');
  }

  /**
   * Belirli Kullanıcıyı Al
   * @param userId Kullanıcı ID
   */
  getUser(userId: string): Observable<UserDto> {
    return this.get<UserDto>(`users/${encodeURIComponent(userId)}`);
  }

  /**
   * Rolleri Listele
   */
  listRoles(): Observable<RoleDto[]> {
    return this.get<RoleDto[]>('roles');
  }

  /**
   * Belirli Rolü Al
   * @param roleId Rol ID
   */
  getRole(roleId: string): Observable<RoleDto> {
    return this.listRoles().pipe(
      switchMap((roles: RoleDto[]) => {
        const role = roles.find((item: RoleDto) => item.id === roleId);

        return role
          ? of(role)
          : throwError(() =>
              buildProblemError(`Rol bulunamadi: ${roleId}`, 404)
            );
      })
    );
  }

  /**
   * İzin Modüllerini Listele
   */
  listPermissionModules(): Observable<PermissionModuleDto[]> {
    return this.listPermissionCatalog();
  }

  /**
   * Kullanıcının izin olup olmadığını kontrol et
   * @param userId Kullanıcı ID
   * @param permissionCode İzin kodu
   */
  hasPermission(userId: string, permissionCode: string): Observable<boolean> {
    const normalizedPermissionCode = permissionCode.trim().toLocaleLowerCase('tr-TR');

    return this.getUser(userId).pipe(
      map((user: UserDto) => {
        const directPermissions = (user.permissions ?? []).some(
          (code: string) => code?.trim().toLocaleLowerCase('tr-TR') === normalizedPermissionCode
        );

        if (directPermissions) {
          return true;
        }

        return (user.modules ?? []).some((module: PermissionModuleDto) =>
          (module.menus ?? []).some((menu) =>
            (menu.actions ?? []).some(
              (action) =>
                action.permissionCode?.trim().toLocaleLowerCase('tr-TR') === normalizedPermissionCode
            )
          )
        );
      })
    );
  }

  /**
   * Kullanıcıya Rol Ata (v1.0)
   * @param userId Kullanıcı ID
   * @param roleIds Rol ID'leri
   */
  assignRolesToUser(userId: string, roleIds: string[]): Observable<any> {
    return this.post(
      `users/${encodeURIComponent(userId)}/roles`,
      { roleIds }
    );
  }

  assignUserRoles(userId: string, roleIds: string[] | IFurpaUserRoleAssignRequestApiDto): Observable<any> {
    const nextRoleIds = Array.isArray(roleIds) ? roleIds : roleIds.roleIds;
    return this.assignRolesToUser(userId, nextRoleIds);
  }

  /**
   * Kullanıcıdan Rol Çıkart (v1.0)
   * @param userId Kullanıcı ID
   * @param roleId Rol ID
   */
  removeRoleFromUser(userId: string, roleId: string): Observable<any> {
    return this.getUser(userId).pipe(
      switchMap((user: UserDto) =>
        this.listRoles().pipe(
          switchMap((roles: RoleDto[]) => {
            const assignedRoleNames = new Set(
              (user.roles ?? []).map((name: string) => name.trim().toLocaleLowerCase('tr-TR'))
            );
            const nextRoleIds = roles
              .filter((role: RoleDto) =>
                assignedRoleNames.has((role.name ?? '').trim().toLocaleLowerCase('tr-TR'))
              )
              .map((role: RoleDto) => role.id)
              .filter((currentRoleId: string) => currentRoleId !== roleId);

            return this.assignRolesToUser(userId, nextRoleIds);
          })
        )
      )
    );
  }

  updateUser(id: string, request: IFurpaUpdateUserRequestApiDto): Observable<IFurpaUserApiDto> {
    return this.put<IFurpaUserApiDto, IFurpaUpdateUserRequestApiDto>(`users/${encodeURIComponent(id)}`, request);
  }

  getBenim<TResponse = unknown>(): Observable<TResponse> {
    return this.get<TResponse>('auth/me');
  }

  /**
   * Rol'e izin ata
   */
  assignRolePermissions(roleId: string, request: IFurpaRolePermissionAssignRequestApiDto): Observable<any> {
    return this.post(`roles/${encodeURIComponent(roleId)}/permissions`, request);
  }
}

