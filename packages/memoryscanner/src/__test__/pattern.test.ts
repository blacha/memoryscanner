import { deepEqual, equal, throws } from 'assert';
import { test } from 'node:test';
import { Pattern } from '../pattern.js';

test('should create a pattern', () => {
  const pat = Pattern.lu32(0x5c_45_41_f0);
  equal(pat, 'f0 41 45 5c');
});

test('should throw if overflows', () => {
  throws(() => Pattern.lu32(0x7f_5c_45_41_f0));
});
test('should throw if underflows', () => {
  throws(() => Pattern.lu32(-1));
});

test('should create a pointer', () => {
  const pat = Pattern.pointer(0x5c_45_41_f0);
  equal(pat, 'f0 41 45 5c 00 00 00 00');
});

test('should create a big pointer', () => {
  const pat = Pattern.pointer(0x7f_5c_45_41_f0);
  equal(pat, 'f0 41 45 5c 7f 00 00 00');
});

test('should convert to a array', () => {
  const pat = Pattern.toArray('f0 41 45 5c ?? ?? ?? ??');
  deepEqual(pat, [0xf0, 0x41, 0x45, 0x5c, -1, -1, -1, -1]);
});
