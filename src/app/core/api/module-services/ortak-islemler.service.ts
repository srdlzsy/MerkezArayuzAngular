import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AnnouncementDto,
  AnnouncementInboxHttpRequest,
  AnnouncementManagementListHttpRequest,
  AnnouncementSummaryDto,
  ChangeFeedbackStatusHttpRequest,
  CreateFeedbackItemHttpRequest,
  FeedbackItemDto,
  FeedbackManagementListHttpRequest,
  FeedbackSummaryDto,
  SaveAnnouncementHttpRequest
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class OrtakIslemlerService extends BaseApiService {
  getAnnouncementsInbox(request: AnnouncementInboxHttpRequest): Observable<AnnouncementDto[]> {
    return this.getWithQuery<AnnouncementDto[], AnnouncementInboxHttpRequest>(
      'home/duyurular',
      request
    );
  }

  getAnnouncementSummary(): Observable<AnnouncementSummaryDto> {
    return this.get<AnnouncementSummaryDto>('home/duyurular/ozet');
  }

  markAnnouncementAsRead(id: string): Observable<AnnouncementDto> {
    return this.http.patch<AnnouncementDto>(
      this.buildUrl(`home/duyurular/${encodeURIComponent(id)}/okundu`),
      null
    );
  }

  getAnnouncementManagementItems(
    request: AnnouncementManagementListHttpRequest
  ): Observable<AnnouncementDto[]> {
    return this.getWithQuery<AnnouncementDto[], AnnouncementManagementListHttpRequest>(
      'ortak-islemler/duyurular',
      request
    );
  }

  getAnnouncementManagementDetail(id: string): Observable<AnnouncementDto> {
    return this.get<AnnouncementDto>(
      `ortak-islemler/duyurular/${encodeURIComponent(id)}`
    );
  }

  createAnnouncement(request: SaveAnnouncementHttpRequest): Observable<AnnouncementDto> {
    return this.post<AnnouncementDto, SaveAnnouncementHttpRequest>(
      'ortak-islemler/duyurular',
      request
    );
  }

  updateAnnouncement(
    id: string,
    request: SaveAnnouncementHttpRequest
  ): Observable<AnnouncementDto> {
    return this.put<AnnouncementDto, SaveAnnouncementHttpRequest>(
      `ortak-islemler/duyurular/${encodeURIComponent(id)}`,
      request
    );
  }

  archiveAnnouncement(id: string): Observable<AnnouncementDto> {
    return this.http.patch<AnnouncementDto>(
      this.buildUrl(`ortak-islemler/duyurular/${encodeURIComponent(id)}/arsivle`),
      null
    );
  }

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