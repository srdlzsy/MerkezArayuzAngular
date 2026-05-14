import { DocsMenuSection, DocsTaskItem } from '../models/docs.models';
import type { Gorev, Sorumluluk, Yetki } from '../../core/auth/models/auth.models';
import { DOCS_PAGES } from './docs-pages.config';
import {
  getPrimaryTaskRoutePath,
  getTaskAccessKeyAliases
} from './docs-task-source.config';

export interface DocsTaskRegistration {
  id: string;
  label: string;
  summary: string;
  route: string;
  pageId: string;
  accessKeys: string[];
}

export interface DocsTaskContext {
  sorumluluk: Sorumluluk;
  gorev: Gorev;
  registration: DocsTaskRegistration | null;
}

const ACCESS_CHAR_MAP: Record<string, string> = {
  '\u00c7': 'C',
  '\u00e7': 'c',
  '\u011e': 'G',
  '\u011f': 'g',
  '\u0130': 'I',
  '\u0131': 'i',
  '\u00d6': 'O',
  '\u00f6': 'o',
  '\u015e': 'S',
  '\u015f': 's',
  '\u00dc': 'U',
  '\u00fc': 'u'
};

function normalizeAccessKey(value: string | null | undefined): string {
  if (!value?.trim()) {
    return '';
  }

  return value
    .trim()
    .replace(/[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/g, (char) =>
      ACCESS_CHAR_MAP[char] ?? char
    )
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUniqueAccessKeys(values: ReadonlyArray<string | null | undefined>): string[] {
  return values
    .map((value) => normalizeAccessKey(value))
    .filter((value, index, items) => !!value && items.indexOf(value) === index);
}

function hasAnySharedKey(left: string[], right: string[]): boolean {
  return left.some((value) => right.includes(value));
}

function getBackendLeafKey(pageId: string): string {
  const baseRouteOrFile = DOCS_PAGES[pageId]?.baseRouteOrFile;

  if (!baseRouteOrFile) {
    return '';
  }

  const segments = baseRouteOrFile.split('/').filter(Boolean);
  const apiIndex = segments.findIndex((segment) => segment.toLowerCase() === 'api');
  const backendSegments = apiIndex >= 0 ? segments.slice(apiIndex + 2) : segments;

  return backendSegments[backendSegments.length - 1] ?? '';
}

function normalizeRoutePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function buildTaskRegistration(pageId: string): DocsTaskRegistration {
  const page = DOCS_PAGES[pageId];
  const route = normalizeRoutePath(getPrimaryTaskRoutePath(pageId));
  const routeSegment = route.split('/').filter(Boolean).pop() ?? pageId;

  return {
    id: pageId,
    label: page.title,
    summary: page.subtitle,
    route,
    pageId,
    accessKeys: buildUniqueAccessKeys([
      pageId,
      page.title,
      routeSegment,
      getBackendLeafKey(pageId),
      ...getTaskAccessKeyAliases(pageId)
    ])
  };
}

export const DOCS_TASK_REGISTRY: DocsTaskRegistration[] = Object.keys(DOCS_PAGES).map((pageId) =>
  buildTaskRegistration(pageId)
);

function buildUserAccessKeySet(sorumluluklar: Sorumluluk[]): Set<string> {
  const accessKeys = new Set<string>();

  for (const sorumluluk of sorumluluklar) {
    for (const gorev of sorumluluk.gorevler ?? []) {
      const taskKeys = buildUniqueAccessKeys([gorev.isim, gorev.sebike]);

      for (const key of taskKeys) {
        accessKeys.add(key);
      }
    }
  }

  return accessKeys;
}

function buildTaskMatchKeys(gorev: Gorev): string[] {
  return buildUniqueAccessKeys([gorev.isim, gorev.sebike]);
}

function buildPermissionKeys(yetki: Yetki): string[] {
  return buildUniqueAccessKeys([yetki.sebike, yetki.isim]);
}

function matchesTaskRegistration(gorev: Gorev, registration: DocsTaskRegistration): boolean {
  const taskMatchKeys = buildTaskMatchKeys(gorev);

  return taskMatchKeys.length > 0 && hasAnySharedKey(registration.accessKeys, taskMatchKeys);
}

function findTaskRegistration(
  gorev: Gorev,
  registrations: DocsTaskRegistration[]
): DocsTaskRegistration | null {
  const taskMatchKeys = buildTaskMatchKeys(gorev);

  if (!taskMatchKeys.length) {
    return null;
  }

  return (
    registrations.find((registration) =>
      hasAnySharedKey(registration.accessKeys, taskMatchKeys)
    ) ?? null
  );
}

function buildSectionId(sorumluluk: Sorumluluk, index: number): string {
  return (
    normalizeAccessKey(sorumluluk.sebike) ||
    normalizeAccessKey(sorumluluk.isim) ||
    `section-${index + 1}`
  );
}

function buildMenuItems(
  sorumluluk: Sorumluluk,
  registrations: DocsTaskRegistration[]
): DocsTaskItem[] {
  return (sorumluluk.gorevler ?? []).flatMap((gorev) => {
    const registration = findTaskRegistration(gorev, registrations);

    if (!registration) {
      return [];
    }

    return [
      {
        id: registration.id,
        label: gorev.isim?.trim() || registration.label,
        route: registration.route,
        summary: registration.summary,
        pageId: registration.pageId,
        pageType: 'api'
      }
    ];
  });
}

function findTaskRegistrationById(
  taskId: string,
  registrations: DocsTaskRegistration[]
): DocsTaskRegistration | null {
  return (
    registrations.find(
      (registration) => registration.id === taskId || registration.pageId === taskId
    ) ?? null
  );
}

function findMatchedTaskContexts(
  taskId: string,
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[]
): DocsTaskContext[] {
  const registration = findTaskRegistrationById(taskId, registrations);
  const normalizedTaskId = normalizeAccessKey(taskId);

  return sorumluluklar.flatMap((sorumluluk) =>
    (sorumluluk.gorevler ?? []).flatMap((gorev) => {
      const isMatch = registration
        ? matchesTaskRegistration(gorev, registration)
        : buildTaskMatchKeys(gorev).includes(normalizedTaskId);

      if (!isMatch) {
        return [];
      }

      return [
        {
          sorumluluk,
          gorev,
          registration
        }
      ];
    })
  );
}

export function normalizeDocsAccessKey(value: string | null | undefined): string {
  return normalizeAccessKey(value);
}

export function getDocsTaskRegistrations(
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): DocsTaskRegistration[] {
  return registrations;
}

export function buildDocsMenuForUser(
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): DocsMenuSection[] {
  return sorumluluklar.flatMap((sorumluluk, index) => {
    const children = buildMenuItems(sorumluluk, registrations);

    if (!children.length) {
      return [];
    }

    return [
      {
        id: buildSectionId(sorumluluk, index),
        label: sorumluluk.isim?.trim() || sorumluluk.sebike?.trim() || 'Adsiz Sorumluluk',
        summary: `${children.length} gorev`,
        children
      }
    ];
  });
}

export function hasDocsTaskAccess(
  taskId: string,
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): boolean {
  const registration = findTaskRegistrationById(taskId, registrations);
  const userAccessKeys = buildUserAccessKeySet(sorumluluklar);

  if (!registration) {
    return userAccessKeys.has(normalizeAccessKey(taskId));
  }

  return registration.accessKeys.some((accessKey) => userAccessKeys.has(accessKey));
}

export function getDocsTaskContext(
  taskId: string,
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): DocsTaskContext | null {
  return findMatchedTaskContexts(taskId, sorumluluklar, registrations)[0] ?? null;
}

export function getDocsTask(
  taskId: string,
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): Gorev | null {
  return getDocsTaskContext(taskId, sorumluluklar, registrations)?.gorev ?? null;
}

export function getDocsTaskPermissions(
  taskId: string,
  sorumluluklar: Sorumluluk[],
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): Yetki[] {
  const seenKeys = new Set<string>();

  return findMatchedTaskContexts(taskId, sorumluluklar, registrations).flatMap(({ gorev }) =>
    (gorev.yetkiler ?? []).filter((yetki) => {
      const permissionKey =
        buildPermissionKeys(yetki).join('|') ||
        `${yetki.id ?? 'null'}|${yetki.isim ?? ''}|${yetki.sebike ?? ''}`;

      if (!permissionKey || seenKeys.has(permissionKey)) {
        return false;
      }

      seenKeys.add(permissionKey);
      return true;
    })
  );
}
