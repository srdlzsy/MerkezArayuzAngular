import { Injectable, signal } from '@angular/core';

import type { CurrentUser } from '../../../core/auth/models/auth.models';
import type { ClientRequestPayload, SafeCreateFailure } from './safe-create-retry.helpers';

const STORAGE_PREFIX = 'furpa.safe-create.pending.v2.';
const STORAGE_VERSION = 2;
const MAX_FAILURE_MESSAGE_LENGTH = 1000;

export interface SafeCreatePendingScope {
  userId: string;
  clientType: 'web' | 'terminal';
  warehouseNo: number;
  operationCode: string;
}

export type SafeCreatePendingState = 'pending' | 'needsReview';

export interface SafeCreatePendingRecord<TRequest extends ClientRequestPayload> {
  version: 2;
  scope: SafeCreatePendingScope;
  request: TRequest;
  state: SafeCreatePendingState;
  createdAtUtc: string;
  updatedAtUtc: string;
  failure: SafeCreateFailure | null;
}

@Injectable({ providedIn: 'root' })
export class SafeCreatePendingStore {
  private readonly revision = signal(0);

  save<TRequest extends ClientRequestPayload>(
    scope: SafeCreatePendingScope,
    request: TRequest
  ): SafeCreatePendingRecord<TRequest> {
    const clientRequestId = requireClientRequestId(request);
    const existing = this.read<TRequest>(scope, clientRequestId);
    const now = new Date().toISOString();
    const record: SafeCreatePendingRecord<TRequest> = {
      version: STORAGE_VERSION,
      scope,
      request,
      state: 'pending',
      createdAtUtc: existing?.createdAtUtc ?? now,
      updatedAtUtc: now,
      failure: null
    };

    localStorage.setItem(this.buildStorageKey(scope, clientRequestId), JSON.stringify(record));
    this.touch();
    return record;
  }

  markFailure<TRequest extends ClientRequestPayload>(
    scope: SafeCreatePendingScope,
    clientRequestId: string,
    failure: SafeCreateFailure
  ): SafeCreatePendingRecord<TRequest> | null {
    const existing = this.read<TRequest>(scope, clientRequestId);
    if (!existing) {
      return null;
    }

    const normalizedFailure: SafeCreateFailure = {
      ...failure,
      message: failure.message.slice(0, MAX_FAILURE_MESSAGE_LENGTH)
    };
    const record: SafeCreatePendingRecord<TRequest> = {
      ...existing,
      state: failure.retryable === true ? 'pending' : 'needsReview',
      updatedAtUtc: new Date().toISOString(),
      failure: normalizedFailure
    };

    try {
      localStorage.setItem(this.buildStorageKey(scope, clientRequestId), JSON.stringify(record));
      this.touch();
    } catch {
      // The original pending request stays intact when storage becomes unavailable.
    }
    return record;
  }

  read<TRequest extends ClientRequestPayload>(
    scope: SafeCreatePendingScope,
    clientRequestId: string
  ): SafeCreatePendingRecord<TRequest> | null {
    this.revision();
    return this.readByKey<TRequest>(this.buildStorageKey(scope, clientRequestId));
  }

  findForOperation<TRequest extends ClientRequestPayload>(
    userId: string,
    clientType: SafeCreatePendingScope['clientType'],
    operationCode: string
  ): SafeCreatePendingRecord<TRequest>[] {
    this.revision();
    const normalizedUserId = normalizeScopePart(userId);
    const normalizedOperationCode = normalizeScopePart(operationCode);
    const records: SafeCreatePendingRecord<TRequest>[] = [];

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(STORAGE_PREFIX)) {
          continue;
        }

        const record = this.readByKey<TRequest>(key);
        if (
          record &&
          normalizeScopePart(record.scope.userId) === normalizedUserId &&
          record.scope.clientType === clientType &&
          normalizeScopePart(record.scope.operationCode) === normalizedOperationCode
        ) {
          records.push(record);
        }
      }
    } catch {
      return [];
    }

    return records.sort((left, right) =>
      left.createdAtUtc.localeCompare(right.createdAtUtc)
      || left.scope.warehouseNo - right.scope.warehouseNo
    );
  }

  remove(scope: SafeCreatePendingScope, clientRequestId: string): void {
    try {
      localStorage.removeItem(this.buildStorageKey(scope, clientRequestId));
    } catch {
      // A stale record is safer than turning a confirmed API success into a UI failure.
    }
    this.clearRecoveryMarker(scope, clientRequestId);
    this.touch();
  }

  wasRecoveryAttemptedInSession(
    scope: SafeCreatePendingScope,
    clientRequestId: string
  ): boolean {
    try {
      return sessionStorage.getItem(this.buildRecoveryMarkerKey(scope, clientRequestId)) === '1';
    } catch {
      return false;
    }
  }

  markRecoveryAttemptedInSession(
    scope: SafeCreatePendingScope,
    clientRequestId: string
  ): void {
    try {
      sessionStorage.setItem(this.buildRecoveryMarkerKey(scope, clientRequestId), '1');
    } catch {
      // Recovery can still run safely because the create endpoint is idempotent.
    }
  }

  clearRecoveryMarker(scope: SafeCreatePendingScope, clientRequestId: string): void {
    try {
      sessionStorage.removeItem(this.buildRecoveryMarkerKey(scope, clientRequestId));
    } catch {
      // Session markers are only an optimization; persistent request state is authoritative.
    }
  }

  private readByKey<TRequest extends ClientRequestPayload>(
    key: string
  ): SafeCreatePendingRecord<TRequest> | null {
    try {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) {
        return null;
      }

      const value = JSON.parse(rawValue) as unknown;
      return isPendingRecord<TRequest>(value) ? value : null;
    } catch {
      return null;
    }
  }

  private buildStorageKey(scope: SafeCreatePendingScope, clientRequestId: string): string {
    return `${STORAGE_PREFIX}${[
      scope.userId,
      scope.clientType,
      scope.warehouseNo,
      scope.operationCode,
      clientRequestId
    ].map((value) => encodeURIComponent(normalizeScopePart(String(value)))).join('.')}`;
  }

  private buildRecoveryMarkerKey(
    scope: SafeCreatePendingScope,
    clientRequestId: string
  ): string {
    return `${this.buildStorageKey(scope, clientRequestId)}.recovery-attempted`;
  }

  private touch(): void {
    this.revision.update((value) => value + 1);
  }
}

function requireClientRequestId(request: ClientRequestPayload): string {
  const clientRequestId = request.clientRequestId?.trim();

  if (!clientRequestId) {
    throw new Error('Bekleyen kayit icin clientRequestId zorunludur.');
  }

  return clientRequestId;
}

export function buildSafeCreateUserId(user: CurrentUser | null | undefined): string {
  return user?.userId?.trim()
    || user?.username?.trim()
    || `${user?.displayName?.trim() || 'unknown-user'}:${user?.depoNo ?? 'unknown-warehouse'}`;
}

export function buildSafeCreatePendingScope(
  user: CurrentUser | null | undefined,
  operationCode: string,
  request: ClientRequestPayload
): SafeCreatePendingScope {
  const values = request as ClientRequestPayload & {
    warehouseNo?: unknown;
    sourceWarehouseNo?: unknown;
  };
  const rawWarehouseNo = values.warehouseNo ?? values.sourceWarehouseNo;
  const warehouseNo = Number(rawWarehouseNo);

  return {
    userId: buildSafeCreateUserId(user),
    clientType: 'web',
    warehouseNo: Number.isFinite(warehouseNo) && warehouseNo > 0 ? Math.trunc(warehouseNo) : 0,
    operationCode
  };
}

function normalizeScopePart(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function isPendingRecord<TRequest extends ClientRequestPayload>(
  value: unknown
): value is SafeCreatePendingRecord<TRequest> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<SafeCreatePendingRecord<TRequest>>;
  return record.version === STORAGE_VERSION
    && !!record.scope
    && typeof record.scope.userId === 'string'
    && (record.scope.clientType === 'web' || record.scope.clientType === 'terminal')
    && typeof record.scope.warehouseNo === 'number'
    && Number.isFinite(record.scope.warehouseNo)
    && typeof record.scope.operationCode === 'string'
    && !!record.request
    && typeof record.request === 'object'
    && typeof record.request.clientRequestId === 'string'
    && (record.state === 'pending' || record.state === 'needsReview')
    && typeof record.createdAtUtc === 'string'
    && typeof record.updatedAtUtc === 'string';
}
