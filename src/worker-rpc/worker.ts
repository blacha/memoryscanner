import type { MessagePort } from 'node:worker_threads';
import { Requests, WorkerRequest, WorkerResponseError, WorkerResponseOk } from './messages.js';

function isWorkerRequest<E extends Requests>(e: unknown): e is WorkerRequest<E> {
  if (typeof e !== 'object') return false;
  if (e == null) return false;
  if ((e as WorkerRequest<E>).type === 'request') return true;
  return false;
}

export class WorkerRpc<E extends Requests> {
  routes: { [K in keyof E]: E[K] };
  port: MessagePort | null = null;
  constructor(routes: { [K in keyof E]: E[K] }) {
    this.routes = routes;
  }

  async onMessage(e: unknown & { id: number }): Promise<WorkerResponseOk<E> | WorkerResponseError> {
    if (isWorkerRequest<E>(e)) {
      if (this.routes[e.name] != null) {
        try {
          const res = await this.routes[e.name](e);
          return { id: e.id, type: 'done', response: res };
        } catch (err) {
          return { id: e.id, type: 'error', message: String(err) };
        }
      }
    }

    return { id: e.id, type: 'error', message: 'Unknown Command' };
  }

  bind(p: MessagePort): void {
    if (this.port != null) throw new Error('Cannot rebind Worker to new port');
    this.port = p;
    p.on('message', (e: unknown & { id: number }) => this.onMessage(e));
  }
}
