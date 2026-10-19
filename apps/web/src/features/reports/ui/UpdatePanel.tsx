// UC #5-3: change incident status, request information or enter a resolution.
import { useState } from 'react';
import { Alert, Button, ErrorBanner, SelectField, TextAreaField, useToast } from '../../../design';
import { useSessionGuard } from '../../auth';
import { fieldErrorsOf, toAppError } from '../../../services';
import { buildUpdate, isClosed, nextStatuses } from '../controller/incidentRules';
import type { UpdateField, UpdateForm } from '../controller/incidentRules';
import { updateIncident } from '../controller/incidentActions';
import { reportStrings as s } from '../strings';
import type { IncidentView } from '../types';

const blank: UpdateForm = { status: '', infoRequest: '', resolution: '' };

export function UpdatePanel({
  incident,
  onUpdated,
}: {
  incident: IncidentView;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<UpdateForm>(blank);
  const [missing, setMissing] = useState<UpdateField | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const onSessionError = useSessionGuard();
  const a = s.actions;

  if (isClosed(incident.status)) return <Alert>{a.closedNote}</Alert>;

  const submit = async () => {
    const check = buildUpdate(incident, form);
    if (!check.ok) return setMissing(check.field);
    setMissing(null);
    setBusy(true);
    setError(null);
    try {
      await updateIncident(check.input);
      toast.show(a.updated, 'success');
      setForm(blank);
      onUpdated();
    } catch (e) {
      setError(e);
      onSessionError(e);
      if (toAppError(e).code === 'STALE_VERSION') onUpdated();
    } finally {
      setBusy(false);
    }
  };
  const server = fieldErrorsOf(error);

  return (
    <section className="stack" aria-labelledby="update-heading">
      <h2 id="update-heading">{a.heading}</h2>
      <SelectField
        label={a.newStatus}
        required
        value={form.status}
        error={missing === 'status' ? a.chooseStatus : server.status}
        onChange={(e) => setForm({ ...form, status: e.target.value as UpdateForm['status'] })}
      >
        <option value="">{a.choose}</option>
        {nextStatuses(incident.status).map((st) => (
          <option key={st} value={st}>
            {s.status[st]}
          </option>
        ))}
      </SelectField>
      {form.status === 'AWAITING_INFO' && (
        <TextAreaField
          label={a.infoRequest}
          hint={a.textHint}
          required
          value={form.infoRequest}
          error={missing === 'infoRequest' ? a.required : server.infoRequest}
          onChange={(e) => setForm({ ...form, infoRequest: e.target.value })}
        />
      )}
      {form.status === 'RESOLVED' && (
        <TextAreaField
          label={a.resolution}
          hint={a.textHint}
          required
          value={form.resolution}
          error={missing === 'resolution' ? a.required : server.resolution}
          onChange={(e) => setForm({ ...form, resolution: e.target.value })}
        />
      )}
      <ErrorBanner error={error} />
      <div>
        <Button onClick={() => void submit()} busy={busy}>
          {a.submit}
        </Button>
      </div>
    </section>
  );
}
