import { WorkerRpcPool } from '@wtrpc/core';
import { dump, toHex } from './format.js';
import { ProcessLinux, ProcessMemoryMap } from './linux/process.js';
import { Pattern } from './pattern.js';
import { Criteria, MemoryTasks, TaskScan } from './tasks/task.js';

export interface ScanOptions {
  /** Min/Max size of memory block to scan */
  block?: { min?: number; max?: number; filter?(m: ProcessMemoryMap): boolean };

  criteria?: Criteria[];
}

const workerUrl = new URL('./worker.js', import.meta.url);

export class ProcessMemory {
  /** Number of threads to use to scan memory */
  static Threads = 32;

  static _pool: WorkerRpcPool<MemoryTasks> | null;
  /** Worker pool to run tasks on */
  static get Pool(): WorkerRpcPool<MemoryTasks> {
    if (this._pool == null) this._pool = new WorkerRpcPool<MemoryTasks>(ProcessMemory.Threads, workerUrl);
    return this._pool;
  }

  static async close(): Promise<void> {
    await this._pool?.close();
    this._pool = null;
  }

  proc: ProcessLinux;

  constructor(proc: ProcessLinux) {
    this.proc = proc;
  }

  static async find(name: string): Promise<ProcessMemory | null> {
    const proc = await ProcessLinux.findByName(name);
    if (proc) return new ProcessMemory(proc);
    return null;
  }

  async scan(pattern: string | Buffer, options?: ScanOptions): Promise<number[]> {
    if (Buffer.isBuffer(pattern)) pattern = Pattern.buffer(pattern);

    Pattern.toArray(pattern); // Validate the pattern is good
    const memoryMaps = await this.proc.loadMap();

    const tasks: Promise<number[]>[] = [];
    for (const m of memoryMaps) {
      if (options?.block) {
        // Skip small memory blocks
        if (options.block.min && m.size < options.block.min) continue;
        // Skip large memory block
        if (options.block.max && m.size > options.block.max) continue;
        // Skip any blocks excluded by a filter function
        if (options.block.filter && options.block.filter(m) === false) continue;
      }

      const taskScan: TaskScan = {
        pid: this.proc.pid,
        start: m.start,
        end: m.end,
        pattern,
        criteria: options?.criteria,
      };

      const task = ProcessMemory.Pool.run('scan', taskScan);

      tasks.push(task);
    }

    const ret = await Promise.all(tasks);
    return ret.flat();
  }

  async read(offset: number, count: number): Promise<Buffer> {
    return this.proc.read(offset, count);
  }

  /** Dump the memory at a offset into a pretty console output */
  async dump(offset: number, count = 0x100): Promise<void> {
    const bytes = await this.proc.read(offset, count);
    dump(bytes, toHex(offset));
  }
}
