import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BranchDetailDto,
  CashierDto,
  CashierPasswordMutationDto,
  CashRegisterMessageStatusDto,
  CashRegisterResponse,
  CashRegisterTerminalDto,
  CashRegistryDto,
  CreateBranchSettingsHttpRequest,
  CreateCashierHttpRequest,
  CreateCashRegisterHttpRequest,
  CreateDeviceHttpRequest,
  DeviceDto,
  DeviceStatusDto,
  DeviceTypeDto,
  UpdateBranchSettingsHttpRequest,
  UpdateCashierHttpRequest
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class AyarIslemleriService extends BaseApiService {
  getDeviceTypes(): Observable<DeviceTypeDto[]> {
    return this.get<DeviceTypeDto[]>('ayar-islemleri/cihazlar/tipler');
  }

  getDevices(branchNo?: number | null): Observable<DeviceDto[]> {
    return this.getWithQuery<DeviceDto[]>('ayar-islemleri/cihazlar', {
      branchNo: branchNo ?? undefined
    });
  }

  getDeviceStatuses(branchNo?: number | null): Observable<DeviceStatusDto[]> {
    return this.getWithQuery<DeviceStatusDto[]>('ayar-islemleri/cihazlar/durum', {
      branchNo: branchNo ?? undefined
    });
  }

  getBranchDeviceStatuses(branchNo: number): Observable<DeviceStatusDto[]> {
    return this.get<DeviceStatusDto[]>(
      `ayar-islemleri/cihazlar/subeler/${branchNo}/durum`
    );
  }

  createDevice(request: CreateDeviceHttpRequest): Observable<DeviceDto> {
    return this.post<DeviceDto, CreateDeviceHttpRequest>('ayar-islemleri/cihazlar', request);
  }

  deleteDevice(id: number): Observable<void> {
    return this.delete<void>(`ayar-islemleri/cihazlar/${id}`);
  }

  getBranchSettings(): Observable<BranchDetailDto[]> {
    return this.get<BranchDetailDto[]>('ayar-islemleri/sube-ayarlari');
  }

  getBranchSetting(branchNo: number): Observable<BranchDetailDto> {
    return this.get<BranchDetailDto>(`ayar-islemleri/sube-ayarlari/${branchNo}`);
  }

  getBranchCashRegistries(branchNo: number): Observable<CashRegistryDto[]> {
    return this.get<CashRegistryDto[]>(
      `ayar-islemleri/sube-ayarlari/${branchNo}/kasalar`
    );
  }

  createBranchSettings(
    request: CreateBranchSettingsHttpRequest
  ): Observable<BranchDetailDto> {
    return this.post<BranchDetailDto, CreateBranchSettingsHttpRequest>(
      'ayar-islemleri/sube-ayarlari',
      request
    );
  }

  updateBranchSettings(
    branchNo: number,
    request: UpdateBranchSettingsHttpRequest
  ): Observable<BranchDetailDto> {
    return this.put<BranchDetailDto, UpdateBranchSettingsHttpRequest>(
      `ayar-islemleri/sube-ayarlari/${branchNo}`,
      request
    );
  }

  getCashRegisterTerminals(cashNo: number): Observable<CashRegisterTerminalDto[]> {
    return this.get<CashRegisterTerminalDto[]>(
      `ayar-islemleri/kasa-pos-terminalleri/kasalar/${cashNo}/terminaller`
    );
  }

  getCurrentBranchMessageStatuses(): Observable<CashRegisterMessageStatusDto[]> {
    return this.get<CashRegisterMessageStatusDto[]>(
      'ayar-islemleri/kasa-pos-terminalleri/mevcut-sube/mesaj-durumlari'
    );
  }

  getBranchMessageStatuses(branchNo: number): Observable<CashRegisterMessageStatusDto[]> {
    return this.get<CashRegisterMessageStatusDto[]>(
      `ayar-islemleri/kasa-pos-terminalleri/subeler/${branchNo}/mesaj-durumlari`
    );
  }

  createCashRegister(
    request: CreateCashRegisterHttpRequest
  ): Observable<CashRegisterResponse> {
    return this.post<CashRegisterResponse, CreateCashRegisterHttpRequest>(
      'ayar-islemleri/kasa-pos-terminalleri',
      request
    );
  }

  deleteBranchCashRegister(branchNo: number, cashNo: number): Observable<void> {
    return this.delete<void>(
      `ayar-islemleri/kasa-pos-terminalleri/subeler/${branchNo}/kasalar/${cashNo}`
    );
  }

  deleteBranchTerminal(branchNo: number, terminalNo: string): Observable<void> {
    return this.delete<void>(
      `ayar-islemleri/kasa-pos-terminalleri/subeler/${branchNo}/terminaller/${encodeURIComponent(terminalNo)}`
    );
  }

  getCashiers(): Observable<CashierDto[]> {
    return this.get<CashierDto[]>('ayar-islemleri/kasiyerler');
  }

  createCashier(request: CreateCashierHttpRequest): Observable<CashierPasswordMutationDto> {
    return this.post<CashierPasswordMutationDto, CreateCashierHttpRequest>(
      'ayar-islemleri/kasiyerler',
      request
    );
  }

  updateCashier(
    cashierCode: number,
    request: UpdateCashierHttpRequest
  ): Observable<CashierDto> {
    return this.put<CashierDto, UpdateCashierHttpRequest>(
      `ayar-islemleri/kasiyerler/${cashierCode}`,
      request
    );
  }

  resetCashierPassword(cashierCode: number): Observable<CashierPasswordMutationDto> {
    return this.post<CashierPasswordMutationDto, null>(
      `ayar-islemleri/kasiyerler/${cashierCode}/sifre-sifirla`,
      null
    );
  }
}
