import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  RecheckMobileSafeWriteHttpRequest,
  SafeWriteReviewResultDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({ providedIn: 'root' })
export class MobileSyncService extends BaseApiService {
  recheckSafeWrite(
    clientRequestId: string,
    operationCode: string
  ): Observable<SafeWriteReviewResultDto> {
    const request: RecheckMobileSafeWriteHttpRequest = { operationCode };

    return this.post<SafeWriteReviewResultDto, RecheckMobileSafeWriteHttpRequest>(
      `mobile-sync/guvenli-yazmalar/${encodeURIComponent(clientRequestId)}/yeniden-dogrula`,
      request
    );
  }
}
