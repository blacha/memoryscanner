export const Bytes = {
  KiloByte(bytes: number): number {
    return bytes * 1024;
  },
  MegaByte(bytes: number): number {
    return bytes * 1024 * 1024;
  },
};
