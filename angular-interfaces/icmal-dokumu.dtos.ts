/**
 * Icmal Dokumu DTOs
 */

export interface ISummariesCT {
  warehouse: string;
  documentSerie: string;
  documentOrderNo: number;
  cashNo: number;
  zReportNo: number;
  cashierNo: number;
  managerNo: number;
  summaryDate: Date;
  total: number;
}

export class SummariesCT implements ISummariesCT {
  constructor(
    public warehouse: string,
    public documentSerie: string,
    public documentOrderNo: number,
    public cashNo: number,
    public zReportNo: number,
    public cashierNo: number,
    public managerNo: number,
    public summaryDate: Date,
    public total: number
  ) {}
}

export interface ISummariesDetailsCT {
  typeName: string;
  paymentTypeID: number;
  accountCode: string;
  slipNumber: number;
  amount: number;
  terminalId: string;
  description: string;
}

export class SummariesDetailsCT implements ISummariesDetailsCT {
  constructor(
    public typeName: string,
    public paymentTypeID: number,
    public accountCode: string,
    public slipNumber: number,
    public amount: number,
    public terminalId: string,
    public description: string
  ) {}
}

export interface IBanknoteMovementsCT {
  value: number;
  banknoteTypeID: number;
  quantity: number;
  total: number;
}

export class BanknoteMovementsCT implements IBanknoteMovementsCT {
  constructor(
    public value: number,
    public banknoteTypeID: number,
    public quantity: number,
    public total: number
  ) {}
}

export interface IGiftCheckMovementsCT {
  value: number;
  giftCheckTypeID: number;
  quantity: number;
  total: number;
}

export class GiftCheckMovementsCT implements IGiftCheckMovementsCT {
  constructor(
    public value: number,
    public giftCheckTypeID: number,
    public quantity: number,
    public total: number
  ) {}
}

export interface ICashier {
  kasiyerId: number;
  olusturanKullanici: string;
  olusturmaTarihi: string;
  guncelleyenKullanici: string;
  guncellemeTarihi: string;
  kasiyerKodu: string;
  kasiyerAdi: string;
  kasiyerSoyadi: string;
  kasiyerSifre: string;
  kasiyerYetki: string;
  kasiyerDurumu: boolean;
  adres: string;
  telefon: string;
}

export class Cashier implements ICashier {
  constructor(
    public kasiyerId: number,
    public olusturanKullanici: string,
    public olusturmaTarihi: string,
    public guncelleyenKullanici: string,
    public guncellemeTarihi: string,
    public kasiyerKodu: string,
    public kasiyerAdi: string,
    public kasiyerSoyadi: string,
    public kasiyerSifre: string,
    public kasiyerYetki: string,
    public kasiyerDurumu: boolean,
    public adres: string,
    public telefon: string
  ) {}
}

export interface ICashRegisterDetails {
  cashRegisterNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
  cashNo: number;
  cashType: number;
}

export class CashRegisterDetails implements ICashRegisterDetails {
  constructor(
    public cashRegisterNo: string,
    public bank: string,
    public terminalId: string,
    public merchantNo: string,
    public cashNo: number,
    public cashType: number
  ) {}
}
