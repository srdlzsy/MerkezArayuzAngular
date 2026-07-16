import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../base-api.service';
import { parseDateRangeToken, getDefaultDateRange } from '../furpa-merkez-api.utils';
import {
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaCreateInventoryCountResponseApiDto,
  IFurpaInventoryCountDetailApiDto,
  IFurpaInventoryCountListItemApiDto,
} from '@interfaces';

@Injectable({
  providedIn: 'root'
})
export class SayimIslemleriService extends BaseApiService {
  getSayimSonuclariListe(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaInventoryCountListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();

    return this.getWithQuery<IFurpaInventoryCountListItemApiDto[]>('stok-islemleri/sayim-sonuclari', {
      WarehouseNo: warehouseNo,
      StartDate: range.startDate,
      EndDate: range.endDate
    });
  }

  getSayimSonucuDetay(evrakNo: number, _depoNo: number, tarih: string): Observable<IFurpaInventoryCountDetailApiDto> {
    return this.getWithQuery<IFurpaInventoryCountDetailApiDto>(`stok-islemleri/sayim-sonuclari/${evrakNo}`, {
      documentDate: tarih
    });
  }

  createSayimSonucu(
    request: IFurpaCreateInventoryCountRequestApiDto
  ): Observable<IFurpaCreateInventoryCountResponseApiDto> {
    return this.post<IFurpaCreateInventoryCountResponseApiDto, IFurpaCreateInventoryCountRequestApiDto>(
      'stok-islemleri/sayim-sonuclari',
      request
    );
  }
}



