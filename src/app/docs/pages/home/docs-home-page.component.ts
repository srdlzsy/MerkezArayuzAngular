import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocsTaskItem } from '../../models/docs.models';
import { DocsNavigationService } from '../../services/docs-navigation.service';

@Component({
  selector: 'app-docs-home-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-home-page.component.html',
  styleUrl: './docs-home-page.component.scss'
})
export class DocsHomePageComponent {
  private readonly docsNavigationService = inject(DocsNavigationService);

  protected readonly navGroups = this.docsNavigationService.menuGroups;

  protected readonly apiCount = computed(() =>
    this.navGroups().reduce((total, group) => total + group.children.length, 0)
  );

  protected getFirstRoute(items: DocsTaskItem[]): string {
    const route = items[0]?.route;

    if (route) {
      return route;
    }

    return '/dashboard';
  }

  protected getPreviewLabels(items: DocsTaskItem[]): string[] {
    return items
      .slice(0, 6)
      .map((item) => item.label)
      .filter((label) => !!label);
  }
}
