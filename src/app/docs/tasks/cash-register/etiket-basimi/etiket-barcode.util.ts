const SVG_NS = 'http://www.w3.org/2000/svg';

export interface BarcodeRenderOptions {
  barWidth?: number;
  barHeight?: number;
  fontSize?: number;
  marginX?: number;
  marginTop?: number;
  textMargin?: number;
}

const DEFAULT_OPTIONS: Required<BarcodeRenderOptions> = {
  barWidth: 1.2,
  barHeight: 40,
  fontSize: 12,
  marginX: 8,
  marginTop: 4,
  textMargin: 0
};

const EAN_LEFT_ODD = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011'
] as const;

const EAN_LEFT_EVEN = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111'
] as const;

const EAN_RIGHT = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100'
] as const;

const EAN13_PARITY = [
  'AAAAAA',
  'AABABB',
  'AABBAB',
  'AABBBA',
  'ABAABB',
  'ABBAAB',
  'ABBBAA',
  'ABABAB',
  'ABABBA',
  'ABBABA'
] as const;

function createSvgElement<T extends keyof SVGElementTagNameMap>(
  tagName: T
): SVGElementTagNameMap[T] {
  return document.createElementNS(SVG_NS, tagName);
}

function buildPattern(value: string): number[] {
  const segments: number[] = [2, 1, 2, 1, 2, 1];

  for (const character of value) {
    const bits = character.charCodeAt(0).toString(2).padStart(8, '0');

    for (const bit of bits) {
      segments.push(bit === '1' ? 2 : 1);
      segments.push(1);
    }

    segments.push(2);
    segments.push(1);
  }

  segments.push(2, 1, 2, 1, 2, 1);

  return segments;
}

function computeEan13CheckDigit(baseValue: string): string {
  const digits = baseValue.slice(0, 12).split('').map(Number);
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0
  );

  return `${(10 - (sum % 10)) % 10}`;
}

function computeEan8CheckDigit(baseValue: string): string {
  const digits = baseValue.slice(0, 7).split('').map(Number);
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
    0
  );

  return `${(10 - (sum % 10)) % 10}`;
}

function normalizeEanValue(value: string, targetLength: 8 | 13): string | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  if (value.length === targetLength) {
    return value;
  }

  if (value.length === targetLength - 1) {
    return targetLength === 13
      ? `${value}${computeEan13CheckDigit(value)}`
      : `${value}${computeEan8CheckDigit(value)}`;
  }

  return null;
}

function buildEan13Bits(value: string): { bits: string; guardModules: Set<number> } | null {
  const normalizedValue = normalizeEanValue(value, 13);

  if (!normalizedValue) {
    return null;
  }

  const firstDigit = Number(normalizedValue[0]);
  const parityPattern = EAN13_PARITY[firstDigit];
  let bits = '101';

  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(normalizedValue[index]);
    bits += parityPattern[index - 1] === 'A' ? EAN_LEFT_ODD[digit] : EAN_LEFT_EVEN[digit];
  }

  bits += '01010';

  for (let index = 7; index <= 12; index += 1) {
    const digit = Number(normalizedValue[index]);
    bits += EAN_RIGHT[digit];
  }

  bits += '101';

  const guardModules = new Set<number>();

  for (let index = 0; index < bits.length; index += 1) {
    if (
      (index >= 0 && index <= 2) ||
      (index >= 45 && index <= 49) ||
      (index >= 92 && index <= 94)
    ) {
      guardModules.add(index);
    }
  }

  return {
    bits,
    guardModules
  };
}

function buildEan8Bits(value: string): { bits: string; guardModules: Set<number> } | null {
  const normalizedValue = normalizeEanValue(value, 8);

  if (!normalizedValue) {
    return null;
  }

  let bits = '101';

  for (let index = 0; index <= 3; index += 1) {
    bits += EAN_LEFT_ODD[Number(normalizedValue[index])];
  }

  bits += '01010';

  for (let index = 4; index <= 7; index += 1) {
    bits += EAN_RIGHT[Number(normalizedValue[index])];
  }

  bits += '101';

  const guardModules = new Set<number>();

  for (let index = 0; index < bits.length; index += 1) {
    if (
      (index >= 0 && index <= 2) ||
      (index >= 32 && index <= 36) ||
      (index >= 64 && index <= 66)
    ) {
      guardModules.add(index);
    }
  }

  return {
    bits,
    guardModules
  };
}

function pickBarcodeFormat(value: string): 'EAN8' | 'EAN13' | 'CODE128' {
  if (/^\d{8}$/.test(value) || /^\d{7}$/.test(value)) {
    return 'EAN8';
  }

  if (/^\d{13}$/.test(value) || /^\d{12}$/.test(value)) {
    return 'EAN13';
  }

  return 'CODE128';
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
  const eanPattern =
    format === 'EAN13'
      ? buildEan13Bits(value)
      : format === 'EAN8'
        ? buildEan8Bits(value)
        : null;
  const textHeight = settings.fontSize > 0 ? settings.fontSize + settings.textMargin + 2 : 0;
  const guardExtraHeight = format === 'CODE128' ? 0 : Math.max(4, settings.fontSize * 0.35);

  if (eanPattern) {
    const width = eanPattern.bits.length * settings.barWidth + settings.marginX * 2;
    const height = settings.marginTop + settings.barHeight + guardExtraHeight + textHeight;

    target.setAttribute('viewBox', `0 0 ${width} ${height}`);
    target.setAttribute('preserveAspectRatio', 'none');

    for (let index = 0; index < eanPattern.bits.length; index += 1) {
      if (eanPattern.bits[index] !== '1') {
        continue;
      }

      const rect = createSvgElement('rect');
      const x = settings.marginX + index * settings.barWidth;
      const isGuardBar = eanPattern.guardModules.has(index);
      const barHeight = settings.barHeight + (isGuardBar ? guardExtraHeight : 0);

      rect.setAttribute('x', `${x}`);
      rect.setAttribute('y', `${settings.marginTop}`);
      rect.setAttribute('width', `${settings.barWidth}`);
      rect.setAttribute('height', `${barHeight}`);
      rect.setAttribute('fill', '#000');
      target.appendChild(rect);
    }

    const label = createSvgElement('text');
    label.setAttribute('x', `${width / 2}`);
    label.setAttribute('y', `${height - 2}`);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', `${settings.fontSize}`);
    label.setAttribute('font-family', 'Arial, sans-serif');
    label.textContent = format === 'EAN13'
      ? normalizeEanValue(value, 13) ?? value
      : normalizeEanValue(value, 8) ?? value;
    target.appendChild(label);

    return;
  }

  const pattern = buildPattern(value);
  const width =
    pattern.reduce((total, segment) => total + segment, 0) * settings.barWidth +
    settings.marginX * 2;
  const height = settings.marginTop + settings.barHeight + textHeight + 6;

  target.setAttribute('viewBox', `0 0 ${width} ${height}`);
  target.setAttribute('preserveAspectRatio', 'none');

  let x = settings.marginX;

  pattern.forEach((segment, index) => {
    const segmentWidth = segment * settings.barWidth;

    if (index % 2 === 0) {
      const rect = createSvgElement('rect');
      rect.setAttribute('x', `${x}`);
      rect.setAttribute('y', `${settings.marginTop}`);
      rect.setAttribute('width', `${segmentWidth}`);
      rect.setAttribute('height', `${settings.barHeight}`);
      rect.setAttribute('fill', '#000');
      target.appendChild(rect);
    }

    x += segmentWidth;
  });

  const label = createSvgElement('text');
  label.setAttribute('x', `${width / 2}`);
  label.setAttribute('y', `${height - 2}`);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', `${settings.fontSize}`);
  label.setAttribute('font-family', 'Arial, sans-serif');
  label.textContent = value;
  target.appendChild(label);
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
