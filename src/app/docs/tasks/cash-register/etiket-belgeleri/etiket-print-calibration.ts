export interface EtiketPrintCalibration {
  readonly offsetXmm: number;
  readonly offsetYmm: number;
}

const DEFAULT_CALIBRATION: EtiketPrintCalibration = {
  offsetXmm: 0,
  offsetYmm: 0
};

const WAREHOUSE_CALIBRATIONS: Readonly<
  Record<number, Readonly<Record<string, EtiketPrintCalibration>>>
> = {
  113: {
    rack_label_a4: {
      offsetXmm: 0,
      offsetYmm: 3
    }
  },
  154: {
    rack_label_a4: {
      offsetXmm: 0,
      offsetYmm: 3
    }
  },
  165: {
    rack_label_a4: {
      offsetXmm: 0,
      offsetYmm: 3
    }
  }
};

export function resolveEtiketPrintCalibration(
  warehouseNo: number | null | undefined,
  labelType: string | null | undefined
): EtiketPrintCalibration {
  if (warehouseNo === null || warehouseNo === undefined || !labelType) {
    return DEFAULT_CALIBRATION;
  }

  return WAREHOUSE_CALIBRATIONS[warehouseNo]?.[labelType] ?? DEFAULT_CALIBRATION;
}
