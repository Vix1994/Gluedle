/*
 * Small, dependency-free QR encoder for Gluedle share cards.
 * Implements ISO/IEC 18004 byte mode for a fixed Version 5-L symbol.
 * The implementation is original to this project; constants follow the QR specification.
 */

export const QR_VERSION = 5;
export const QR_SIZE = 17 + QR_VERSION * 4;
export const QR_DATA_CODEWORDS = 108;
export const QR_EC_CODEWORDS = 26;
export const QR_MAX_BYTES = 106;

const PAD_BYTES = [0xec, 0x11];

export function createQrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text))];
  if (bytes.length > QR_MAX_BYTES) {
    throw new RangeError(`QR payload exceeds ${QR_MAX_BYTES} UTF-8 bytes.`);
  }

  const data = createDataCodewords(bytes);
  const codewords = [...data, ...reedSolomonRemainder(data, QR_EC_CODEWORDS)];
  let best = null;

  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = createBaseMatrix();
    placeCodewords(matrix, codewords, mask);
    placeFormatBits(matrix, mask);
    const score = penaltyScore(matrix);
    if (!best || score < best.score) best = { matrix, score };
  }

  return best.matrix;
}

export function canonicalGameUrl(locationLike) {
  const source = locationLike instanceof URL
    ? new URL(locationLike.href)
    : new URL(String(locationLike?.href ?? locationLike));
  source.hash = "";
  source.search = "";
  const trimmedPath = source.pathname.replace(/\/+$/, "");
  if (/\/gluedle(?:\.html)?$/.test(trimmedPath)) {
    source.pathname = `${trimmedPath.replace(/\/gluedle(?:\.html)?$/, "")}/gluedle/`;
  } else {
    const directory = source.pathname.endsWith("/")
      ? source.pathname
      : source.pathname.slice(0, source.pathname.lastIndexOf("/") + 1);
    source.pathname = `${directory}gluedle/`;
  }
  return source.href;
}

function createDataCodewords(bytes) {
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacity = QR_DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data = [];
  for (let index = 0; index < bits.length; index += 8) {
    data.push(bits.slice(index, index + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }
  let padIndex = 0;
  while (data.length < QR_DATA_CODEWORDS) {
    data.push(PAD_BYTES[padIndex % PAD_BYTES.length]);
    padIndex += 1;
  }
  return data;
}

function appendBits(target, value, length) {
  for (let bit = length - 1; bit >= 0; bit -= 1) target.push((value >>> bit) & 1);
}

function createBaseMatrix() {
  const matrix = Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(null));
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, QR_SIZE - 7, 0);
  placeFinder(matrix, 0, QR_SIZE - 7);

  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    matrix[6][index] = index % 2 === 0;
    matrix[index][6] = index % 2 === 0;
  }

  placeAlignment(matrix, 30, 30);
  reserveFormatAreas(matrix);
  matrix[QR_SIZE - 8][8] = true;
  return matrix;
}

function placeFinder(matrix, left, top) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const row = top + y;
      const column = left + x;
      if (row < 0 || column < 0 || row >= QR_SIZE || column >= QR_SIZE) continue;
      const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
      matrix[row][column] = inside
        && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
    }
  }
}

function placeAlignment(matrix, centerX, centerY) {
  if (matrix[centerY][centerX] !== null) return;
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      matrix[centerY + y][centerX + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
    }
  }
}

function reserveFormatAreas(matrix) {
  for (let index = 0; index <= 8; index += 1) {
    if (matrix[8][index] === null) matrix[8][index] = false;
    if (matrix[index][8] === null) matrix[index][8] = false;
  }
  for (let index = 0; index < 8; index += 1) {
    matrix[8][QR_SIZE - 1 - index] = false;
    matrix[QR_SIZE - 1 - index][8] = false;
  }
}

function placeCodewords(matrix, codewords, mask) {
  const bits = codewords.flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let offset = 0; offset < QR_SIZE; offset += 1) {
      const row = upward ? QR_SIZE - 1 - offset : offset;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const column = right - columnOffset;
        if (matrix[row][column] !== null) continue;
        const bit = bits[bitIndex] ?? 0;
        matrix[row][column] = Boolean(bit ^ maskBit(mask, row, column));
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function maskBit(mask, row, column) {
  const conditions = [
    (row + column) % 2 === 0,
    row % 2 === 0,
    column % 3 === 0,
    (row + column) % 3 === 0,
    (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
    (row * column) % 2 + (row * column) % 3 === 0,
    ((row * column) % 2 + (row * column) % 3) % 2 === 0,
    ((row + column) % 2 + (row * column) % 3) % 2 === 0,
  ];
  return conditions[mask] ? 1 : 0;
}

function placeFormatBits(matrix, mask) {
  const data = (0b01 << 3) | mask;
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((remainder >>> bit) & 1) !== 0) remainder ^= 0x537 << (bit - 10);
  }
  const format = ((data << 10) | remainder) ^ 0x5412;
  const bit = (index) => ((format >>> index) & 1) !== 0;

  for (let index = 0; index <= 5; index += 1) matrix[index][8] = bit(index);
  matrix[7][8] = bit(6);
  matrix[8][8] = bit(7);
  matrix[8][7] = bit(8);
  for (let index = 9; index < 15; index += 1) matrix[8][14 - index] = bit(index);

  for (let index = 0; index < 8; index += 1) matrix[8][QR_SIZE - 1 - index] = bit(index);
  for (let index = 8; index < 15; index += 1) matrix[QR_SIZE - 15 + index][8] = bit(index);
  matrix[QR_SIZE - 8][8] = true;
}

function reedSolomonRemainder(data, degree) {
  const divisor = reedSolomonDivisor(degree);
  const result = Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let index = 0; index < degree; index += 1) {
      result[index] ^= multiplyGalois(divisor[index], factor);
    }
  }
  return result;
}

function reedSolomonDivisor(degree) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let iteration = 0; iteration < degree; iteration += 1) {
    for (let index = 0; index < degree; index += 1) {
      result[index] = multiplyGalois(result[index], root);
      if (index + 1 < degree) result[index] ^= result[index + 1];
    }
    root = multiplyGalois(root, 0x02);
  }
  return result;
}

function multiplyGalois(left, right) {
  let x = left;
  let y = right;
  let product = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    product ^= -(y & 1) & x;
    y >>>= 1;
    x = (x << 1) ^ (-(x >>> 7) & 0x11d);
  }
  return product;
}

function penaltyScore(matrix) {
  let score = 0;
  for (const line of [...matrix, ...transpose(matrix)]) {
    let runColor = line[0];
    let runLength = 1;
    for (let index = 1; index < line.length; index += 1) {
      if (line[index] === runColor) runLength += 1;
      else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = line[index];
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + runLength - 5;
    const text = line.map((cell) => (cell ? "1" : "0")).join("");
    score += 40 * countPattern(text, "10111010000");
    score += 40 * countPattern(text, "00001011101");
  }
  for (let row = 0; row < QR_SIZE - 1; row += 1) {
    for (let column = 0; column < QR_SIZE - 1; column += 1) {
      const value = matrix[row][column];
      if (
        matrix[row][column + 1] === value
        && matrix[row + 1][column] === value
        && matrix[row + 1][column + 1] === value
      ) score += 3;
    }
  }
  const dark = matrix.flat().filter(Boolean).length;
  score += Math.floor(Math.abs(dark * 20 - QR_SIZE * QR_SIZE * 10) / (QR_SIZE * QR_SIZE)) * 10;
  return score;
}

function transpose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function countPattern(text, pattern) {
  let count = 0;
  for (let index = 0; index <= text.length - pattern.length; index += 1) {
    if (text.slice(index, index + pattern.length) === pattern) count += 1;
  }
  return count;
}
