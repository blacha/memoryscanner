# wtrpc

Type safe node js worker threads

Define a contract `contract.ts`
```typescript
type RpcContract = {
    scan: (req: {pid: number, pattern: string}) => number[]
}
```

Implement the contract as a worker 

`worker.ts`
```typescript
import { WorkerRpc } from 'wtrpc'
import { RpcContract } from './contract.js'
import { parentPort } from 'node:worker_threads';

const worker = new WorkerRpc<RpcContract>({
    scan(req: {pid: number, pattern: string}): number[] {
        return [-1]
    }
})

// Bind the worker to the worker_thread parent port if it exists
if (parentPort) worker.bind(parentPort);
```

`pool.ts`
```typescript
import { WorkerRpcPool } from 'wtrpc'
import { RpcContract } from './contract.js'

const workerUrl = new URL(import.meta.url, './worker.js');
const threadCount = os.cpus().length;

const pool = new WorkerRpcPool<RpcContract>(threadCount, workerUrl);

// Run the task on the worker thread pool
const offsets = await pool.run('scan', { pid: 37, pattern: '00 ?? 00 ?? 07' })
// [-1]
```
