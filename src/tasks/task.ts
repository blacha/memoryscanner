export type Task = TaskScan;

export interface TaskScan {
  id: number;

  start: number;
  end: number;

  pattern: string;
  criteria?: Criteria[];
}

export type Criteria = CriteraRange;

export type StrutType = 'u8' | 'lu16' | 'lu32' | 'lu64';

export interface CriteraRange {
  type: 'range';
  format: StrutType;
  min?: number;
  max: number;
}

function* findPattern(mem: Buffer, pattern: number[]): Generator<number> {
  console.log('FindPatter', mem, pattern);
  for (let i = 0; i < mem.length - pattern.length; i++) {
    let found = false;
    for (let j = 0; j < pattern.length; j++) {
      const byte = pattern[j];
      if (byte === -1) continue;
      if (mem[i + j] === byte) continue;
      found = false;
      break;
    }

    console.log(i, found);
    if (found) yield i;
  }
}

for (const offset of findPattern(Buffer.from([0x00, 0x01, 0x02, 0x01, 0x03]), [0x01, -1])) {
  console.log({ offset });
}

console.log('Hello');
