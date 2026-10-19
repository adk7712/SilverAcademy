// Accessible data table: sortable headers (aria-sort buttons) and pagination.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { strings } from '../strings';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  nextSort,
  pageCount,
  paginate,
  sortRows,
} from './tableLogic';
import type { SortState, SortValue } from './tableLogic';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => SortValue;
}

interface TableProps<T> {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  loading?: boolean;
  empty?: ReactNode;
}

export function Table<T>({
  caption,
  columns,
  rows,
  rowKey,
  pageSize = DEFAULT_PAGE_SIZE,
  loading,
  empty,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    return col && sort ? sortRows(rows, col.sortValue, sort.dir) : [...rows];
  }, [rows, columns, sort]);

  if (loading) return <Spinner />;
  if (rows.length === 0) return <>{empty ?? <EmptyState />}</>;

  const current = clampPage(page, sorted.length, pageSize);
  const pages = pageCount(sorted.length, pageSize);
  const visible = paginate(sorted, current, pageSize);
  const from = (current - 1) * pageSize + 1;

  const ariaSort = (key: string) =>
    sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <div className="table-wrap">
      <table className="table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.sortValue ? (ariaSort(c.key) ?? 'none') : undefined}
              >
                {c.sortValue ? (
                  <button
                    type="button"
                    className="table__sort"
                    aria-label={strings.table.sortBy(c.header)}
                    onClick={() => setSort(nextSort(sort, c.key))}
                  >
                    {c.header}
                    <span aria-hidden="true">
                      {sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <nav className="table__pager" aria-label={caption}>
          <span aria-live="polite">
            {strings.table.rows(from, from + visible.length - 1, sorted.length)}
          </span>
          <span className="row">
            <Button
              variant="secondary"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              {strings.common.previous}
            </Button>
            <span>{strings.table.pageOf(current, pages)}</span>
            <Button
              variant="secondary"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              {strings.common.next}
            </Button>
          </span>
        </nav>
      )}
    </div>
  );
}
