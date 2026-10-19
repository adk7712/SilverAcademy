// Doc ids and id derivations for the seed (architecture.md 2.2). Seed-only helpers.
import { createHash, createHmac } from 'node:crypto';
import { QR_PREFIX, QR_SIGNATURE_LENGTH, normaliseVoucherCode } from '@silveracademy/shared';

export const COLLECTIONS = {
  users: 'users',
  instructorProfiles: 'instructorProfiles',
  workshops: 'workshops',
  facilities: 'facilities',
  slots: 'slots',
  venueRequests: 'venueRequests',
  bookings: 'bookings',
  attendance: 'attendance',
  feedback: 'feedback',
  volunteerAssignments: 'volunteerAssignments',
  wallets: 'wallets',
  ledger: 'ledger',
  voucherTiers: 'voucherTiers',
  voucherInventory: 'voucherInventory',
  voucherUploads: 'voucherUploads',
} as const;

const SINGPASS_UID_PREFIX = 'sp_';
const SINGPASS_UID_HASH_LENGTH = 20;
const STAFF_UID_PREFIX = 'st_';
export const STAFF_EMAIL_DOMAIN = 'staff.silveracademy.test';
const HMAC_ALGORITHM = 'sha256';

const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');

/** users/{uid} for Singpass accounts: `sp_` + first 20 hex chars of sha256(sub). */
export const singpassUid = (sub: string): string =>
  `${SINGPASS_UID_PREFIX}${sha256Hex(sub).slice(0, SINGPASS_UID_HASH_LENGTH)}`;
export const staffUid = (staffUserId: string): string => `${STAFF_UID_PREFIX}${staffUserId}`;
export const staffEmail = (staffUserId: string): string => `${staffUserId}@${STAFF_EMAIL_DOMAIN}`;

/** voucherInventory/{sha256(normalisedCode)}. */
export const voucherDocId = (code: string): string => sha256Hex(normaliseVoucherCode(code));
export const bookingDocId = (workshopId: string, learnerId: string): string =>
  `${workshopId}_${learnerId}`;
export const assignmentDocId = (workshopId: string, volunteerId: string): string =>
  `${workshopId}_${volunteerId}`;
export const facilityDocId = (key: string): string => `fac-${key}`;
export const slotDocId = (key: string): string => `slot-${key}`;

/** Same derivation as functions qrSigner: base64url(HMAC_SHA256(secret, "SA1." + bookingId)) truncated. */
export function qrSignature(bookingId: string, secret: string): string {
  return createHmac(HMAC_ALGORITHM, secret)
    .update(`${QR_PREFIX}.${bookingId}`)
    .digest('base64url')
    .slice(0, QR_SIGNATURE_LENGTH);
}
