// UC #1-3 shows the latest venue request: status, reason, info question with reply form, withdraw.
import { useState } from 'react';
import { AppText, Badge, Button, Card, TextField } from '../../../../design';
import { format, strings } from '../../../../i18n';
import {
  canRespondToInfo,
  canWithdraw,
  formatSlot,
  requestStatusInfo,
} from '../../controller/venueRequestLogic';
import type { VenueRequest } from '@silveracademy/shared';

const t = strings.venuesInstructor;

interface Props {
  request: VenueRequest;
  busy: boolean;
  replyError: string | null;
  onReply: (message: string) => Promise<boolean>;
  onWithdraw: () => void;
}

export function RequestStatusCard({ request, busy, replyError, onReply, onWithdraw }: Props) {
  const [message, setMessage] = useState('');
  const info = requestStatusInfo(request.status);
  return (
    <Card>
      <AppText variant="title">{t.requestHeading}</AppText>
      <AppText variant="bodyStrong">
        {format(t.requestFor, {
          venue: request.facilityName,
          slot: formatSlot({ startAt: request.slotStartAt, endAt: request.slotEndAt }),
        })}
      </AppText>
      <Badge label={info.label} tone={info.tone} />
      {request.decisionReason ? (
        <AppText>{format(t.reasonLabel, { reason: request.decisionReason })}</AppText>
      ) : null}
      {canRespondToInfo(request) ? (
        <>
          {request.infoRequest ? (
            <AppText variant="bodyStrong">
              {format(t.infoQuestion, { message: request.infoRequest })}
            </AppText>
          ) : null}
          <TextField
            label={t.infoReplyField}
            value={message}
            onChangeText={setMessage}
            multiline
            error={replyError ?? undefined}
          />
          <Button
            label={t.infoReplySend}
            loading={busy}
            onPress={() => void onReply(message).then((ok) => ok && setMessage(''))}
          />
        </>
      ) : null}
      {canWithdraw(request) ? (
        <Button label={t.withdraw} variant="danger" disabled={busy} onPress={onWithdraw} />
      ) : null}
    </Card>
  );
}
