# memoryscanner

*WIP* this is still a work in progress APIs may not exist and not work correctly.

Multithreaded process memory scanner

```typescript
import { ProcessMemory } from 'memoryscanner';

const proc = ProcessMemory.find('process_name');

/* Scan a process with multiple threads looking for a pattern of bytes*/
const ret = await proc.scan('01 02 ?? f3 a4');
/**
 * List of offsets for where the pattern occurs
 * [
 *   0x4bffa03d
 *   0x5f0763fa
 *   0x1030fa61
 * ]
 */

```

Advanced usage, scan with byte criteria

```typescript
const ret = await proc.scan('01 02 ?? f3 a4 ?? ?? ?? ?? ', { criteria: [
    // byte 2 '??' is a u8 between 0x01 and 0x20
    { type: 'range', offset: 0x02, min: 1, max: 32, format: 'u8' },
    // bytes 5-8 is a little endian 32bit number between 1000, and 5,000,000
    { type: 'range', offset: 0x05, min: 1_000, max: 5_000_000, format: 'lu32' },
]})
```