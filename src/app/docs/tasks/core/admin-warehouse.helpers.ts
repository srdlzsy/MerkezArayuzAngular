import type { CurrentUser } from '../../../core/auth/models/auth.models';

export function hasAdminWarehouseRole(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((role) => {
    const normalizedRole = role.trim().toLocaleLowerCase('tr-TR');
    return normalizedRole === 'admin' || normalizedRole === 'administrator';
  });
}

export function currentUserIsAdmin(user: CurrentUser | null | undefined): boolean {
  return hasAdminWarehouseRole(user?.roller);
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
    return 'JWT deposu okunamadi';
  }

  if (user.depoIsmi?.trim() && user.depoNo !== null && user.depoNo !== undefined) {
    return `${user.depoIsmi.trim()} (${user.depoNo})`;
  }

  if (user.depoIsmi?.trim()) {
    return user.depoIsmi.trim();
  }

  return user.depoNo !== null && user.depoNo !== undefined
    ? `Depo ${user.depoNo}`
    : 'JWT deposu okunamadi';
}
