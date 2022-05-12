import c from 'ansi-colors';

/**
 * Convert a number to a hex string
 *
 * @example
 *
 * ```typescript
 * toHex(32) //0x20
 * toHex(1) // 0x01
 * toHex(5072) // 0x13d0
 * ```
 *
 * @param num number to convert
 * @param padding number of leading padding 0s
 * @returns hex string
 */
export function toHex(num: number, padding = 2): string {
  return '0x' + num.toString(16).padStart(padding, '0');
}

const ByteSizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

/**
 * Convert a byte count to human readable count
 *
 * @example
 *
 * ```typescript
 * toHuman(0x01) // 1 Byte
 * toHuman(1024 * 1024) // 1 MB
 * toHuman(76 * 1024 * 1024) // 76 MB
 * ```
 *
 * @param bytes number of bytes
 * @returns Human byte count
 */
export function toHuman(bytes: number): string {
  if (bytes === 0) return '0 Byte';
  const i = Number(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + ByteSizes[i];
}

const charA = 'a'.charCodeAt(0);
const charZ = 'z'.charCodeAt(0);
const charCapA = 'A'.charCodeAt(0);
const charCapZ = 'Z'.charCodeAt(0);
const char0 = '0'.charCodeAt(0);
const char9 = '9'.charCodeAt(0);

function isChar(o: number): boolean {
  if (o >= charA && o <= charZ) return true;
  if (o >= charCapA && o <= charCapZ) return true;
  if (o >= char0 && o <= char9) return true;
  if (o === 0x20) return true;
  return false;
}
export function toHexColor(num: number): string {
  const str = toHex(num);
  if (num === 0) return c.gray(str);
  if (isChar(num)) {
    if (num >= char0 && num <= char9) return c.yellow(str);
    if (num === 0x20) return c.red(str);
    return c.blue(str);
  }
  return str;
}

const NonStringChar = c.gray('.');
const DumpSize = 16;

/** Dump a buffer into a human readable(ish) output */
export function dump(buf: Buffer, title = ''): void {
  let offset = 0;

  let padStart = 2;
  if (buf.length >= 0x100) padStart = 3;

  if (title) title = `  ${title}  `;
  const titleLine = c.red('-'.repeat((122 + padStart) / 2 - title.length / 2));
  console.log(`${titleLine}${title}${titleLine}`);
  while (buf.length > 0) {
    const b = [...buf.slice(0, DumpSize)];

    const output = [];
    const outChars = [];
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      let outputChar = NonStringChar;
      if (isChar(c)) outputChar = String.fromCharCode(c);
      if (c === 0x00) outputChar = ' ';
      output.push(toHexColor(b[i]).padStart(4, ' '));
      outChars.push(outputChar);
      if ((i + 1) % 4 === 0) output.push('  ');
      else output.push(' ');
    }
    console.log(toHex(offset, padStart), c.red('|'), output.join('').padEnd(112 + padStart, ' '), outChars.join(' '));
    offset += DumpSize;
    buf = buf.slice(DumpSize);
  }
}
