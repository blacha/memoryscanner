import { ProcessLinux } from '../linux/process.js';
import { Pattern } from '../pattern.js';
import { TaskScan, readNumber } from './task.js';

/**
 * Scan a buffer looking for a pattern of bytes
 *
 * @param mem Buffer to scan
 * @param pattern Pattern to find, -1 for wild card number
 */
export function* findPattern(mem: Buffer | number[], pattern: string): Generator<number> {
  const keys = Pattern.toArray(pattern);
  for (let i = 0; i <= mem.length - keys.length; i++) {
    let found = true;
    for (let j = 0; j < keys.length; j++) {
      const byte = keys[j];
      if (byte === -1) continue;
      if (mem[i + j] === byte) continue;
      found = false;
      break;
    }
    if (found) yield i;
  }
}

const ProcessCache = new Map<number, ProcessLinux>();

function loadProcess(pid: number): ProcessLinux {
  let existing = ProcessCache.get(pid);
  if (existing == null) {
    existing = new ProcessLinux(pid, 'Unknown');
    ProcessCache.set(pid, existing);
  }
  return existing;
}

export async function scan(req: TaskScan): Promise<number[]> {
  const proc = loadProcess(req.pid);

  const memory = await proc.read(req.start, req.end - req.start);
  let res = [...findPattern(memory, req.pattern)];

  const criteria = req.criteria;
  if (criteria == null) return res.map((c) => req.start + c);

  res = res.filter((f): boolean => {
    for (const cr of criteria) {
      const value = readNumber(memory, f + cr.offset, cr.format);

      switch (cr.type) {
        case 'range':
          if (cr.min != null && value < cr.min) return false;
          if (cr.max != null && value > cr.max) return false;
          break;
        case 'equal':
          for (const val of cr.values) {
            if (val === value) return true;
          }
          break;

        default:
          throw new Error('Unknown criteria type: ' + cr);
      }
    }
    return true;
  });
  return res.map((c) => req.start + c);
}
