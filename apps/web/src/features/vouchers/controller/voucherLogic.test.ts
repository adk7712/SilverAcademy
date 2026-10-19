// UC #5-4: unit tests for voucher upload parsing, grouping and form validation.
import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_ROWS } from '@silveracademy/shared';
import { parseVoucherText, previewRows, countRejected } from './parseVoucherFile';
import { activeTierIds, groupByProvider, totalOf } from './inventorySummary';
import { checkReason, validateTier } from './voucherForms';
import type { TierView } from '../types';

const tier = (p: string, d: number, a: number, active = true): TierView => ({
  id: `${p}_${d}`,
  provider: p,
  providerName: p,
  denomination: d,
  pointsCost: d * 100,
  active,
  counts: { AVAILABLE: a, CLAIMED: 1, INVALID: 0, REMOVED: 2 },
});

describe('parseVoucherText', () => {
  it('parses csv and tab rows, skipping header and blanks', () => {
    const r = parseVoucherText(
      'provider,denomination,code\nNTUC,10,ABCD-1234\n\nNTUC\t20\tWXYZ-5678\r\n',
    );
    expect(r.rows).toEqual([
      { provider: 'NTUC', denomination: 10, code: 'ABCD-1234' },
      { provider: 'NTUC', denomination: 20, code: 'WXYZ-5678' },
    ]);
    expect(r.malformed).toEqual([]);
  });
  it('reports malformed lines with line numbers', () => {
    const r = parseVoucherText('NTUC,10\nNTUC,abc,CODE-0001\nNTUC,10,ABCD-1234');
    expect(r.malformed).toEqual([
      { line: 1, reason: 'MISSING_FIELDS' },
      { line: 2, reason: 'BAD_DENOMINATION' },
    ]);
    expect(r.rows).toHaveLength(1);
  });
  it('flags files over the row limit', () => {
    const text = Array.from(
      { length: MAX_UPLOAD_ROWS + 1 },
      (_, i) => `NTUC,10,CODE-${String(i).padStart(6, '0')}`,
    ).join('\n');
    expect(parseVoucherText(text).tooMany).toBe(true);
  });
});

describe('previewRows', () => {
  it('marks invalid format, unknown tier and in-file duplicates, with masked codes', () => {
    const rows = parseVoucherText(
      'NTUC,10,ABCD-1234\nNTUC,10,abcd-1234\nNTUC,10,bad\nFOO,5,ZZZZ-9999',
    ).rows;
    const p = previewRows(rows, new Set(['NTUC_10']));
    expect(p.map((r) => r.reason)).toEqual([
      undefined,
      'DUPLICATE_IN_FILE',
      'INVALID_FORMAT',
      'UNKNOWN_TIER',
    ]);
    expect(p[0]?.codeMasked).toBe('****1234');
    expect(countRejected(p)).toBe(3);
  });
});

describe('inventory summary', () => {
  it('groups by provider, sorts denominations and totals counts', () => {
    const g = groupByProvider([tier('B', 20, 3), tier('A', 10, 5), tier('B', 10, 1)]);
    expect(g.map((x) => x.provider)).toEqual(['A', 'B']);
    expect(g[1]?.tiers.map((t) => t.denomination)).toEqual([10, 20]);
    expect(g[1]?.totals.AVAILABLE).toBe(4);
    expect(totalOf(g[0]!.totals)).toBe(8);
  });
  it('lists only active tier ids', () => {
    expect([...activeTierIds([tier('A', 10, 1), tier('B', 10, 1, false)])]).toEqual(['A_10']);
  });
});

describe('forms', () => {
  it('requires a reason', () => {
    expect(checkReason('   ').ok).toBe(false);
    expect(checkReason(' bad code ')).toEqual({ ok: true, reason: 'bad code' });
  });
  it('validates tier numbers', () => {
    const bad = validateTier({
      provider: '',
      providerName: 'X',
      denomination: '1.5',
      pointsCost: '0',
      active: true,
    });
    expect(bad).toEqual({
      ok: false,
      errors: { provider: 'required', denomination: 'number', pointsCost: 'number' },
    });
    const good = validateTier({
      provider: ' NTUC ',
      providerName: 'NTUC',
      denomination: '10',
      pointsCost: '1000',
      active: false,
    });
    expect(good).toEqual({
      ok: true,
      input: {
        provider: 'NTUC',
        providerName: 'NTUC',
        denomination: 10,
        pointsCost: 1000,
        active: false,
      },
    });
  });
});
