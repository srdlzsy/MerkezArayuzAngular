import { Injectable, signal } from '@angular/core';

import type { CurrentUser } from '../../../../core/auth/models/auth.models';
import { buildSafeCreateUserId } from '../safe-create-pending.store';

const STORAGE_PREFIX = 'furpa.create-draft.v1.';
const STORAGE_VERSION = 1;
const MAX_TITLE_LENGTH = 100;

export const MAX_BROWSER_CREATE_DRAFTS_PER_MODULE = 5;

export interface BrowserCreateDraftScope {
  userId: string;
  moduleCode: string;
  operationCode: string;
  warehouseNo: number;
}

export interface BrowserCreateDraftRecord<TPayload = unknown> {
  version: 1;
  id: string;
  scope: BrowserCreateDraftScope;
  title: string;
  lineCount: number;
  payload: TPayload;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export type BrowserCreateDraftSaveResult<TPayload> =
  | { ok: true; record: BrowserCreateDraftRecord<TPayload> }
  | { ok: false; reason: 'limit' | 'storage' };

export interface BrowserCreateDraftInput<TPayload> {
  id?: string | null;
  title: string;
  lineCount: number;
  payload: TPayload;
}

@Injectable({ providedIn: 'root' })
export class BrowserCreateDraftStore {
  private readonly revision = signal(0);

  save<TPayload>(
    scope: BrowserCreateDraftScope,
    input: BrowserCreateDraftInput<TPayload>
  ): BrowserCreateDraftSaveResult<TPayload> {
    const id = input.id?.trim() || createDraftId();
    const existing = this.read<TPayload>(scope, id);

    if (!existing && this.countForModule(scope.userId, scope.moduleCode) >= MAX_BROWSER_CREATE_DRAFTS_PER_MODULE) {
      return { ok: false, reason: 'limit' };
    }

    const now = new Date().toISOString();
    const record: BrowserCreateDraftRecord<TPayload> = {
      version: STORAGE_VERSION,
      id,
      scope: normalizeScope(scope),
      title: normalizeTitle(input.title),
      lineCount: normalizeLineCount(input.lineCount),
      payload: input.payload,
      createdAtUtc: existing?.createdAtUtc ?? now,
      updatedAtUtc: now
    };

    try {
      localStorage.setItem(this.buildStorageKey(scope, id), JSON.stringify(record));
      this.touch();
      return { ok: true, record };
    } catch {
      return { ok: false, reason: 'storage' };
    }
  }

  read<TPayload>(
    scope: Pick<BrowserCreateDraftScope, 'userId' | 'moduleCode' | 'operationCode'>,
    id: string
  ): BrowserCreateDraftRecord<TPayload> | null {
    this.revision();
    return this.readByKey<TPayload>(this.buildStorageKey(scope, id));
  }

  listForOperation<TPayload>(
    scope: Pick<BrowserCreateDraftScope, 'userId' | 'moduleCode' | 'operationCode'>
  ): BrowserCreateDraftRecord<TPayload>[] {
    this.revision();
    return this.listAll<TPayload>().filter((record) =>
      sameScopePart(record.scope.userId, scope.userId)
      && sameScopePart(record.scope.moduleCode, scope.moduleCode)
      && sameScopePart(record.scope.operationCode, scope.operationCode)
    );
  }

  countForModule(userId: string, moduleCode: string): number {
    this.revision();
    return this.listAll().filter((record) =>
      sameScopePart(record.scope.userId, userId)
      && sameScopePart(record.scope.moduleCode, moduleCode)
    ).length;
  }

  remove(
    scope: Pick<BrowserCreateDraftScope, 'userId' | 'moduleCode' | 'operationCode'>,
    id: string
  ): void {
    try {
      localStorage.removeItem(this.buildStorageKey(scope, id));
    } catch {
      // A stale local draft is safer than interrupting the user's create flow.
    }
    this.touch();
  }

  private listAll<TPayload = unknown>(): BrowserCreateDraftRecord<TPayload>[] {
    const records: BrowserCreateDraftRecord<TPayload>[] = [];

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(STORAGE_PREFIX)) {
          continue;
        }

        const record = this.readByKey<TPayload>(key);
        if (record) {
          records.push(record);
        }
      }
    } catch {
      return [];
    }

    return records.sort((left, right) => right.updatedAtUtc.localeCompare(left.updatedAtUtc));
  }

  private readByKey<TPayload>(key: string): BrowserCreateDraftRecord<TPayload> | null {
    try {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) {
        return null;
      }

      const value = JSON.parse(rawValue) as unknown;
      return isDraftRecord<TPayload>(value) ? value : null;
    } catch {
      return null;
    }
  }

  private buildStorageKey(
    scope: Pick<BrowserCreateDraftScope, 'userId' | 'moduleCode' | 'operationCode'>,
    id: string
  ): string {
    return `${STORAGE_PREFIX}${[
      scope.userId,
      scope.moduleCode,
      scope.operationCode,
      id
    ].map((value) => encodeURIComponent(normalizeScopePart(value))).join('.')}`;
  }

  private touch(): void {
    this.revision.update((value) => value + 1);
  }
}

export function buildBrowserCreateDraftScope(
  user: CurrentUser | null | undefined,
  moduleCode: string,
  operationCode: string,
  warehouseNo?: number | null
): BrowserCreateDraftScope {
  const normalizedWarehouseNo = Number(warehouseNo ?? user?.depoNo ?? 0);

  return {
    userId: buildSafeCreateUserId(user),
    moduleCode,
    operationCode,
    warehouseNo: Number.isFinite(normalizedWarehouseNo) && normalizedWarehouseNo > 0
      ? Math.trunc(normalizedWarehouseNo)
      : 0
  };
}

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeScope(scope: BrowserCreateDraftScope): BrowserCreateDraftScope {
  return {
    userId: scope.userId.trim(),
    moduleCode: scope.moduleCode.trim(),
    operationCode: scope.operationCode.trim(),
    warehouseNo: Number.isFinite(scope.warehouseNo) && scope.warehouseNo > 0
      ? Math.trunc(scope.warehouseNo)
      : 0
  };
}

function normalizeTitle(value: string): string {
  return (value.trim() || 'Adsiz taslak').slice(0, MAX_TITLE_LENGTH);
}

function normalizeLineCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizeScopePart(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function sameScopePart(left: string, right: string): boolean {
  return normalizeScopePart(left) === normalizeScopePart(right);
}

function isDraftRecord<TPayload>(value: unknown): value is BrowserCreateDraftRecord<TPayload> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<BrowserCreateDraftRecord<TPayload>>;
  return record.version === STORAGE_VERSION
    && typeof record.id === 'string'
    && !!record.id.trim()
    && !!record.scope
    && typeof record.scope.userId === 'string'
    && typeof record.scope.moduleCode === 'string'
    && typeof record.scope.operationCode === 'string'
    && typeof record.scope.warehouseNo === 'number'
    && typeof record.title === 'string'
    && typeof record.lineCount === 'number'
    && 'payload' in record
    && typeof record.createdAtUtc === 'string'
    && typeof record.updatedAtUtc === 'string';
}
