import { parentPort, threadId } from 'node:worker_threads';

console.log(threadId);

if (parentPort == null) throw new Error('ParentPort is not defined');
parentPort.on('message', (task) => {
  console.log('OnTask', task);

  parentPort?.postMessage({ type: 'done', taskId: task.taskId });
});
