import { Route } from '@angular/router';

import { DocsContentPage } from '../models/docs.models';

export type DocsTaskLoadComponent = NonNullable<Route['loadComponent']>;
export type DocsTaskRouteData = Readonly<Record<string, unknown>>;

export interface DocsTaskRouteSource {
  path: string;
  loadComponent: DocsTaskLoadComponent;
  data?: DocsTaskRouteData;
  isPrimary?: boolean;
}

export interface DocsTaskSource {
  page: DocsContentPage;
  routes: readonly DocsTaskRouteSource[];
  accessKeyAliases?: readonly string[];
}

export function route(
  path: string,
  loadComponent: DocsTaskLoadComponent,
  options?: { data?: DocsTaskRouteData; isPrimary?: boolean }
): DocsTaskRouteSource {
  return {
    path,
    loadComponent,
    data: options?.data,
    isPrimary: options?.isPrimary ?? false
  };
}

export function singleRouteTask(
  page: DocsContentPage,
  loadComponent: DocsTaskLoadComponent,
  options?: { accessKeyAliases?: readonly string[]; data?: DocsTaskRouteData; path?: string }
): DocsTaskSource {
  return {
    page,
    accessKeyAliases: options?.accessKeyAliases,
    routes: [
      route(options?.path ?? `docs/api/${page.id}`, loadComponent, {
        data: options?.data,
        isPrimary: true
      })
    ]
  };
}

export function multiRouteTask(
  page: DocsContentPage,
  routes: readonly DocsTaskRouteSource[],
  accessKeyAliases?: readonly string[]
): DocsTaskSource {
  return {
    page,
    routes,
    accessKeyAliases
  };
}

export function referenceTask(
  page: DocsContentPage,
  options?: { accessKeyAliases?: readonly string[]; data?: DocsTaskRouteData; path?: string }
): DocsTaskSource {
  return singleRouteTask(
    page,
    () =>
      import('../tasks/core/docs-reference-page/docs-reference-page.component').then(
        (m) => m.DocsReferencePageComponent
      ),
    options
  );
}
