import { Worker } from 'node:worker_threads';
import { Requests, WorkerRequest, WorkerResponseError, WorkerResponseOk } from './messages';

class Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: string) => void;
  resolve: (value: T | PromiseLike<T>) => void;
  value: T | null = null;
  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    }).then((c) => (this.value = c));
  }
}

interface WorkerRpc<E extends Requests, K extends keyof E = keyof E> {
  message: WorkerRequest<E, K>;
  deferred: Deferred<ReturnType<E[K]>>;

  /** Time the request was queued */
  queuedAt: number;
  /** Time the request was submitted to a worker*/
  startedAt?: number;
  /** Time the request finished */
  endedAt?: number;
}

export class WorkerRpcPool<E extends Requests> {
  /** Current task ID */
  taskId = 0;
  /** Location to the worker  */
  readonly worker: URL;

  readonly workers: Worker[] = [];
  /** List of workers currently not doing anything */
  private freeWorkers: Worker[] = []; // TODO maybe a Queue would be a better open here

  /** List of tasks that need to be run */
  todo: WorkerRpc<Requests>[] = []; // TODO priority queue?

  /** Mapping of taskId to task */
  tasks: Map<number, WorkerRpc<Requests>> = new Map();

  constructor(threads: number, worker: URL) {
    this.worker = worker;
    for (let i = 0; i < threads; i++) this.addNewWorker(i);
  }

  private addNewWorker(workerId: number): void {
    const worker = new Worker(this.worker, { workerData: { workerId } });
    worker.on('message', (evt: WorkerResponseOk<E> | WorkerResponseError) => {
      this.freeWorkers.push(worker);

      const task = this.tasks.get(evt.id);
      if (task == null) return this.onWorkerFree();
      task.endedAt = Date.now();
      // const runtimeMs = task.endedAt - (task.startedAt ?? task.queuedAt);
      // const queueTimeMs = task.startedAt! - task.queuedAt;
      // console.log(evt.id, task.message.type, { runtimeMs, queueTimeMs });
      switch (evt.type) {
        case 'done':
          task.deferred.value = evt.response;
          task.deferred.resolve(evt.response);
          break;
        case 'error':
          task.deferred.reject(evt.message);
          break;
        default:
          console.log('Unknown message: ' + evt);
      }

      this.onWorkerFree();
    });

    this.freeWorkers.push(worker);
    this.workers[workerId] = worker;
  }

  private onWorkerFree(): void {
    while (this.freeWorkers.length > 0) {
      const task = this.todo.shift();
      if (task == null) return;
      this.execute(task);
    }
  }

  run<K extends keyof E>(name: K, req: Parameters<E[K]>[0]): ReturnType<E[K]> {
    const message = { id: this.taskId++, type: 'request' as const, name: String(name), request: req };
    const task: WorkerRpc<Requests> = {
      message,
      deferred: new Deferred(),
      queuedAt: Date.now(),
    };

    this.todo.push(task);
    this.tasks.set(task.message.id, task);
    this.onWorkerFree();

    return task.deferred.promise as ReturnType<E[K]>;
  }

  private execute(task: WorkerRpc<Requests>): void {
    const worker = this.freeWorkers.pop();
    if (worker == null) throw new Error('Failed to acquire worker');
    task.startedAt = Date.now();
    worker.postMessage(task.message);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((c) => c.terminate()));
  }
}
