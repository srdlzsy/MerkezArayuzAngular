export type FeedbackItemType = 'Complaint' | 'Suggestion';

export type FeedbackPriority = 'Low' | 'Normal' | 'High';

export type FeedbackStatus =
  | 'New'
  | 'Read'
  | 'InProgress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

export interface CreateFeedbackItemHttpRequest {
  type: FeedbackItemType | string;
  title: string;
  message: string;
  priority?: FeedbackPriority | string | null;
}

export interface ChangeFeedbackStatusHttpRequest {
  status: FeedbackStatus | string;
  adminNote?: string | null;
}

export interface FeedbackManagementListHttpRequest {
  status?: FeedbackStatus | string | null;
  type?: FeedbackItemType | string | null;
  warehouseNo?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  take?: number | null;
}

export interface FeedbackItemDto {
  id: string;
  type: FeedbackItemType | string;
  typeName: string;
  title: string;
  message: string;
  status: FeedbackStatus | string;
  statusName: string;
  priority: FeedbackPriority | string;
  priorityName: string;
  createdByUserId: string | null;
  createdByUsername: string;
  createdByFullName: string;
  warehouseNo: number | null;
  warehouseName: string | null;
  adminNote: string | null;
  readAtUtc: string | null;
  readByUserId: string | null;
  statusChangedAtUtc: string | null;
  statusChangedByUserId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  closedAtUtc: string | null;
}

export interface FeedbackSummaryDto {
  myOpenCount: number;
  myResolvedCount: number;
  latestStatus: FeedbackStatus | string | null;
  latestCreatedAtUtc: string | null;
}
