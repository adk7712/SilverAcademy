// UC #5-1 #5-5 confirm dialog with a reason field validated before submit.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Modal, TextAreaField } from '../../../design';
import { strings } from '../../../strings';
import { userStrings } from '../strings';
import type { DecisionOutcome } from '../types';

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** When false the reason box is hidden. */
  askReason: boolean;
  reasonRequired: boolean;
  reasonLabel?: string;
  reasonHint?: string;
  busy: boolean;
  onSubmit: (reasonText: string) => Promise<DecisionOutcome<void>>;
  onClose: () => void;
  /** Called after a successful submit (parent shows a toast). */
  onDone: () => void;
}

/** Mount only while open; unmounting resets the form. */
export function ReasonDialog(p: Props) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [failure, setFailure] = useState<string>();

  const submit = async () => {
    setFieldError(undefined);
    setFailure(undefined);
    const outcome = await p.onSubmit(reason);
    if (outcome.kind === 'done') p.onDone();
    else if (outcome.kind === 'invalid') setFieldError(outcome.message);
    else setFailure(outcome.message);
  };

  return (
    <Modal
      open
      title={p.title}
      onClose={p.onClose}
      actions={
        <>
          <Button variant="secondary" onClick={p.onClose} disabled={p.busy}>
            {strings.common.cancel}
          </Button>
          <Button variant={p.tone ?? 'primary'} onClick={() => void submit()} busy={p.busy}>
            {p.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div>{p.message}</div>
        {p.askReason && (
          <TextAreaField
            label={p.reasonLabel ?? userStrings.confirm.reasonLabel}
            hint={p.reasonHint ?? userStrings.confirm.reasonHint}
            required={p.reasonRequired}
            rows={4}
            value={reason}
            error={fieldError}
            onChange={(e) => {
              setReason(e.target.value);
              setFieldError(undefined);
            }}
          />
        )}
        {failure && <Alert tone="danger">{failure}</Alert>}
      </div>
    </Modal>
  );
}
