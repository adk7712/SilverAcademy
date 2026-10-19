// UC #4-2 request detail: workshop, venue, date/time, state and decision actions.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button } from '../../../design';
import { PATHS } from '../../../app/paths';
import {
  availableActions,
  needsAlternativeSlot,
  requestLabel,
  requestTone,
} from '../controller/requestRules';
import type { RequestAction } from '../controller/requestRules';
import type { DecisionOutcome } from '../controller/decisions';
import { formatDay, formatTimeRange } from '../controller/slotRules';
import { venueStrings } from '../strings';
import type { RequestView } from '../types';
import { DecisionDialogs } from './DecisionDialogs';
import type { DialogResult } from './DecisionDialogs';

interface Props {
  request: RequestView;
  onBack: () => void;
  onDecide: (action: RequestAction, result: DialogResult) => Promise<DecisionOutcome>;
}

export function RequestDetail({ request, onBack, onDecide }: Props) {
  const r = venueStrings.requests;
  const [action, setAction] = useState<RequestAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);

  const actions = availableActions(request.status);
  const conflicted = needsAlternativeSlot(request.status) || outcome?.kind === 'conflict';

  async function submit(a: RequestAction, result: DialogResult) {
    setBusy(true);
    setFailure(null);
    const out = await onDecide(a, result);
    setBusy(false);
    if (out.kind === 'error') return setFailure(out.message);
    setOutcome(out);
    setAction(null);
  }

  const rows: [string, string][] = [
    [r.workshop, request.workshopTitle],
    [r.instructor, request.instructorName],
    [r.venue, request.facilityName],
    [r.date, formatDay(request.startMs)],
    [r.time, formatTimeRange(request.startMs, request.endMs)],
    [r.category, request.category],
    [r.capacity, String(request.workshopCapacity)],
    [r.materials, request.materials || '-'],
  ];

  return (
    <section className="stack" aria-labelledby="request-heading">
      <div>
        <Button variant="ghost" onClick={onBack}>
          {r.back}
        </Button>
      </div>
      <div className="row">
        <h1 id="request-heading">{r.detailTitle}</h1>
        <Badge tone={requestTone(request.status)}>{requestLabel(request.status)}</Badge>
      </div>
      {outcome?.kind === 'ok' && <Alert tone="success">{outcome.message}</Alert>}
      {conflicted && (
        <Alert tone="warning">
          <strong>{r.conflictTitle}</strong>
          <p>{r.conflictBody}</p>
          <p>{r.conflictPrompt}</p>
          <Link to={PATHS.partnerAvailability}>{r.conflictCta}</Link>
        </Alert>
      )}
      <dl className="card stack">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>
              <strong>{k}</strong>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>
            <strong>{r.description}</strong>
          </dt>
          <dd>{request.description}</dd>
        </div>
        {request.infoRequest && (
          <div>
            <dt>
              <strong>{r.infoAsked}</strong>
            </dt>
            <dd>{request.infoRequest}</dd>
          </div>
        )}
        {request.infoResponse && (
          <div>
            <dt>
              <strong>{r.infoReply}</strong>
            </dt>
            <dd>{request.infoResponse}</dd>
          </div>
        )}
        {request.decisionReason && (
          <div>
            <dt>
              <strong>{r.decisionReason}</strong>
            </dt>
            <dd>{request.decisionReason}</dd>
          </div>
        )}
      </dl>
      {request.status === 'AWAITING_INFO' && <Alert tone="info">{r.awaitingNote}</Alert>}
      {actions.length > 0 && outcome === null && (
        <div className="row">
          <Button onClick={() => setAction('APPROVE')}>{r.approve}</Button>
          <Button variant="secondary" onClick={() => setAction('REQUEST_INFO')}>
            {r.requestInfo}
          </Button>
          <Button variant="danger" onClick={() => setAction('REJECT')}>
            {r.reject}
          </Button>
        </div>
      )}
      <DecisionDialogs
        request={request}
        action={action}
        busy={busy}
        failure={failure}
        onCancel={() => {
          setAction(null);
          setFailure(null);
        }}
        onSubmit={(a, res) => void submit(a, res)}
      />
    </section>
  );
}
