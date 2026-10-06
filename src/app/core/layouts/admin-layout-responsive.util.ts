export const ADMIN_LAYOUT_OVERLAY_MAX_WIDTH = 1100;
export const ADMIN_LAYOUT_COLLAPSE_MAX_WIDTH = 1440;
export const ADMIN_LAYOUT_EXPAND_MIN_WIDTH = 1760;

export function isAdminDesktopLayout(viewportWidth: number): boolean {
  return viewportWidth > ADMIN_LAYOUT_OVERLAY_MAX_WIDTH;
}

export function resolveSidebarCollapsed(
  viewportWidth: number,
  currentValue: boolean
): boolean {
  if (viewportWidth <= ADMIN_LAYOUT_COLLAPSE_MAX_WIDTH) {
    return true;
  }

  if (viewportWidth >= ADMIN_LAYOUT_EXPAND_MIN_WIDTH) {
    return false;
  }

  return currentValue;
}

export function createExclusiveOpenSections(
  sectionIds: readonly string[],
  openSectionId: string | null
): Record<string, boolean> {
  return Object.fromEntries(sectionIds.map((id) => [id, id === openSectionId]));
}
