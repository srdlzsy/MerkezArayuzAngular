/**
 * Legacy company order DTO aliases.
 * Canonical API contracts live in `siparis-islemleri.dtos.ts`.
 */

import type {
  CompanyOrderDetailDto,
  CompanyOrderHeaderDto,
  CompanyOrderLineItemDto,
  CompanyOrderListItemDto,
  CompanyOrderCustomerProductDto,
  CompanyOrderCustomerProductListHttpRequest,
  ConvertSuggestedCompanyOrderHttpRequest,
  ConvertSuggestedCompanyOrderLineHttpRequest,
  CreateIssuedCompanyOrderHttpRequest,
  CreateIssuedCompanyOrderLineHttpRequest,
  CreateIssuedCompanyOrderResponse,
  SuggestedCompanyOrderListHttpRequest,
  SuggestedCompanyOrderListItemDto
} from './siparis-islemleri.dtos';

export type IFurpaCompanyOrderListItemApiDto = CompanyOrderListItemDto;
export type IFurpaCompanyOrderHeaderApiDto = CompanyOrderHeaderDto;
export type IFurpaCompanyOrderItemApiDto = CompanyOrderLineItemDto;
export type IFurpaCompanyOrderDetailApiDto = CompanyOrderDetailDto;
export type IFurpaCreateCompanyOrderLineRequestApiDto = CreateIssuedCompanyOrderLineHttpRequest;
export type IFurpaCreateCompanyOrderRequestApiDto = CreateIssuedCompanyOrderHttpRequest;
export type IFurpaCreateCompanyOrderResponseApiDto = CreateIssuedCompanyOrderResponse;
export type IFurpaCompanyOrderCustomerProductApiDto = CompanyOrderCustomerProductDto;
export type IFurpaCompanyOrderCustomerProductListRequestApiDto =
  CompanyOrderCustomerProductListHttpRequest;
export type IFurpaSuggestedCompanyOrderListItemApiDto = SuggestedCompanyOrderListItemDto;
export type IFurpaSuggestedCompanyOrderListRequestApiDto = SuggestedCompanyOrderListHttpRequest;
export type IFurpaConvertSuggestedCompanyOrderRequestApiDto =
  ConvertSuggestedCompanyOrderHttpRequest;
export type IFurpaConvertSuggestedCompanyOrderLineRequestApiDto =
  ConvertSuggestedCompanyOrderLineHttpRequest;
