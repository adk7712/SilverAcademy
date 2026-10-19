// UC #4-1 Add/Edit Facility dialog: details plus OneMap-style coordinates via MapProvider lookup.
import { useState } from 'react';
import { Alert, Button, Modal, TextAreaField, TextField } from '../../../design';
import { fieldErrorsOf } from '../../../services/errors';
import { findLocation } from '../controller/addressLookup';
import { validateFacilityDraft } from '../controller/facilityForm';
import type { FacilityErrors, FacilityInput } from '../controller/facilityForm';
import { isPostalCodeComplete } from '../controller/facilityForm';
import { venueErrorMessage } from '../controller/venueErrors';
import { strings } from '../../../strings';
import { venueStrings } from '../strings';
import type { FacilityDraft } from '../types';

interface Props {
  draft: FacilityDraft | null;
  onClose: () => void;
  onSave: (input: FacilityInput) => Promise<{ ok: true } | { ok: false; error: unknown }>;
}

export function FacilityFormModal({ draft, onClose, onSave }: Props) {
  // Keyed by the parent so state resets for each open.
  return (
    <Modal
      open={draft !== null}
      title={
        draft?.id ? venueStrings.availability.editFacility : venueStrings.availability.addFacility
      }
      onClose={onClose}
      actions={<></>}
    >
      {draft && <Form initial={draft} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Form({
  initial,
  onClose,
  onSave,
}: {
  initial: FacilityDraft;
  onClose: () => void;
  onSave: Props['onSave'];
}) {
  const f = venueStrings.facility;
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FacilityErrors>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);

  const set = (k: keyof FacilityDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function find() {
    setFinding(true);
    setNotice(null);
    const out = await findLocation(draft.postalCode);
    setFinding(false);
    if (out.kind === 'found') {
      setDraft((d) => ({
        ...d,
        address: out.address,
        postalCode: out.postalCode,
        lat: String(out.lat),
        lng: String(out.lng),
      }));
      setNotice({ tone: 'success', text: f.locationFound });
    } else {
      setNotice({ tone: 'warning', text: out.message });
    }
  }

  async function submit() {
    const { errors: found, input } = validateFacilityDraft(draft);
    setErrors(found);
    setFailure(null);
    if (!input) return;
    setBusy(true);
    const res = await onSave(input);
    setBusy(false);
    if (res.ok) return onClose();
    setErrors(fieldErrorsOf(res.error) as FacilityErrors);
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
        label={f.name}
        required
        value={draft.name}
        onChange={set('name')}
        error={errors.name}
      />
      <div className="row">
        <TextField
          label={f.postalCode}
          required
          hint={f.postalHint}
          inputMode="numeric"
          maxLength={6}
          value={draft.postalCode}
          onChange={set('postalCode')}
          error={errors.postalCode}
        />
        <Button
          variant="secondary"
          busy={finding}
          disabled={!isPostalCodeComplete(draft.postalCode)}
          onClick={() => void find()}
        >
          {finding ? f.finding : f.findLocation}
        </Button>
      </div>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <TextAreaField
        label={f.address}
        required
        rows={2}
        value={draft.address}
        onChange={set('address')}
        error={errors.address}
      />
      <div className="row">
        <TextField
          label={f.lat}
          required
          inputMode="decimal"
          value={draft.lat}
          onChange={set('lat')}
          error={errors.lat}
          hint={f.coordsHint}
        />
        <TextField
          label={f.lng}
          required
          inputMode="decimal"
          value={draft.lng}
          onChange={set('lng')}
          error={errors.lng}
        />
      </div>
      <TextField
        label={f.capacity}
        required
        inputMode="numeric"
        value={draft.capacity}
        onChange={set('capacity')}
        error={errors.capacity}
      />
      <TextField
        label={f.amenities}
        hint={f.amenitiesHint}
        value={draft.amenities}
        onChange={set('amenities')}
        error={errors.amenities}
      />
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
