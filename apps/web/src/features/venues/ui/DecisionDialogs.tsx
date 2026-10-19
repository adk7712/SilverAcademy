// UC #4-2 approve / reject / request-more-info dialogs (reject and info can suggest another slot).
import { useState } from 'react';
import { Alert, ConfirmDialog, Modal, Button, SelectField, TextAreaField } from '../../../design';
import { strings } from '../../../strings';
import type { RequestAction } from '../controller/requestRules';
import { validateInfoMessage } from '../controller/requestRules';
import { useSuggestableSlots } from '../controller/useSlots';
import { formatDateTime } from '../controller/slotRules';
import { venueStrings } from '../strings';
import type { RequestView } from '../types';

export interface DialogResult {
  reason?: string;
  message?: string;
  suggestedSlotId?: string;
}

interface Props {
  request: RequestView;
  action: RequestAction | null;
  busy: boolean;
  failure: string | null;
  onCancel: () => void;
  onSubmit: (action: RequestAction, result: DialogResult) => void;
}

export function DecisionDialogs({ request, action, busy, failure, onCancel, onSubmit }: Props) {
  const r = venueStrings.requests;
  return (
    <>
      <ConfirmDialog
        open={action === 'APPROVE'}
        title={r.approveTitle}
        message={
          <div className="stack">
            {failure && <Alert tone="danger">{failure}</Alert>}
            <p>{r.approveMessage}</p>
          </div>
        }
        confirmLabel={r.approve}
        busy={busy}
        onConfirm={() => onSubmit('APPROVE', {})}
        onCancel={onCancel}
      />
      <Modal
        open={action === 'REJECT' || action === 'REQUEST_INFO'}
        title={action === 'REJECT' ? r.rejectTitle : r.infoTitle}
        onClose={onCancel}
        actions={<></>}
      >
        {(action === 'REJECT' || action === 'REQUEST_INFO') && (
          <TextForm
            request={request}
            action={action}
            busy={busy}
            failure={failure}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        )}
      </Modal>
    </>
  );
}

function TextForm({
  request,
  action,
  busy,
  failure,
  onCancel,
  onSubmit,
}: Omit<Props, 'action'> & { action: 'REJECT' | 'REQUEST_INFO' }) {
  const r = venueStrings.requests;
  const [text, setText] = useState('');
  const [suggested, setSuggested] = useState('');
  const [error, setError] = useState<string | undefined>();
  const others = useSuggestableSlots(request.facilityId, request.slotId);
  const isInfo = action === 'REQUEST_INFO';

  function submit() {
    if (isInfo) {
      const problem = validateInfoMessage(text);
      setError(problem);
      if (problem) return;
    }
    onSubmit(action, {
      ...(isInfo ? { message: text } : { reason: text }),
      ...(suggested ? { suggestedSlotId: suggested } : {}),
    });
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {failure && <Alert tone="danger">{failure}</Alert>}
      <TextAreaField
        label={isInfo ? r.infoLabel : r.reasonLabel}
        hint={isInfo ? undefined : r.reasonHint}
        required={isInfo}
        rows={3}
        value={text}
        error={error}
        onChange={(e) => setText(e.target.value)}
      />
      <SelectField
        label={r.suggestLabel}
        value={suggested}
        onChange={(e) => setSuggested(e.target.value)}
      >
        <option value="">{others.loading ? r.suggestLoading : r.suggestNone}</option>
        {others.data.map((s) => (
          <option key={s.id} value={s.id}>
            {formatDateTime(s.startMs)}
          </option>
        ))}
      </SelectField>
      <div className="modal__actions">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {strings.common.cancel}
        </Button>
        <Button type="submit" variant={isInfo ? 'primary' : 'danger'} busy={busy}>
          {isInfo ? r.requestInfo : r.reject}
        </Button>
      </div>
    </form>
  );
}
