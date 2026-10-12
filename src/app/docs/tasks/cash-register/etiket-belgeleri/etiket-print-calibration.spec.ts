import { resolveEtiketPrintCalibration } from './etiket-print-calibration';

describe('resolveEtiketPrintCalibration', () => {
  it('moves the legacy A5 rack label 3mm down for calibrated warehouses', () => {
    [113, 154, 165].forEach((warehouseNo) => {
      expect(resolveEtiketPrintCalibration(warehouseNo, 'rack_label_a4')).toEqual({
        offsetXmm: 0,
        offsetYmm: 3
      });
    });
  });

  it('keeps other warehouses at the physical zero point', () => {
    expect(resolveEtiketPrintCalibration(120, 'rack_label_a4')).toEqual({
      offsetXmm: 0,
      offsetYmm: 0
    });
  });

  it('does not apply the legacy correction to the physical A5 feed layout', () => {
    expect(resolveEtiketPrintCalibration(165, 'rack_label_a5_landscape')).toEqual({
      offsetXmm: 0,
      offsetYmm: 0
    });
  });
});
