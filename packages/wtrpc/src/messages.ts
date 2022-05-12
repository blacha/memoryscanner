export interface Requests {
  [key: string]: (req: any) => Promise<any>;
}

export interface WorkerResponseOk<E extends Requests, K extends keyof E = keyof E> {
  id: number;
  type: 'done';
  response: ReturnType<E[K]>;
}

export interface WorkerResponseError {
  id: number;
  type: 'error';
  message?: string;
  stack?: string;
}

export interface WorkerRequest<E extends Requests, K extends keyof E = keyof E> {
  id: number;
  type: 'request';
  name: K;
  request: Parameters<E[K]>[0];
}
