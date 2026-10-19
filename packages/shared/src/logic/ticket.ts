// UC #2-2 #2-3 #1-4 #3-4 ticket code and QR payload helpers (format only; signing lives in functions).
import {
  CROCKFORD_ALPHABET,
  QR_BOOKING_ID_MAX,
  QR_PREFIX,
  QR_SIGNATURE_LENGTH,
  TICKET_CODE_GROUP,
  TICKET_CODE_LENGTH,
} from '../constants';

// Booking ids may contain '-' (seed ids such as ws-01); '.' stays the delimiter so this is unambiguous.
const QR_REGEX = new RegExp(
  `^${QR_PREFIX}\\.([A-Za-z0-9_-]{1,${QR_BOOKING_ID_MAX}})\\.([A-Za-z0-9_-]{${QR_SIGNATURE_LENGTH}})$`,
);

export interface ParsedQrPayload {
  bookingId: string;
  signature: string;
}

/** Format check only (no secret): `SA1.<bookingId>.<sig>`. Null means "not a SilverAcademy code". */
export function parseQrPayload(payload: string): ParsedQrPayload | null {
  const m = QR_REGEX.exec(payload.trim());
  return m ? { bookingId: m[1] as string, signature: m[2] as string } : null;
}

export const buildQrPayload = (bookingId: string, signature: string) =>
  `${QR_PREFIX}.${bookingId}.${signature}`;

/** Uppercase, strip `-` and spaces, O->0, I/L->1 (Crockford). */
export function normaliseTicketCode(input: string): string {
  return input.toUpperCase().replace(/[-\s]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
}

export function isValidTicketCode(input: string): boolean {
  const c = normaliseTicketCode(input);
  return c.length === TICKET_CODE_LENGTH && [...c].every((ch) => CROCKFORD_ALPHABET.includes(ch));
}

/** `ABCD1234` -> `ABCD-1234` for display. */
export function formatTicketCode(code: string): string {
  const c = normaliseTicketCode(code);
  return c.length > TICKET_CODE_GROUP
    ? `${c.slice(0, TICKET_CODE_GROUP)}-${c.slice(TICKET_CODE_GROUP)}`
    : c;
}
