import type {
  BakeryProductionReportDto,
  BakeryProductionReportItemDto
} from '@interfaces';

export type BakeryProductionReportMode = 'summary' | 'branch';

const categories = [
  { code: '22', name: 'Sarf Pastane' },
  { code: '30', name: 'Yaş Pasta' },
  { code: '31', name: 'Kuru Pasta' },
  { code: '32', name: 'Baklava' },
  { code: '33', name: 'Mayalı Grup' }
] as const;

const productCollator = new Intl.Collator('tr-TR', {
  sensitivity: 'base',
  numeric: true
});

export function buildBakeryProductionReportMarkup(
  report: BakeryProductionReportDto,
  mode: BakeryProductionReportMode
): string {
  const title = mode === 'summary'
    ? 'Unlu Üretim Toplu Sipariş Raporu'
    : 'Unlu Üretim Şube Detaylı Sipariş Raporu';
  const content = mode === 'summary'
    ? renderSummary(report.items)
    : renderBranchDetail(report.items);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${printStyles}</style>
</head>
<body>
  <main class="sheet">
    <header class="report-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(formatDate(report.reportDate))} / ${escapeHtml(formatWarehouse(report))}</p>
    </header>
    ${content}
  </main>
</body>
</html>`;
}

function renderSummary(items: readonly BakeryProductionReportItemDto[]): string {
  const totals = new Map<string, BakeryProductionReportItemDto>();

  for (const item of items) {
    const key = `${item.typeCode}\u001f${item.productCode}\u001f${item.productName}`;
    const existing = totals.get(key);
    totals.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item });
  }

  const sections = categories
    .map((category) => {
      const categoryItems = [...totals.values()]
        .filter((item) => item.typeCode === category.code)
        .sort(compareProducts);

      if (!categoryItems.length) {
        return '';
      }

      const rows = categoryItems
        .map((item) => `<tr>
          <td>${escapeHtml(item.productCode)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td class="number">${escapeHtml(formatNumber(item.quantity))}</td>
        </tr>`)
        .join('');

      return `<section class="category-section">
        <h2>${escapeHtml(category.name)}</h2>
        <table>
          <colgroup><col class="code-column"><col><col class="quantity-column"></colgroup>
          <thead><tr><th>Kod</th><th>Ürün</th><th class="number">${escapeHtml(category.name)}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .filter(Boolean)
    .join('');

  return sections || '<p class="empty">Seçilen tarihte unlu üretim siparişi bulunamadı.</p>';
}

function renderBranchDetail(items: readonly BakeryProductionReportItemDto[]): string {
  const groups = new Map<string, BakeryProductionReportItemDto[]>();

  for (const item of items) {
    const key = `${item.branchNo}\u001f${item.branchName}\u001f${item.documentSerie}\u001f${item.documentOrderNo}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const orderedGroups = [...groups.values()].sort((left, right) => {
    const branchComparison = productCollator.compare(left[0]?.branchName ?? '', right[0]?.branchName ?? '');
    if (branchComparison !== 0) {
      return branchComparison;
    }

    const serieComparison = productCollator.compare(
      left[0]?.documentSerie ?? '',
      right[0]?.documentSerie ?? ''
    );
    return serieComparison !== 0
      ? serieComparison
      : (left[0]?.documentOrderNo ?? 0) - (right[0]?.documentOrderNo ?? 0);
  });

  if (!orderedGroups.length) {
    return '<p class="empty">Seçilen tarihte unlu üretim siparişi bulunamadı.</p>';
  }

  return orderedGroups
    .map((group) => {
      const first = group[0];
      const products = new Map<string, { code: string; name: string; quantities: Map<string, number> }>();

      for (const item of group) {
        const key = `${item.productCode}\u001f${item.productName}`;
        const product = products.get(key) ?? {
          code: item.productCode,
          name: item.productName,
          quantities: new Map<string, number>()
        };
        product.quantities.set(
          item.typeCode,
          (product.quantities.get(item.typeCode) ?? 0) + item.quantity
        );
        products.set(key, product);
      }

      const rows = [...products.values()]
        .sort((left, right) => compareProductValues(left, right))
        .map((product) => `<tr>
          <td>${escapeHtml(product.code)}</td>
          <td>${escapeHtml(product.name)}</td>
          ${categories.map((category) => renderQuantityCell(product.quantities.get(category.code) ?? 0)).join('')}
        </tr>`)
        .join('');
      const branchLabel = first?.branchName?.trim()
        ? `${first.branchNo} - ${first.branchName}`
        : `${first?.branchNo ?? 0}`;
      const documentLabel = `${first?.documentSerie ?? ''}/${first?.documentOrderNo ?? 0}`;

      return `<section class="branch-group">
        <h2>${escapeHtml(branchLabel)} / ${escapeHtml(documentLabel)}</h2>
        <table class="branch-table">
          <colgroup><col class="code-column"><col class="product-column">${categories.map(() => '<col class="category-column">').join('')}</colgroup>
          <thead><tr><th>Kod</th><th>Ürün</th>${categories.map((category) => `<th class="number">${escapeHtml(category.name)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');
}

function renderQuantityCell(quantity: number): string {
  return `<td class="number">${quantity === 0 ? '' : escapeHtml(formatNumber(quantity))}</td>`;
}

function compareProducts(
  left: BakeryProductionReportItemDto,
  right: BakeryProductionReportItemDto
): number {
  const nameComparison = productCollator.compare(left.productName, right.productName);
  return nameComparison !== 0
    ? nameComparison
    : productCollator.compare(left.productCode, right.productCode);
}

function compareProductValues(
  left: { code: string; name: string },
  right: { code: string; name: string }
): number {
  const nameComparison = productCollator.compare(left.name, right.name);
  return nameComparison !== 0 ? nameComparison : productCollator.compare(left.code, right.code);
}

function formatWarehouse(report: BakeryProductionReportDto): string {
  const name = report.sourceWarehouseName?.trim();
  return name ? `${report.sourceWarehouseNo} - ${name}` : `Depo ${report.sourceWarehouseNo}`;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

const printStyles = `
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 20.5mm;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 12px;
    color: #000;
    background: #e5e7eb;
    font-family: "Times New Roman", Times, serif;
  }

  .sheet {
    width: 180mm;
    min-height: 261mm;
    margin: 0 auto;
    padding: 8mm;
    background: #fff;
  }

  .report-header {
    margin-bottom: 10mm;
    text-align: center;
  }

  h1 {
    margin: 0 0 4px;
    font-size: 28px;
    line-height: 1.15;
  }

  .report-header p {
    margin: 0;
    font-size: 13px;
  }

  .category-section,
  .branch-group {
    margin: 0 0 9mm;
  }

  .category-section { break-inside: avoid; }
  .branch-group + .branch-group { break-before: page; }

  h2 {
    margin: 0 0 4px;
    font-size: 20px;
    text-align: center;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead { display: table-header-group; }
  tr { break-inside: avoid; }

  th,
  td {
    padding: 4px 5px;
    border: 1px solid #000;
    vertical-align: top;
    font-size: 12px;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  th { font-weight: 700; }
  .number { text-align: center; }
  .code-column { width: 22mm; }
  .quantity-column { width: 30mm; }
  .product-column { width: 54mm; }
  .category-column { width: 20mm; }
  .branch-table th,
  .branch-table td { font-size: 10px; }

  .empty {
    padding: 12px;
    border: 1px solid #000;
    text-align: center;
    font-size: 14px;
  }

  @media print {
    body { padding: 0; background: #fff; }
    .sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
  }
`;
