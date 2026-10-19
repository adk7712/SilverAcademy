// UC #4-1 Add/Edit slot dialog (status Available / Unavailable / Under Maintenance).
import { useState } from 'react';
import { Alert, Button, Modal, SelectField, TextField } from '../../../design';
import { SLOT_STATUS_OPTIONS, leavesAvailable, validateSlotDraft } from '../controller/slotRules';
import { venueErrorMessage } from '../controller/venueErrors';
import type { SlotSaveInput } from '../controller/useSlots';
import { strings } from '../../../strings';
import { venueStrings } from '../strings';
import type { SlotDraft, SlotView } from '../types';

interface Props {
  draft: SlotDraft | null;
  original?: SlotView;
  onClose: () => void;
  onSave: (
    input: SlotSaveInput,
  ) => Promise<
    { ok: true; value: { conflictedRequestIds: string[] } } | { ok: false; error: unknown }
  >;
  onSaved: (conflicted: number) => void;
}

export function SlotFormModal({ draft, original, onClose, onSave, onSaved }: Props) {
  return (
    <Modal
      open={draft !== null}
      title={draft?.id ? venueStrings.slots.edit : venueStrings.slots.add}
      onClose={onClose}
      actions={<></>}
    >
      {draft && (
        <Form
          initial={draft}
          original={original}
          onClose={onClose}
          onSave={onSave}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function Form({
  initial,
  original,
  onClose,
  onSave,
  onSaved,
}: Omit<Props, 'draft'> & { initial: SlotDraft }) {
  const s = venueStrings.slots;
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = validateSlotDraft(draft, Date.now());
    setErrors(v.errors);
    setFailure(null);
    if (!v.startAt || !v.endAt) return;
    setBusy(true);
    const res = await onSave({
      ...(draft.id ? { slotId: draft.id } : {}),
      startAt: v.startAt,
      endAt: v.endAt,
      status: draft.status,
    });
    setBusy(false);
    if (res.ok) {
      onSaved(res.value.conflictedRequestIds.length);
      return onClose();
    }
    setFailure(venueErrorMessage(res.error));
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {failure && <Alert tone="danger">{failure}</Alert>}
      <TextField
        type="datetime-local"
        label={s.start}
        required
        value={draft.start}
        error={errors.start}
        onChange={(e) => setDraft({ ...draft, start: e.target.value })}
      />
      <TextField
        type="datetime-local"
        label={s.end}
        required
        value={draft.end}
        error={errors.end}
        onChange={(e) => setDraft({ ...draft, end: e.target.value })}
      />
      <SelectField
        label={s.status}
        value={draft.status}
        onChange={(e) => setDraft({ ...draft, status: e.target.value as SlotDraft['status'] })}
      >
        {SLOT_STATUS_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {venueStrings.slotStatus[o]}
          </option>
        ))}
      </SelectField>
      {leavesAvailable(original, draft.status) && (
        <Alert tone="warning">{s.leaveAvailableWarning}</Alert>
      )}
      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {strings.common.cancel}
        </Button>
        <Button type="submit" busy={busy}>
          {strings.common.save}
        </Button>
      </div>
    </form>
  );
}
