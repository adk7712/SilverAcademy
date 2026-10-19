// UC #5-4: upload voucher codes (file or paste), client-side preview, server result with rejected rows.
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MAX_UPLOAD_ROWS } from '@silveracademy/shared';
import { Alert, Button, ErrorBanner, Table, TextAreaField } from '../../../design';
import type { Column } from '../../../design';
import { useSessionGuard } from '../../auth';
import { activeTierIds } from '../controller/inventorySummary';
import { countRejected, parseVoucherText, previewRows } from '../controller/parseVoucherFile';
import type { PreviewRow } from '../controller/parseVoucherFile';
import { uploadVoucherRows } from '../controller/voucherActions';
import { voucherStrings as s } from '../strings';
import type { TierView, UploadResult } from '../types';

const u = s.upload;
const UPLOAD_TABLE_PAGE_SIZE = 20;

export function UploadTab({ tiers, onUploaded }: { tiers: TierView[]; onUploaded: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const onSessionError = useSessionGuard();

  const parsed = useMemo(() => parseVoucherText(text), [text]);
  const preview = useMemo(() => previewRows(parsed.rows, activeTierIds(tiers)), [parsed, tiers]);
  const canSubmit = parsed.rows.length > 0 && parsed.malformed.length === 0 && !parsed.tooMany;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setText(await file.text());
      setResult(null);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await uploadVoucherRows(parsed.rows));
      setText('');
      onUploaded();
    } catch (e) {
      setError(e);
      onSessionError(e);
    } finally {
      setBusy(false);
    }
  };

  const previewColumns: Column<PreviewRow>[] = [
    { key: 'row', header: u.row, render: (r) => r.row, sortValue: (r) => r.row },
    { key: 'provider', header: u.provider, render: (r) => r.provider },
    { key: 'denomination', header: u.denomination, render: (r) => r.denomination },
    { key: 'code', header: u.codeMasked, render: (r) => <code>{r.codeMasked}</code> },
    {
      key: 'check',
      header: u.expected,
      render: (r) => (r.reason ? s.rejectReason[r.reason] : u.ok),
    },
  ];
  const rejectedColumns: Column<UploadResult['rejected'][number]>[] = [
    { key: 'row', header: u.row, render: (r) => r.row, sortValue: (r) => r.row },
    { key: 'code', header: u.codeMasked, render: (r) => <code>{r.codeMasked}</code> },
    {
      key: 'reason',
      header: u.reason,
      render: (r) => s.rejectReason[r.reason],
      sortValue: (r) => r.reason,
    },
  ];

  return (
    <div className="stack">
      <h2>{u.heading}</h2>
      <p>{u.help}</p>
      <label className="field__label" htmlFor="voucher-file">
        {u.file}
      </label>
      <input
        id="voucher-file"
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={(e) => void onFile(e)}
      />
      <TextAreaField
        label={u.paste}
        value={text}
        rows={8}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
      />
      {parsed.tooMany && <Alert tone="danger">{u.tooMany(MAX_UPLOAD_ROWS)}</Alert>}
      {parsed.malformed.length > 0 && (
        <Alert tone="warning">
          <strong>{u.malformedHeading}</strong>
          <ul>
            {parsed.malformed.map((m) => (
              <li key={m.line}>{u.malformedLine(m.line, u.malformed[m.reason])}</li>
            ))}
          </ul>
          {u.fixFirst}
        </Alert>
      )}
      {preview.length > 0 && (
        <>
          <p role="status">
            {u.previewSummary(
              preview.length,
              preview.length - countRejected(preview),
              countRejected(preview),
            )}
          </p>
          <Table
            caption={u.previewCaption}
            columns={previewColumns}
            rows={preview}
            rowKey={(r) => String(r.row)}
            pageSize={UPLOAD_TABLE_PAGE_SIZE}
          />
        </>
      )}
      <ErrorBanner error={error} />
      <div className="row">
        <Button onClick={() => void submit()} busy={busy} disabled={!canSubmit}>
          {u.submit}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setText('');
            setResult(null);
          }}
          disabled={busy}
        >
          {u.clear}
        </Button>
      </div>
      {result && (
        <section className="stack" aria-live="polite">
          <Alert tone="success">{u.result(result.acceptedCount)}</Alert>
          <h3>{u.rejectedHeading}</h3>
          {result.rejected.length === 0 ? (
            <p>{u.noneRejected}</p>
          ) : (
            <Table
              caption={u.rejectedCaption}
              columns={rejectedColumns}
              rows={result.rejected}
              rowKey={(r) => String(r.row)}
              pageSize={UPLOAD_TABLE_PAGE_SIZE}
            />
          )}
        </section>
      )}
    </div>
  );
}
