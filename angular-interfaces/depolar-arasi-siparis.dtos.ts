/**
 * Legacy warehouse order DTO aliases.
 * Canonical API contracts live in `siparis-islemleri.dtos.ts`.
 */

import type {
  CreateIssuedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderLineHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  ConvertSuggestedWarehouseOrderHttpRequest,
  ConvertSuggestedWarehouseOrderLineHttpRequest,
  SuggestedWarehouseOrderListHttpRequest,
  SuggestedWarehouseOrderListItemDto,
  WarehouseOrderDetailDto,
  WarehouseOrderHeaderDto,
  WarehouseOrderLineItemDto,
  WarehouseOrderListItemDto
} from './siparis-islemleri.dtos';

export type IFurpaWarehouseOrderListItemApiDto = WarehouseOrderListItemDto;
export type IFurpaWarehouseOrderHeaderApiDto = WarehouseOrderHeaderDto;
export type IFurpaWarehouseOrderItemApiDto = WarehouseOrderLineItemDto;
export type IFurpaWarehouseOrderDetailApiDto = WarehouseOrderDetailDto;
export type IFurpaCreateWarehouseOrderLineRequestApiDto = CreateIssuedWarehouseOrderLineHttpRequest;
export type IFurpaCreateWarehouseOrderRequestApiDto = CreateIssuedWarehouseOrderHttpRequest;
export type IFurpaCreateWarehouseOrderResponseApiDto = CreateIssuedWarehouseOrderResponse;
export type IFurpaSuggestedWarehouseOrderListItemApiDto = SuggestedWarehouseOrderListItemDto;
export type IFurpaSuggestedWarehouseOrderListRequestApiDto =
  SuggestedWarehouseOrderListHttpRequest;
export type IFurpaConvertSuggestedWarehouseOrderRequestApiDto =
  ConvertSuggestedWarehouseOrderHttpRequest;
export type IFurpaConvertSuggestedWarehouseOrderLineRequestApiDto =
  ConvertSuggestedWarehouseOrderLineHttpRequest;
