import { Worker } from 'node:worker_threads';

export { Process, ProcessMemoryMap } from './linux/process.js';

// const threadPool =

type WorkerMessage = WorkerMessageDone | WorkerMessageError | WorkerMessageTask<unknown>;
interface WorkerMessageDone {
  taskId: number;
  type: 'done';
}
interface WorkerMessageError {
  taskId: number;
  type: 'error';
}

interface WorkerMessageTask<T> {
  taskId: number;
  type: 'task';
  data: T;
}

let taskId = 0;
export class WorkerTask<T> {
  taskId: number;
  data: WorkerMessageTask<T>;
  promise: Promise<void>;
  resolve: () => void;
  constructor(data: T) {
    this.taskId = taskId++;
    this.data = { type: 'task', taskId: this.taskId, data };
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}

class WorkerPool {
  taskId: number;
  worker: URL;
  threads: number;
  workers: Worker[] = [];
  freeWorkers: Worker[] = [];

  todo: WorkerTask<unknown>[] = [];
  tasks: Map<number, WorkerTask<unknown>> = new Map();
  constructor(threads: number, worker: URL) {
    this.threads = threads;
    this.worker = worker;
    for (let i = 0; i < threads; i++) this.addNewWorker(i);
  }

  addNewWorker(workerId: number): void {
    const worker = new Worker(this.worker, { workerData: { workerId } });
    worker.on('message', (evt: WorkerMessage) => {
      console.log({ workerId }, 'event', evt);

      if (evt.type === 'done') {
        const task = this.tasks.get(evt.taskId);
        if (task == null) return;
        task.resolve();
        this.freeWorkers.push(worker);
        this.onWorkerFree();
        return;
      }
    });

    this.freeWorkers.push(worker);
  }

  onWorkerFree(): void {
    console.log('FreeWorker', 'tasks', this.todo.length);
    while (this.freeWorkers.length > 0) {
      const task = this.todo.shift();
      console.log(task);
      if (task == null) return;
      this.execute(task);
    }
  }

  run<T>(task: T): WorkerTask<T> {
    const wt = new WorkerTask(task);
    this.todo.push(wt);
    this.tasks.set(wt.taskId, wt);
    if (this.freeWorkers.length > 0) this.onWorkerFree();
    return wt;
  }

  private execute(task: WorkerTask<unknown>): void {
    console.log('Execute', task.taskId);
    const worker = this.freeWorkers.pop();
    if (worker == null) throw new Error('Failed to acquire worker');
    worker.postMessage(task.data);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((c) => c.terminate()));
  }
}
// console.log(worker);

const workerUrl = new URL('./worker.js', import.meta.url);
const pool = new WorkerPool(2, workerUrl);

async function main(): Promise<void> {
  console.log('Main');
  const task = pool.run({ type: 'task', task: 'Hello World' });

  const ret = await task.promise;
  console.log('Done3', ret);
  await pool.close();
  console.log('\nAllClosed');
}

main().then(() => console.log('Done'));
