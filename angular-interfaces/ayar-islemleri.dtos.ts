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
  terminalBanks: TerminalBankOptionDto[];
}

export interface TerminalBankOptionDto {
  paymentName: string;
  paymentTypeNo: number;
  accountCode: string;
  displayName: string;
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
  cashRegisterNo?: number | null;
  cashType: number;
  cashRegisterType?: number | null;
  cashTypeName: string;
  cashRegisterTypeName?: string | null;
  cashTypeDescription: string;
  cashRegisterTypeDescription?: string | null;
  cashFinanceNumber?: string | null;
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
  cashRegisterNo?: string | null;
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

export interface DespatchDriverDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  plateNumber: string;
  tckn: string;
  maskedTckn: string;
  isActive: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
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

export interface DespatchDriverListHttpRequest {
  search?: string | null;
  includeInactive?: boolean | null;
  take?: number | null;
}

export interface SaveDespatchDriverHttpRequest {
  firstName: string;
  lastName: string;
  plateNumber: string;
  tckn: string;
  isActive: boolean;
  notes?: string | null;
}

export interface B2BBulletinListHttpRequest {
  search?: string | null;
  take?: number | null;
}

export interface B2BBulletinDto {
  id: number;
  definition: string;
  link: string;
  createDate: string | null;
}

export interface SaveB2BBulletinHttpRequest {
  definition: string;
  link: string;
  createDate?: string | null;
}

export interface B2BUserListHttpRequest {
  search?: string | null;
  includeInactive?: boolean | null;
  take?: number | null;
}

export interface B2BUserDto {
  userId: string;
  userFullName: string;
  userMail: string;
  status: boolean;
  createDate: string | null;
  menus: string | null;
  userEndDate: string | null;
  accountCount: number;
  categories?: string[] | null;
}

export interface B2BUserAccountDto {
  id: number;
  accountId: string;
  category: string | null;
}

export interface B2BUserDetailDto extends B2BUserDto {
  accounts: B2BUserAccountDto[];
}

export interface UpdateB2BUserHttpRequest {
  userFullName: string;
  userMail: string;
  status: boolean;
  menus?: string | null;
  userEndDate?: string | null;
}
