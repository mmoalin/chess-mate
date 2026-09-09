import { describe, expect, it } from 'vitest';
import { moveLabel } from './notation';
describe('scoresheet notation', () => {
  it('uses full move numbers and distinguishes Black moves', () => {
    expect(moveLabel(1, 'e4')).toBe('1.e4');
    expect(moveLabel(2, 'e5')).toBe('1…e5');
    expect(moveLabel(5, 'Bc4')).toBe('3.Bc4');
  });
  it('honors a custom starting position’s side and full move number', () => {
    expect(moveLabel(1, 'Ke5', '8/8/4k3/8/4K3/8/4P3/8 b - - 0 35')).toBe('35…Ke5');
  });
});
