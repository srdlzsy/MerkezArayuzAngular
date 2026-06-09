import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ChangeFeedbackStatusHttpRequest,
  CreateFeedbackItemHttpRequest,
  FeedbackItemDto,
  FeedbackManagementListHttpRequest,
  FeedbackSummaryDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class OrtakIslemlerService extends BaseApiService {
  createFeedbackItem(request: CreateFeedbackItemHttpRequest): Observable<FeedbackItemDto> {
    return this.post<FeedbackItemDto, CreateFeedbackItemHttpRequest>(
      'home/sikayet-oneri',
      request
    );
  }

  getMyFeedbackItems(): Observable<FeedbackItemDto[]> {
    return this.get<FeedbackItemDto[]>('home/sikayet-oneri/benim');
  }

  getFeedbackSummary(): Observable<FeedbackSummaryDto> {
    return this.get<FeedbackSummaryDto>('home/sikayet-oneri/ozet');
  }

  getFeedbackManagementItems(
    request: FeedbackManagementListHttpRequest
  ): Observable<FeedbackItemDto[]> {
    return this.getWithQuery<FeedbackItemDto[], FeedbackManagementListHttpRequest>(
      'ortak-islemler/sikayet-oneri',
      request
    );
  }

  getFeedbackManagementDetail(id: string): Observable<FeedbackItemDto> {
    return this.get<FeedbackItemDto>(
      `ortak-islemler/sikayet-oneri/${encodeURIComponent(id)}`
    );
  }

  markFeedbackAsRead(id: string): Observable<FeedbackItemDto> {
    return this.http.patch<FeedbackItemDto>(
      this.buildUrl(`ortak-islemler/sikayet-oneri/${encodeURIComponent(id)}/okundu`),
      null
    );
  }

  changeFeedbackStatus(
    id: string,
    request: ChangeFeedbackStatusHttpRequest
  ): Observable<FeedbackItemDto> {
    return this.patch<FeedbackItemDto, ChangeFeedbackStatusHttpRequest>(
      `ortak-islemler/sikayet-oneri/${encodeURIComponent(id)}/durum`,
      request
    );
  }
}
