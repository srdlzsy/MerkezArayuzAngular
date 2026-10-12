export const ADMIN_LAYOUT_OVERLAY_MAX_WIDTH = 1100;

export function isAdminDesktopLayout(viewportWidth: number): boolean {
  return viewportWidth > ADMIN_LAYOUT_OVERLAY_MAX_WIDTH;
}

export function resolveSidebarCollapsed(
  viewportWidth: number,
  currentValue: boolean
): boolean {
  return isAdminDesktopLayout(viewportWidth) ? currentValue : false;
}

export function createExclusiveOpenSections(
  sectionIds: readonly string[],
  openSectionId: string | null
): Record<string, boolean> {
  return Object.fromEntries(sectionIds.map((id) => [id, id === openSectionId]));
}
