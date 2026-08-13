import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize } from 'rxjs';
import type { AnnouncementDto, AnnouncementSummaryDto } from '@interfaces';

import { DOCS_PAGES } from '../../docs/config/docs-pages.config';
import { normalizeDocsAccessKey } from '../../docs/config/docs-menu.config';
import { DocsRegistryValidationService } from '../../docs/config/docs-registry-validation.service';
import { DocsMenuSection } from '../../docs/models/docs.models';
import { DocsNavigationService } from '../../docs/services/docs-navigation.service';
import { AuthService } from '../auth/services/auth.service';
import { OrtakIslemlerService } from '../api/module-services/ortak-islemler.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  @ViewChild('contentWrapper') private contentWrapper?: ElementRef<HTMLElement>;

  private readonly sidebarZoomInCollapseWidth = 1280;
  private readonly sidebarZoomOutExpandWidth = 1760;
  private readonly sidebarCollapsedStorageKey = 'furpa.adminLayout.sidebarCollapsed';
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly ortakIslemlerService = inject(OrtakIslemlerService);
  private readonly docsNavigationService = inject(DocsNavigationService);
  private readonly docsRegistryValidationService = inject(DocsRegistryValidationService);

  protected readonly pageTitle = signal('Dokumantasyon');
  protected readonly isSidebarOpen = signal(false);
  protected readonly isSidebarCollapsed = signal(this.readSidebarCollapsedPreference());
  protected readonly isDesktopLayout = signal(this.readIsDesktopLayout());
  protected readonly isSidebarRailMode = computed(
    () => this.isDesktopLayout() && this.isSidebarCollapsed()
  );
  protected readonly activeRailGroupId = signal<string | null>(null);
  protected readonly railMenuTop = signal(12);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly menuGroups = this.docsNavigationService.menuGroups;
  protected readonly branchLabel = computed(() => {
    const user = this.currentUser();

    if (!user) {
      return 'Depo secilmedi';
    }

    if (user.depoIsmi && user.depoNo !== null) {
      return `${user.depoIsmi} ${user.depoNo}`;
    }

    return user.depoIsmi || (user.depoNo !== null ? `Depo ${user.depoNo}` : 'Depo secilmedi');
  });
  protected readonly openSections = signal<Record<string, boolean>>({});
  protected readonly activeTaskId = signal<string | null>(null);
  protected readonly announcementSummary = signal<AnnouncementSummaryDto | null>(null);
  protected readonly announcementItems = signal<AnnouncementDto[]>([]);
  protected readonly announcementInboxOpen = signal(false);
  protected readonly announcementsLoading = signal(false);
  protected readonly announcementsMessage = signal<string | null>(null);
  protected readonly unreadAnnouncementCount = computed(() => this.announcementSummary()?.unreadCount ?? 0);
  protected readonly canOpenAnnouncementManagement = computed(() => this.authService.hasTaskAccess('duyurular'));

  constructor() {
    effect(() => {
      const user = this.currentUser();

      if (!user?.sorumluluklar?.length) {
        return;
      }

      this.docsRegistryValidationService.reportAssignedTaskCoverage(user.sorumluluklar);
      this.loadAnnouncementSummary();

      if (
        !environment.production &&
        ['kullanicilar', 'roller', 'yetkiler'].some((taskId) => this.authService.hasTaskAccess(taskId))
      ) {
        this.docsRegistryValidationService.validateRegistry().subscribe();
      }
    });

    this.updatePageTitle();
    this.syncActiveTaskId();
    this.expandActiveMenuPath();
    this.syncSidebarWithViewportWidth();

    this.router.events.pipe(filter((event: unknown) => event instanceof NavigationEnd)).subscribe(() => {
      this.updatePageTitle();
      this.syncActiveTaskId();
      this.expandActiveMenuPath();
      this.scheduleContentScrollToTop();
      this.closeSidebar();
      this.closeRailMenu();
      this.closeAnnouncementInbox();
    });
  }

  protected toggleAnnouncementInbox(): void {
    const nextOpen = !this.announcementInboxOpen();
    this.announcementInboxOpen.set(nextOpen);

    if (nextOpen) {
      this.loadAnnouncementInbox();
    }
  }

  protected closeAnnouncementInbox(): void {
    this.announcementInboxOpen.set(false);
  }

  protected loadAnnouncementSummary(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.ortakIslemlerService
      .getAnnouncementSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary: AnnouncementSummaryDto) => this.announcementSummary.set(summary),
        error: () => this.announcementSummary.set(null)
      });
  }

  protected loadAnnouncementInbox(): void {
    this.announcementsLoading.set(true);
    this.announcementsMessage.set(null);

    this.ortakIslemlerService
      .getAnnouncementsInbox({ includeRead: false, take: 20 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.announcementsLoading.set(false))
      )
      .subscribe({
        next: (items: AnnouncementDto[]) => {
          this.announcementItems.set((items ?? []).map((item) => ({ ...item, targets: item.targets ?? [] })));
          this.announcementsMessage.set(items?.length ? null : 'Okunmamis aktif duyuru yok.');
        },
        error: () => {
          this.announcementItems.set([]);
          this.announcementsMessage.set('Duyurular su an alinamadi.');
        }
      });
  }

  protected markAnnouncementAsRead(item: AnnouncementDto, event?: MouseEvent): void {
    event?.stopPropagation();

    this.ortakIslemlerService
      .markAnnouncementAsRead(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.announcementItems.update((items) => items.filter((current) => current.id !== item.id));
          this.loadAnnouncementSummary();
        }
      });
  }

  protected openAnnouncementManagement(): void {
    this.closeAnnouncementInbox();
    void this.router.navigate(['/docs/api/duyurular']);
  }

  protected formatAnnouncementCount(count: number): string {
    return count > 99 ? '99+' : `${count}`;
  }

  protected getAnnouncementPriorityClass(priority: string | null | undefined): string {
    switch (priority) {
      case 'Urgent':
        return 'announcement-urgent';
      case 'Important':
        return 'announcement-important';
      default:
        return 'announcement-normal';
    }
  }

  protected formatAnnouncementDate(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected readonly trackAnnouncement = (_index: number, item: AnnouncementDto): string => item.id;

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  protected toggleSidebarCollapsed(): void {
    const nextValue = !this.isSidebarCollapsed();

    this.setSidebarCollapsed(nextValue);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected handleLeafNavigate(): void {
    this.closeSidebar();
    this.closeRailMenu();
    this.scheduleContentScrollToTop();
  }

  protected closeRailMenu(): void {
    this.activeRailGroupId.set(null);
  }

  protected isSectionOpen(id: string): boolean {
    const state = this.openSections();

    if (id in state) {
      return !!state[id];
    }

    return this.menuGroups()[0]?.id === id;
  }

  protected toggleSection(id: string, event?: MouseEvent): void {
    if (this.isSidebarRailMode()) {
      this.setRailMenuTopFromEvent(event);
      this.activeRailGroupId.update((activeId) => (activeId === id ? null : id));
      return;
    }

    const nextValue = !this.isSectionOpen(id);

    this.openSections.update((state) => ({
      ...state,
      [id]: nextValue
    }));
  }

  protected isGroupActive(group: DocsMenuSection): boolean {
    const activeTaskId = this.activeTaskId();

    return !!activeTaskId && group.children.some((item) => item.id === activeTaskId);
  }

  protected isRailGroupOpen(id: string): boolean {
    return this.activeRailGroupId() === id;
  }

  protected getRailMenuTopPx(): string {
    return `${this.railMenuTop()}px`;
  }

  protected getGroupIcon(group: DocsMenuSection, index = 0): string {
    const groupKey = normalizeDocsAccessKey(group.label || group.id);

    switch (groupKey) {
      case 'kasa-islemleri':
        return 'fas fa-cash-register';
      case 'mal-kabul-islemleri':
        return 'fas fa-dolly';
      case 'siparis-islemleri':
        return 'fas fa-cart-shopping';
      case 'iade-islemleri':
        return 'fas fa-rotate-left';
      case 'stok-sayim-islemleri':
      case 'sayim-islemleri':
        return 'fas fa-clipboard-check';
      case 'stok-giris-islemleri':
        return 'fas fa-box-open';
      case 'stok-cikis-islemleri':
        return 'fas fa-box';
      case 'stok-islemleri':
        return 'fas fa-boxes-stacked';
      case 'stok-virman-islemleri':
        return 'fas fa-right-left';
      case 'kullanici-islemleri':
        return 'fas fa-user-gear';
      case 'sevk-islemleri':
        return 'fas fa-truck';
      case 'operasyon-islemleri':
        return 'fas fa-screwdriver-wrench';
      case 'entegrasyon-islemleri':
        return 'fas fa-network-wired';
      case 'fatura-islemleri':
        return 'fas fa-file-invoice';
      case 'rapor-islemleri':
        return 'fas fa-chart-line';
      case 'arama-islemleri':
        return 'fas fa-magnifying-glass';
      case 'ayar-islemleri':
        return 'fas fa-sliders';
      case 'ortak-islemler':
        return 'fas fa-comments';
      case 'duzeltme-islemleri':
        return 'fas fa-pen-to-square';
      case 'green-grocer':
        return 'fas fa-seedling';
      default:
        return this.getFallbackGroupIcon(index);
    }
  }

  @HostListener('window:resize')
  protected handleWindowResize(): void {
    const width = window.innerWidth;
    const isDesktop = width >= 961;

    this.isDesktopLayout.set(isDesktop);

    if (isDesktop) {
      this.closeSidebar();
      this.syncSidebarWithViewportWidth(width);
    } else {
      this.closeRailMenu();
    }
  }

  private syncSidebarWithViewportWidth(width = this.readViewportWidth()): void {
    if (width < 961) {
      return;
    }

    if (width <= this.sidebarZoomInCollapseWidth) {
      this.setSidebarCollapsed(true);
      return;
    }

    if (width >= this.sidebarZoomOutExpandWidth) {
      this.setSidebarCollapsed(false);
    }
  }

  private setSidebarCollapsed(isCollapsed: boolean): void {
    if (this.isSidebarCollapsed() === isCollapsed) {
      return;
    }

    this.isSidebarCollapsed.set(isCollapsed);
    this.writeSidebarCollapsedPreference(isCollapsed);
    this.closeRailMenu();
  }

  private readViewportWidth(): number {
    if (typeof window === 'undefined') {
      return this.sidebarZoomOutExpandWidth;
    }

    return window.innerWidth;
  }

  private setRailMenuTopFromEvent(event?: MouseEvent): void {
    if (typeof window === 'undefined' || !event?.currentTarget) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = 260;
    const viewportPadding = 12;
    const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedMenuHeight - viewportPadding);

    this.railMenuTop.set(Math.min(Math.max(rect.top, viewportPadding), maxTop));
  }

  private readIsDesktopLayout(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 961;
  }

  private readSidebarCollapsedPreference(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(this.sidebarCollapsedStorageKey) === 'true';
    } catch {
      return false;
    }
  }

  private writeSidebarCollapsedPreference(isCollapsed: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(this.sidebarCollapsedStorageKey, `${isCollapsed}`);
    } catch {
      // Layout preference is optional; ignore storage failures.
    }
  }

  private scheduleContentScrollToTop(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      this.contentWrapper?.nativeElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }

  private updatePageTitle(): void {
    const route = this.getDeepestActiveRoute();

    const explicitTitle = route?.snapshot?.data?.['title'] as string | undefined;
    const taskId = route?.snapshot?.data?.['taskId'] as string | undefined;
    const taskTitle = taskId ? DOCS_PAGES[taskId]?.title : undefined;

    this.pageTitle.set(explicitTitle || taskTitle || 'Dokumantasyon');
  }

  private expandActiveMenuPath(): void {
    const activeTaskId = this.activeTaskId();

    if (!activeTaskId) {
      return;
    }

    for (const group of this.menuGroups()) {
      if (!group.children.some((item) => item.id === activeTaskId)) {
        continue;
      }

      this.openSections.update((state) => ({ ...state, [group.id]: true }));
      return;
    }
  }

  private syncActiveTaskId(): void {
    const route = this.getDeepestActiveRoute();
    const taskId = (route?.snapshot?.data?.['taskId'] as string | undefined) ?? null;
    this.activeTaskId.set(taskId);
  }

  private getFallbackGroupIcon(index: number): string {
    const fallbackIcons = [
      'fas fa-layer-group',
      'fas fa-folder-tree',
      'fas fa-table-cells-large',
      'fas fa-diagram-project',
      'fas fa-list-check',
      'fas fa-compass',
      'fas fa-cubes',
      'fas fa-briefcase',
      'fas fa-warehouse',
      'fas fa-gauge-high',
      'fas fa-file-lines',
      'fas fa-building'
    ];

    return fallbackIcons[index % fallbackIcons.length];
  }

  private getDeepestActiveRoute(): ActivatedRoute | null {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route;
  }
}
