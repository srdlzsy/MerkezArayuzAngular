import { DOCS_PAGES } from './docs-pages.config';
import { DOCS_TASK_REGISTRY } from './docs-menu.config';
import {
  DOCS_TASK_SOURCE,
  getDocsTaskSourceEntries,
  getPrimaryTaskRoutePath
} from './docs-task-source.config';
import { TASK_ROUTES } from '../tasks/task-routes';

describe('DOCS_TASK_REGISTRY', () => {
  it('keeps source, page and registry counts aligned', () => {
    expect(getDocsTaskSourceEntries().length).toBe(Object.keys(DOCS_PAGES).length);
    expect(DOCS_TASK_REGISTRY.length).toBe(Object.keys(DOCS_PAGES).length);
  });

  it('registers every page with a matching route and non-empty access keys', () => {
    const routeTaskIds = new Set(TASK_ROUTES.map((route) => route.data?.['taskId']));
    const routePaths = new Set(
      TASK_ROUTES.map((route) => {
        const path = route.path ?? '';

        return path.startsWith('/') ? path : `/${path}`;
      })
    );

    for (const registration of DOCS_TASK_REGISTRY) {
      const sourceTask = DOCS_TASK_SOURCE[registration.id];

      expect(sourceTask)
        .withContext(`Registry kaydi icin source bulunamadi: ${registration.id}`)
        .toBeDefined();
      expect(DOCS_PAGES[registration.pageId])
        .withContext(`Registry kaydi icin page bulunamadi: ${registration.id}`)
        .toBeDefined();
      expect(registration.route)
        .withContext(`Registry route bos: ${registration.id}`)
        .toBe(`/${getPrimaryTaskRoutePath(registration.pageId)}`);
      expect(routeTaskIds.has(registration.id))
        .withContext(`Registry icin taskId bulunamadi: ${registration.id}`)
        .toBeTrue();
      expect(routePaths.has(registration.route))
        .withContext(`Registry icin ana route bulunamadi: ${registration.id}`)
        .toBeTrue();
      expect(sourceTask?.routes.length ?? 0)
        .withContext(`Source route tanimi bos: ${registration.id}`)
        .toBeGreaterThan(0);
      expect(registration.accessKeys.length)
        .withContext(`Registry access key bos: ${registration.id}`)
        .toBeGreaterThan(0);
      expect(new Set(registration.accessKeys).size)
        .withContext(`Registry access key tekrar ediyor: ${registration.id}`)
        .toBe(registration.accessKeys.length);
    }
  });

  it('does not contain duplicate ids, page ids or routes', () => {
    const ids = DOCS_TASK_REGISTRY.map((registration) => registration.id);
    const pageIds = DOCS_TASK_REGISTRY.map((registration) => registration.pageId);
    const routes = DOCS_TASK_REGISTRY.map((registration) => registration.route);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(pageIds).size).toBe(pageIds.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('uses the primary route for multi-route tasks', () => {
    const kullaniciRegistration = DOCS_TASK_REGISTRY.find(
      (registration) => registration.id === 'kullanicilar'
    );
    const rolRegistration = DOCS_TASK_REGISTRY.find(
      (registration) => registration.id === 'roller'
    );
    const yetkiRegistration = DOCS_TASK_REGISTRY.find(
      (registration) => registration.id === 'yetkiler'
    );
    const kasaRegistration = DOCS_TASK_REGISTRY.find(
      (registration) => registration.id === 'kasa-sayimlari'
    );
    const kullaniciRoutes =
      DOCS_TASK_SOURCE['kullanicilar']?.routes.map((route) => route.path) ?? [];
    const rolRoutes = DOCS_TASK_SOURCE['roller']?.routes.map((route) => route.path) ?? [];
    const yetkiRoutes = DOCS_TASK_SOURCE['yetkiler']?.routes.map((route) => route.path) ?? [];
    const kasaRoutes =
      DOCS_TASK_SOURCE['kasa-sayimlari']?.routes.map((route) => route.path) ?? [];

    expect(kullaniciRoutes).toEqual([
      'docs/api/kullanicilar/detay',
      'docs/api/kullanicilar/ekle',
      'docs/api/kullanicilar'
    ]);
    expect(rolRoutes).toEqual([
      'docs/api/roller/detay',
      'docs/api/roller/ekle',
      'docs/api/roller'
    ]);
    expect(yetkiRoutes).toEqual([
      'docs/api/yetkiler/detay',
      'docs/api/yetkiler/ekle',
      'docs/api/yetkiler'
    ]);
    expect(kasaRoutes).toEqual(['docs/api/kasa-sayimlari/ekle', 'docs/api/kasa-sayimlari']);
    expect(getPrimaryTaskRoutePath('kullanicilar')).toBe('docs/api/kullanicilar');
    expect(getPrimaryTaskRoutePath('roller')).toBe('docs/api/roller');
    expect(getPrimaryTaskRoutePath('yetkiler')).toBe('docs/api/yetkiler');
    expect(getPrimaryTaskRoutePath('kasa-sayimlari')).toBe('docs/api/kasa-sayimlari');
    expect(kullaniciRegistration?.route).toBe('/docs/api/kullanicilar');
    expect(rolRegistration?.route).toBe('/docs/api/roller');
    expect(yetkiRegistration?.route).toBe('/docs/api/yetkiler');
    expect(kasaRegistration?.route).toBe('/docs/api/kasa-sayimlari');
  });
});
