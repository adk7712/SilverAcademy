// Pure sorting and pagination helpers for <Table>.
export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: string;
  dir: SortDir;
}
export type SortValue = string | number | boolean | Date | null | undefined;

export const DEFAULT_PAGE_SIZE = 10;

/** Click on a header: new column -> asc, same column asc -> desc, desc -> unsorted. */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  return current.dir === 'asc' ? { key, dir: 'desc' } : null;
}

function compareValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // empty values always last
  if (b == null) return -1;
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  }
  const na = a instanceof Date ? a.getTime() : Number(a);
  const nb = b instanceof Date ? b.getTime() : Number(b);
  return na - nb;
}

/** Stable sort; returns a new array. Empty values stay last in both directions. */
export function sortRows<T>(
  rows: readonly T[],
  getValue: ((row: T) => SortValue) | undefined,
  dir: SortDir,
): T[] {
  if (!getValue) return [...rows];
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => {
      if (x.value == null || y.value == null)
        return compareValues(x.value, y.value) || x.index - y.index;
      return sign * compareValues(x.value, y.value) || x.index - y.index;
    })
    .map((x) => x.row);
}

export const pageCount = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / pageSize));

export const clampPage = (page: number, total: number, pageSize: number): number =>
  Math.min(Math.max(1, page), pageCount(total, pageSize));

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const p = clampPage(page, rows.length, pageSize);
  return rows.slice((p - 1) * pageSize, p * pageSize);
}
