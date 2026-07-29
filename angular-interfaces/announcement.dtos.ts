export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';

export type AnnouncementStatus = 'Published' | 'Archived';

export type AnnouncementTargetType = 'AllWarehouses' | 'Warehouse' | 'User';

export interface AnnouncementInboxHttpRequest {
  includeRead?: boolean | null;
  take?: number | null;
}

export interface AnnouncementManagementListHttpRequest {
  status?: AnnouncementStatus | string | null;
  targetType?: AnnouncementTargetType | string | null;
  targetWarehouseNo?: number | null;
  targetUserId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  includeArchived?: boolean | null;
  take?: number | null;
}

export interface SaveAnnouncementHttpRequest {
  title: string;
  message: string;
  priority?: AnnouncementPriority | string | null;
  targetType: AnnouncementTargetType | string;
  targetWarehouseNos?: number[] | null;
  targetUserIds?: string[] | null;
  startsAtUtc?: string | null;
  expiresAtUtc?: string | null;
}

export interface AnnouncementSummaryDto {
  activeCount: number;
  unreadCount: number;
  latestAnnouncementId: string | null;
  latestPublishedAtUtc: string | null;
}

export interface AnnouncementTargetDto {
  id: string;
  type: AnnouncementTargetType | string;
  typeName: string;
  warehouseNo: number | null;
  warehouseName: string | null;
  userId: string | null;
  username: string | null;
  userFullName: string | null;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority | string;
  priorityName: string;
  status: AnnouncementStatus | string;
  statusName: string;
  createdByUserId: string;
  createdByUsername: string;
  createdByFullName: string;
  startsAtUtc: string | null;
  expiresAtUtc: string | null;
  publishedAtUtc: string;
  archivedAtUtc: string | null;
  archivedByUserId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  readAtUtc: string | null;
  targets: AnnouncementTargetDto[];
}