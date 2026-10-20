import type { BakeryProductionReportDto } from '@interfaces';

import { buildBakeryProductionReportMarkup } from './bakery-production-report-print';

describe('buildBakeryProductionReportMarkup', () => {
  const report: BakeryProductionReportDto = {
    reportDate: '2026-10-20',
    sourceWarehouseNo: 55,
    sourceWarehouseName: 'UNLU URETIM',
    items: [
      {
        branchNo: 110,
        branchName: 'KESTEL 1',
        documentSerie: 'F110',
        documentOrderNo: 42,
        productCode: 'A001',
        productName: 'AÇMA',
        typeCode: '33',
        typeName: 'Mayalı Grup',
        quantity: 5
      },
      {
        branchNo: 110,
        branchName: 'KESTEL 1',
        documentSerie: 'F110',
        documentOrderNo: 42,
        productCode: 'P001',
        productName: 'PASTA',
        typeCode: '30',
        typeName: 'Yaş Pasta',
        quantity: 3
      }
    ]
  };

  it('renders the missing fermented category in the summary report', () => {
    const markup = buildBakeryProductionReportMarkup(report, 'summary');

    expect(markup).toContain('Mayalı Grup');
    expect(markup).toContain('AÇMA');
    expect(markup).toContain('>5</td>');
  });

  it('groups branch detail by branch and document and leaves zero category cells empty', () => {
    const markup = buildBakeryProductionReportMarkup(report, 'branch');

    expect(markup).toContain('110 - KESTEL 1 / F110/42');
    expect(markup).toContain('Sarf Pastane');
    expect(markup).toContain('<td class="number"></td>');
  });
});
