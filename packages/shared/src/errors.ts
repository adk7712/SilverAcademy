// AppError + AppErrorCode + HttpsError mapping (architecture.md section 6; functions.md section 0). All UCs.
const CODES = {
  Generic: [
    'UNAUTHENTICATED',
    'PERMISSION_DENIED',
    'ACCOUNT_SUSPENDED',
    'INVALID_INPUT',
    'NOT_FOUND',
    'STALE_VERSION',
    'INVALID_TRANSITION',
    'REASON_REQUIRED',
    'BUSY_TRY_AGAIN',
    'INTERNAL',
  ],
  Auth: [
    'SINGPASS_AUTH_FAILED',
    'SINGPASS_UNAVAILABLE',
    'PROFILE_UNAVAILABLE',
    'REGISTRATION_REQUIRED',
    'NOT_STAFF_ACCOUNT',
  ],
  Users: [
    'NOT_SENIOR_ELIGIBLE',
    'PROFILE_NOT_APPROVED',
    'PROFILE_ALREADY_APPROVED',
    'NOT_PENDING',
    'CANNOT_TARGET_ADMIN',
    'USER_ID_TAKEN',
  ],
  Workshops: [
    'WORKSHOP_NOT_EDITABLE',
    'CAPACITY_BELOW_BOOKINGS',
    'ACTIVE_BOOKINGS_CONFIRM_REQUIRED',
    'WORKSHOP_LOCKED_FIELDS',
  ],
  Bookings: [
    'WORKSHOP_NOT_OPEN',
    'WORKSHOP_STARTED',
    'WORKSHOP_FULL',
    'ALREADY_BOOKED',
    'CANNOT_BOOK_OWN_WORKSHOP',
  ],
  Attendance: [
    'INVALID_QR',
    'TICKET_NOT_FOUND',
    'WRONG_WORKSHOP',
    'NO_BOOKING',
    'ALREADY_ATTENDED',
    'NOT_AUTHORISED_FOR_WORKSHOP',
    'SESSION_NOT_ACTIVE',
  ],
  Volunteers: ['NOT_ACCEPTING_VOLUNTEERS', 'VOLUNTEERS_FULL', 'ALREADY_OPTED_IN', 'NOT_ASSIGNED'],
  Feedback: ['NOT_ATTENDED', 'FEEDBACK_WINDOW_CLOSED', 'ALREADY_SUBMITTED'],
  Venues: [
    'SLOT_UNAVAILABLE',
    'SLOT_CONFLICT',
    'SLOT_BOOKED_LOCKED',
    'SLOT_OVERLAP',
    'INVALID_TIME_RANGE',
    'SLOT_IN_PAST',
    'VENUE_REQUEST_EXISTS',
    'VENUE_TOO_SMALL',
    'REQUEST_NOT_PENDING',
    'NOT_FACILITY_OWNER',
    'LOCATION_OUT_OF_BOUNDS',
    'MAP_UNAVAILABLE',
  ],
  Vouchers: [
    'TIER_NOT_FOUND',
    'INSUFFICIENT_POINTS',
    'OUT_OF_STOCK',
    'UPLOAD_TOO_LARGE',
    'VOUCHER_NOT_AVAILABLE',
  ],
  Reports: ['ATTACHMENT_INVALID', 'INCIDENT_CLOSED'],
} as const;

type Group = keyof typeof CODES;
export type AppErrorCode = (typeof CODES)[Group][number];
export const APP_ERROR_CODES = Object.values(CODES).flat() as readonly AppErrorCode[];
/** Enum-style access: `AppErrorCode.WORKSHOP_FULL`. */
export const AppErrorCode = Object.fromEntries(APP_ERROR_CODES.map((c) => [c, c])) as {
  readonly [K in AppErrorCode]: K;
};

export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message?: string,
    readonly details?: ErrorDetails,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
export const isAppErrorCode = (v: unknown): v is AppErrorCode =>
  typeof v === 'string' && (APP_ERROR_CODES as readonly string[]).includes(v);

export type HttpsCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'unavailable'
  | 'aborted'
  | 'failed-precondition';

const HTTPS_GROUPS: Record<Exclude<HttpsCode, 'failed-precondition'>, readonly AppErrorCode[]> = {
  unauthenticated: ['UNAUTHENTICATED'],
  'permission-denied': [
    'PERMISSION_DENIED',
    'ACCOUNT_SUSPENDED',
    'PROFILE_NOT_APPROVED',
    'NOT_AUTHORISED_FOR_WORKSHOP',
    'NOT_ASSIGNED',
    'NOT_FACILITY_OWNER',
    'NOT_STAFF_ACCOUNT',
    'CANNOT_TARGET_ADMIN',
    'NOT_SENIOR_ELIGIBLE',
  ],
  'invalid-argument': [
    'INVALID_INPUT',
    'INVALID_QR',
    'REASON_REQUIRED',
    'INVALID_TIME_RANGE',
    'LOCATION_OUT_OF_BOUNDS',
    'ATTACHMENT_INVALID',
    'UPLOAD_TOO_LARGE',
  ],
  'not-found': ['NOT_FOUND', 'TICKET_NOT_FOUND', 'TIER_NOT_FOUND'],
  'already-exists': [
    'ALREADY_BOOKED',
    'ALREADY_ATTENDED',
    'ALREADY_OPTED_IN',
    'ALREADY_SUBMITTED',
    'VENUE_REQUEST_EXISTS',
  ],
  'resource-exhausted': ['WORKSHOP_FULL', 'VOLUNTEERS_FULL', 'OUT_OF_STOCK'],
  unavailable: ['SINGPASS_UNAVAILABLE', 'MAP_UNAVAILABLE'],
  aborted: ['BUSY_TRY_AGAIN', 'STALE_VERSION'],
};

/** HttpsError code for an AppErrorCode (architecture.md section 6); default failed-precondition. */
export function httpsCodeFor(code: AppErrorCode): HttpsCode {
  for (const [https, codes] of Object.entries(HTTPS_GROUPS)) {
    if (codes.includes(code)) return https as HttpsCode;
  }
  return 'failed-precondition';
}
