import {
  ADMIN_LAYOUT_COLLAPSE_MAX_WIDTH,
  ADMIN_LAYOUT_EXPAND_MIN_WIDTH,
  ADMIN_LAYOUT_OVERLAY_MAX_WIDTH,
  createExclusiveOpenSections,
  isAdminDesktopLayout,
  resolveSidebarCollapsed
} from './admin-layout-responsive.util';

describe('admin layout responsive helpers', () => {
  it('uses overlay navigation when effective viewport width is limited', () => {
    expect(isAdminDesktopLayout(ADMIN_LAYOUT_OVERLAY_MAX_WIDTH)).toBeFalse();
    expect(isAdminDesktopLayout(ADMIN_LAYOUT_OVERLAY_MAX_WIDTH + 1)).toBeTrue();
  });

  it('collapses the sidebar on common 1366px workstations', () => {
    expect(resolveSidebarCollapsed(1366, false)).toBeTrue();
    expect(resolveSidebarCollapsed(ADMIN_LAYOUT_COLLAPSE_MAX_WIDTH, false)).toBeTrue();
  });

  it('expands the sidebar on wide screens', () => {
    expect(resolveSidebarCollapsed(ADMIN_LAYOUT_EXPAND_MIN_WIDTH, true)).toBeFalse();
    expect(resolveSidebarCollapsed(1920, true)).toBeFalse();
  });

  it('keeps the user preference between automatic breakpoints', () => {
    expect(resolveSidebarCollapsed(1600, true)).toBeTrue();
    expect(resolveSidebarCollapsed(1600, false)).toBeFalse();
  });

  it('keeps only the selected top-level menu section open', () => {
    expect(createExclusiveOpenSections(['orders', 'returns', 'reports'], 'returns')).toEqual({
      orders: false,
      returns: true,
      reports: false
    });
    expect(createExclusiveOpenSections(['orders', 'returns'], null)).toEqual({
      orders: false,
      returns: false
    });
  });
});
