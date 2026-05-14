/**
 * Auth ve Authorization DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Auth Modelleri
// ============================================================================

export interface LoginUserRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  warehouseNo: string;
  warehouseName: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  warehouseNo: string;
  warehouseName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  modules: PermissionModuleDto[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

// ============================================================================
// Permission Modelleri
// ============================================================================

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  moduleCode: string;
  moduleName: string;
  menuCode: string;
  menuName: string;
  actionCode: string;
  actionName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SavePermissionBody {
  code: string;
  name: string;
  description?: string | null;
}

export interface PermissionModuleDto {
  code: string;
  name: string;
  menus: PermissionMenuDto[];
}

export interface PermissionMenuDto {
  code: string;
  name: string;
  actions: PermissionActionDto[];
}

export interface PermissionActionDto {
  code: string;
  name: string;
  permissionCode: string;
  description?: string | null;
}

// ============================================================================
// Role Modelleri
// ============================================================================

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: PermissionDto[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveRoleBody {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface AssignPermissionsBody {
  permissionIds: string[];
}

export interface AssignRolesBody {
  roleIds: string[];
}

// ============================================================================
// User Management Modelleri
// ============================================================================

export interface UpdateUserBody {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  warehouseNo: string;
  warehouseName: string;
  isActive: boolean;
}

// ============================================================================
// Common API Hata Modeli
// ============================================================================

export interface ProblemDetails {
  status: number;
  title: string;
  detail: string;
  instance: string;
}
