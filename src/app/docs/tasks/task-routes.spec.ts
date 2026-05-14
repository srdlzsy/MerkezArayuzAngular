import { DOCS_PAGES } from '../config/docs-pages.config';
import { getDocsTaskSourceEntries } from '../config/docs-task-source.config';
import { TASK_ROUTES } from './task-routes';

describe('TASK_ROUTES', () => {
  it('derives the same route count from the single task source', () => {
    const expectedRouteCount = getDocsTaskSourceEntries().reduce(
      (total, [, definition]) => total + definition.routes.length,
      0
    );

    expect(TASK_ROUTES.length).toBe(expectedRouteCount);
  });

  it('maps every route taskId to an existing docs page', () => {
    for (const route of TASK_ROUTES) {
      const taskId = route.data?.['taskId'];

      expect(taskId).withContext(`Route "${route.path}" taskId tanimsiz`).toBeTruthy();
      expect(DOCS_PAGES[taskId as string])
        .withContext(`Route "${route.path}" icin "${taskId}" page config bulunamadi`)
        .toBeDefined();
    }
  });

  it('does not contain duplicate route paths', () => {
    const paths = TASK_ROUTES.map((route) => route.path);
    const uniquePaths = new Set(paths);

    expect(uniquePaths.size).toBe(paths.length);
  });
});
