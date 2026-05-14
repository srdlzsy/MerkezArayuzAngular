/**
 * Legacy arama DTO aliases.
 * Canonical API contracts live in `arama-islemleri.dtos.ts`.
 */

import type {
  CustomerLookupItemDto,
  CustomerSearchHttpRequest,
  ProductLookupItemDto,
  ProductSearchHttpRequest,
  WarehouseLookupItemDto,
  WarehouseSearchHttpRequest
} from './arama-islemleri.dtos';

export type IFurpaProductSearchQueryApiDto = ProductSearchHttpRequest;
export type IFurpaProductSearchItemApiDto = ProductLookupItemDto;
export type IFurpaCustomerSearchQueryApiDto = CustomerSearchHttpRequest;
export type IFurpaCustomerSearchItemApiDto = CustomerLookupItemDto;
export type IFurpaWarehouseSearchQueryApiDto = WarehouseSearchHttpRequest;
export type IFurpaWarehouseSearchItemApiDto = WarehouseLookupItemDto;
