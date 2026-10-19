// UC #5-4: parse pasted/uploaded voucher text into upload rows and preview verdicts (pure).
import {
  MAX_UPLOAD_ROWS,
  VOUCHER_DENOMINATION_MAX,
  classifyUploadRows,
  maskVoucherCode,
} from '@silveracademy/shared';
import type { UploadRejectReason, UploadRow } from '@silveracademy/shared';

export type MalformedReason = 'MISSING_FIELDS' | 'BAD_DENOMINATION';
export interface MalformedLine {
  line: number;
  reason: MalformedReason;
}
export interface ParsedVoucherText {
  rows: UploadRow[];
  malformed: MalformedLine[];
  tooMany: boolean;
}
export interface PreviewRow extends UploadRow {
  row: number;
  codeMasked: string;
  reason?: UploadRejectReason;
}

const FIELD_SPLIT = /[,\t;]/;
const HEADER_FIRST_CELL = 'provider';
const EXPECTED_FIELDS = 3;

export function parseVoucherText(text: string): ParsedVoucherText {
  const rows: UploadRow[] = [];
  const malformed: MalformedLine[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') return;
    const cells = line.split(FIELD_SPLIT).map((c) => c.trim());
    if (rows.length + malformed.length === 0 && cells[0]?.toLowerCase() === HEADER_FIRST_CELL)
      return;
    const [provider, denom, code] = cells;
    if (cells.length < EXPECTED_FIELDS || !provider || !denom || !code) {
      malformed.push({ line: i + 1, reason: 'MISSING_FIELDS' });
      return;
    }
    const denomination = Number(denom);
    if (
      !Number.isInteger(denomination) ||
      denomination <= 0 ||
      denomination > VOUCHER_DENOMINATION_MAX
    ) {
      malformed.push({ line: i + 1, reason: 'BAD_DENOMINATION' });
      return;
    }
    rows.push({ provider, denomination, code });
  });
  return { rows, malformed, tooMany: rows.length > MAX_UPLOAD_ROWS };
}

/** Client-side mirror of the server's pre-transaction checks; the server stays authoritative. */
export function previewRows(
  rows: readonly UploadRow[],
  activeTierIds: ReadonlySet<string>,
): PreviewRow[] {
  const verdicts = classifyUploadRows(rows, activeTierIds);
  return rows.map((r, i) => ({
    ...r,
    row: i + 1,
    codeMasked: maskVoucherCode(r.code),
    reason: verdicts[i]?.reason,
  }));
}

export const countRejected = (rows: readonly PreviewRow[]): number =>
  rows.filter((r) => r.reason).length;
