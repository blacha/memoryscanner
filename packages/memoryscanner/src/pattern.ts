const buf = Buffer.alloc(0x08);

export const Pattern = {
  lu32(num: number): string {
    buf.writeUint32LE(num);
    return this.buffer(buf.slice(0, 4));
  },

  pointer(num: number): string {
    if (num <= 0xff_ff_ff_ff) {
      buf.writeUint32LE(num, 0);
      buf.writeUint32LE(0, 4);
    } else {
      buf.writeBigUint64LE(BigInt(num), 0);
    }
    return this.buffer(buf);
  },

  /** Join two patterns together */
  join(a: string, b: string): string {
    return a.trim() + ' ' + b.trim();
  },

  /** convert a buffer to a pattern string */
  buffer(buffer: Buffer): string {
    const output: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      output.push(buffer[i].toString(16).padStart(2, '0'));
    }
    return output.join(' ');
  },

  /** Convert a pattern to a array */
  toArray(pattern: string): number[] {
    const output: number[] = [];
    for (const chunk of pattern.split(' ')) {
      if (chunk === '??') output.push(-1);
      else {
        const ret = parseInt(chunk, 16);
        if (isNaN(ret)) throw new Error('Failed to parse: ' + chunk);
        output.push(ret);
      }
    }
    return output;
  },
};
