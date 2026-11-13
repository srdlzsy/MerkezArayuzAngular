import type {
  ITrendyolGoBatchWorkflowApiDto,
  ITrendyolGoDirectPriceStockDispatchResultApiDto,
  ITrendyolGoDirectStoreDispatchResultApiDto
} from '@interfaces';

export type TrendyolGoLiveTone = 'info' | 'success' | 'warning' | 'danger';

export interface ITrendyolGoDirectStoreLiveStatus {
  label: string;
  tone: TrendyolGoLiveTone;
  isPending: boolean;
  detailText: string;
}

export interface ITrendyolGoDirectDispatchLiveSummary {
  tone: TrendyolGoLiveTone;
  title: string;
  subtitle: string;
  isPending: boolean;
  pendingCount: number;
  succeededCount: number;
  warningCount: number;
  failedCount: number;
}

export interface TrendyolGoBatchSummaryInput {
  status: string;
  statusTone: 'success' | 'warning' | 'danger';
}

export function shortTrendyolGoBatchId(batchId: string): string {
  if (!batchId || batchId.length <= 16) {
    return batchId;
  }

  return `${batchId.slice(0, 8)}...${batchId.slice(-6)}`;
}

export function isTrendyolGoCatalogPending(
  result: ITrendyolGoDirectStoreDispatchResultApiDto
): boolean {
  return result.workflowStatus === 'CatalogAndPriceStockQueued';
}

export function formatTrendyolGoDirectStoreStatusLabel(
  result: ITrendyolGoDirectStoreDispatchResultApiDto
): string {
  if (result.workflowStatus === 'QueuedWithWarnings') {
    return `Kuyrukta, uyari: ${result.errorMessage || 'Bazi urunler gonderilmedi'}`;
  }

  if (result.success) {
    if (result.workflowStatus === 'CatalogAndPriceStockQueued') {
      return 'Katalog ve fiyat/stok bekleniyor';
    }
    if (result.workflowStatus === 'SaleOffQueued') {
      return 'Satis kapatma sonucu bekleniyor';
    }
    if (result.workflowStatus === 'PriceStockAndSaleOffQueued') {
      return 'Fiyat/stok ve kapatma sonucu bekleniyor';
    }
    return 'TGO sonucu bekleniyor';
  }

  if (isTrendyolGoCatalogPending(result)) {
    return 'Katalog onayi bekleniyor';
  }

  return `Hata: ${result.errorMessage || 'Gonderim tamamlanamadi'}`;
}

export function resolveTrendyolGoBatchChipTone(
  batchId: string,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  manualSummary?: TrendyolGoBatchSummaryInput | null
): TrendyolGoLiveTone {
  if (manualSummary) {
    if (manualSummary.statusTone === 'success') return 'success';
    if (manualSummary.statusTone === 'danger') return 'danger';
    if (manualSummary.status === 'COMPLETED' || manualSummary.status === 'SUCCESS') return 'warning';
  }

  const wf = workflowByBatchId.get(batchId);
  if (wf) {
    if (wf.status === 'Succeeded') return 'success';
    if (wf.status === 'PartiallySucceeded') return 'warning';
    if (wf.status === 'Failed') return 'danger';
  }

  return 'info';
}

export function resolveTrendyolGoDirectStoreLiveStatus(
  sr: ITrendyolGoDirectStoreDispatchResultApiDto,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  getManualBatchSummary: (batchId: string) => TrendyolGoBatchSummaryInput | null
): ITrendyolGoDirectStoreLiveStatus {
  if (!sr.success && !isTrendyolGoCatalogPending(sr) && sr.workflowStatus !== 'QueuedWithWarnings') {
    return {
      label: 'Hata Olustu',
      tone: 'danger',
      isPending: false,
      detailText: sr.errorMessage || 'Gonderim tamamlanamadi'
    };
  }

  const allBatchIds = [
    ...(sr.batchRequestIds || []),
    ...(sr.catalogBatchRequestIds || [])
  ];

  if (allBatchIds.length === 0) {
    if (sr.workflowStatus === 'QueuedWithWarnings') {
      return {
        label: 'Uyari ile Kuyrukta',
        tone: 'warning',
        isPending: false,
        detailText: sr.errorMessage || 'Bazi urunler gonderilmedi'
      };
    }

    return {
      label: sr.success ? 'Tamamlandi' : formatTrendyolGoDirectStoreStatusLabel(sr),
      tone: sr.success ? 'success' : 'warning',
      isPending: false,
      detailText: sr.errorMessage || ''
    };
  }

  const tones = allBatchIds.map((id) =>
    resolveTrendyolGoBatchChipTone(id, workflowByBatchId, getManualBatchSummary(id))
  );
  const hasPending = tones.some((tone) => tone === 'info');
  const hasDanger = tones.some((tone) => tone === 'danger');
  const hasWarning = tones.some((tone) => tone === 'warning');

  const workflowDetails = allBatchIds
    .map((id) => workflowByBatchId.get(id))
    .filter((wf): wf is ITrendyolGoBatchWorkflowApiDto => !!wf)
    .map((wf) => wf.lastError || wf.resultSummary || '')
    .filter(Boolean);

  if (hasPending) {
    return {
      label: formatTrendyolGoDirectStoreStatusLabel(sr),
      tone: isTrendyolGoCatalogPending(sr) ? 'warning' : 'info',
      isPending: true,
      detailText: workflowDetails[0] || sr.errorMessage || 'TGO batch sonucu bekleniyor'
    };
  }

  if (hasDanger) {
    return {
      label: 'Hata Olustu',
      tone: 'danger',
      isPending: false,
      detailText: workflowDetails[0] || sr.errorMessage || 'Batch isleminde hata olustu'
    };
  }

  if (hasWarning || sr.workflowStatus === 'QueuedWithWarnings') {
    return {
      label: 'Kismi Hata',
      tone: 'warning',
      isPending: false,
      detailText: workflowDetails[0] || sr.errorMessage || 'Bazi urunlerde uyari/hata var'
    };
  }

  return {
    label: 'Basariyla Tamamlandi',
    tone: 'success',
    isPending: false,
    detailText: workflowDetails[0] || 'Tum batch islemleri basariyla tamamlandi'
  };
}

export function buildTrendyolGoDirectDispatchSummary(
  res: ITrendyolGoDirectPriceStockDispatchResultApiDto,
  workflowByBatchId: ReadonlyMap<string, ITrendyolGoBatchWorkflowApiDto>,
  getManualBatchSummary: (batchId: string) => TrendyolGoBatchSummaryInput | null
): ITrendyolGoDirectDispatchLiveSummary {
  const statuses = res.storeResults.map((sr) =>
    resolveTrendyolGoDirectStoreLiveStatus(sr, workflowByBatchId, getManualBatchSummary)
  );
  const pendingCount = statuses.filter((s) => s.isPending).length;
  const succeededCount = statuses.filter((s) => !s.isPending && s.tone === 'success').length;
  const warningCount = statuses.filter((s) => !s.isPending && s.tone === 'warning').length;
  const failedCount = statuses.filter((s) => !s.isPending && s.tone === 'danger').length;

  let tone: TrendyolGoLiveTone = 'info';
  let title = 'Gonderim Isleniyor';
  if (pendingCount === 0) {
    if (failedCount > 0 && succeededCount === 0 && warningCount === 0) {
      tone = 'danger';
      title = 'Gonderim Basarisiz';
    } else if (failedCount > 0 || warningCount > 0) {
      tone = 'warning';
      title = 'Trendyol Go Gonderimi Kismi Hata ile Tamamlandi';
    } else {
      tone = 'success';
      title = 'Trendyol Go Gonderimi Tamamlandi';
    }
  }

  const subtitle = pendingCount > 0
    ? `${res.targetStoresCount} magaza, ${res.totalItemsDispatched} urun TGO tarafinda isleniyor (${succeededCount}/${res.storeResults.length} tamamlandi).`
    : `${res.targetStoresCount} magaza, toplam ${res.totalItemsDispatched} urun icin TGO islemi tamamlandi. Varsa sube POS aktarimi ayri izleniyor.`;

  return {
    tone,
    title,
    subtitle,
    isPending: pendingCount > 0,
    pendingCount,
    succeededCount,
    warningCount,
    failedCount
  };
}
