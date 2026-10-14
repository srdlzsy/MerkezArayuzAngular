import {
  getLabelPriceDifference,
  resolveLabelPriceChangeStatus
} from './price-change-status';

describe('price change status', () => {
  it('classifies label price records using the backend business rules', () => {
    expect(resolveLabelPriceChangeStatus({ oldPrice: 0, price: 50 })).toBe('initial');
    expect(resolveLabelPriceChangeStatus({ oldPrice: 40, price: 50 })).toBe('increased');
    expect(resolveLabelPriceChangeStatus({ oldPrice: 50, price: 40 })).toBe('decreased');
    expect(resolveLabelPriceChangeStatus({ oldPrice: 50, price: 50 })).toBe('unchanged');
  });

  it('compares numeric strings at currency precision', () => {
    expect(resolveLabelPriceChangeStatus({ oldPrice: '25.50', price: '25.50' })).toBe('unchanged');
    expect(resolveLabelPriceChangeStatus({ oldPrice: 10, price: 10.0000001 })).toBe('unchanged');
  });

  it('does not calculate a misleading difference for an initial price', () => {
    expect(getLabelPriceDifference({ oldPrice: 0, price: 50 })).toBeNull();
    expect(getLabelPriceDifference({ oldPrice: 50, price: 60 })).toBe(10);
  });
});
