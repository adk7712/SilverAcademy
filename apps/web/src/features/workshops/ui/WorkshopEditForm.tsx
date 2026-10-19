// UC #5-2 edit the fields an admin may change (title, description, category, materials, capacity).
import { useState } from 'react';
import { WORKSHOP_CATEGORIES } from '@silveracademy/shared';
import type { Workshop, WorkshopCategory } from '@silveracademy/shared';
import { Alert, Button, SelectField, TextAreaField, TextField } from '../../../design';
import { toEditForm } from '../controller/editForm';
import { workshopStrings as t } from '../strings';
import type { EditForm, SubmitOutcome } from '../types';

interface Props {
  workshop: Workshop;
  capacityLocked: boolean;
  busy: boolean;
  onSave: (form: EditForm) => Promise<SubmitOutcome<boolean>>;
  onSaved: (changed: boolean) => void;
}

export function WorkshopEditForm({ workshop, capacityLocked, busy, onSave, onSaved }: Props) {
  const [form, setForm] = useState<EditForm>(() => toEditForm(workshop));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async () => {
    setErrors({});
    setFailure(undefined);
    const o = await onSave(form);
    if (o.kind === 'done') onSaved(o.value);
    else if (o.kind === 'invalid') setErrors(o.fieldErrors);
    else {
      setErrors(o.fieldErrors);
      setFailure(o.message);
    }
  };

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2>{t.edit.title}</h2>
      <TextField
        label={t.edit.titleField}
        required
        value={form.title}
        error={errors.title}
        onChange={(e) => set('title', e.target.value)}
      />
      <TextAreaField
        label={t.edit.descriptionField}
        required
        rows={4}
        value={form.description}
        error={errors.description}
        onChange={(e) => set('description', e.target.value)}
      />
      <SelectField
        label={t.edit.categoryField}
        required
        value={form.category}
        error={errors.category}
        onChange={(e) => set('category', e.target.value as WorkshopCategory)}
      >
        {WORKSHOP_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t.categoryLabels[c]}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label={t.edit.materialsField}
        rows={3}
        value={form.materials}
        error={errors.materials}
        onChange={(e) => set('materials', e.target.value)}
      />
      <TextField
        label={t.edit.capacityField}
        required
        inputMode="numeric"
        value={form.capacity}
        disabled={capacityLocked}
        hint={capacityLocked ? t.edit.capacityLocked : t.edit.capacityHint(workshop.seatsTaken)}
        error={errors.capacity}
        onChange={(e) => set('capacity', e.target.value)}
      />
      {failure && <Alert tone="danger">{failure}</Alert>}
      <div className="row">
        <Button type="submit" busy={busy}>
          {t.edit.save}
        </Button>
      </div>
    </form>
  );
}
