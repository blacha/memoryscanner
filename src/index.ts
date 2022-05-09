import { toHuman } from './format.js';
import { Process } from './linux/process.js';
import { MemoryTasks, TaskScan } from './tasks/task.js';
import { WorkerRpcPool } from './wtrpc/pool.js';

export { Process, ProcessMemoryMap } from './linux/process.js';

const workerUrl = new URL('./worker.js', import.meta.url);
const pool = new WorkerRpcPool<MemoryTasks>(32, workerUrl);

async function main(): Promise<void> {
  const proc = await Process.findByName('proc_name.exe');
  if (proc == null) return;
  const map = await proc.loadMap();

  const scanSeed = Buffer.alloc(0x04);
  scanSeed.writeUInt32LE(0xfa32b6ca);

  const tasks = [];
  for (const m of map) {
    const size = m.end - m.start;
    // Skip small memory blocks
    if (size < 1 * 1024 * 1024) continue;
    // Skip large memory block
    if (size > 256 * 1024 * 1024) continue;

    const taskScan: TaskScan = {
      pid: proc.pid,
      start: m.start,
      end: m.end,
      pattern: [...scanSeed],
      criteria: [
        { type: 'range', offset: 0x40, min: 1, max: 0xff_ff_ff_ff, format: 'lu32' },
        { type: 'range', offset: 0x48, min: 1, max: 0xff_ff_ff_ff, format: 'lu32' },
        { type: 'range', offset: 0x58, min: 1, max: 0xff_ff_ff_ff, format: 'lu32' },
        { type: 'range', offset: 0x60, min: 1, max: 0xff_ff_ff_ff, format: 'lu32' },
      ],
    };
    tasks.push(pool.run('scan', taskScan));
  }

  const res = await Promise.all(tasks.map((c) => c));

  const ret = res.filter((c) => (c.length ?? 0) > 0);
  console.log(ret.map((c) => c.map((j) => toHuman(j))));
  await pool.close();
}

main();
