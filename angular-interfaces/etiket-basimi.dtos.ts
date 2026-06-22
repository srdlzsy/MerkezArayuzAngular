/**
 * Legacy label DTO aliases plus minimal UI-only extensions.
 * Canonical API contracts live in `stok-islemleri.dtos.ts`.
 */

import type {
  LabelDocumentListItemDto,
  LabelDocumentProductDto,
  LabelPriceChangedProductDto,
  LabelTagDto,
  KunyeLabelTagDto
} from './stok-islemleri.dtos';

export type IFurpaLabelDocumentListItemApiDto = LabelDocumentListItemDto;
export type IFurpaLabelDocumentProductApiDto = LabelDocumentProductDto;
export type IFurpaLabelPriceChangedProductApiDto = LabelPriceChangedProductDto;
export type IFurpaLabelTagApiDto = LabelTagDto;
export type IFurpaKunyeLabelTagApiDto = KunyeLabelTagDto;

export type IEtiketBasimProduct = IFurpaLabelDocumentProductApiDto & {
  productPriceDocNumber?: string;
  promotionPrice?: number;
  expirationDate?: string;
  productImage?: string;
};

export type ILabelDocument = IFurpaLabelDocumentListItemApiDto;

export interface IProductPromotion {
  discountAmount: number;
  discountRate: number;
  productPluNo: number;
  expirationDate: string;
}

export type IKunyeTag = IFurpaLabelTagApiDto & {
  productionNeighborhood?: string;
  customTax?: number | null;
  vat?: number | null;
  createdDate?: string | null;
  printDate?: string | null;
};

export type IManavKunyeTag = IFurpaKunyeLabelTagApiDto & IKunyeTag;
