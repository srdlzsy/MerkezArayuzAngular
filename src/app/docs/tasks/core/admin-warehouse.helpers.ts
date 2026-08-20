import type { CurrentUser } from '../../../core/auth/models/auth.models';

const API_SEGMENT = 'api';
const ALL_WAREHOUSES_SUFFIX = 'all-warehouses';
const ALL_WAREHOUSES_PERMISSION_OVERRIDES: Record<string, string> = {
  'giden-depo-iadeleri': 'iade-islemleri.giden-depo-iadeleri.all-warehouses',
  'gelen-depo-iadeleri': 'iade-islemleri.gelen-depo-iadeleri.all-warehouses',
  'giden-depolar-arasi-sevkler': 'sevk-islemleri.giden-depolar-arasi-sevkler.all-warehouses',
  'gelen-depolar-arasi-sevkler': 'sevk-islemleri.gelen-depolar-arasi-sevkler.all-warehouses',
  'giden-firma-sevkleri': 'sevk-islemleri.giden-firma-sevkleri.all-warehouses',
  'gelen-firma-sevkleri': 'sevk-islemleri.gelen-firma-sevkleri.all-warehouses',
  'icmal-kaydi-girisi': 'kasa-islemleri.icmal-kaydi-girisi.all-warehouses',
  'authorization-files': 'operasyon-islemleri.operations.all-warehouses'
};

export function normalizePermissionCode(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
}

export function currentUserHasPermission(
  user: CurrentUser | null | undefined,
  permissionCode: string | null | undefined
): boolean {
  const normalizedPermissionCode = normalizePermissionCode(permissionCode);

  if (!normalizedPermissionCode || !user) {
    return false;
  }

  return getCurrentUserPermissionCodes(user).some(
    (code) => normalizePermissionCode(code) === normalizedPermissionCode
  );
}

export function currentUserCanUseAllWarehouses(
  user: CurrentUser | null | undefined,
  permissionCode: string | null | undefined
): boolean {
  return currentUserHasPermission(user, permissionCode);
}

export function buildAllWarehousesPermissionCode(
  pageId: string | null | undefined,
  baseRouteOrFile: string | null | undefined
): string | null {
  const override = pageId?.trim() ? ALL_WAREHOUSES_PERMISSION_OVERRIDES[pageId.trim()] : undefined;

  if (override) {
    return override;
  }

  const normalizedRoute = baseRouteOrFile?.split('|')[0]?.trim();

  if (!normalizedRoute?.startsWith('/api/')) {
    return null;
  }

  const segments = normalizedRoute.split('/').filter(Boolean);
  const apiIndex = segments.findIndex((segment) => segment.toLocaleLowerCase('tr-TR') === API_SEGMENT);
  const moduleCode = segments[apiIndex + 1];
  const menuCode = segments[apiIndex + 2];

  if (!moduleCode || !menuCode) {
    return null;
  }

  return `${moduleCode}.${menuCode}.${ALL_WAREHOUSES_SUFFIX}`;
}

export function toPositiveWarehouseNo(
  value: string | number | null | undefined
): number | null {
  const normalizedValue = typeof value === 'string' ? value.trim() : value;

  if (normalizedValue === '' || normalizedValue === null || normalizedValue === undefined) {
    return null;
  }

  const warehouseNo = Number(normalizedValue);
  return Number.isFinite(warehouseNo) && warehouseNo > 0 ? Math.trunc(warehouseNo) : null;
}

export function getCurrentWarehouseNo(user: CurrentUser | null | undefined): number | null {
  return toPositiveWarehouseNo(user?.depoNo);
}

export function formatCurrentWarehouseLabel(user: CurrentUser | null | undefined): string {
  if (!user) {
    return 'Kullanici deposu okunamadi';
  }

  if (user.depoIsmi?.trim() && user.depoNo !== null && user.depoNo !== undefined) {
    return `${user.depoIsmi.trim()} (${user.depoNo})`;
  }

  if (user.depoIsmi?.trim()) {
    return user.depoIsmi.trim();
  }

  return user.depoNo !== null && user.depoNo !== undefined
    ? `Depo ${user.depoNo}`
    : 'Kullanici deposu okunamadi';
}

function getCurrentUserPermissionCodes(user: CurrentUser): string[] {
  const permissions = new Set<string>();

  for (const permission of user.permissions ?? []) {
    addPermissionCode(permissions, permission);
  }

  for (const responsibility of user.sorumluluklar ?? []) {
    for (const task of responsibility.gorevler ?? []) {
      addPermissionCode(permissions, task.sebike);

      for (const permission of task.yetkiler ?? []) {
        addPermissionCode(permissions, permission.sebike);
      }
    }
  }

  return Array.from(permissions);
}

function addPermissionCode(permissions: Set<string>, value: string | null | undefined): void {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    permissions.add(normalizedValue);
  }
}
