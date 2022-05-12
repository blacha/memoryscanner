import { MessagePort, threadId } from 'node:worker_threads';
import { Requests, WorkerRequest, WorkerResponseError, WorkerResponseOk } from './messages.js';

function isWorkerRequest<E extends Requests>(e: unknown): e is WorkerRequest<E> {
  if (typeof e !== 'object') return false;
  if (e == null) return false;
  if ((e as WorkerRequest<E>).type === 'request') return true;
  return false;
}

export class WorkerRpc<E extends Requests> {
  threadId = threadId;
  routes: { [K in keyof E]: E[K] };
  port: MessagePort | null = null;

  constructor(routes: { [K in keyof E]: E[K] }) {
    this.routes = routes;
  }

  async onMessage(e: unknown & { id: number }): Promise<WorkerResponseOk<E> | WorkerResponseError> {
    try {
      if (isWorkerRequest<E>(e)) {
        if (this.routes[e.name] != null) {
          const res = await this.routes[e.name](e.request);
          return { id: e.id, type: 'done', response: res };
        }
      }
      return { id: e.id, type: 'error', message: 'Unknown Command' };
    } catch (err) {
      return { id: e.id, type: 'error', message: String(err), stack: err instanceof Error ? err.stack : undefined };
    }
  }

  bind(p: MessagePort): void {
    if (this.port != null) throw new Error('Cannot rebind Worker to new port');
    this.port = p;
    p.on('message', (e: unknown & { id: number; name: string }) => {
      // console.log(`Worker:${threadId}.onMessage:${e.id}:${e.name}`);
      this.onMessage(e).then((result) => {
        // console.log(`Worker:${threadId}.onResult:${e.id}:${e.name}:${result.type}`);
        p.postMessage(result);
      });
    });
  }
}
