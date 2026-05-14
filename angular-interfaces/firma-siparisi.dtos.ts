/**
 * Legacy company order DTO aliases.
 * Canonical API contracts live in `siparis-islemleri.dtos.ts`.
 */

import type {
  CompanyOrderDetailDto,
  CompanyOrderHeaderDto,
  CompanyOrderLineItemDto,
  CompanyOrderListItemDto,
  CreateIssuedCompanyOrderHttpRequest,
  CreateIssuedCompanyOrderLineHttpRequest,
  CreateIssuedCompanyOrderResponse
} from './siparis-islemleri.dtos';

export type IFurpaCompanyOrderListItemApiDto = CompanyOrderListItemDto;
export type IFurpaCompanyOrderHeaderApiDto = CompanyOrderHeaderDto;
export type IFurpaCompanyOrderItemApiDto = CompanyOrderLineItemDto;
export type IFurpaCompanyOrderDetailApiDto = CompanyOrderDetailDto;
export type IFurpaCreateCompanyOrderLineRequestApiDto = CreateIssuedCompanyOrderLineHttpRequest;
export type IFurpaCreateCompanyOrderRequestApiDto = CreateIssuedCompanyOrderHttpRequest;
export type IFurpaCreateCompanyOrderResponseApiDto = CreateIssuedCompanyOrderResponse;
