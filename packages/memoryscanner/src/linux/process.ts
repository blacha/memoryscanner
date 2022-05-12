import { promises as fs } from 'fs';
import { FileHandle } from 'fs/promises';
import { toHex } from '../format.js';

export interface ProcessMemoryMap {
  /** Offset of start of memory block */
  start: number;
  /** Offset at end of memory block */
  end: number;
  /** Size of the memory block */
  size: number;
  /**  */
  permissions: string;
  path?: string;
  /** Full text of the map line */
  line: string;
}

export type FilterFunc = (f: ProcessMemoryMap) => boolean;

export class ProcessLinux {
  static CacheDurationMs = 10_000;
  /** Process ID */
  readonly pid: number;
  /** Process Name */
  readonly name: string;

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

        yield { name: fileName, pid };
      } catch (e) {
        // noop
      }
    }
    return null;
  }

  /** Find a pid from a process name */
  static async findByName(name: string): Promise<ProcessLinux | null> {
    for await (const pt of this.listProcesses()) {
      if (pt.name.includes(name)) return new ProcessLinux(pt.pid, name);
    }

    return null;
  }

  private _loadMapPromise: { data: Promise<ProcessMemoryMap[]>; time: number } | null;
  loadMap(): Promise<ProcessMemoryMap[]> {
    if (this._loadMapPromise) {
      if (Date.now() - this._loadMapPromise.time > ProcessLinux.CacheDurationMs) return this._loadMapPromise.data;
    }
    this._loadMapPromise = { time: Date.now(), data: this._loadMap() };
    return this._loadMapPromise.data;
  }

  /** Load the memory map */
  private async _loadMap(): Promise<ProcessMemoryMap[]> {
    const data = await fs.readFile(`/proc/${this.pid}/maps`);

    const memLines = data.toString().trim().split('\n');

    const memMaps: ProcessMemoryMap[] = [];
    for (const line of memLines) {
      const parts = line.split(' ');
      const [start, end] = parts[0].split('-').map((c) => parseInt(c, 16));

      const obj = {
        start,
        end,
        size: end - start,
        permissions: parts[1],
        path: parts.length > 7 ? parts[parts.length - 1] : undefined,
        line,
      };

      // If the process cant write to it, then its not useful to us
      if (!obj.permissions.startsWith('rw')) continue;
      // Ignore graphic card data
      if (obj.line.includes('/dev/nvidia')) continue;
      if (obj.line.includes('/memfd:')) continue;

      memMaps.push(obj);
    }

    return memMaps;
  }

  _fh: Promise<FileHandle> | null;
  _fhLastAccess: number = Date.now();
  _fhTimeout: NodeJS.Timeout | null;
  /** Cache the file handle and auto close it after 5 seconds of not being used */
  get fh(): Promise<FileHandle> {
    this._fhLastAccess = Date.now();
    if (this._fh) return this._fh;

    this._fh = fs.open(this.memoryFile, 'r');
    this._fhTimeout = setTimeout(async () => {
      if (this._fh == null) return;
      if (Date.now() - this._fhLastAccess > 5_000) {
        const fh = this._fh;
        this._fh = null;
        await fh.then((c) => c.close());
      }
    }, 5_000);
    return this._fh;
  }

  get memoryFile(): string {
    return `/proc/${this.pid}/mem`;
  }

  /** Read a section of memory from this process */
  async read(offset: number, count: number): Promise<Buffer> {
    try {
      const fh = await this.fh;
      if (fh == null) throw new Error('Failed to open :' + this.memoryFile);
      const buf = Buffer.allocUnsafe(count);

      const ret = await fh.read(buf, 0, buf.length, offset);
      if (ret == null || ret.bytesRead === 0) throw new Error('Failed to read memory at: ' + toHex(offset));

      return buf;
    } catch (e) {
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
