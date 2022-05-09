export type Task = TaskScan;

export interface TaskScan {
  /** Process id */
  pid: number;
  /** Byte to start at */
  start: number;
  /** Bytes to end at */
  end: number;

  /** Patter to scan for */
  pattern: number[] | Buffer;

  /** Extra criteria for the pattern */
  criteria?: Criteria[];
}

export type Criteria = CriteriaRange;

export type StrutType = 'u8' | 'lu16' | 'lu32' | 'lu64';

export interface CriteriaRange {
  type: 'range';
  format: StrutType;
  offset: number;
  min?: number;
  max: number;
}

export type MemoryTasks = {
  scan: (req: TaskScan) => Promise<number[]>;
};
