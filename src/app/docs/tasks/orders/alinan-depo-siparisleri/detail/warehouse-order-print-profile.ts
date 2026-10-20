import type { WarehouseOrderHeaderDto } from '@interfaces';

export interface WarehouseOrderPrintProfile {
  warehouseNo: number;
  title: string;
  buttonLabel: string;
  fallbackWarehouseName: string;
}

const WAREHOUSE_ORDER_PRINT_PROFILES: readonly WarehouseOrderPrintProfile[] = [
  {
    warehouseNo: 56,
    title: 'Manav Siparis Formu',
    buttonLabel: 'Manav Siparis Formu',
    fallbackWarehouseName: 'MANAV DEPO'
  },
  {
    warehouseNo: 53,
    title: 'Et-Sarkuteri Siparis Formu',
    buttonLabel: 'Et-Sarkuteri Siparis Formu',
    fallbackWarehouseName: 'ET-SARKUTERI DEPO'
  },
  {
    warehouseNo: 62,
    title: 'Unlu Uretim Siparis Formu',
    buttonLabel: 'Unlu Uretim Siparis Formu',
    fallbackWarehouseName: 'UNLU URETIM - ALEMDAR'
  }
];

export function resolveWarehouseOrderPrintProfile(
  header: WarehouseOrderHeaderDto
): WarehouseOrderPrintProfile | null {
  const warehouseNumbers = [
    header.outWarehouseNo,
    header.warehouseNo,
    header.relatedWarehouseNo,
    header.inWarehouseNo
  ];

  for (const warehouseNo of warehouseNumbers) {
    const profile = WAREHOUSE_ORDER_PRINT_PROFILES.find(
      (candidate) => candidate.warehouseNo === warehouseNo
    );

    if (profile) {
      return profile;
    }
  }

  return null;
}
