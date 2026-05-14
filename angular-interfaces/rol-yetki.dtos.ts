import type {
  AssignPermissionsBody,
  AssignRolesBody,
  AuthResponse,
  LoginUserRequest,
  PermissionActionDto,
  PermissionDto,
  PermissionMenuDto,
  PermissionModuleDto,
  RegisterUserRequest,
  RoleDto,
  SavePermissionBody,
  SaveRoleBody,
  UpdateUserBody,
  UserDto
} from './auth.dtos';

// Detail screen edits a nested responsibility tree in the UI and saves it by
// flattening selected ids into this request model.
export interface RoleSorumlulukGorevYetkilerAtaDto {
  roleId: string;
  sorumlulukIds?: number[] | null;
  gorevIds?: number[] | null;
  yetkiIds?: number[] | null;
}

export interface YetkiResponseModel {
  id?: number;
  isim: string | null;
  sebike: string | null;
}

export interface GorevResponseModel {
  id?: number;
  isim: string | null;
  sebike: string | null;
  yetkiler: YetkiResponseModel[];
}

export interface SorumlulukGorevVeYetkiResponseModel {
  id?: number;
  isim: string | null;
  sebike: string | null;
  gorevler: GorevResponseModel[];
}

export interface RolBilgiResponseModel {
  id: string;
  rol: string | null;
}

export interface RolYetkiResponseModel {
  id: number;
  isim: string | null;
  sebike: string | null;
}

export interface RolGorevResponseModel {
  id: number;
  isim: string | null;
  sebike: string | null;
  yetkiler: RolYetkiResponseModel[];
}

export interface RolSorumlulukResponseModel {
  id: number;
  isim: string | null;
  sebike: string | null;
  gorevler: RolGorevResponseModel[];
}

export interface KullaniciRolleriResponseModel {
  rol: RolBilgiResponseModel;
  rolSorumluluklari: RolSorumlulukResponseModel[];
}

export type IFurpaPermissionCatalogActionApiDto = PermissionActionDto;
export type IFurpaPermissionCatalogMenuApiDto = PermissionMenuDto;
export type IFurpaPermissionCatalogModuleApiDto = PermissionModuleDto;
export type IFurpaPermissionListItemApiDto = PermissionDto;
export type IFurpaRoleApiDto = RoleDto;
export type IFurpaUserApiDto = UserDto;
export type IFurpaRegisterRequestApiDto = RegisterUserRequest;
export type IFurpaRolePermissionAssignRequestApiDto = AssignPermissionsBody;
export type IFurpaUserRoleAssignRequestApiDto = AssignRolesBody;
export type IFurpaLoginRequestApiDto = LoginUserRequest;
export type IFurpaSavePermissionRequestApiDto = SavePermissionBody;
export type IFurpaSaveRoleRequestApiDto = SaveRoleBody;
export type IFurpaUpdateUserRequestApiDto = UpdateUserBody;
export type IFurpaAuthResponseApiDto = AuthResponse;
export type IFurpaMeResponseApiDto = UserDto;
