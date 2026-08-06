import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  GreenGrocerOperationsAdjustmentApplyDto,
  GreenGrocerOperationsAdjustmentApplyHttpRequest,
  GreenGrocerOperationsAdjustmentPreviewDto,
  GreenGrocerOperationsAdjustmentPreviewHttpRequest,
  GreenGrocerOperationsOverviewDto,
  GreenGrocerOperationsOverviewHttpRequest,
  GreenGrocerReportDateHttpRequest,
  GreenGrocerReportTypeOptionDto,
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
  private readonly operationsPath = 'green-grocer/operations';

  getTypeOptions(): Observable<GreenGrocerReportTypeOptionDto[]> {
    return this.get<GreenGrocerReportTypeOptionDto[]>('green-grocer/reports/type-options');
  }

  getSummary(
    dateOrRequest: string | GreenGrocerReportDateHttpRequest
  ): Observable<IFurpaGreenGrocerSummaryReportItemApiDto[]> {
    return this.getWithQuery<IFurpaGreenGrocerSummaryReportItemApiDto[], GreenGrocerReportDateHttpRequest>(
      'green-grocer/reports/summary',
      this.buildReportDateRequest(dateOrRequest)
    );
  }

  getByBranch(
    dateOrRequest: string | GreenGrocerReportDateHttpRequest
  ): Observable<IFurpaGreenGrocerBranchReportResponseApiDto> {
    return this.getWithQuery<IFurpaGreenGrocerBranchReportResponseApiDto, GreenGrocerReportDateHttpRequest>(
      'green-grocer/reports/by-branch',
      this.buildReportDateRequest(dateOrRequest)
    );
  }

  getByProduct(
    dateOrRequest: string | GreenGrocerReportDateHttpRequest
  ): Observable<IFurpaGreenGrocerProductReportApiResponse> {
    return this.getWithQuery<IFurpaGreenGrocerProductReportApiResponse, GreenGrocerReportDateHttpRequest>(
      'green-grocer/reports/by-product',
      this.buildReportDateRequest(dateOrRequest)
    );
  }

  getGreens(
    dateOrRequest: string | GreenGrocerReportDateHttpRequest
  ): Observable<IFurpaGreenGrocerBranchReportItemApiDto[]> {
    return this.getWithQuery<IFurpaGreenGrocerBranchReportItemApiDto[], GreenGrocerReportDateHttpRequest>(
      'green-grocer/reports/greens',
      this.buildReportDateRequest(dateOrRequest)
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

  getOperationsOverview(
    request: GreenGrocerOperationsOverviewHttpRequest
  ): Observable<GreenGrocerOperationsOverviewDto> {
    return this.getWithQuery<GreenGrocerOperationsOverviewDto, GreenGrocerOperationsOverviewHttpRequest>(
      `${this.operationsPath}/overview`,
      request
    );
  }

  previewOperationsAdjustment(
    request: GreenGrocerOperationsAdjustmentPreviewHttpRequest
  ): Observable<GreenGrocerOperationsAdjustmentPreviewDto> {
    return this.post<
      GreenGrocerOperationsAdjustmentPreviewDto,
      GreenGrocerOperationsAdjustmentPreviewHttpRequest
    >(`${this.operationsPath}/adjustments/preview`, request);
  }

  applyOperationsAdjustment(
    request: GreenGrocerOperationsAdjustmentApplyHttpRequest
  ): Observable<GreenGrocerOperationsAdjustmentApplyDto> {
    return this.post<
      GreenGrocerOperationsAdjustmentApplyDto,
      GreenGrocerOperationsAdjustmentApplyHttpRequest
    >(`${this.operationsPath}/adjustments`, request);
  }

  private buildReportDateRequest(
    dateOrRequest: string | GreenGrocerReportDateHttpRequest
  ): GreenGrocerReportDateHttpRequest {
    return typeof dateOrRequest === 'string' ? { date: dateOrRequest } : dateOrRequest;
  }
}
