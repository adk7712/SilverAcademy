import { describe, expect, it } from 'vitest';
import { clampPage, nextSort, pageCount, paginate, sortRows } from './tableLogic';

describe('nextSort', () => {
  it('cycles asc -> desc -> none and resets on a new column', () => {
    const a = nextSort(null, 'name');
    expect(a).toEqual({ key: 'name', dir: 'asc' });
    const b = nextSort(a, 'name');
    expect(b).toEqual({ key: 'name', dir: 'desc' });
    expect(nextSort(b, 'name')).toBeNull();
    expect(nextSort(b, 'age')).toEqual({ key: 'age', dir: 'asc' });
  });
});

describe('sortRows', () => {
  const rows = [
    { n: 'b', v: 2 },
    { n: 'A', v: null },
    { n: 'c', v: 10 },
    { n: 'd', v: 2 },
  ];
  it('sorts text case-insensitively and numbers numerically', () => {
    expect(sortRows(rows, (r) => r.n, 'asc').map((r) => r.n)).toEqual(['A', 'b', 'c', 'd']);
    expect(sortRows(rows, (r) => r.v, 'asc').map((r) => r.n)).toEqual(['b', 'd', 'c', 'A']);
  });
  it('keeps empty values last and ties stable in descending order', () => {
    expect(sortRows(rows, (r) => r.v, 'desc').map((r) => r.n)).toEqual(['c', 'b', 'd', 'A']);
  });
  it('does not mutate and handles no accessor', () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.n, 'desc');
    expect(rows).toEqual(copy);
    expect(sortRows(rows, undefined, 'asc')).toEqual(rows);
  });
  it('sorts dates', () => {
    const d = [{ t: new Date(2026, 1, 2) }, { t: new Date(2025, 1, 2) }];
    expect(sortRows(d, (r) => r.t, 'asc')[0]).toBe(d[1]);
  });
});

describe('pagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  it('counts pages (at least 1)', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(25, 10)).toBe(3);
  });
  it('clamps and slices', () => {
    expect(clampPage(99, 25, 10)).toBe(3);
    expect(clampPage(0, 25, 10)).toBe(1);
    expect(paginate(items, 3, 10)).toEqual([20, 21, 22, 23, 24]);
    expect(paginate(items, 1, 10)).toHaveLength(10);
  });
});
