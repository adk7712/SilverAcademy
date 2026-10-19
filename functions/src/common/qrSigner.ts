// QR payload signing/verification, the only place the HMAC key is used (architecture.md 4.2, ADR-017). UC #2-2, #1-4, #3-4.
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  AppError,
  QR_PREFIX,
  QR_SIGNATURE_LENGTH,
  buildQrPayload,
  parseQrPayload,
} from '@silveracademy/shared';
import { qrSecret } from './config';

const HMAC_ALGORITHM = 'sha256';

const signature = (bookingId: string, secret: string): string =>
  createHmac(HMAC_ALGORITHM, secret)
    .update(`${QR_PREFIX}.${bookingId}`)
    .digest('base64url')
    .slice(0, QR_SIGNATURE_LENGTH);

/** `SA1.<bookingId>.<sig>`. Same derivation as the seed (`firebase/seed/ids.ts`). */
export const signQr = (bookingId: string, secret: string = qrSecret()): string =>
  buildQrPayload(bookingId, signature(bookingId, secret));

/** Returns the bookingId, or throws AppError INVALID_QR (malformed or bad signature). Constant-time compare. */
export function verifyQr(payload: string, secret: string = qrSecret()): string {
  const parsed = parseQrPayload(payload);
  if (!parsed) throw new AppError('INVALID_QR');
  const expected = Buffer.from(signature(parsed.bookingId, secret));
  const actual = Buffer.from(parsed.signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError('INVALID_QR');
  }
  return parsed.bookingId;
}
