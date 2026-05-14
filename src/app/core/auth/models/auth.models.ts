import type {
  IFurpaMeResponseApiDto,
  IFurpaPermissionCatalogActionApiDto,
  IFurpaPermissionCatalogMenuApiDto,
  IFurpaPermissionCatalogModuleApiDto
} from '@interfaces';

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc?: string | null;
  user?: MeResponse;
  currentUser?: KullaniciResponse | null;
  tokenType?: string;
  expiresIn?: number;
  refreshToken?: string;
}

export interface Yetki {
  id?: number;
  isim?: string;
  sebike?: string;
}

export interface Gorev {
  id: number;
  isim: string;
  sebike: string;
  yetkiler: Yetki[];
}

export interface Sorumluluk {
  id: number;
  isim: string;
  sebike: string;
  gorevler: Gorev[];
}

export interface KullaniciResponse {
  ad: string | null;
  soyad: string | null;
  depoNo: number | null;
  depoIsmi: string | null;
  roller: string[];
  sorumluluklar: Sorumluluk[];
  permissions?: string[];
}

export interface CurrentUser {
  ad: string | null;
  soyad: string | null;
  depoNo: number | null;
  depoIsmi: string | null;
  roller: string[];
  sorumluluklar: Sorumluluk[];
  permissions: string[];
  displayName: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type MeActionResponse = IFurpaPermissionCatalogActionApiDto;
export type MeMenuResponse = IFurpaPermissionCatalogMenuApiDto;
export type MeModuleResponse = IFurpaPermissionCatalogModuleApiDto;
export type MeResponse = IFurpaMeResponseApiDto;
