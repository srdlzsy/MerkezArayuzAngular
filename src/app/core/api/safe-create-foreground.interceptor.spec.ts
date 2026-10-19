import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { safeCreateForegroundInterceptor } from './safe-create-foreground.interceptor';

describe('safeCreateForegroundInterceptor', () => {
  it('keeps the create request pending and returns a recovered completed result', fakeAsync(() => {
    const requests: HttpRequest<unknown>[] = [];
    const expectedResult = { documentSerie: 'FMK', documentOrderNo: 42 };
    const next: HttpHandlerFn = (request) => {
      requests.push(request);
      if (request.method === 'POST') {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                errorCode: 'MIKRO_WRITE_IN_PROGRESS',
                retryable: true,
                recommendedAction: 'WaitAndCheck',
              },
            }),
        );
      }

      return of(
        new HttpResponse({
          status: 200,
          body: {
            status: 'Completed',
            result: expectedResult,
            recoveryState: 'ExactMatch',
            recommendedAction: 'Completed',
          },
        }),
      );
    };

    let responseBody: unknown;
    safeCreateForegroundInterceptor(createRequest(), next).subscribe((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse) {
        responseBody = event.body;
      }
    });

    expect(requests).toHaveSize(1);
    tick(3000);

    expect(requests).toHaveSize(2);
    expect(requests[1].method).toBe('GET');
    expect(requests[1].url).toBe(
      'https://api.test/api/mal-kabul-islemleri/firma-mal-kabulleri/offline-sync/request-1',
    );
    expect(responseBody).toEqual(expectedResult);
  }));

  it('returns retry permission to the same form without posting again', fakeAsync(() => {
    const requests: HttpRequest<unknown>[] = [];
    const next: HttpHandlerFn = (request) => {
      requests.push(request);
      if (request.method === 'POST') {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 504,
              error: { detail: 'Timeout' },
            }),
        );
      }

      return of(
        new HttpResponse({
          status: 200,
          body: {
            status: 'Failed',
            errorMessage: 'Mikro kaydi bulunamadi.',
            errorCode: 'SAFE_WRITE_RETRY_ALLOWED',
            retryable: true,
            recoveryState: 'Missing',
            recommendedAction: 'RetrySameRequest',
          },
        }),
      );
    };

    const receivedErrors: HttpErrorResponse[] = [];
    safeCreateForegroundInterceptor(createRequest(), next).subscribe({
      error: (error: HttpErrorResponse) => {
        receivedErrors.push(error);
      },
    });

    tick(3000);

    expect(requests).toHaveSize(2);
    expect(requests.filter((request) => request.method === 'POST')).toHaveSize(1);
    expect(receivedErrors).toHaveSize(1);
    expect(receivedErrors[0].status).toBe(409);
    expect(receivedErrors[0].error.recommendedAction).toBe('RetrySameRequest');
  }));

  it('does not intercept ordinary post requests', () => {
    const request = new HttpRequest('POST', 'https://api.test/api/auth/login', {
      clientRequestId: 'request-1',
    });
    const next: HttpHandlerFn = (handledRequest) =>
      of(new HttpResponse({ status: 200, body: handledRequest.url }));

    let responseBody: unknown;
    safeCreateForegroundInterceptor(request, next).subscribe((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse) {
        responseBody = event.body;
      }
    });

    expect(responseBody).toBe('https://api.test/api/auth/login');
  });
});

function createRequest(): HttpRequest<unknown> {
  return new HttpRequest(
    'POST',
    'https://api.test/api/mal-kabul-islemleri/firma-mal-kabulleri',
    { clientRequestId: 'request-1', lines: [] },
  );
}
