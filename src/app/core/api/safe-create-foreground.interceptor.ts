import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { catchError, of, switchMap, throwError, timer } from 'rxjs';
import type { Observable } from 'rxjs';

const FOREGROUND_WAIT_MS = 5 * 60 * 1000;
const STATUS_POLL_MS = 3 * 1000;

const STATUS_PATHS: ReadonlyArray<readonly [string, string]> = [
  ['/mal-kabul-islemleri/firma-mal-kabulleri', '/mal-kabul-islemleri/firma-mal-kabulleri/offline-sync'],
  ['/stok-islemleri/sayim-sonuclari', '/stok-islemleri/sayim-sonuclari/offline-sync'],
  ['/siparis-islemleri/verilen-depo-siparisleri', '/siparis-islemleri/verilen-depo-siparisleri/offline-sync'],
  ['/siparis-islemleri/onerilen-depo-siparisleri/convert-to-order', '/siparis-islemleri/onerilen-depo-siparisleri/offline-sync'],
  ['/siparis-islemleri/verilen-firma-siparisleri', '/siparis-islemleri/verilen-firma-siparisleri/offline-sync'],
  ['/siparis-islemleri/onerilen-firma-siparisleri/convert-to-order', '/siparis-islemleri/onerilen-firma-siparisleri/offline-sync'],
  ['/sevk-islemleri/depolar-arasi-sevkler/giden', '/sevk-islemleri/depolar-arasi-sevkler/offline-sync'],
  ['/sevk-islemleri/firma-sevkleri/giden', '/sevk-islemleri/firma-sevkleri/offline-sync'],
  ['/iade-islemleri/depo-iadeleri/giden', '/iade-islemleri/depo-iadeleri/offline-sync'],
  ['/iade-islemleri/firma-iadeleri', '/iade-islemleri/firma-iadeleri/offline-sync'],
  ['/stok-islemleri/zayiat-fisleri', '/stok-islemleri/zayiat-fisleri/offline-sync'],
  ['/stok-islemleri/masraf-fisleri', '/stok-islemleri/masraf-fisleri/offline-sync'],
  ['/stok-islemleri/virmanlar', '/stok-islemleri/virmanlar/offline-sync'],
  ['/green-grocer/operations/adjustments', '/green-grocer/operations/adjustments/offline-sync'],
];

interface SafeCreateStatus {
  status?: unknown;
  errorMessage?: unknown;
  errorCode?: unknown;
  retryable?: unknown;
  retryAfterSeconds?: unknown;
  result?: unknown;
  recoveryState?: unknown;
  recommendedAction?: unknown;
}

export const safeCreateForegroundInterceptor: HttpInterceptorFn = (request, next) => {
  const route = resolveSafeCreateRoute(request);
  if (!route) {
    return next(request);
  }

  const deadline = Date.now() + FOREGROUND_WAIT_MS;
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!shouldWaitForResolution(error)) {
        return throwError(() => error);
      }

      return pollStatus(request, next, route.statusUrl, route.clientRequestId, deadline, error);
    }),
  );
};

function pollStatus(
  createRequest: HttpRequest<unknown>,
  next: HttpHandlerFn,
  statusBaseUrl: string,
  clientRequestId: string,
  deadline: number,
  fallbackError: HttpErrorResponse,
): Observable<HttpEvent<unknown>> {
  if (Date.now() >= deadline) {
    return throwError(() => fallbackError);
  }

  return timer(STATUS_POLL_MS).pipe(
    switchMap(() =>
      next(
        createRequest.clone({
          method: 'GET',
          url: `${statusBaseUrl}/${encodeURIComponent(clientRequestId)}`,
          body: null,
        }),
      ),
    ),
    switchMap((event: HttpEvent<unknown>) => {
      if (!(event instanceof HttpResponse)) {
        return of(event);
      }

      const status = asSafeCreateStatus(event.body);
      const normalizedStatus = readText(status?.status).toLowerCase();
      const action = readText(status?.recommendedAction);

      if (normalizedStatus === 'completed' || action === 'Completed') {
        return of(
          new HttpResponse({
            body: status?.result,
            headers: event.headers,
            status: 200,
            statusText: 'OK',
            url: createRequest.url,
          }),
        );
      }

      if (action === 'WaitAndCheck' || normalizedStatus === 'processing') {
        return pollStatus(
          createRequest,
          next,
          statusBaseUrl,
          clientRequestId,
          deadline,
          toStatusError(createRequest, status, fallbackError),
        );
      }

      return throwError(() => toStatusError(createRequest, status, fallbackError));
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0 || error.status === 401 || error.status === 403) {
        return throwError(() => error);
      }

      if (Date.now() >= deadline) {
        return throwError(() => error.status === 404 ? fallbackError : error);
      }

      if (error.status === 404 || error.status >= 500) {
        return pollStatus(
          createRequest,
          next,
          statusBaseUrl,
          clientRequestId,
          deadline,
          fallbackError,
        );
      }

      return throwError(() => error);
    }),
  );
}

function resolveSafeCreateRoute(
  request: HttpRequest<unknown>,
): { statusUrl: string; clientRequestId: string } | null {
  if (request.method !== 'POST' || !isRecord(request.body)) {
    return null;
  }

  const clientRequestId = readText(request.body['clientRequestId']);
  if (!clientRequestId) {
    return null;
  }

  const requestUrl = request.url.split('?')[0].replace(/\/$/, '');
  for (const [createPath, statusPath] of STATUS_PATHS) {
    if (!requestUrl.endsWith(createPath)) {
      continue;
    }

    return {
      statusUrl: `${requestUrl.slice(0, -createPath.length)}${statusPath}`,
      clientRequestId,
    };
  }

  return null;
}

function shouldWaitForResolution(error: HttpErrorResponse): boolean {
  if (error.status >= 500) {
    return true;
  }

  if (error.status !== 409 || !isRecord(error.error)) {
    return false;
  }

  const action = readText(error.error['recommendedAction']);
  if (action) {
    return action === 'WaitAndCheck';
  }

  const errorCode = readText(error.error['errorCode']).toUpperCase();
  return (
    errorCode === 'MIKRO_WRITE_IN_PROGRESS' ||
    errorCode === 'MIKRO_WRITE_OUTCOME_UNCONFIRMED' ||
    errorCode === 'MIKRO_DOCUMENT_INCOMPLETE' ||
    error.error['retryable'] === true
  );
}

function toStatusError(
  request: HttpRequest<unknown>,
  status: SafeCreateStatus | null,
  fallback: HttpErrorResponse,
): HttpErrorResponse {
  if (!status) {
    return fallback;
  }

  return new HttpErrorResponse({
    error: {
      title: 'Conflict',
      status: 409,
      detail: readText(status.errorMessage) || fallback.message,
      errorCode: readText(status.errorCode) || null,
      retryable: typeof status.retryable === 'boolean' ? status.retryable : null,
      retryAfterSeconds:
        typeof status.retryAfterSeconds === 'number' ? status.retryAfterSeconds : null,
      recoveryState: readText(status.recoveryState) || null,
      recommendedAction: readText(status.recommendedAction) || null,
    },
    status: 409,
    statusText: 'Conflict',
    url: request.url,
  });
}

function asSafeCreateStatus(value: unknown): SafeCreateStatus | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
