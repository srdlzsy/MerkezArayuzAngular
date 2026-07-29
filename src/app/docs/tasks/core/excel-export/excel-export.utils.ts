import type { Cell, Sheet, SheetData } from 'write-excel-file/browser';

type BrowserFileContent = File | Blob | ArrayBuffer;

export type ExcelExportColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean';

export interface ExcelExportColumn<Row = unknown> {
  label: string;
  value: Extract<keyof Row, string> | string | ((row: Row) => unknown);
  type?: ExcelExportColumnType;
  format?: string;
}

export interface ExcelExportSheet<Row = unknown> {
  sheetName: string;
  rows: readonly Row[];
  columns: readonly ExcelExportColumn<Row>[];
}

export interface ExcelExportSingleSheetOptions<Row = unknown> extends ExcelExportSheet<Row> {
  fileName: string;
}

export interface ExcelExportWorkbookOptions {
  fileName: string;
  sheets: readonly ExcelExportSheet<any>[];
}

interface PreparedExcelSheet extends Sheet<BrowserFileContent> {
  sheet: string;
  columns: Array<{ width: number }>;
}

type ExcelExportOptions<Row = unknown> =
  | ExcelExportSingleSheetOptions<Row>
  | ExcelExportWorkbookOptions;

export async function exportRowsToExcel<Row>(
  options: ExcelExportOptions<Row>
): Promise<void> {
  const preparedSheets = prepareExcelSheets(options);

  if (!preparedSheets.length) {
    return;
  }

  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const fileName = `${normalizeExcelFileName(options.fileName)}.xlsx`;

  if (preparedSheets.length === 1) {
    const [sheet] = preparedSheets;

    await writeXlsxFile(sheet.data, {
      sheet: sheet.sheet,
      columns: sheet.columns
    }).toFile(fileName);
    return;
  }

  await writeXlsxFile(preparedSheets).toFile(fileName);
}

export function normalizeExcelFileName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    .trim();

  return normalized || 'rapor';
}

export function normalizeExcelSheetName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\[\]\\/*?:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 31)
    .trim();

  return normalized || 'Rapor';
}

function prepareExcelSheets<Row>(options: ExcelExportOptions<Row>): PreparedExcelSheet[] {
  const sheets = 'sheets' in options
    ? options.sheets
    : [
        {
          sheetName: options.sheetName,
          rows: options.rows,
          columns: options.columns
        }
      ];
  const usedSheetNames = new Set<string>();

  return sheets
    .filter((sheet) => sheet.columns.length > 0)
    .map((sheet, index) => prepareExcelSheet(sheet, usedSheetNames, index));
}

function prepareExcelSheet<Row>(
  sheet: ExcelExportSheet<Row>,
  usedSheetNames: Set<string>,
  index: number
): PreparedExcelSheet {
  const data = buildExcelSheetData(sheet.rows, sheet.columns);

  return {
    sheet: getUniqueSheetName(sheet.sheetName, usedSheetNames, index),
    data,
    columns: buildExcelColumnWidths(sheet.columns, data)
  };
}

function buildExcelSheetData<Row>(
  rows: readonly Row[],
  columns: readonly ExcelExportColumn<Row>[]
): SheetData {
  return [
    columns.map((column) => ({
      value: column.label,
      type: String,
      fontWeight: 'bold',
      backgroundColor: '#eaf0ff'
    })),
    ...rows.map((row) => columns.map((column) => buildExcelCell(row, column)))
  ];
}

function buildExcelCell<Row>(row: Row, column: ExcelExportColumn<Row>): Cell {
  const value = resolveColumnValue(row, column);

  if (value === null || value === undefined) {
    return '';
  }

  if (isExcelCellObject(value)) {
    return value;
  }

  if (column.type === 'date' || column.type === 'datetime') {
    const dateValue = value instanceof Date ? value : new Date(`${value}`);

    if (!Number.isNaN(dateValue.getTime())) {
      return {
        value: dateValue,
        type: Date,
        format: column.format ?? (column.type === 'date' ? 'dd.mm.yyyy' : 'dd.mm.yyyy hh:mm')
      };
    }
  }

  if (value instanceof Date) {
    return {
      value,
      type: Date,
      format: column.format ?? 'dd.mm.yyyy hh:mm'
    };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }

    return {
      value,
      type: Number,
      format: column.format ?? (column.type === 'currency' ? '#,##0.00' : undefined)
    };
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return `${value}`;
}

function resolveColumnValue<Row>(row: Row, column: ExcelExportColumn<Row>): unknown {
  if (typeof column.value === 'function') {
    return column.value(row);
  }

  return (row as Record<string, unknown>)[column.value];
}

function buildExcelColumnWidths<Row>(
  columns: readonly ExcelExportColumn<Row>[],
  sheetData: SheetData
): Array<{ width: number }> {
  return columns.map((column, columnIndex) => {
    const contentWidth = sheetData.reduce((width, row) => {
      const value = getExcelCellDisplayValue(row[columnIndex]);
      return Math.max(width, value.length);
    }, column.label.length);

    return { width: Math.max(10, Math.min(contentWidth + 2, 42)) };
  });
}

function getExcelCellDisplayValue(cell: Cell): string {
  if (cell === null || cell === undefined) {
    return '';
  }

  if (isExcelCellObject(cell)) {
    const value = cell.value;
    return value === null || value === undefined ? '' : `${value}`;
  }

  return `${cell}`;
}

function isExcelCellObject(value: unknown): value is Exclude<Cell, null | undefined> & {
  value?: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date) &&
    ('value' in value || 'type' in value || 'format' in value)
  );
}

function getUniqueSheetName(
  rawName: string,
  usedSheetNames: Set<string>,
  index: number
): string {
  const baseName = normalizeExcelSheetName(rawName || `Rapor ${index + 1}`);
  let candidate = baseName;
  let suffixIndex = 2;

  while (usedSheetNames.has(candidate.toLocaleLowerCase('tr-TR'))) {
    const suffix = ` ${suffixIndex}`;
    candidate = `${baseName.slice(0, 31 - suffix.length).trim()}${suffix}`;
    suffixIndex += 1;
  }

  usedSheetNames.add(candidate.toLocaleLowerCase('tr-TR'));
  return candidate;
}
