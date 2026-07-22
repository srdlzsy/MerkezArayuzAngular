import JsBarcode from 'jsbarcode';

export interface BarcodeRenderOptions {
  barWidth?: number;
  barHeight?: number;
  fontSize?: number;
  marginX?: number;
  marginTop?: number;
  textMargin?: number;
}

type BarcodeFormat = 'EAN8' | 'EAN13' | 'CODE128';

const DEFAULT_OPTIONS: Required<BarcodeRenderOptions> = {
  barWidth: 1.2,
  barHeight: 40,
  fontSize: 12,
  marginX: 8,
  marginTop: 4,
  textMargin: 0
};

function pickBarcodeFormat(value: string): BarcodeFormat {
  if (/^\d{8}$/.test(value) || /^\d{7}$/.test(value)) {
    return 'EAN8';
  }

  if (/^\d{13}$/.test(value) || /^\d{12}$/.test(value)) {
    return 'EAN13';
  }

  return 'CODE128';
}

function markBarcodeRenderError(target: SVGSVGElement, value: string, format: BarcodeFormat): void {
  target.innerHTML = '';
  target.setAttribute('data-barcode-error', `${format}:${value}`);
}

export function renderBarcodeSvg(
  target: SVGSVGElement | null,
  rawValue: string | null | undefined,
  options: BarcodeRenderOptions = {}
): void {
  if (!target) {
    return;
  }

  const value = rawValue?.trim() ?? '';

  target.innerHTML = '';

  if (!value) {
    return;
  }

  const settings = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const format = pickBarcodeFormat(value);
  let isValid = false;

  target.removeAttribute('data-barcode-error');

  try {
    JsBarcode(target, value, {
      format,
      width: settings.barWidth,
      height: settings.barHeight,
      displayValue: settings.fontSize > 0,
      font: 'Arial, sans-serif',
      fontSize: settings.fontSize,
      textMargin: settings.textMargin,
      margin: 0,
      marginLeft: settings.marginX,
      marginRight: settings.marginX,
      marginTop: settings.marginTop,
      marginBottom: 0,
      background: 'transparent',
      lineColor: '#000',
      valid: (valid) => {
        isValid = valid;
      }
    });
  } catch {
    markBarcodeRenderError(target, value, format);
    return;
  }

  if (!isValid) {
    markBarcodeRenderError(target, value, format);
    return;
  }

  target.setAttribute('preserveAspectRatio', 'none');
}

export function isDomesticOrigin(origin: string | null | undefined): boolean {
  const normalized = (origin?.trim().toUpperCase() ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '');

  return (
    normalized === 'TR' ||
    normalized.includes('TURKIYE') ||
    normalized.includes('TURK') ||
    normalized.includes('YERLI')
  );
}
