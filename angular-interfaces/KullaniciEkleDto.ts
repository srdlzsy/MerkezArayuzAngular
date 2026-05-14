// Admin-only create form posts this payload directly to the user create endpoint.
export interface KullaniciEkleDto {
  mikroUserId?: number;
  ad?: string;
  soyad?: string;
  mikroDepoNo?: number;
  mikroDepoIsmi?: string;

  userName: string;
  password: string;

  email?: string;
  phoneNumber?: string;

  kullaniciRolleri?: string[];
}
