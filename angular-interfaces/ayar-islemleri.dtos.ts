export interface DeviceTypeDto {
  id: number;
  deviceName: string;
}

export interface DeviceDto {
  id: number;
  branchNo: number;
  deviceTypeId: number;
  deviceTypeName: string;
  ipAddress: string;
  description: string;
}

export interface DeviceStatusDto {
  branchNo: number;
  deviceTypeId: number;
  deviceTypeName: string;
  ipAddress: string;
  description: string;
  online: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface SettingsTypeOptionDto {
  value: number;
  code: string;
  name: string;
  description: string;
  isKnown: boolean;
}

export interface BranchSettingsLookupsDto {
  scalesTypes: SettingsTypeOptionDto[];
  cashTypes: SettingsTypeOptionDto[];
}

export interface CashRegisterSettingsLookupsDto {
  cashTypes: SettingsTypeOptionDto[];
}

export interface BranchDetailDto {
  branchNo: number;
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  scalesTypeName: string;
  scalesTypeDescription: string;
  poskonFolderPath: string;
  posGenelFolderPath: string;
}

export interface CashRegistryDto {
  detailId: number;
  branchNo: number;
  cashNo: number;
  cashType: number;
  cashTypeName: string;
  cashTypeDescription: string;
}

export interface CashRegisterResponse {
  branchNo: number;
  cashNo: number;
  cashType: number;
  cashTypeName: string;
  cashTypeDescription: string;
  terminals: CashRegisterTerminalDto[];
}

export interface CashRegisterTerminalDto {
  id: number;
  terminalNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
  cashNo: number | null;
}

export interface CashRegisterMessageStatusDto {
  branchNo: number;
  cashNo: number;
  cashType: number;
  cashTypeName: string;
  cashTypeDescription: string;
  state: number | null;
  stateName: string | null;
  filePath: string;
  error: string | null;
}

export interface CashierDto {
  cashierCode: number;
  cashierName: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

export interface CashierPasswordMutationDto {
  cashierCode: number;
  generatedPassword: string;
  cashier: CashierDto;
}

export interface CreateDeviceHttpRequest {
  branchNo: number;
  deviceTypeId: number;
  ipAddress: string;
  description: string;
}

export interface CreateCashRegistryHttpRequest {
  cashNo: number;
  cashType: number;
}

export interface CreateBranchSettingsHttpRequest {
  branchNo: number;
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  poskonFolderPath: string;
  posGenelFolderPath: string;
  cashRegisters: CreateCashRegistryHttpRequest[];
}

export interface UpdateBranchSettingsHttpRequest {
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  poskonFolderPath: string;
  posGenelFolderPath: string;
}

export interface CreateCashRegisterTerminalHttpRequest {
  terminalNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
}

export interface CreateCashRegisterHttpRequest {
  branchNo: number;
  cashNo: number;
  cashType: number;
  terminals: CreateCashRegisterTerminalHttpRequest[];
}

export interface CreateCashierHttpRequest {
  cashierName: string;
  cashierAuthorization: string;
}

export interface UpdateCashierHttpRequest {
  cashierName: string;
  cashierAuthorization: string;
  cashierState: boolean;
}
