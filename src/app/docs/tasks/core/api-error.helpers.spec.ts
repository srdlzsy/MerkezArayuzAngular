import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { resolveHttpErrorMessage } from './api-error.helpers';

describe('resolveHttpErrorMessage', () => {
  it('appends the ProblemDetails correlation id to the resolved message', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        detail: 'Sunucu hatasi.',
        correlationId: 'correlation-42'
      }
    });

    expect(resolveHttpErrorMessage(error, 'Islem basarisiz.')).toBe(
      'Sunucu hatasi. (Takip No: correlation-42)'
    );
  });

  it('uses a correlation response header when the body does not contain one', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: { title: 'Servis kullanilamiyor.' },
      headers: new HttpHeaders({ 'X-Correlation-Id': 'header-77' })
    });

    expect(resolveHttpErrorMessage(error, 'Islem basarisiz.')).toBe(
      'Servis kullanilamiyor. (Takip No: header-77)'
    );
  });

  it('does not duplicate a correlation id already present in the message', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Islem basarisiz. Takip No: same-id',
        correlationId: 'same-id'
      }
    });

    expect(resolveHttpErrorMessage(error, 'Islem basarisiz.')).toBe(
      'Islem basarisiz. Takip No: same-id'
    );
  });
});
