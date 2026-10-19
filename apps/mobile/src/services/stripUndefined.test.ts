// Tests for the undefined-stripping used before every callable invocation.
import { stripUndefined } from './stripUndefined';

describe('stripUndefined', () => {
  it('drops undefined keys at any depth but keeps null, false and 0', () => {
    expect(
      stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: 0, f: null, g: false } }),
    ).toEqual({
      a: 1,
      c: { e: 0, f: null, g: false },
    });
  });
  it('handles arrays and primitives', () => {
    expect(stripUndefined([{ a: undefined, b: 1 }, 2])).toEqual([{ b: 1 }, 2]);
    expect(stripUndefined('x')).toBe('x');
    expect(stripUndefined(undefined)).toBeUndefined();
  });
});
