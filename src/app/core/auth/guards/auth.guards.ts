import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

type AuthGuardResult = true | UrlTree;

function redirectIfUnauthenticated(): AuthGuardResult | Observable<AuthGuardResult> {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return authService.ensureHydratedCurrentUser().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
}

function redirectIfAuthenticated(): AuthGuardResult | Observable<AuthGuardResult> {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return authService.ensureHydratedCurrentUser().pipe(
    map(() => router.createUrlTree(['/dashboard'])),
    catchError(() => of(true))
  );
}

export const authGuard: CanActivateFn = () => redirectIfUnauthenticated();

export const authChildGuard: CanActivateChildFn = () => redirectIfUnauthenticated();

export const taskAccessGuard: CanActivateChildFn = (childRoute) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const taskId = childRoute.data?.['taskId'] as string | undefined;

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return authService.ensureHydratedCurrentUser().pipe(
    map(() => {
      if (!taskId) {
        return true;
      }

      return authService.hasTaskAccess(taskId) ? true : router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

export const loginRedirectGuard: CanActivateFn = () => {
  return redirectIfAuthenticated();
};
