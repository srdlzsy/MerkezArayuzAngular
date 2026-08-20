import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  B2BBulletinDto,
  B2BBulletinListHttpRequest,
  B2BUserDetailDto,
  B2BUserDto,
  B2BUserListHttpRequest,
  BranchDetailDto,
  BranchSettingsLookupsDto,
  CashierDto,
  CashierPasswordMutationDto,
  CashRegisterMessageStatusDto,
  CashRegisterResponse,
  CashRegisterSettingsLookupsDto,
  CashRegisterTerminalDto,
  CashRegistryDto,
  CreateBranchSettingsHttpRequest,
  CreateCashierHttpRequest,
  CreateCashRegisterHttpRequest,
  CreateDeviceHttpRequest,
  DeviceDto,
  DeviceStatusDto,
  DeviceTypeDto,
  DespatchDriverDto,
  DespatchDriverListHttpRequest,
  SaveDespatchDriverHttpRequest,
  SaveB2BBulletinHttpRequest,
  UpdateBranchSettingsHttpRequest,
  UpdateB2BUserHttpRequest,
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

  getBranchSettingsLookups(): Observable<BranchSettingsLookupsDto> {
    return this.get<BranchSettingsLookupsDto>('ayar-islemleri/sube-ayarlari/secenekler');
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

  getCashRegisterSettingsLookups(): Observable<CashRegisterSettingsLookupsDto> {
    return this.get<CashRegisterSettingsLookupsDto>(
      'ayar-islemleri/kasa-pos-terminalleri/secenekler'
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

  getDespatchDrivers(
    request: DespatchDriverListHttpRequest = {}
  ): Observable<DespatchDriverDto[]> {
    return this.getWithQuery<DespatchDriverDto[]>('ayar-islemleri/soforler', request);
  }

  getDespatchDriver(id: string): Observable<DespatchDriverDto> {
    return this.get<DespatchDriverDto>(`ayar-islemleri/soforler/${encodeURIComponent(id)}`);
  }

  createDespatchDriver(
    request: SaveDespatchDriverHttpRequest
  ): Observable<DespatchDriverDto> {
    return this.post<DespatchDriverDto, SaveDespatchDriverHttpRequest>(
      'ayar-islemleri/soforler',
      request
    );
  }

  updateDespatchDriver(
    id: string,
    request: SaveDespatchDriverHttpRequest
  ): Observable<DespatchDriverDto> {
    return this.put<DespatchDriverDto, SaveDespatchDriverHttpRequest>(
      `ayar-islemleri/soforler/${encodeURIComponent(id)}`,
      request
    );
  }

  deleteDespatchDriver(id: string): Observable<void> {
    return this.delete<void>(`ayar-islemleri/soforler/${encodeURIComponent(id)}`);
  }

  getB2BBulletins(request: B2BBulletinListHttpRequest = {}): Observable<B2BBulletinDto[]> {
    return this.getWithQuery<B2BBulletinDto[]>('ayar-islemleri/b2b-ayarlari/bultenler', {
      search: request.search?.trim() || undefined,
      take: request.take ?? 100
    });
  }

  createB2BBulletin(request: SaveB2BBulletinHttpRequest): Observable<B2BBulletinDto> {
    return this.post<B2BBulletinDto, SaveB2BBulletinHttpRequest>(
      'ayar-islemleri/b2b-ayarlari/bultenler',
      request
    );
  }

  updateB2BBulletin(
    id: number,
    request: SaveB2BBulletinHttpRequest
  ): Observable<B2BBulletinDto> {
    return this.put<B2BBulletinDto, SaveB2BBulletinHttpRequest>(
      `ayar-islemleri/b2b-ayarlari/bultenler/${id}`,
      request
    );
  }

  deleteB2BBulletin(id: number): Observable<void> {
    return this.delete<void>(`ayar-islemleri/b2b-ayarlari/bultenler/${id}`);
  }

  getB2BUsers(request: B2BUserListHttpRequest = {}): Observable<B2BUserDto[]> {
    return this.getWithQuery<B2BUserDto[]>('ayar-islemleri/b2b-ayarlari/kullanicilar', {
      search: request.search?.trim() || undefined,
      includeInactive: request.includeInactive ?? false,
      take: request.take ?? 100
    });
  }

  getB2BUser(userId: string): Observable<B2BUserDetailDto> {
    return this.get<B2BUserDetailDto>(
      `ayar-islemleri/b2b-ayarlari/kullanicilar/${encodeURIComponent(userId)}`
    );
  }

  updateB2BUser(
    userId: string,
    request: UpdateB2BUserHttpRequest
  ): Observable<B2BUserDetailDto> {
    return this.put<B2BUserDetailDto, UpdateB2BUserHttpRequest>(
      `ayar-islemleri/b2b-ayarlari/kullanicilar/${encodeURIComponent(userId)}`,
      request
    );
  }
}
