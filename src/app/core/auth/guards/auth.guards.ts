import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

function redirectIfUnauthenticated(): true | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
}

function redirectIfAuthenticated(): true | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
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

  if (!taskId) {
    return true;
  }

  return authService.hasTaskAccess(taskId) ? true : router.createUrlTree(['/dashboard']);
};

export const loginRedirectGuard: CanActivateFn = () => {
  return redirectIfAuthenticated();
};
