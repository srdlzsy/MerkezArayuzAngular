/**
 * Stock receipt and virman API DTO aliases.
 */

import type {
  CreateStockReceiptHttpRequest,
  CreateStockReceiptLineHttpRequest,
  CreateStockReceiptResponse,
  CreateVirmanHttpRequest,
  CreateVirmanLineHttpRequest,
  CreateVirmanResponse,
  StockReceiptDetailDto,
  StockReceiptLineItemDto,
  StockReceiptListItemDto,
  VirmanDetailDto,
  VirmanLineItemDto,
  VirmanListItemDto
} from './stok-islemleri.dtos';

export type IFurpaStockReceiptListItemApiDto = StockReceiptListItemDto;
export type IFurpaStockReceiptItemApiDto = StockReceiptLineItemDto;
export type IFurpaStockReceiptDetailApiDto = StockReceiptDetailDto;
export type IFurpaCreateStockReceiptLineRequestApiDto = CreateStockReceiptLineHttpRequest;
export type IFurpaCreateStockReceiptRequestApiDto = CreateStockReceiptHttpRequest;
export type IFurpaCreateStockReceiptResponseApiDto = CreateStockReceiptResponse;
export type IFurpaVirmanListItemApiDto = VirmanListItemDto;
export type IFurpaVirmanItemApiDto = VirmanLineItemDto;
export type IFurpaVirmanDetailApiDto = VirmanDetailDto;
export type IFurpaCreateVirmanLineRequestApiDto = CreateVirmanLineHttpRequest;
export type IFurpaCreateVirmanRequestApiDto = CreateVirmanHttpRequest;
export type IFurpaCreateVirmanResponseApiDto = CreateVirmanResponse;
