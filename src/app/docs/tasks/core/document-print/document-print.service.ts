import { Injectable } from '@angular/core';

export type DocumentPrintCellAlign = 'left' | 'center' | 'right';

export interface DocumentPrintColumn {
  label: string;
  width?: string;
  align?: DocumentPrintCellAlign;
}

export interface DocumentPrintField {
  label: string;
  value: unknown;
  wide?: boolean;
  optional?: boolean;
}

export interface DocumentPrintSection {
  title?: string;
  fields: readonly DocumentPrintField[];
}

export interface DocumentPrintSignature {
  label: string;
  value?: unknown;
}

export interface DocumentPrintRequest {
  title: string;
  subtitle?: string;
  branch?: string;
  orientation?: 'portrait' | 'landscape';
  density?: 'normal' | 'compact' | 'dense';
  sections: readonly DocumentPrintSection[];
  lineTitle: string;
  columns: readonly DocumentPrintColumn[];
  rows: readonly (readonly unknown[])[];
  signatures?: readonly DocumentPrintSignature[];
  generatedAt?: Date;
}

export interface RawDocumentPrintRequest {
  markup: string;
  targetWindow?: Window;
  windowFeatures?: string;
  printDelayMs?: number;
  closeAfterPrint?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentPrintService {
  private readonly dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  print(request: DocumentPrintRequest): boolean {
    return this.printHtml({ markup: this.buildPrintMarkup(request) });
  }

  printHtml(request: RawDocumentPrintRequest): boolean {
    const printWindow = request.targetWindow ?? window.open(
      '',
      '_blank',
      request.windowFeatures ?? 'width=960,height=720'
    );

    if (!printWindow) {
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(request.markup);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();

      if (request.closeAfterPrint) {
        printWindow.close();
      }
    }, request.printDelayMs ?? 150);

    return true;
  }

  private buildPrintMarkup(request: DocumentPrintRequest): string {
    const generatedAt = request.generatedAt ?? new Date();

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(request.title)}</title>
  <style>${this.buildStyles(request.orientation ?? 'portrait', request.density ?? 'compact')}</style>
</head>
<body>
  <main class="sheet">
    <header class="document-header">
      <div class="brand-row">
        <strong>FURPA</strong>
        <span>${this.escapeHtml(this.dateFormatter.format(generatedAt))}</span>
      </div>
      <h1>${this.escapeHtml(request.title)}</h1>
      ${this.renderOptionalLine('document-subtitle', request.subtitle)}
      ${this.renderOptionalLine('branch-line', request.branch)}
    </header>

    ${this.renderSections(request.sections)}

    <section class="line-section">
      <div class="section-title">${this.escapeHtml(request.lineTitle)}</div>
      ${this.renderTable(request.columns, request.rows)}
    </section>

    ${this.renderSignatures(request.signatures ?? [])}
  </main>
</body>
</html>`;
  }

  private renderSections(sections: readonly DocumentPrintSection[]): string {
    return sections
      .map((section) => {
        const fields = section.fields.filter((field) => this.shouldRenderField(field));

        if (!fields.length) {
          return '';
        }

        const titleMarkup = section.title
          ? `<div class="section-title">${this.escapeHtml(section.title)}</div>`
          : '';

        return `<section class="detail-section">
          ${titleMarkup}
          <div class="field-grid">
            ${fields.map((field) => this.renderField(field)).join('')}
          </div>
        </section>`;
      })
      .join('');
  }

  private renderField(field: DocumentPrintField): string {
    const value = this.normalizeDisplayValue(field.value);
    const wideClass = field.wide ? ' field-wide' : '';

    return `<div class="field${wideClass}">
      <span>${this.escapeHtml(field.label)}</span>
      <strong>${this.escapeHtml(value)}</strong>
    </div>`;
  }

  private renderTable(
    columns: readonly DocumentPrintColumn[],
    rows: readonly (readonly unknown[])[]
  ): string {
    if (!rows.length) {
      return '<p class="empty-line">Kalem bilgisi bulunamadi.</p>';
    }

    const colGroup = columns
      .map((column) => {
        const width = column.width?.trim();
        return width ? `<col style="width: ${this.escapeAttribute(width)}">` : '<col>';
      })
      .join('');

    const header = columns
      .map((column) => `<th class="${this.alignClass(column.align)}">${this.escapeHtml(column.label)}</th>`)
      .join('');

    const body = rows
      .map(
        (row) =>
          `<tr>${columns
            .map(
              (column, index) =>
                `<td class="${this.alignClass(column.align)}">${this.escapeHtml(
                  this.normalizeDisplayValue(row[index])
                )}</td>`
            )
            .join('')}</tr>`
      )
      .join('');

    return `<table>
      <colgroup>${colGroup}</colgroup>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
  }

  private renderSignatures(signatures: readonly DocumentPrintSignature[]): string {
    if (!signatures.length) {
      return '';
    }

    return `<section class="signature-grid">
      ${signatures
        .map((signature) => {
          const value = this.normalizeDisplayValue(signature.value);
          const valueMarkup = value === '-' ? '&nbsp;' : this.escapeHtml(value);

          return `<div class="signature-box">
            <span>${this.escapeHtml(signature.label)}</span>
            <strong>${valueMarkup}</strong>
          </div>`;
        })
        .join('')}
    </section>`;
  }

  private renderOptionalLine(className: string, value: unknown): string {
    const normalizedValue = this.normalizeDisplayValue(value);

    if (normalizedValue === '-') {
      return '';
    }

    return `<p class="${className}">${this.escapeHtml(normalizedValue)}</p>`;
  }

  private shouldRenderField(field: DocumentPrintField): boolean {
    return !field.optional || this.normalizeDisplayValue(field.value) !== '-';
  }

  private normalizeDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '-' : this.dateFormatter.format(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayir';
    }

    const textValue = `${value}`.trim();
    return textValue || '-';
  }

  private alignClass(align: DocumentPrintCellAlign | undefined): string {
    if (align === 'right') {
      return 'align-right';
    }

    if (align === 'center') {
      return 'align-center';
    }

    return 'align-left';
  }

  private escapeHtml(value: string): string {
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

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/;/g, '');
  }

  private buildStyles(
    orientation: 'portrait' | 'landscape',
    density: 'normal' | 'compact' | 'dense'
  ): string {
    const sheetWidth = orientation === 'landscape' ? '277mm' : '190mm';
    const isDense = density === 'dense';
    const isCompact = density === 'compact';
    const pageMargin = isDense ? '5.5mm' : isCompact ? '7mm' : '11mm';
    const bodyFontSize = isDense ? '8.5px' : isCompact ? '9.5px' : '11px';
    const bodyLineHeight = isDense ? '1.08' : isCompact ? '1.16' : '1.3';
    const sheetPadding = isDense ? '3.5mm' : isCompact ? '5mm' : '9mm';
    const compactGap = isDense ? '1px' : isCompact ? '2px' : '4px';
    const sectionGap = isDense ? '3px' : isCompact ? '4px' : '8px';
    const fieldGap = isDense ? '1.5px' : isCompact ? '2px' : '4px';
    const fieldPadding = isDense ? '1.5px 2.5px' : isCompact ? '2px 3px' : '4px 5px';
    const tablePadding = isDense ? '1.5px 2.5px' : isCompact ? '2px 3px' : '4px 5px';
    const tableHeaderFontSize = isDense ? '7px' : isCompact ? '7.5px' : '8px';
    const tableCellFontSize = isDense ? '7.8px' : isCompact ? '8.5px' : '9px';
    const signatureGap = isDense ? '6mm' : isCompact ? '8mm' : '14mm';
    const signatureMargin = isDense ? '6mm' : isCompact ? '9mm' : '18mm';
    const signatureHeight = isDense ? '12mm' : isCompact ? '15mm' : '22mm';

    return `
      @page {
        size: A4 ${orientation};
        margin: ${pageMargin};
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 14px;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        font-size: ${bodyFontSize};
        line-height: ${bodyLineHeight};
        background: #e5e7eb;
      }

      .sheet {
        width: ${sheetWidth};
        min-height: 277mm;
        margin: 0 auto;
        padding: ${sheetPadding};
        background: #fff;
        border: 1px solid #d1d5db;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
      }

      .document-header {
        display: grid;
        gap: ${compactGap};
        padding-bottom: ${isDense ? '3px' : isCompact ? '4px' : '8px'};
        border-bottom: 2px solid #111827;
        text-align: center;
      }

      .brand-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #4b5563;
        font-size: 9px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .brand-row strong {
        color: #0f766e;
        font-size: 12px;
      }

      h1 {
        margin: 3px 0 0;
        color: #111827;
        font-size: 15px;
        line-height: 1.15;
      }

      .document-subtitle,
      .branch-line {
        margin: 0;
        font-size: 10px;
      }

      .branch-line {
        font-weight: 700;
      }

      .detail-section,
      .line-section {
        margin-top: ${sectionGap};
      }

      .section-title {
        margin-bottom: ${isDense || isCompact ? '2px' : '4px'};
        color: #0f766e;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .field-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: ${fieldGap};
      }

      .field {
        min-width: 0;
        padding: ${fieldPadding};
        border: 1px solid #d1d5db;
        background: #f9fafb;
      }

      .field-wide {
        grid-column: span 2;
      }

      .field span,
      .signature-box span {
        display: block;
        margin-bottom: 2px;
        color: #4b5563;
        font-size: 8px;
        font-weight: 700;
      }

      .field strong,
      .signature-box strong {
        display: block;
        min-height: 12px;
        color: #111827;
        font-size: 10px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
      }

      thead {
        display: table-header-group;
      }

      th,
      td {
        padding: ${tablePadding};
        border: 1px solid #d1d5db;
        vertical-align: top;
        overflow-wrap: anywhere;
      }

      th {
        color: #111827;
        font-size: ${tableHeaderFontSize};
        font-weight: 800;
        background: #eef2f7;
      }

      td {
        font-size: ${tableCellFontSize};
      }

      tbody tr {
        break-inside: avoid;
      }

      .align-left {
        text-align: left;
      }

      .align-center {
        text-align: center;
      }

      .align-right {
        text-align: right;
      }

      .empty-line {
        margin: 0;
        padding: 8px;
        border: 1px solid #d1d5db;
        color: #4b5563;
        background: #f9fafb;
      }

      .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: ${signatureGap};
        margin-top: ${signatureMargin};
      }

      .signature-box {
        min-height: ${signatureHeight};
        padding: ${isDense || isCompact ? '3px' : '5px'};
        border: 1px solid #9ca3af;
        text-align: center;
      }

      @media print {
        body {
          padding: 0;
          background: #fff;
        }

        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
          border: 0;
          box-shadow: none;
        }
      }
    `;
  }
}
