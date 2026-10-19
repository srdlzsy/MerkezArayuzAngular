import {
  buildPackageQuantityMessage,
  getPackageQuantityViolation,
} from './warehouse-order-package.rules';

describe('warehouse order package rules', () => {
  it('accepts exact package multiples', () => {
    expect(getPackageQuantityViolation(18, 9)).toBeNull();
    expect(getPackageQuantityViolation(3.6, 1.2)).toBeNull();
  });

  it('returns the nearest valid quantities', () => {
    expect(getPackageQuantityViolation(10, 9)).toEqual({
      quantity: 10,
      packageFactor: 9,
      lowerQuantity: 9,
      upperQuantity: 18,
    });
  });

  it('does not suggest zero packages', () => {
    const violation = getPackageQuantityViolation(1, 20);

    expect(violation?.lowerQuantity).toBeNull();
    expect(violation?.upperQuantity).toBe(20);
    expect(violation ? buildPackageQuantityMessage(violation, 'ADET') : '').toContain(
      '1 yerine 20 girin',
    );
  });
});
