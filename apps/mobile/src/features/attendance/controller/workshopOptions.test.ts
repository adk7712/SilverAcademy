// UC #1-4 #3-4 tests for picker ordering and window hint.
import { sortScanWorkshops, windowHint } from './workshopOptions';
import type { ScanWorkshop } from '../types';

const H = 3_600_000;
const NOW = 1_000 * H;
const mk = (id: string, startH: number | null, endH: number | null): ScanWorkshop => ({
  id,
  title: id,
  startAtMs: startH === null ? null : startH * H,
  endAtMs: endH === null ? null : endH * H,
  source: 'OWNED',
});

describe('windowHint', () => {
  it('reports open, not open and unknown', () => {
    expect(windowHint(mk('a', 1000, 1002), NOW)).toBe('OPEN');
    expect(windowHint(mk('b', 1100, 1102), NOW)).toBe('NOT_OPEN');
    expect(windowHint(mk('c', 1000, null), NOW)).toBe('UNKNOWN');
  });
});

describe('sortScanWorkshops', () => {
  it('puts open-window first, then by start, and dedupes by id', () => {
    const out = sortScanWorkshops(
      [
        mk('later', 1200, 1202),
        mk('soon', 1100, 1102),
        mk('now', 1000, 1002),
        mk('now', 1000, 1002),
      ],
      NOW,
    );
    expect(out.map((w) => w.id)).toEqual(['now', 'soon', 'later']);
  });
});
