import type { WarehouseOrderHeaderDto } from '@interfaces';

import { resolveWarehouseOrderPrintProfile } from './warehouse-order-print-profile';

describe('resolveWarehouseOrderPrintProfile', () => {
  function createHeader(overrides: Partial<WarehouseOrderHeaderDto>): WarehouseOrderHeaderDto {
    return {
      ...overrides
    } as WarehouseOrderHeaderDto;
  }

  it('selects the Manav print form for warehouse 56', () => {
    const profile = resolveWarehouseOrderPrintProfile(
      createHeader({ outWarehouseNo: 56, inWarehouseNo: 120 })
    );

    expect(profile?.title).toBe('Manav Siparis Formu');
  });

  it('selects the Et-Sarkuteri print form for warehouse 53', () => {
    const profile = resolveWarehouseOrderPrintProfile(
      createHeader({ relatedWarehouseNo: 53, warehouseNo: 120 })
    );

    expect(profile?.title).toBe('Et-Sarkuteri Siparis Formu');
  });

  it('does not offer a special print form for other warehouses', () => {
    const profile = resolveWarehouseOrderPrintProfile(
      createHeader({ outWarehouseNo: 50, inWarehouseNo: 120 })
    );

    expect(profile).toBeNull();
  });
});
