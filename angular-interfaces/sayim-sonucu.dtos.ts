/**
 * Inventory count API DTO aliases.
 */

import type {
  CreateInventoryCountHttpRequest,
  CreateInventoryCountLineHttpRequest,
  CreateInventoryCountResponse,
  InventoryCountDetailDto,
  InventoryCountHeaderDto,
  InventoryCountLineItemDto,
  InventoryCountListItemDto
} from './stok-islemleri.dtos';

export type IFurpaInventoryCountListItemApiDto = InventoryCountListItemDto;
export type IFurpaInventoryCountHeaderApiDto = InventoryCountHeaderDto;
export type IFurpaInventoryCountItemApiDto = InventoryCountLineItemDto;
export type IFurpaInventoryCountDetailApiDto = InventoryCountDetailDto;
export type IFurpaCreateInventoryCountLineRequestApiDto = CreateInventoryCountLineHttpRequest;
export type IFurpaCreateInventoryCountRequestApiDto = CreateInventoryCountHttpRequest;
export type IFurpaCreateInventoryCountResponseApiDto = CreateInventoryCountResponse;
