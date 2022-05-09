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
