import { WorkerRpc } from '@wtrpc/core';
import { parentPort } from 'node:worker_threads';
import { MemoryTasks } from './tasks/task.js';
import { scan } from './tasks/task.scan.js';

const worker = new WorkerRpc<MemoryTasks>({ scan });
if (parentPort) worker.bind(parentPort);
