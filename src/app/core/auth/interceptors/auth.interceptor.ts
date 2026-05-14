import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();
  const tokenType = authService.getTokenType();
  const isLoginRequest = req.url.includes('/auth/login');
  const isRefreshRequest = req.url.includes('/auth/refresh');

  if (!token || !tokenType || isLoginRequest || isRefreshRequest) {
    return next(req);
  }

  const authorizedRequest = req.clone({
    setHeaders: {
      Authorization: `${tokenType} ${token}`
    }
  });

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap(() => {
          const refreshedToken = authService.getAccessToken();
          const refreshedTokenType = authService.getTokenType();

          if (!refreshedToken || !refreshedTokenType) {
            return throwError(() => error);
          }

          return next(
            req.clone({
              setHeaders: {
                Authorization: `${refreshedTokenType} ${refreshedToken}`
              }
            })
          );
        }),
        catchError((refreshError: HttpErrorResponse) => {
          authService.logout();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};
