const SVG_NS = 'http://www.w3.org/2000/svg';

type QrErrorCorrectLevel = 'L' | 'M' | 'Q' | 'H';

// Minimal QR generator adapted from Kazuhiko Arase's qrcode-generator (MIT).
// Supports byte mode with auto version and L error correction by default.
class QrBitBuffer {
  private buffer: number[] = [];
  private length = 0;

  public getLengthInBits(): number {
    return this.length;
  }

  public put(num: number, length: number): void {
    for (let i = 0; i < length; i += 1) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  public putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length += 1;
  }

  public getBuffer(): number[] {
    return this.buffer;
  }
}

const QrPad0 = 0xec;
const QrPad1 = 0x11;

const QrPatternPositionTable = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54]
] as const;

const QrG15 =
  (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const QrG18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const QrG15Mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

const QrMode = {
  NUMERIC: 1,
  BYTE: 4
} as const;

const QrErrorCorrectLevels: Record<QrErrorCorrectLevel, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};

const QrRsBlockTable = [
  // L
  // 1
  [1, 26, 19],
  // 2
  [1, 44, 34],
  // 3
  [1, 70, 55],
  // 4
  [1, 100, 80],
  // 5
  [1, 134, 108],
  // 6
  [2, 86, 68],
  // 7
  [2, 98, 78],
  // 8
  [2, 121, 97],
  // 9
  [2, 146, 116],
  // 10
  [2, 86, 68, 2, 87, 69]
] as const;

function getBchDigit(data: number): number {
  let digit = 0;
  let value = data;
  while (value !== 0) {
    digit += 1;
    value >>>= 1;
  }
  return digit;
}

function getBchTypeInfo(data: number): number {
  let value = data << 10;
  while (getBchDigit(value) - getBchDigit(QrG15) >= 0) {
    value ^= QrG15 << (getBchDigit(value) - getBchDigit(QrG15));
  }
  return ((data << 10) | value) ^ QrG15Mask;
}

function getBchTypeNumber(data: number): number {
  let value = data << 12;
  while (getBchDigit(value) - getBchDigit(QrG18) >= 0) {
    value ^= QrG18 << (getBchDigit(value) - getBchDigit(QrG18));
  }
  return (data << 12) | value;
}

function getPatternPosition(version: number): number[] {
  const positions = QrPatternPositionTable[version - 1] ?? [];
  return Array.from(positions);
}

function getMask(pattern: number, i: number, j: number): boolean {
  switch (pattern) {
    case 0:
      return (i + j) % 2 === 0;
    case 1:
      return i % 2 === 0;
    case 2:
      return j % 3 === 0;
    case 3:
      return (i + j) % 3 === 0;
    case 4:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5:
      return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    case 7:
      return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function getErrorCorrectPolynomial(errorCorrectLength: number): number[] {
  let poly = [1];
  for (let i = 0; i < errorCorrectLength; i += 1) {
    poly = qrPolyMultiply(poly, [1, qrGexp(i)]);
  }
  return poly;
}

function qrPolyMultiply(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= qrGexp(qrGlog(a[i]) + qrGlog(b[j]));
    }
  }
  return result;
}

const QR_EXP_TABLE = new Array(256).fill(0);
const QR_LOG_TABLE = new Array(256).fill(0);

for (let i = 0; i < 8; i += 1) {
  QR_EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i += 1) {
  QR_EXP_TABLE[i] =
    QR_EXP_TABLE[i - 4] ^ QR_EXP_TABLE[i - 5] ^ QR_EXP_TABLE[i - 6] ^ QR_EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i += 1) {
  QR_LOG_TABLE[QR_EXP_TABLE[i]] = i;
}

function qrGlog(n: number): number {
  if (n < 1) {
    throw new Error('glog');
  }
  return QR_LOG_TABLE[n];
}

function qrGexp(n: number): number {
  let value = n;
  while (value < 0) {
    value += 255;
  }
  while (value >= 256) {
    value -= 255;
  }
  return QR_EXP_TABLE[value];
}

function createData(version: number, errorCorrectLevel: QrErrorCorrectLevel, data: string): number[] {
  const buffer = new QrBitBuffer();
  const isNumeric = /^\d+$/.test(data);

  if (isNumeric) {
    buffer.put(QrMode.NUMERIC, 4);
    const countBits = version < 10 ? 10 : version < 27 ? 12 : 14;
    buffer.put(data.length, countBits);

    for (let i = 0; i < data.length; i += 3) {
      const chunk = data.slice(i, i + 3);
      const bitLength = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
      buffer.put(Number(chunk), bitLength);
    }
  } else {
    buffer.put(QrMode.BYTE, 4);
    buffer.put(data.length, version < 10 ? 8 : 16);
    for (let i = 0; i < data.length; i += 1) {
      buffer.put(data.charCodeAt(i), 8);
    }
  }

  const rsBlocks = getRsBlocks(version, errorCorrectLevel);
  let totalDataCount = 0;
  rsBlocks.forEach((block) => (totalDataCount += block.dataCount));

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error('QR overflow');
  }

  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
    buffer.put(0, 4);
  }

  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(false);
  }

  while (buffer.getBuffer().length < totalDataCount) {
    buffer.put(QrPad0, 8);
    if (buffer.getBuffer().length >= totalDataCount) {
      break;
    }
    buffer.put(QrPad1, 8);
  }

  return createBytes(buffer, rsBlocks);
}

function getRsBlocks(version: number, errorCorrectLevel: QrErrorCorrectLevel): Array<{ totalCount: number; dataCount: number }> {
  const offset = (version - 1) * 1;
  const row = QrRsBlockTable[offset];
  if (!row) {
    throw new Error('QR RS block missing');
  }
  const blocks: Array<{ totalCount: number; dataCount: number }> = [];
  for (let i = 0; i < row.length; i += 3) {
    const count = row[i];
    const totalCount = row[i + 1];
    const dataCount = row[i + 2];
    for (let j = 0; j < count; j += 1) {
      blocks.push({ totalCount, dataCount });
    }
  }
  return blocks;
}

function createBytes(buffer: QrBitBuffer, rsBlocks: Array<{ totalCount: number; dataCount: number }>): number[] {
  let offset = 0;
  const maxDcCount = Math.max(...rsBlocks.map((block) => block.dataCount));
  const maxEcCount = Math.max(...rsBlocks.map((block) => block.totalCount - block.dataCount));

  const dcdata: number[][] = [];
  const ecdata: number[][] = [];

  rsBlocks.forEach((block) => {
    const dcCount = block.dataCount;
    const ecCount = block.totalCount - block.dataCount;
    dcdata.push(buffer.getBuffer().slice(offset, offset + dcCount));
    offset += dcCount;

    const rsPoly = getErrorCorrectPolynomial(ecCount);
    const rawPoly = dcdata[dcdata.length - 1].slice();
    while (rawPoly.length < rsPoly.length - 1) {
      rawPoly.push(0);
    }
    const modPoly = qrMod(rawPoly, rsPoly);
    const ec = new Array(ecCount).fill(0);
    for (let i = 0; i < ecCount; i += 1) {
      const modIndex = i + modPoly.length - ecCount;
      ec[i] = modIndex >= 0 ? modPoly[modIndex] : 0;
    }
    ecdata.push(ec);
  });

  const data: number[] = [];
  for (let i = 0; i < maxDcCount; i += 1) {
    dcdata.forEach((block) => {
      if (i < block.length) {
        data.push(block[i]);
      }
    });
  }
  for (let i = 0; i < maxEcCount; i += 1) {
    ecdata.forEach((block) => {
      if (i < block.length) {
        data.push(block[i]);
      }
    });
  }

  return data;
}

function qrMod(dividend: number[], divisor: number[]): number[] {
  let result = dividend.slice();
  while (result.length - divisor.length >= 0) {
    const ratio = qrGlog(result[0]) - qrGlog(divisor[0]);
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= qrGexp(qrGlog(divisor[i]) + ratio);
    }
    while (result.length > 0 && result[0] === 0) {
      result.shift();
    }
  }
  return result;
}

class QrCode {
  private version: number;
  private errorCorrectLevel: QrErrorCorrectLevel;
  private modules: Array<Array<boolean | undefined>> = [];
  private moduleCount = 0;
  private dataCache: number[] = [];
  private dataList: string[] = [];

  constructor(version: number, errorCorrectLevel: QrErrorCorrectLevel) {
    this.version = version;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  public addData(data: string): void {
    this.dataList.push(data);
    this.dataCache = [];
  }

  public isDark(row: number, col: number): boolean {
    return this.modules[row]?.[col] ?? false;
  }

  public getModuleCount(): number {
    return this.moduleCount;
  }

  public make(): void {
    if (this.version < 1) {
      this.version = this.getBestVersion();
    }
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private getBestVersion(): number {
    for (let version = 1; version <= 10; version += 1) {
      try {
        createData(version, this.errorCorrectLevel, this.dataList.join(''));
        return version;
      } catch {
        // continue
      }
    }
    return 1;
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.version * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row += 1) {
      this.modules[row] = new Array<boolean | undefined>(this.moduleCount).fill(undefined);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.version >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache.length === 0) {
      this.dataCache = createData(this.version, this.errorCorrectLevel, this.dataList.join(''));
    }

    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern(): void {
    for (let i = 8; i < this.moduleCount - 8; i += 1) {
      if (this.modules[i][6] === undefined) {
        this.modules[i][6] = i % 2 === 0;
      }
      if (this.modules[6][i] === undefined) {
        this.modules[6][i] = i % 2 === 0;
      }
    }
  }

  private setupPositionAdjustPattern(): void {
    const positions = getPatternPosition(this.version);
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = 0; j < positions.length; j += 1) {
        const row = positions[i];
        const col = positions[j];
        if (this.modules[row][col] !== undefined) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            this.modules[row + r][col + c] =
              Math.max(Math.abs(r), Math.abs(c)) !== 1;
          }
        }
      }
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (QrErrorCorrectLevels[this.errorCorrectLevel] << 3) | maskPattern;
    const bits = getBchTypeInfo(data);

    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    this.modules[this.moduleCount - 8][8] = !test;
  }

  private setupTypeNumber(test: boolean): void {
    const bits = getBchTypeNumber(this.version);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (this.modules[row][col - c] !== undefined) {
            continue;
          }
          let dark = false;
          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }
          const mask = getMask(maskPattern, row, col - c);
          if (mask) {
            dark = !dark;
          }
          this.modules[row][col - c] = dark;
          bitIndex -= 1;
          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLost = 0;
    let pattern = 0;

    for (let i = 0; i < 8; i += 1) {
      this.makeImpl(true, i);
      const lost = this.getLostPoint();
      if (i === 0 || minLost > lost) {
        minLost = lost;
        pattern = i;
      }
    }

    return pattern;
  }

  private getLostPoint(): number {
    let lostPoint = 0;

    for (let row = 0; row < this.moduleCount; row += 1) {
      for (let col = 0; col < this.moduleCount; col += 1) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || this.moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || this.moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === this.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }

    for (let row = 0; row < this.moduleCount - 1; row += 1) {
      for (let col = 0; col < this.moduleCount - 1; col += 1) {
        let count = 0;
        if (this.isDark(row, col)) count += 1;
        if (this.isDark(row + 1, col)) count += 1;
        if (this.isDark(row, col + 1)) count += 1;
        if (this.isDark(row + 1, col + 1)) count += 1;
        if (count === 0 || count === 4) {
          lostPoint += 3;
        }
      }
    }

    for (let row = 0; row < this.moduleCount; row += 1) {
      for (let col = 0; col < this.moduleCount - 6; col += 1) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row, col + 1) &&
          this.isDark(row, col + 2) &&
          this.isDark(row, col + 3) &&
          this.isDark(row, col + 4) &&
          !this.isDark(row, col + 5) &&
          this.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }

    for (let col = 0; col < this.moduleCount; col += 1) {
      for (let row = 0; row < this.moduleCount - 6; row += 1) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row + 1, col) &&
          this.isDark(row + 2, col) &&
          this.isDark(row + 3, col) &&
          this.isDark(row + 4, col) &&
          !this.isDark(row + 5, col) &&
          this.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }

    let darkCount = 0;
    for (let row = 0; row < this.moduleCount; row += 1) {
      for (let col = 0; col < this.moduleCount; col += 1) {
        if (this.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }

    const ratio = Math.abs((100 * darkCount) / (this.moduleCount * this.moduleCount) - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }
}

function createSvgElement<T extends keyof SVGElementTagNameMap>(
  tagName: T
): SVGElementTagNameMap[T] {
  return document.createElementNS(SVG_NS, tagName);
}

export function renderQrSvg(target: SVGSVGElement | null, rawValue: string | null | undefined): void {
  if (!target) {
    return;
  }

  const value = rawValue?.trim() ?? '';
  target.innerHTML = '';

  if (!value) {
    return;
  }

  const qr = new QrCode(0, 'L');
  qr.addData(value);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
  const size = moduleCount + quietZone * 2;
  const cellSize = 1;

  target.setAttribute('viewBox', `0 0 ${size} ${size}`);
  target.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const background = createSvgElement('rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', `${size}`);
  background.setAttribute('height', `${size}`);
  background.setAttribute('fill', '#fff');
  target.appendChild(background);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) {
        continue;
      }
      const rect = createSvgElement('rect');
      rect.setAttribute('x', `${col + quietZone}`);
      rect.setAttribute('y', `${row + quietZone}`);
      rect.setAttribute('width', `${cellSize}`);
      rect.setAttribute('height', `${cellSize}`);
      rect.setAttribute('fill', '#000');
      target.appendChild(rect);
    }
  }
}
