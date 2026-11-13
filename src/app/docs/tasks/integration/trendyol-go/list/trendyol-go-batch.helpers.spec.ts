import type {
  ITrendyolGoBatchWorkflowApiDto,
  ITrendyolGoDirectPriceStockDispatchResultApiDto
} from '@interfaces';

import {
  buildTrendyolGoDirectDispatchSummary,
  resolveTrendyolGoBatchChipTone,
  resolveTrendyolGoDirectStoreLiveStatus,
  shortTrendyolGoBatchId
} from './trendyol-go-batch.helpers';

describe('trendyol-go-batch.helpers', () => {
  const dispatchResult: ITrendyolGoDirectPriceStockDispatchResultApiDto = {
    targetStoresCount: 1,
    totalItemsDispatched: 11,
    totalCatalogCreated: 0,
    storeResults: [
      {
        storeId: 101,
        warehouseNo: 50,
        storeName: 'Merkez Test Subesi',
        itemCount: 11,
        batchCount: 2,
        success: true,
        batchRequestIds: ['3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665', 'fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665'],
        catalogBatchRequestIds: [],
        workflowStatus: 'PriceStockAndSaleOffQueued'
      }
    ]
  };

  const makeWorkflow = (batchRequestId: string, status: string): ITrendyolGoBatchWorkflowApiDto => ({
    id: batchRequestId,
    kind: 'PriceStock',
    batchRequestId,
    storeId: 101,
    warehouseNo: 50,
    status,
    attemptCount: 1,
    nextAttemptAtUtc: '2026-11-12T12:00:00Z',
    createdAtUtc: '2026-11-12T11:59:00Z'
  });

  it('shortens long UUID batch IDs cleanly', () => {
    expect(shortTrendyolGoBatchId('3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665')).toBe('3b6b4a60...497665');
    expect(shortTrendyolGoBatchId('batch-1')).toBe('batch-1');
  });

  it('keeps store pending while workflows are Pending/Processing and transitions to success once all Succeeded', () => {
    const wfMap = new Map<string, ITrendyolGoBatchWorkflowApiDto>([
      ['3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665', makeWorkflow('3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665', 'Succeeded')],
      ['fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', makeWorkflow('fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', 'Processing')]
    ]);

    const pendingSummary = buildTrendyolGoDirectDispatchSummary(dispatchResult, wfMap, () => null);
    expect(pendingSummary.isPending).toBeTrue();
    expect(pendingSummary.tone).toBe('info');

    wfMap.set(
      'fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665',
      makeWorkflow('fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', 'Succeeded')
    );

    const completedSummary = buildTrendyolGoDirectDispatchSummary(dispatchResult, wfMap, () => null);
    expect(completedSummary.isPending).toBeFalse();
    expect(completedSummary.tone).toBe('success');
    expect(completedSummary.title).toBe('Trendyol Go Gonderimi Tamamlandi');

    const storeStatus = resolveTrendyolGoDirectStoreLiveStatus(dispatchResult.storeResults[0], wfMap, () => null);
    expect(storeStatus.isPending).toBeFalse();
    expect(storeStatus.tone).toBe('success');
    expect(storeStatus.label).toBe('Basariyla Tamamlandi');
  });

  it('reports warning/danger when a batch fails or partially succeeds', () => {
    const wfMap = new Map<string, ITrendyolGoBatchWorkflowApiDto>([
      ['3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665', makeWorkflow('3b6b4a60-7f98-4317-a3fa-695a9deca7c9-1794497665', 'Succeeded')],
      ['fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', makeWorkflow('fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', 'PartiallySucceeded')]
    ]);

    expect(resolveTrendyolGoBatchChipTone('fc2a8347-08a7-4240-8ab2-44652b0uc3c7-1794497665', wfMap)).toBe('warning');
    const summary = buildTrendyolGoDirectDispatchSummary(dispatchResult, wfMap, () => null);
    expect(summary.isPending).toBeFalse();
    expect(summary.tone).toBe('warning');
  });
});
