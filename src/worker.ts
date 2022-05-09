import { parentPort } from 'node:worker_threads';
import { Process } from './linux/process.js';
import { MemoryTasks, StrutType, TaskScan } from './tasks/task.js';
import { findPattern } from './tasks/task.scan.js';
import { WorkerRpc } from './wtrpc/worker.js';

const ProcessCache = new Map<number, Process>();

function loadProcess(pid: number): Process {
  let existing = ProcessCache.get(pid);
  if (existing == null) {
    existing = new Process(pid, 'Unknown');
    ProcessCache.set(pid, existing);
  }
  return existing;
}

function readNumber(mem: Buffer, offset: number, format: StrutType): number {
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

async function scan(req: TaskScan): Promise<number[]> {
  const proc = loadProcess(req.pid);

  const memory = await proc.read(req.start, req.end - req.start);
  let res = [...findPattern(memory, req.pattern)];

  const criteria = req.criteria;
  if (criteria == null) return res;

  res = res.filter((f): boolean => {
    for (const cr of criteria) {
      if (cr.type === 'range') {
        const value = readNumber(memory, f + cr.offset, cr.format);
        if (cr.min != null && value < cr.min) return false;
        if (cr.max != null && value > cr.max) return false;
      }
    }
    return true;
  });
  return res;
}

const worker = new WorkerRpc<MemoryTasks>({ scan });
if (parentPort) worker.bind(parentPort);
