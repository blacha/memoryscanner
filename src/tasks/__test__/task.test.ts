import { deepEqual } from 'node:assert';
import { test } from 'node:test';
import { findPattern } from '../task.scan.js';

test('should find a pattern', () => {
  const pat = [...findPattern(Buffer.from([0x45, 0x46]), [0x45, 0x46])];
  deepEqual(pat, [0]);
});

test('should find a pattern at the end of a buffer', () => {
  const pat = [...findPattern(Buffer.from([0x00, 0x00, 0x00, 0x45, 0x46]), [0x45, 0x46])];
  deepEqual(pat, [3]);
});

test('should find a multiple patterns in a buffer', () => {
  const pat = [...findPattern(Buffer.from([0x45, 0x46, 0x00, 0x45, 0x46]), [0x45, 0x46])];
  deepEqual(pat, [0, 3]);
});

test('Should find multiple patterns in a text buffer', () => {
  const pat = [...findPattern(Buffer.from('this is a test message test one test two'), Buffer.from('test'))];
  deepEqual(pat, [10, 23, 32]);
});
