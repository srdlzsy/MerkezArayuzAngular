import type { KasaHareketSalesComparisonRowDto } from '@interfaces';

import type { ExcelExportColumn } from '../../../core/excel-export/excel-export.utils';

export function getSalesComparisonStatus(row: KasaHareketSalesComparisonRowDto): string {
  if (row.pendingInvoiceAmount > 0.01) return 'Fatura bekliyor';
  if (row.hasDifference) return 'Aktarim eksik/fazla';
  if (row.hasReceiptTotalMismatch && row.hasZReportMismatch) return 'Kaynak fisi ve Z kontrol';
  if (row.hasReceiptTotalMismatch) return 'Kaynak fisi kontrol';
  if (row.hasZReportMismatch) return 'Z raporu kontrol';
  return 'Aktarim tam';
}

export function hasSalesComparisonTransferProblem(row: KasaHareketSalesComparisonRowDto): boolean {
  return row.hasDifference || row.pendingInvoiceAmount > 0.01;
}

export function hasSalesComparisonWarning(row: KasaHareketSalesComparisonRowDto): boolean {
  return !hasSalesComparisonTransferProblem(row)
    && (row.hasReceiptTotalMismatch || row.hasZReportMismatch);
}

export function createSalesComparisonExportColumns(
  formatDate: (value: string) => string
): readonly ExcelExportColumn<KasaHareketSalesComparisonRowDto>[] {
  return [
    { label: 'Tarih', value: (row) => formatDate(row.date) },
    { label: 'Sube No', value: 'branchNo', type: 'number' },
    { label: 'Sube', value: 'branchName' },
    { label: 'Kaynak Satir Toplami', value: 'transferredAmount', type: 'currency' },
    { label: 'Kaynak Baslik Toplami', value: 'sourceHeaderAmount', type: 'currency' },
    { label: 'Fis Ici Fark', value: 'receiptLineHeaderDifference', type: 'currency' },
    { label: 'Mikro Stok Hareketi', value: 'stockMovementAmount', type: 'currency' },
    { label: 'Aktarim Net Farki', value: 'netDifference', type: 'currency' },
    { label: 'Bekleyen Fatura', value: 'pendingInvoiceAmount', type: 'currency' },
    { label: 'GPS Tutari', value: 'expenseReceiptAmount', type: 'currency' },
    { label: 'Cek Tutari', value: 'checkAmount', type: 'currency' },
    { label: 'Z Raporu', value: 'zReportAmount', type: 'currency' },
    { label: 'Z Mutabakat Farki', value: 'sourceHeaderZReportDifference', type: 'currency' },
    { label: 'Durum', value: getSalesComparisonStatus },
    { label: 'Mikro Cari Hareketi', value: 'currentAccountAmount', type: 'currency' },
    { label: 'PS Stok Cari Farki', value: 'currentStockDifference', type: 'currency' },
    { label: 'Mikro Net - (Z + Cek)', value: 'zReportTransferDifference', type: 'currency' },
    { label: 'Kaynak Satir Net - (Z + Cek)', value: 'sourceZReportDifference', type: 'currency' },
    { label: 'Mikro PS', value: 'retailStockAmount', type: 'currency' },
    { label: 'Furpa Perakende Fis', value: 'retailTransferredAmount', type: 'currency' },
    { label: 'Perakende Fis Farki', value: 'retailDifference', type: 'currency' },
    { label: 'Mikro Fatura', value: 'invoiceStockAmount', type: 'currency' },
    { label: 'Kaynak Fatura', value: 'invoiceTransferredAmount', type: 'currency' },
    { label: 'Fatura Kaynak / Mikro Farki', value: 'invoiceDifference', type: 'currency' },
    { label: 'Mikro Gider Pusulasi', value: 'expenseSlipStockAmount', type: 'currency' },
    { label: 'Furpa Gider Pusulasi', value: 'expenseSlipTransferredAmount', type: 'currency' },
    { label: 'Gider Pusulasi Farki', value: 'expenseSlipDifference', type: 'currency' },
    { label: 'Mikro Net', value: 'netStockTurnover', type: 'currency' },
    { label: 'Furpa Net', value: 'netTransferredTurnover', type: 'currency' },
    { label: 'Genel Net Fark', value: 'netDifference', type: 'currency' },
    { label: 'Kaynak Veri Uyarisi', value: (row) => (row.hasSourceDataWarning ? 'Var' : 'Yok') }
  ];
}
