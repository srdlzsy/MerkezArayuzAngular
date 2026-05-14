import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { DOCS_PAGES } from '../../docs/config/docs-pages.config';
import { normalizeDocsAccessKey } from '../../docs/config/docs-menu.config';
import { DocsRegistryValidationService } from '../../docs/config/docs-registry-validation.service';
import { DocsMenuSection } from '../../docs/models/docs.models';
import { DocsNavigationService } from '../../docs/services/docs-navigation.service';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly docsNavigationService = inject(DocsNavigationService);
  private readonly docsRegistryValidationService = inject(DocsRegistryValidationService);

  protected readonly pageTitle = signal('Dokumantasyon');
  protected readonly isSidebarOpen = signal(false);
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

  constructor() {
    effect(() => {
      const user = this.currentUser();

      if (!user?.sorumluluklar?.length) {
        return;
      }

      this.docsRegistryValidationService.reportAssignedTaskCoverage(user.sorumluluklar);

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

    this.router.events.pipe(filter((event: unknown) => event instanceof NavigationEnd)).subscribe(() => {
      this.updatePageTitle();
      this.syncActiveTaskId();
      this.expandActiveMenuPath();
      this.closeSidebar();
    });
  }



  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected handleLeafNavigate(): void {
    this.closeSidebar();
  }

  protected isSectionOpen(id: string): boolean {
    const state = this.openSections();

    if (id in state) {
      return !!state[id];
    }

    return this.menuGroups()[0]?.id === id;
  }

  protected toggleSection(id: string): void {
    const nextValue = !this.isSectionOpen(id);

    this.openSections.update((state) => ({
      ...state,
      [id]: nextValue
    }));
  }

  protected getGroupIcon(group: DocsMenuSection): string {
    const groupKey = normalizeDocsAccessKey(group.label || group.id);

    switch (groupKey) {
      case 'kasa-islemleri':
        return 'fas fa-cog';
      case 'mal-kabul-islemleri':
        return 'fas fa-truck-loading';
      case 'siparis-islemleri':
        return 'fas fa-shopping-cart';
      case 'iade-islemleri':
        return 'fas fa-arrow-up';
      case 'stok-sayim-islemleri':
      case 'sayim-islemleri':
        return 'far fa-file-alt';
      case 'stok-giris-islemleri':
      case 'stok-cikis-islemleri':
        return 'fas fa-boxes';
      case 'stok-virman-islemleri':
        return 'fas fa-exchange-alt';
      case 'kullanici-islemleri':
        return 'fas fa-user';
      case 'sevk-islemleri':
        return 'fas fa-truck';
      case 'operasyon-islemleri':
        return 'fas fa-gears';
      case 'entegrasyon-islemleri':
        return 'fas fa-plug';
      default:
        return 'fas fa-circle';
    }
  }

  @HostListener('window:resize')
  protected handleWindowResize(): void {
    if (window.innerWidth >= 961) {
      this.closeSidebar();
    }
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

  private getDeepestActiveRoute(): ActivatedRoute | null {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route;
  }
}
