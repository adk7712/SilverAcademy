// UC #5-4: mark a voucher Invalid or Removed with a required reason.
import { useState } from 'react';
import { Button, ErrorBanner, Modal, TextAreaField, useToast } from '../../../design';
import { useSessionGuard } from '../../auth';
import { checkReason } from '../controller/voucherForms';
import { changeVoucherStatus } from '../controller/voucherActions';
import { voucherStrings as s } from '../strings';
import type { InventoryItem } from '../types';

interface Props {
  item: InventoryItem | null;
  status: 'INVALID' | 'REMOVED';
  onClose: () => void;
  onDone: () => void;
}

export function StatusDialog({ item, status, onClose, onDone }: Props) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const onSessionError = useSessionGuard();

  const close = () => {
    setReason('');
    setFieldError(undefined);
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!item) return;
    const check = checkReason(reason);
    if (!check.ok) {
      setFieldError(s.statusDialog.reasonMissing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeVoucherStatus(item.voucherId, status, check.reason);
      toast.show(s.statusDialog.done, 'success');
      close();
      onDone();
    } catch (e) {
      setError(e);
      onSessionError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={item !== null}
      title={status === 'INVALID' ? s.statusDialog.titleInvalid : s.statusDialog.titleRemoved}
      onClose={close}
      busy={busy}
      actions={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            {s.statusDialog.cancel}
          </Button>
          <Button variant="danger" onClick={() => void submit()} busy={busy}>
            {s.statusDialog.confirm}
          </Button>
        </>
      }
    >
      <div className="stack">
        {item && <p>{s.statusDialog.description(item.codeMasked)}</p>}
        <TextAreaField
          label={s.statusDialog.reason}
          hint={s.statusDialog.reasonHint}
          value={reason}
          required
          error={fieldError}
          onChange={(e) => setReason(e.target.value)}
        />
        <ErrorBanner error={error} />
      </div>
    </Modal>
  );
}
