// UC #4-1 per-facility slot list grouped by day: add, edit, remove; BOOKED slots are locked.
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Spinner,
} from '../../../design';
import type { Tone } from '../../../design';
import {
  draftFromSlot,
  emptySlotDraft,
  formatTimeRange,
  groupSlotsByDay,
} from '../controller/slotRules';
import { useSlots } from '../controller/useSlots';
import { venueErrorMessage } from '../controller/venueErrors';
import { venueStrings } from '../strings';
import type { FacilityView, SlotDraft, SlotView } from '../types';
import { SlotFormModal } from './SlotFormModal';

const TONES: Record<SlotView['status'], Tone> = {
  AVAILABLE: 'success',
  UNAVAILABLE: 'neutral',
  MAINTENANCE: 'warning',
  BOOKED: 'info',
};

export function SlotPanel({ facility }: { facility: FacilityView }) {
  const s = venueStrings.slots;
  const slots = useSlots(facility.id);
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [removing, setRemoving] = useState<SlotView | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'success' | 'danger' | 'warning'; text: string } | null>(
    null,
  );

  const original = slots.data.find((x) => x.id === draft?.id);
  const groups = groupSlotsByDay(slots.data);

  function afterSave(conflicted: number) {
    setNote({
      tone: conflicted > 0 ? 'warning' : 'success',
      text: conflicted > 0 ? `${s.saved} ${s.conflictedNote(conflicted)}` : s.saved,
    });
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    const res = await slots.remove(removing.id);
    setBusy(false);
    setRemoving(null);
    if (res.ok) {
      const n = res.value.conflictedRequestIds.length;
      setNote({
        tone: n > 0 ? 'warning' : 'success',
        text: n > 0 ? `${s.removed} ${s.conflictedNote(n)}` : s.removed,
      });
    } else {
      setNote({ tone: 'danger', text: venueErrorMessage(res.error) });
    }
  }

  return (
    <section className="card stack" aria-labelledby="slots-heading">
      <div className="row">
        <h2 id="slots-heading">{s.title(facility.name)}</h2>
        <Button onClick={() => setDraft(emptySlotDraft())}>{s.add}</Button>
      </div>
      {note && (
        <Alert tone={note.tone} onDismiss={() => setNote(null)}>
          {note.text}
        </Alert>
      )}
      <ErrorBanner error={slots.error} onRetry={slots.reload} />
      {slots.loading && <Spinner />}
      {!slots.loading && !slots.error && groups.length === 0 && (
        <EmptyState title={s.empty} description={s.emptyHint} />
      )}
      {groups.map((g) => (
        <div key={g.day} className="stack">
          <h3>{g.day}</h3>
          <ul className="stack" aria-label={g.day}>
            {g.slots.map((slot) => (
              <li key={slot.id} className="row">
                <strong>{formatTimeRange(slot.startMs, slot.endMs)}</strong>
                <Badge tone={TONES[slot.status]}>{venueStrings.slotStatus[slot.status]}</Badge>
                {slot.locked ? (
                  <span role="note">
                    {s.lockedShort}. {s.lockedMessage}
                  </span>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      aria-label={`${s.editAction} ${g.day} ${formatTimeRange(slot.startMs, slot.endMs)}`}
                      onClick={() => setDraft(draftFromSlot(slot))}
                    >
                      {s.editAction}
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`${s.remove} ${g.day} ${formatTimeRange(slot.startMs, slot.endMs)}`}
                      onClick={() => setRemoving(slot)}
                    >
                      {s.remove}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <SlotFormModal
        draft={draft}
        original={original}
        onClose={() => setDraft(null)}
        onSave={slots.save}
        onSaved={afterSave}
      />
      <ConfirmDialog
        open={removing !== null}
        title={s.removeTitle}
        message={s.removeMessage}
        confirmLabel={s.remove}
        tone="danger"
        busy={busy}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
