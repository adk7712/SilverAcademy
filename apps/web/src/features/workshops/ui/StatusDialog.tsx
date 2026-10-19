// UC #5-2 status change dialog: reason (cancel), impact warning for active bookings, confirm.
import { useState } from 'react';
import type { WorkshopAdminAction } from '@silveracademy/shared';
import { Alert, Button, CheckboxField, Modal, TextAreaField } from '../../../design';
import { strings } from '../../../strings';
import { statusActionNeedsReason } from '../controller/workshopRules';
import { workshopStrings as t } from '../strings';
import type { SubmitOutcome } from '../types';

interface Props {
  action: WorkshopAdminAction;
  workshopTitle: string;
  /** Bookings affected (0 = no warning). */
  impact: number;
  busy: boolean;
  onSubmit: (reason: string, acknowledged: boolean) => Promise<SubmitOutcome<unknown>>;
  onClose: () => void;
  onDone: () => void;
}

/** Mount only while open; unmounting resets the form. */
export function StatusDialog({
  action,
  workshopTitle,
  impact,
  busy,
  onSubmit,
  onClose,
  onDone,
}: Props) {
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const askReason = statusActionNeedsReason(action);

  const submit = async () => {
    setErrors({});
    setFailure(undefined);
    const o = await onSubmit(reason, ack);
    if (o.kind === 'done') onDone();
    else if (o.kind === 'invalid') setErrors(o.fieldErrors);
    else setFailure(o.message);
  };

  return (
    <Modal
      open
      title={t.confirm.title(t.actions[action], workshopTitle)}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {strings.common.cancel}
          </Button>
          <Button
            variant={action === 'CANCELLED' ? 'danger' : 'primary'}
            onClick={() => void submit()}
            busy={busy}
          >
            {t.confirm.submit}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p>{t.confirm[action]}</p>
        {impact > 0 && (
          <Alert tone="warning">
            <strong>{t.confirm.impactTitle}</strong>
            <p>
              {action === 'CANCELLED'
                ? t.confirm.impactCancel(impact)
                : t.confirm.impactArchive(impact)}
            </p>
          </Alert>
        )}
        {askReason && (
          <TextAreaField
            label={t.confirm.reasonLabel}
            hint={t.confirm.reasonHint}
            required
            rows={4}
            value={reason}
            error={errors.reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrors((x) => ({ ...x, reason: '' }));
            }}
          />
        )}
        {impact > 0 && (
          <div>
            <CheckboxField
              label={t.confirm.impactAck}
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {errors.ack && (
              <span className="field__error" role="alert">
                {errors.ack}
              </span>
            )}
          </div>
        )}
        {failure && <Alert tone="danger">{failure}</Alert>}
      </div>
    </Modal>
  );
}
