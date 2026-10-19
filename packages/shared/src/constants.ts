// Shared constants (architecture.md section 7). Cross-cutting: FR 1.2, 2.10, 3.x, 5.x; NFR 2.1, 2.2.
// No magic numbers elsewhere: add new limits here.
export const FUNCTIONS_REGION = 'asia-southeast1';
export const SENIOR_MIN_AGE = 50; // FR 1.2
/** Singapore is UTC+8 with no DST; used for age calculation (#0-1). */
export const SG_UTC_OFFSET_HOURS = 8;

// Workshops (#1-2)
export const WORKSHOP_TITLE_MAX = 80;
export const WORKSHOP_DESCRIPTION_MAX = 2000;
export const WORKSHOP_MATERIALS_MAX = 500;
export const WORKSHOP_CAPACITY_MIN = 1;
export const WORKSHOP_CAPACITY_MAX = 50; // keeps cancel tx < 500 writes
export const VOLUNTEER_SLOTS_MAX = 5;

// Venues (#1-3, #4-1, #4-2)
export const VENUE_REQUEST_MIN_LEAD_MIN = 60;
export const MAX_SLOT_HOURS = 8;
export const POSTAL_CODE_LENGTH = 6;
export const FACILITY_NAME_MAX = 120;
export const FACILITY_ADDRESS_MAX = 250;
export const FACILITY_CAPACITY_MAX = 1000;
export const AMENITIES_MAX = 20;
export const AMENITY_MAX_LENGTH = 60;
export const SG_BOUNDS = { latMin: 1.15, latMax: 1.48, lngMin: 103.6, lngMax: 104.1 } as const;

// Attendance (#1-4, #3-4)
export const CHECKIN_OPENS_MIN_BEFORE = 60;
export const CHECKIN_CLOSES_MIN_AFTER = 30;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

// Points and vouchers (#1-5..#1-7, #5-4)
export const POINTS_PER_ATTENDANCE = 1; // FR 2.10
export const POINTS_PER_SGD = 2;
export const VOUCHER_CODE_REGEX = /^[A-Z0-9-]{8,32}$/;
export const MAX_UPLOAD_ROWS = 400;
export const VOUCHER_LIST_LIMIT_MAX = 100;
export const VOUCHER_MASK_VISIBLE = 4;
export const VOUCHER_MASK_PREFIX = '****';
export const VOUCHER_DENOMINATION_MAX = 1000;

// Tickets and QR (#2-2, #2-3)
export const TICKET_CODE_LENGTH = 8; // Crockford base32
export const TICKET_CODE_GROUP = 4; // shown as XXXX-XXXX
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const QR_PREFIX = 'SA1';
export const QR_BOOKING_ID_MAX = 128;
export const QR_SIGNATURE_LENGTH = 22;

// Feedback (#2-4)
export const FEEDBACK_WINDOW_DAYS = 7;
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];
export const FEEDBACK_RATING_MIN = FEEDBACK_RATINGS[0];
export const FEEDBACK_RATING_MAX = FEEDBACK_RATINGS[4];
export const FEEDBACK_COMMENT_MAX = 1000;
export const FEEDBACK_TAGS_MAX = 5;
export const FEEDBACK_TAG_MAX_LENGTH = 40;

// Reports (#2-5, #5-3)
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
export const INCIDENT_DESCRIPTION_MIN = 10;
export const INCIDENT_DESCRIPTION_MAX = 2000;
export const INCIDENT_TEXT_MAX = 1000; // resolution / infoRequest
export const ATTACHMENT_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const INCIDENT_REF_REGEX = /^SA-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/;

// Users and admin (#5-1, #5-5, gap #17)
export const DISPLAY_NAME_MAX = 100;
export const INSTRUCTOR_BIO_MAX = 1000;
export const EXPERIENCE_YEARS_MAX = 80;
export const REASON_MAX = 500;
export const ID_MAX_LENGTH = 256;
export const VOUCHER_PROVIDER_MAX = 40;
export const VOUCHER_PROVIDER_NAME_MAX = 80;
export const STAFF_USER_ID_MAX = 40;
export const STAFF_PASSWORD_MIN = 8;
export const ORG_NAME_MAX = 120;

// Search and recommendations (#2-1, #3-1)
export const SEARCH_FETCH_LIMIT = 200;
export const RECO_W_POPULARITY = 0.6;
export const RECO_W_PROXIMITY = 0.4;
export const RECO_DEFAULT_LIMIT = 5;
export const EARTH_RADIUS_KM = 6371;

// External services
export const MAP_TIMEOUT_MS = 4000;
export const MAP_SEARCH_DEFAULT_LIMIT = 10;

// Accessibility (NFR 2.1, 2.2)
export const FONT_SCALES = [1, 1.25, 1.5] as const;
export const MIN_TOUCH_TARGET_PX = 44;
