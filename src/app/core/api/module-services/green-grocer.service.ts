import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  GreenGrocerProductCaseProfileDto,
  GreenGrocerProductCaseProfileListHttpRequest,
  GreenGrocerProductCaseResolutionDto,
  GreenGrocerProductCaseResolutionHttpRequest,
  IFurpaGreenGrocerBranchReportItemApiDto,
  IFurpaGreenGrocerBranchReportResponseApiDto,
  IFurpaGreenGrocerDeleteOrderResponseApiDto,
  IFurpaGreenGrocerProductReportApiResponse,
  IFurpaGreenGrocerSummaryReportItemApiDto,
  SaveGreenGrocerProductCaseProfileHttpRequest
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class GreenGrocerService extends BaseApiService {
  private readonly productCaseProfilesPath = 'green-grocer/product-case-profiles';

  getSummary(date: string): Observable<IFurpaGreenGrocerSummaryReportItemApiDto[]> {
    return this.getWithQuery<IFurpaGreenGrocerSummaryReportItemApiDto[]>(
      'green-grocer/reports/summary',
      { date }
    );
  }

  getByBranch(date: string): Observable<IFurpaGreenGrocerBranchReportResponseApiDto> {
    return this.getWithQuery<IFurpaGreenGrocerBranchReportResponseApiDto>(
      'green-grocer/reports/by-branch',
      { date }
    );
  }

  getByProduct(date: string): Observable<IFurpaGreenGrocerProductReportApiResponse> {
    return this.getWithQuery<IFurpaGreenGrocerProductReportApiResponse>(
      'green-grocer/reports/by-product',
      { date }
    );
  }

  getGreens(date: string): Observable<IFurpaGreenGrocerBranchReportItemApiDto[]> {
    return this.getWithQuery<IFurpaGreenGrocerBranchReportItemApiDto[]>(
      'green-grocer/reports/greens',
      { date }
    );
  }

  deleteOrder(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number | null
  ): Observable<IFurpaGreenGrocerDeleteOrderResponseApiDto> {
    const query = new URLSearchParams({
      documentSerie,
      documentOrderNo: String(documentOrderNo)
    });

    if (warehouseNo !== null && warehouseNo !== undefined && Number.isFinite(warehouseNo)) {
      query.set('warehouseNo', String(warehouseNo));
    }

    return this.delete<IFurpaGreenGrocerDeleteOrderResponseApiDto>(
      `green-grocer/orders?${query.toString()}`
    );
  }

  getProductCaseProfiles(
    request: GreenGrocerProductCaseProfileListHttpRequest = {}
  ): Observable<GreenGrocerProductCaseProfileDto[]> {
    return this.getWithQuery<
      GreenGrocerProductCaseProfileDto[],
      GreenGrocerProductCaseProfileListHttpRequest
    >(this.productCaseProfilesPath, request);
  }

  getProductCaseProfile(stockCode: string): Observable<GreenGrocerProductCaseProfileDto> {
    return this.get<GreenGrocerProductCaseProfileDto>(
      `${this.productCaseProfilesPath}/${encodeURIComponent(stockCode.trim())}`
    );
  }

  saveProductCaseProfile(
    stockCode: string,
    request: SaveGreenGrocerProductCaseProfileHttpRequest
  ): Observable<GreenGrocerProductCaseProfileDto> {
    return this.put<GreenGrocerProductCaseProfileDto, SaveGreenGrocerProductCaseProfileHttpRequest>(
      `${this.productCaseProfilesPath}/${encodeURIComponent(stockCode.trim())}`,
      request
    );
  }

  deleteProductCaseProfile(stockCode: string): Observable<void> {
    return this.delete<void>(
      `${this.productCaseProfilesPath}/${encodeURIComponent(stockCode.trim())}`
    );
  }

  previewProductCaseResolution(
    request: GreenGrocerProductCaseResolutionHttpRequest
  ): Observable<GreenGrocerProductCaseResolutionDto> {
    return this.post<
      GreenGrocerProductCaseResolutionDto,
      GreenGrocerProductCaseResolutionHttpRequest
    >(`${this.productCaseProfilesPath}/resolution-preview`, request);
  }
}
