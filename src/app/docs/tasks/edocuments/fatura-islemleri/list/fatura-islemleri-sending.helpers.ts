import type {
  InvoiceSendingListItemDto,
  InvoiceSendingScenarioDto
} from '../../../../../core/api/module-services/fatura-islemleri.service';
import { formatDateOnly, type FurpaDateRange } from '../../../../../core/api/furpa-merkez-api.utils';

export type SendingSortKey =
  | 'invoiceId'
  | 'customerTitle'
  | 'documentDate'
  | 'isSent'
  | 'scenario'
  | 'payableTotal';

export type SortDirection = 'asc' | 'desc';

export interface SendingSortState {
  key: SendingSortKey;
  direction: SortDirection;
}

export type SendingStatusFilterType = 'all' | 'unsent' | 'sent' | 'attention';

export const INVOICE_STATUS_CODE_LABELS: Record<string, string> = {
  NotPrepared: 'Hazirlanmadi',
  NotSend: 'Gonderilmedi',
  Draft: 'Taslak',
  Canceled: 'Iptal Edildi',
  Queued: 'Kuyrukta',
  Processing: 'Isleniyor',
  SentToGib: "GIB'e Gonderildi",
  Approved: 'Onaylandi',
  WaitingForAprovement: 'Onay Bekliyor',
  Declined: 'Reddedildi',
  Return: 'Iade Edildi',
  EArchivedCanceled: 'E-Arsiv Iptal',
  Error: 'Hata',
  '1000': 'Onaylandi',
  '1100': 'Onay Bekliyor',
  '1200': 'Reddedildi',
  '1300': 'Iade Edildi',
  '1400': 'E-Arsiv Iptal',
  '2000': 'Hata'
};

export function resolveSendingDatePreset(
  preset: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth',
  now = new Date()
): FurpaDateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);

  if (preset === 'today') {
    start = today;
    end = today;
  } else if (preset === 'yesterday') {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    end = start;
  } else if (preset === 'thisWeek') {
    const day = today.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);
    end = today;
  } else if (preset === 'thisMonth') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = today;
  }

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end)
  };
}

export function filterSendingItemsByStatus(
  items: InvoiceSendingListItemDto[],
  status: SendingStatusFilterType,
  hasReceiverAddress: (item: InvoiceSendingListItemDto) => boolean
): InvoiceSendingListItemDto[] {
  if (status === 'unsent') {
    return items.filter((item) => !item.isSent);
  }
  if (status === 'sent') {
    return items.filter((item) => item.isSent);
  }
  if (status === 'attention') {
    return items.filter((item) => !item.isSent && !hasReceiverAddress(item));
  }
  return items;
}

export function compareSendingSortValue(
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined
): number {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined || left === '') {
    return 1;
  }

  if (right === null || right === undefined || right === '') {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right), 'tr-TR', {
    numeric: true,
    sensitivity: 'base'
  });
}

export function getSendingSortValue(
  item: InvoiceSendingListItemDto,
  key: SendingSortKey,
  getScenarioLabel: (scenario: unknown) => string,
  getSendingPayableTotal: (item: InvoiceSendingListItemDto) => number
): string | number | boolean | null {
  switch (key) {
    case 'invoiceId':
      return item.invoiceId;
    case 'customerTitle':
      return item.customerTitle;
    case 'documentDate':
      return item.documentDate ? new Date(item.documentDate).getTime() : null;
    case 'isSent':
      return item.isSent;
    case 'scenario':
      return getScenarioLabel(item.scenario);
    case 'payableTotal':
      return getSendingPayableTotal(item);
  }
}

export function sortSendingItems(
  items: InvoiceSendingListItemDto[],
  sort: SendingSortState,
  getScenarioLabel: (scenario: unknown) => string,
  getSendingPayableTotal: (item: InvoiceSendingListItemDto) => number
): InvoiceSendingListItemDto[] {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...items].sort((left, right) => {
    const result = compareSendingSortValue(
      getSendingSortValue(left, sort.key, getScenarioLabel, getSendingPayableTotal),
      getSendingSortValue(right, sort.key, getScenarioLabel, getSendingPayableTotal)
    );

    if (result !== 0) {
      return result * direction;
    }

    return compareSendingSortValue(left.invoiceId, right.invoiceId);
  });
}

export function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getSendingGrossTotal(item: InvoiceSendingListItemDto): number {
  const grossTotal = toFiniteNumber(item.grossTotal);
  return grossTotal !== null
    ? grossTotal
    : getSendingLineExtensionTotal(item) + getSendingDiscountTotal(item);
}

export function getSendingDiscountTotal(item: InvoiceSendingListItemDto): number {
  return toFiniteNumber(item.discountTotal) ?? 0;
}

export function getSendingLineExtensionTotal(item: InvoiceSendingListItemDto): number {
  return toFiniteNumber(item.lineExtensionTotal) ?? 0;
}

export function getSendingTaxTotal(item: InvoiceSendingListItemDto): number {
  return toFiniteNumber(item.taxTotal) ?? 0;
}

export function getSendingPayableTotal(item: InvoiceSendingListItemDto): number {
  const payableTotal = toFiniteNumber(item.payableTotal);
  if (payableTotal !== null) {
    return payableTotal;
  }
  return (
    getSendingLineExtensionTotal(item) +
    getSendingTaxTotal(item) +
    (toFiniteNumber(item.chargeTotal) ?? 0)
  );
}

export function getInvoiceScenario(value: unknown): InvoiceSendingScenarioDto | null {
  if (value === 'EFatura' || value === 'EArsiv') {
    return value;
  }
  const normalized = typeof value === 'string' ? value.trim().toLocaleLowerCase('tr-TR') : '';
  if (value === 0 || normalized === '0' || normalized === 'efatura') {
    return 'EFatura';
  }
  if (value === 1 || value === 2 || normalized === '1' || normalized === '2' || normalized === 'earsiv') {
    return 'EArsiv';
  }
  return null;
}

export function resolveSendingScenario(value: unknown): InvoiceSendingScenarioDto {
  return getInvoiceScenario(value) ?? 'EFatura';
}

export function isSendingDatePresetMatch(
  preset: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth',
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  now = new Date()
): boolean {
  const range = resolveSendingDatePreset(preset, now);
  return (startDate ?? '').trim() === range.startDate && (endDate ?? '').trim() === range.endDate;
}

export function sumSendingPayableTotal(items: readonly InvoiceSendingListItemDto[]): number {
  return items.reduce((sum, item) => sum + getSendingPayableTotal(item), 0);
}

export function sumSendingTaxTotal(items: readonly InvoiceSendingListItemDto[]): number {
  return items.reduce((sum, item) => sum + getSendingTaxTotal(item), 0);
}

export function sumViewingInvoiceTotal(items: readonly { invoiceTotal?: number | null }[]): number {
  return items.reduce((sum, item) => sum + (toFiniteNumber(item.invoiceTotal) ?? 0), 0);
}

export function sumViewingTaxTotal(items: readonly { taxTotal?: number | null }[]): number {
  return items.reduce((sum, item) => sum + (toFiniteNumber(item.taxTotal) ?? 0), 0);
}

export function printHtmlViaIframe(
  htmlContent: string,
  title?: string,
  timeoutMs = 15_000
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    if (title) {
      frame.title = title;
    }
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDoc = frameWindow?.document;

    if (!frameWindow || !frameDoc) {
      frame.remove();
      reject(new Error('Yazdirma alani olusturulamadi.'));
      return;
    }

    let settled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let resolveTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
      }
      if (resolveTimer !== undefined) {
        clearTimeout(resolveTimer);
      }
      try {
        frameWindow.removeEventListener('afterprint', onAfterPrint);
      } catch {}
      setTimeout(() => {
        try {
          frame.remove();
        } catch {}
      }, 1000);

      // Hata varsa reddet; aksi halde toplu yazdirma hatali faturayi basarili sayar.
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };
    const onAfterPrint = () => cleanup();

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    try {
      frameWindow.addEventListener('afterprint', onAfterPrint, { once: true });
    } catch {}

    fallbackTimer = setTimeout(() => cleanup(), timeoutMs);

    setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
        resolveTimer = setTimeout(() => cleanup(), 300);
      } catch (err) {
        cleanup(err instanceof Error ? err : new Error('Yazdirma baslatilamadi.'));
      }
    }, 300);
  });
}




