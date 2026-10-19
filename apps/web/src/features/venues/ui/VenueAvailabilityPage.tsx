// UC #4-1 ManageVenueAvailability: my facilities (add/edit) and the selected facility's slots.
import { useState } from 'react';
import { Alert, Button, EmptyState, ErrorBanner, Spinner } from '../../../design';
import { draftFromFacility, emptyFacilityDraft } from '../controller/facilityForm';
import { useFacilities } from '../controller/useFacilities';
import { venueStrings } from '../strings';
import type { FacilityDraft } from '../types';
import { FacilityFormModal } from './FacilityFormModal';
import { SlotPanel } from './SlotPanel';

export function VenueAvailabilityPage() {
  const a = venueStrings.availability;
  const facilities = useFacilities();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FacilityDraft | null>(null);
  const [saved, setSaved] = useState(false);

  const selected = facilities.data.find((f) => f.id === selectedId) ?? null;

  return (
    <section className="stack">
      <div className="row">
        <h1>{a.title}</h1>
        <Button onClick={() => setDraft(emptyFacilityDraft())}>{a.addFacility}</Button>
      </div>
      <p>{a.intro}</p>
      {saved && (
        <Alert tone="success" onDismiss={() => setSaved(false)}>
          {venueStrings.facility.saved}
        </Alert>
      )}
      <ErrorBanner error={facilities.error} onRetry={facilities.reload} />
      {facilities.loading && <Spinner />}
      {!facilities.loading && !facilities.error && facilities.data.length === 0 && (
        <EmptyState
          title={a.noFacilities}
          description={a.noFacilitiesHint}
          action={<Button onClick={() => setDraft(emptyFacilityDraft())}>{a.addFacility}</Button>}
        />
      )}
      <ul className="stack" aria-label={a.facilities}>
        {facilities.data.map((f) => (
          <li key={f.id} className="card stack">
            <h2>{f.name}</h2>
            <p>
              {f.address}, Singapore {f.postalCode}
            </p>
            <p>
              {a.capacityPeople(f.capacity)}
              {f.amenities.length > 0 && ` | ${f.amenities.join(', ')}`}
            </p>
            <div className="row">
              <Button
                aria-pressed={f.id === selectedId}
                variant={f.id === selectedId ? 'primary' : 'secondary'}
                onClick={() => setSelectedId(f.id)}
              >
                {a.manageSlots}
                <span className="sr-only">: {f.name}</span>
              </Button>
              <Button variant="ghost" onClick={() => setDraft(draftFromFacility(f))}>
                {a.editFacility}
                <span className="sr-only">: {f.name}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {selected ? (
        <SlotPanel key={selected.id} facility={selected} />
      ) : (
        facilities.data.length > 0 && <p>{a.selectFacility}</p>
      )}
      <FacilityFormModal
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={async (input) => {
          const res = await facilities.save(input);
          if (res.ok) setSaved(true);
          return res;
        }}
      />
    </section>
  );
}
