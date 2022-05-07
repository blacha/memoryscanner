import { promises as fs } from 'fs';
import { FileHandle } from 'fs/promises';
import { toHex } from '../hex.js';

export interface ProcessMemoryMap {
  /** Offset of start of memory block */
  start: number;
  /** Offset at end of memory block */
  end: number;
  /**  */
  permissions: string;
  path?: string;
  /** Full text of the map line */
  line: string;
}

export type FilterFunc = (f: ProcessMemoryMap) => boolean;

export class Process {
  /** Process ID */
  pid: number;
  fh: Promise<FileHandle> | null;
  /** Proces Name */
  name: string;

  constructor(pid: number, name: string) {
    this.pid = pid;
    this.name = name;
  }

  static async *listProcesses(): AsyncGenerator<{ pid: number; name: string }> {
    const files = await fs.readdir('/proc');

    for (const file of files) {
      const pid = Number(file);
      if (isNaN(pid)) continue;

      try {
        const data = await fs.readFile(`/proc/${file}/status`);
        const first = data.toString().split('\n')[0];
        const fileName = first.split('\t')[1];

        console.log(fileName);
        yield { name: fileName, pid };
      } catch (e) {
        // noop
      }
    }
    return null;
  }

  /** Find a pid from a process name */
  static async findByName(name: string): Promise<Process | null> {
    for await (const pt of this.listProcesses()) {
      if (pt.name.includes(name)) return new Process(pt.pid, name);
    }

    return null;
  }

  _loadMapPromise: { data: Promise<ProcessMemoryMap[]>; time: number } | null;
  mapCacheDuration = 10_000;
  loadMap(): Promise<ProcessMemoryMap[]> {
    if (this._loadMapPromise) {
      if (Date.now() - this._loadMapPromise.time > this.mapCacheDuration) return this._loadMapPromise.data;
    }
    this._loadMapPromise = { time: Date.now(), data: this._loadMap() };
    return this._loadMapPromise.data;
  }

  /** Load the memory map */
  async _loadMap(): Promise<ProcessMemoryMap[]> {
    const data = await fs.readFile(`/proc/${this.pid}/maps`);

    const memLines = data.toString().trim().split('\n');

    const memMaps: ProcessMemoryMap[] = [];
    for (const line of memLines) {
      const parts = line.split(' ');
      const [start, end] = parts[0].split('-').map((c) => parseInt(c, 16));

      const obj = {
        start,
        end,
        permissions: parts[1],
        path: parts.length > 7 ? parts[parts.length - 1] : undefined,
        line,
      };

      // If the process cant write to it, then its not useful to us
      if (!obj.permissions.startsWith('rw')) continue;
      // Ignore graphic card data
      if (obj.path?.includes('/dev/nvidia')) continue;

      memMaps.push(obj);
    }

    return memMaps;
  }

  /** Read a section of memory from this process */
  async read(offset: number, count: number): Promise<Buffer> {
    try {
      if (this.fh == null) this.fh = fs.open(`/proc/${this.pid}/mem`, 'r');
      const fh = await this.fh;
      const buf = Buffer.alloc(count);

      const ret = await fh?.read(buf, 0, buf.length, offset);
      if (ret == null || ret.bytesRead === 0) throw new Error('Failed to read memory at: ' + toHex(offset));

      return buf;
    } catch (e) {
      // console.trace(`Failed to read, ${offset}, ${count}`);
      throw new Error('Failed to read memory at: ' + toHex(offset) + ' - ' + e);
    }
  }

  async isValidMemoryMap(offset: number): Promise<boolean> {
    const maps = await this.loadMap();

    for (const map of maps) {
      if (map.start < offset && map.end > offset) return true;
    }
    return false;
  }
}
