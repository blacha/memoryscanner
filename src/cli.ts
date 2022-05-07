import { Process } from './linux/process.js';

async function main(): Promise<void> {
  const proc = await Process.findByName('Brave');

  console.log(proc);
}

main();
