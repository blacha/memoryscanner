/**
 * Scan a buffer looking for a pattern of bytes
 *
 * @param mem Buffer to scan
 * @param pattern Pattern to find, -1 for wild card number
 */
export function* findPattern(mem: Buffer | number[], pattern: Buffer | number[]): Generator<number> {
  for (let i = 0; i <= mem.length - pattern.length; i++) {
    let found = true;
    for (let j = 0; j < pattern.length; j++) {
      const byte = pattern[j];
      if (byte === -1) continue;
      if (mem[i + j] === byte) continue;
      found = false;
      break;
    }
    if (found) yield i;
  }
}
