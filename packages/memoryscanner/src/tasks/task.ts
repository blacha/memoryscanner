export type Task = TaskScan;

export interface TaskScan {
  /** Process id */
  pid: number;
  /** Byte to start at */
  start: number;
  /** Bytes to end at */
  end: number;

  /** Patter to scan for */
  pattern: string;

  /** Extra criteria for the pattern */
  criteria?: Criteria[];
}

export type Criteria = CriteriaRange | CriteriaEqual;

export type StrutType = 'u8' | 'lu16' | 'lu32' | 'lu64';

/** Is this value between min and max */
export interface CriteriaRange {
  type: 'range';
  format: StrutType;
  offset: number;
  min?: number;
  max?: number;
}

/** Does this value equal one of the follow values */
export interface CriteriaEqual {
  type: 'equal';
  format: StrutType;
  offset: number;
  values: number[];
}

export type MemoryTasks = {
  scan: (req: TaskScan) => Promise<number[]>;
};

export function readNumber(mem: Buffer, offset: number, format: StrutType): number {
  switch (format) {
    case 'u8':
      return mem[offset];
    case 'lu16':
      return mem.readUInt16LE(offset);
    case 'lu32':
      return mem.readUInt32LE(offset);
    case 'lu64':
      return Number(mem.readBigUint64LE(offset));
    default:
      throw new Error('Unknown Format');
  }
}
