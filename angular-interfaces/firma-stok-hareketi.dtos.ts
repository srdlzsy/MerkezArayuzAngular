/**
 * Company movement API DTO aliases.
 */

import type {
  CompanyMovementDetailDto,
  CompanyMovementHeaderDto,
  CompanyMovementLineItemDto,
  CompanyMovementListItemDto,
  CreateCompanyMovementHttpRequest,
  CreateCompanyMovementLineHttpRequest,
  CreateCompanyMovementResponse,
  CreateCompanyReceivingHttpRequest,
  CreateCompanyReceivingLineHttpRequest,
  CreateCompanyReceivingLineResultDto,
  CreateCompanyReceivingResponse,
  SendEDespatchHttpRequest,
  SendEDespatchResponse
} from './sevk-iade-malkabul.dtos';

export type IFurpaCompanyMovementListItemApiDto = CompanyMovementListItemDto;
export type IFurpaCompanyMovementHeaderApiDto = CompanyMovementHeaderDto;
export type IFurpaCompanyMovementItemApiDto = CompanyMovementLineItemDto;
export type IFurpaCompanyMovementDetailApiDto = CompanyMovementDetailDto;
export type IFurpaCreateCompanyShipmentLineRequestApiDto = CreateCompanyMovementLineHttpRequest;
export type IFurpaCreateCompanyShipmentRequestApiDto = CreateCompanyMovementHttpRequest;
export type IFurpaCreateCompanyShipmentResponseApiDto = CreateCompanyMovementResponse;
export type IFurpaCreateCompanyReceiptLineRequestApiDto = CreateCompanyReceivingLineHttpRequest;
export type IFurpaCreateCompanyReceiptRequestApiDto = CreateCompanyReceivingHttpRequest;
export type IFurpaCreateCompanyReceiptResponseLineApiDto = CreateCompanyReceivingLineResultDto;
export type IFurpaCreateCompanyReceiptResponseApiDto = CreateCompanyReceivingResponse;
export type IFurpaEDespatchRequestApiDto = SendEDespatchHttpRequest;
export type IFurpaEDespatchResponseApiDto = SendEDespatchResponse;
export type IFurpaCreateCompanyMovementRequestApiDto = CreateCompanyMovementHttpRequest;
export type IFurpaCreateCompanyMovementResponseApiDto = CreateCompanyMovementResponse;
export type IFurpaSendEDespatchRequestApiDto = SendEDespatchHttpRequest;
export type IFurpaSendEDespatchResponseApiDto = SendEDespatchResponse;
