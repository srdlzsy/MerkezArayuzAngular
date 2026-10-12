import {
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

  it('keeps the user preference at every desktop width', () => {
    expect(resolveSidebarCollapsed(1366, false)).toBeFalse();
    expect(resolveSidebarCollapsed(1366, true)).toBeTrue();
    expect(resolveSidebarCollapsed(1600, true)).toBeTrue();
    expect(resolveSidebarCollapsed(1600, false)).toBeFalse();
    expect(resolveSidebarCollapsed(1920, true)).toBeTrue();
  });

  it('does not carry rail mode into the mobile overlay layout', () => {
    expect(resolveSidebarCollapsed(ADMIN_LAYOUT_OVERLAY_MAX_WIDTH, true)).toBeFalse();
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
