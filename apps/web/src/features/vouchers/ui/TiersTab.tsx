// UC #5-4: voucher tier management (add / edit provider tiers and their points cost).
import { useState } from 'react';
import {
  Badge,
  Button,
  ErrorBanner,
  Modal,
  Table,
  TextField,
  CheckboxField,
  useToast,
} from '../../../design';
import type { Column } from '../../../design';
import { useSessionGuard } from '../../auth';
import { fieldErrorsOf } from '../../../services';
import { validateTier } from '../controller/voucherForms';
import type { TierFormErrors, TierFormValues } from '../controller/voucherForms';
import { saveTier } from '../controller/voucherActions';
import { voucherStrings as s } from '../strings';
import type { TierView } from '../types';

const t = s.tiers;
const blank: TierFormValues = {
  provider: '',
  providerName: '',
  denomination: '',
  pointsCost: '',
  active: true,
};
const msg = (code?: 'required' | 'number') =>
  code === 'number' ? t.invalidNumber : code ? t.required : undefined;

export function TiersTab({ tiers, onSaved }: { tiers: TierView[]; onSaved: () => void }) {
  const [form, setForm] = useState<TierFormValues | null>(null);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<TierFormErrors>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const onSessionError = useSessionGuard();

  const open = (v: TierFormValues, edit: boolean) => {
    setForm(v);
    setEditing(edit);
    setErrors({});
    setServerErrors({});
    setError(null);
  };
  const set = (patch: Partial<TierFormValues>) => form && setForm({ ...form, ...patch });

  const submit = async () => {
    if (!form) return;
    const check = validateTier(form);
    if (!check.ok) return setErrors(check.errors);
    setErrors({});
    setBusy(true);
    setError(null);
    try {
      await saveTier(check.input);
      toast.show(t.saved, 'success');
      setForm(null);
      onSaved();
    } catch (e) {
      setServerErrors(fieldErrorsOf(e));
      setError(e);
      onSessionError(e);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<TierView>[] = [
    {
      key: 'provider',
      header: s.summary.provider,
      render: (r) => r.providerName,
      sortValue: (r) => r.providerName,
    },
    {
      key: 'denomination',
      header: s.summary.denomination,
      render: (r) => s.summary.money(r.denomination),
      sortValue: (r) => r.denomination,
    },
    {
      key: 'pointsCost',
      header: s.summary.pointsCost,
      render: (r) => r.pointsCost,
      sortValue: (r) => r.pointsCost,
    },
    {
      key: 'active',
      header: s.summary.active,
      render: (r) => (
        <Badge tone={r.active ? 'success' : 'neutral'}>
          {r.active ? s.summary.active : s.summary.inactive}
        </Badge>
      ),
    },
    {
      key: 'edit',
      header: t.edit,
      render: (r) => (
        <Button
          variant="secondary"
          onClick={() =>
            open(
              {
                provider: r.provider,
                providerName: r.providerName,
                denomination: String(r.denomination),
                pointsCost: String(r.pointsCost),
                active: r.active,
              },
              true,
            )
          }
        >
          {t.edit}
        </Button>
      ),
    },
  ];

  return (
    <div className="stack">
      <div className="row">
        <h2>{t.heading}</h2>
        <Button onClick={() => open(blank, false)}>{t.add}</Button>
      </div>
      <Table
        caption={t.caption}
        columns={columns}
        rows={tiers}
        rowKey={(r) => r.id}
        empty={<p>{s.summary.empty}</p>}
      />
      <Modal
        open={form !== null}
        title={editing ? t.editTitle : t.addTitle}
        onClose={() => setForm(null)}
        busy={busy}
        actions={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} busy={busy}>
              {t.save}
            </Button>
          </>
        }
      >
        {form && (
          <div className="stack">
            <TextField
              label={t.provider}
              hint={t.providerHint}
              required
              value={form.provider}
              disabled={editing}
              error={msg(errors.provider) ?? serverErrors.provider}
              onChange={(e) => set({ provider: e.target.value })}
            />
            <TextField
              label={t.providerName}
              required
              value={form.providerName}
              error={msg(errors.providerName) ?? serverErrors.providerName}
              onChange={(e) => set({ providerName: e.target.value })}
            />
            <TextField
              label={t.denomination}
              required
              inputMode="numeric"
              value={form.denomination}
              disabled={editing}
              error={msg(errors.denomination) ?? serverErrors.denomination}
              onChange={(e) => set({ denomination: e.target.value })}
            />
            <TextField
              label={t.pointsCost}
              required
              inputMode="numeric"
              value={form.pointsCost}
              error={msg(errors.pointsCost) ?? serverErrors.pointsCost}
              onChange={(e) => set({ pointsCost: e.target.value })}
            />
            <CheckboxField
              label={t.active}
              checked={form.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            <ErrorBanner error={error} />
          </div>
        )}
      </Modal>
    </div>
  );
}
