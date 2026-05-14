import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/auth/services/auth.service';

export function injectDocsTaskContext(taskId?: string) {
  const activatedRoute = inject(ActivatedRoute);
  const authService = inject(AuthService);
  const resolvedTaskId = taskId ?? ((activatedRoute.snapshot.data['taskId'] as string | undefined) ?? null);

  return {
    taskId: resolvedTaskId,
    task: computed(() => (resolvedTaskId ? authService.getTask(resolvedTaskId) : null)),
    taskContext: computed(() =>
      resolvedTaskId ? authService.getTaskContext(resolvedTaskId) : null
    ),
    permissions: computed(() =>
      resolvedTaskId ? authService.getTaskPermissions(resolvedTaskId) : []
    ),
    permissionCodes: computed(() =>
      resolvedTaskId ? authService.getTaskPermissionCodes(resolvedTaskId) : []
    ),
    permissionKeys: computed(() =>
      resolvedTaskId ? authService.getTaskPermissionKeys(resolvedTaskId) : []
    )
  };
}

export const injectDocsTaskPermissionContext = injectDocsTaskContext;
