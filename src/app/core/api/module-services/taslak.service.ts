import { Injectable } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';

import {
  IFurpaCompanyMovementDetailApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaCompanyOrderDetailApiDto,
  IFurpaCompanyOrderListItemApiDto,
  IFurpaWarehouseReceiptDetailApiDto,
  IFurpaWarehouseReceiptListItemApiDto,
  IFurpaWarehouseOrderDetailApiDto,
  IFurpaWarehouseOrderListItemApiDto,
  IFurpaWarehouseShippingDetailApiDto,
  IFurpaWarehouseShippingListItemApiDto
} from '@interfaces';

import { getDefaultDateRange } from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';
import { MalKabulIslemleriService } from './mal-kabul-islemleri.service';
import { SevkIslemleriService } from './sevk-islemleri.service';
import { SiparisIslemleriService } from './siparis-islemleri.service';

@Injectable({
  providedIn: 'root'
})
export class TaslakService extends BaseApiService {
  constructor(
    private readonly siparisIslemleriService: SiparisIslemleriService,
    private readonly sevkIslemleriService: SevkIslemleriService,
    private readonly malKabulIslemleriService: MalKabulIslemleriService
  ) {
    super();
  }

  getVerilenFirmaSiparisleri(
    firmaCariKod: string,
    _depoNo: number
  ): Observable<IFurpaCompanyOrderDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.getWithQuery<IFurpaCompanyOrderListItemApiDto[]>(
      'siparis-islemleri/verilen-firma-siparisleri',
      {
        StartDate: range.startDate,
        EndDate: range.endDate,
        CustomerCode: firmaCariKod,
        OnlyOpen: true
      }
    ).pipe(
      switchMap((items: IFurpaCompanyOrderListItemApiDto[]) =>
        this.collectSequentially(items, (item: IFurpaCompanyOrderListItemApiDto) =>
          this.siparisIslemleriService.getVerilenSiparisDetay(item.documentSerie, item.documentOrderNo)
        )
      )
    );
  }

  getAlinanFirmaSiparisleri(
    firmaCariKod: string,
    depoNo: number
  ): Observable<IFurpaCompanyOrderDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.siparisIslemleriService
      .getAlinanFirmaSiparisleri(depoNo, range.startDate, range.endDate, true, firmaCariKod)
      .pipe(
        switchMap((items: IFurpaCompanyOrderListItemApiDto[]) =>
          this.collectSequentially(items, (item: IFurpaCompanyOrderListItemApiDto) =>
            this.siparisIslemleriService.getAlinanSiparisDetay(
              item.documentSerie,
              item.documentOrderNo,
              depoNo
            )
          )
        )
      );
  }

  getAlinanDepoSiparisleri(
    muhatapDepo: number,
    depoNo: number
  ): Observable<IFurpaWarehouseOrderDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.siparisIslemleriService.getAlinanDepoSiparisleri(
      depoNo,
      range.startDate,
      range.endDate
    ).pipe(
      switchMap((items: IFurpaWarehouseOrderListItemApiDto[]) =>
        this.collectSequentially(
          items.filter(
            (item: IFurpaWarehouseOrderListItemApiDto) =>
              item.relatedWarehouseNo === muhatapDepo || item.inWarehouseNo === muhatapDepo
          ),
          (item: IFurpaWarehouseOrderListItemApiDto) =>
            this.siparisIslemleriService.getAlinanDepoSiparisDetay(item.documentSerie, item.documentOrderNo)
        )
      )
    );
  }

  getVerilenDepoSiparisleri(
    muhatapDepo: number,
    depoNo: number
  ): Observable<IFurpaWarehouseOrderDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.siparisIslemleriService
      .getVerilenDepoSiparisleri(depoNo, range.startDate, range.endDate)
      .pipe(
        switchMap((items: IFurpaWarehouseOrderListItemApiDto[]) =>
          this.collectSequentially(
            items.filter((item: IFurpaWarehouseOrderListItemApiDto) =>
              this.matchesWarehouseOrderCounterparty(item, muhatapDepo)
            ),
            (item: IFurpaWarehouseOrderListItemApiDto) =>
              this.siparisIslemleriService.getVerilenDepoSiparisDetay(
                item.documentSerie,
                item.documentOrderNo,
                depoNo
              )
          )
        )
      );
  }

  getFirmayaSevkler(
    firmaCariKod: string,
    depoNo: number
  ): Observable<IFurpaCompanyMovementDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.sevkIslemleriService
      .getGidenFirmaSevkleri(depoNo, range.startDate, range.endDate)
      .pipe(
        switchMap((items: IFurpaCompanyMovementListItemApiDto[]) =>
          this.collectSequentially(
            items.filter((item: IFurpaCompanyMovementListItemApiDto) =>
              this.matchesText(item.customerCode, firmaCariKod)
            ),
            (item: IFurpaCompanyMovementListItemApiDto) =>
              this.sevkIslemleriService.getSevkDetay(
                'ToptanCikisIrsaliyeleri',
                item.documentSerie,
                item.documentOrderNo
              )
          )
        )
      );
  }

  getFirmadanMalKabuller(
    firmaCariKod: string,
    depoNo: number
  ): Observable<IFurpaCompanyMovementDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.malKabulIslemleriService
      .listCompanyReceipts({
        warehouseNo: depoNo,
        startDate: range.startDate,
        endDate: range.endDate
      })
      .pipe(
        switchMap((items: IFurpaCompanyMovementListItemApiDto[]) =>
          this.collectSequentially(
            items.filter((item: IFurpaCompanyMovementListItemApiDto) =>
              this.matchesText(item.customerCode, firmaCariKod)
            ),
            (item: IFurpaCompanyMovementListItemApiDto) =>
              this.malKabulIslemleriService.getCompanyReceiptDetail(item.documentSerie, item.documentOrderNo)
          )
        )
      );
  }

  getDepoyaSevkler(
    muhatapDepoNo: number,
    depoNo: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.sevkIslemleriService
      .getGidenDepolarArasiSevkler(depoNo, range.startDate, range.endDate)
      .pipe(
        switchMap((items: IFurpaWarehouseShippingListItemApiDto[]) =>
          this.collectSequentially(
            items.filter((item: IFurpaWarehouseShippingListItemApiDto) =>
              this.matchesWarehouseMovementCounterparty(item, muhatapDepoNo)
            ),
            (item: IFurpaWarehouseShippingListItemApiDto) =>
              this.sevkIslemleriService.getDepolarArasiNakliyeSevkFisDetay(
                item.documentSerie,
                item.documentOrderNo
              )
          )
        )
      );
  }

  getDepodanMalKabuller(
    muhatapDepoNo: number,
    depoNo: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto[]> {
    const range = this.getRangeToken();

    return this.malKabulIslemleriService
      .listWarehouseReceipts({
        warehouseNo: depoNo,
        startDate: range.startDate,
        endDate: range.endDate
      })
      .pipe(
        switchMap((items: IFurpaWarehouseReceiptListItemApiDto[]) =>
          this.collectSequentially(
            items.filter((item: IFurpaWarehouseReceiptListItemApiDto) =>
              this.matchesWarehouseMovementCounterparty(item, muhatapDepoNo)
            ),
            (item: IFurpaWarehouseReceiptListItemApiDto) =>
              this.malKabulIslemleriService.getDepolarArasiNakliyeMalKabulFisDetay(
                item.documentSerie,
                item.documentOrderNo
              )
          )
        )
      );
  }

  private getRangeToken() {
    return getDefaultDateRange(180);
  }

  private matchesText(left: string | null | undefined, right: string | null | undefined): boolean {
    return this.normalizeText(left) === this.normalizeText(right);
  }

  private matchesWarehouseOrderCounterparty(
    item: Pick<IFurpaWarehouseOrderListItemApiDto, 'relatedWarehouseNo' | 'inWarehouseNo' | 'outWarehouseNo'>,
    warehouseNo: number
  ): boolean {
    return (
      item.relatedWarehouseNo === warehouseNo ||
      item.inWarehouseNo === warehouseNo ||
      item.outWarehouseNo === warehouseNo
    );
  }

  private matchesWarehouseMovementCounterparty(
    item: Pick<
      IFurpaWarehouseShippingListItemApiDto,
      'sourceWarehouseNo' | 'targetWarehouseNo' | 'shippingWarehouseNo'
    >,
    warehouseNo: number
  ): boolean {
    return (
      item.sourceWarehouseNo === warehouseNo ||
      item.targetWarehouseNo === warehouseNo ||
      item.shippingWarehouseNo === warehouseNo
    );
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim().toLocaleUpperCase('tr-TR') ?? '';
  }

  private collectSequentially<TInput, TOutput>(
    items: TInput[],
    loadItem: (item: TInput) => Observable<TOutput>,
    index = 0,
    results: TOutput[] = []
  ): Observable<TOutput[]> {
    if (index >= items.length) {
      return of(results);
    }

    return loadItem(items[index]).pipe(
      switchMap((result: TOutput) =>
        this.collectSequentially(items, loadItem, index + 1, [...results, result])
      )
    );
  }
}



