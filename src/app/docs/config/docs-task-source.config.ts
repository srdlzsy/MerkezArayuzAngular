import { Routes } from '@angular/router';

import { DocsContentPage } from '../models/docs.models';
import type { DocsTaskSource } from './docs-task-source.helpers';
import { ORDERS_TASK_SOURCE } from './orders.task-source';
import { RECEIVING_TASK_SOURCE } from './receiving.task-source';
import { SHIPMENT_TASK_SOURCE } from './shipment.task-source';
import { INVENTORY_TASK_SOURCE } from './inventory.task-source';
import { RETURNS_TASK_SOURCE } from './returns.task-source';
import { CASH_REGISTER_TASK_SOURCE } from './cash-register.task-source';
import { INTEGRATION_TASK_SOURCE } from './integration.task-source';
import { EDOCUMENTS_TASK_SOURCE } from './edocuments.task-source';
import { GREEN_GROCER_TASK_SOURCE } from './green-grocer.task-source';
import { USER_TASK_SOURCE } from './user.task-source';
import { SEARCH_TASK_SOURCE } from './search.task-source';
import { COMMON_TASK_SOURCE } from './common.task-source';
import { RAPOR_ISLEMLERI_TASK_SOURCE } from './rapor-islemleri.task-source';
import { AYAR_ISLEMLERI_TASK_SOURCE } from './ayar-islemleri.task-source';
import { DUZELTME_ISLEMLERI_TASK_SOURCE } from './duzeltme-islemleri.task-source';

export type { DocsTaskRouteSource, DocsTaskSource } from './docs-task-source.helpers';

const DOCS_DOMAIN_TASK_SOURCES: ReadonlyArray<Record<string, DocsTaskSource>> = [
  ORDERS_TASK_SOURCE,
  RECEIVING_TASK_SOURCE,
  SHIPMENT_TASK_SOURCE,
  INVENTORY_TASK_SOURCE,
  RETURNS_TASK_SOURCE,
  CASH_REGISTER_TASK_SOURCE,
  INTEGRATION_TASK_SOURCE,
  EDOCUMENTS_TASK_SOURCE,
  GREEN_GROCER_TASK_SOURCE,
  RAPOR_ISLEMLERI_TASK_SOURCE,
  AYAR_ISLEMLERI_TASK_SOURCE,
  DUZELTME_ISLEMLERI_TASK_SOURCE,
  USER_TASK_SOURCE,
  SEARCH_TASK_SOURCE,
  COMMON_TASK_SOURCE
];

export const DOCS_TASK_SOURCE: Record<string, DocsTaskSource> = Object.assign(
  {},
  ...DOCS_DOMAIN_TASK_SOURCES
) as Record<string, DocsTaskSource>;

export function getDocsTaskSourceEntries(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Array<[string, DocsTaskSource]> {
  return Object.entries(source);
}

export function buildDocsPagesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Record<string, DocsContentPage> {
  return Object.fromEntries(
    getDocsTaskSourceEntries(source).map(([taskId, definition]) => [taskId, definition.page])
  ) as Record<string, DocsContentPage>;
}

export function buildTaskRoutesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Routes {
  return getDocsTaskSourceEntries(source).flatMap(([taskId, definition]) =>
    definition.routes.map((taskRoute) => ({
      path: taskRoute.path,
      loadComponent: taskRoute.loadComponent,
      data: {
        taskId,
        ...(taskRoute.data ?? {})
      }
    }))
  );
}

export function getPrimaryTaskRoutePath(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): string {
  const task = source[taskId];
  const primaryRoute = task?.routes.find((route) => route.isPrimary) ?? task?.routes[0];

  return primaryRoute?.path ?? `docs/api/${taskId}`;
}

export function getTaskAccessKeyAliases(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): readonly string[] {
  return source[taskId]?.accessKeyAliases ?? [];
}
