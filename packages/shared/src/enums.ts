// Enums as const arrays + union types (architecture.md 2.1). Used by every feature module.
// Arrays feed z.enum() in schemas/, so the type and the runtime check cannot drift.
const def = <const T extends readonly string[]>(values: T) => values;

export const ROLES = def([
  'LEARNER',
  'SENIOR_INSTRUCTOR',
  'VOLUNTEER',
  'COMMUNITY_PARTNER',
  'ADMIN',
]);
export type Role = (typeof ROLES)[number];
/** UI-only active mode (ADR-008); same values as Role. */
export const APP_MODES = ROLES;
export type AppMode = Role;
/** Roles an end user can self-register as via Singpass (#0-1). */
export const REGISTER_AS = def(['LEARNER', 'VOLUNTEER']);
export type RegisterAs = (typeof REGISTER_AS)[number];
/** Roles that sign in with staff credentials (#0-2). */
export const STAFF_ROLES = def(['COMMUNITY_PARTNER', 'ADMIN']);
export type StaffRole = (typeof STAFF_ROLES)[number];
export const ATTENDANCE_STAFF_ROLES = def(['SENIOR_INSTRUCTOR', 'VOLUNTEER']);
export type AttendanceStaffRole = (typeof ATTENDANCE_STAFF_ROLES)[number];

export const ACCOUNT_STATUSES = def(['ACTIVE', 'SUSPENDED', 'INACTIVE']);
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const AUTH_TYPES = def(['SINGPASS', 'STAFF']);
export type AuthType = (typeof AUTH_TYPES)[number];
export const STAFF_LOGIN_OUTCOMES = def(['SUCCESS', 'FAILURE', 'BLOCKED']);
export type StaffLoginOutcome = (typeof STAFF_LOGIN_OUTCOMES)[number];
export const ACCOUNT_ACTIONS = def(['FLAG', 'UNFLAG', 'SUSPEND', 'REACTIVATE']);
export type AccountAction = (typeof ACCOUNT_ACTIONS)[number];

export const INSTRUCTOR_PROFILE_STATUSES = def([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REQUIRES_REVISION',
]);
export type InstructorProfileStatus = (typeof INSTRUCTOR_PROFILE_STATUSES)[number];
/** Statuses a review can produce: every profile status except PENDING. */
export const INSTRUCTOR_REVIEW_RESULT_STATUSES = def([
  'APPROVED',
  'REJECTED',
  'REQUIRES_REVISION',
] as const satisfies readonly InstructorProfileStatus[]);
export const INSTRUCTOR_REVIEW_DECISIONS = def(['APPROVE', 'REJECT', 'REQUEST_REVISION']);
export type InstructorReviewDecision = (typeof INSTRUCTOR_REVIEW_DECISIONS)[number];

export const WORKSHOP_STATUSES = def([
  'DRAFT',
  'PENDING_VENUE',
  'OPEN',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];
/** Admin status actions; UNARCHIVE restores statusBeforeArchive. */
export const WORKSHOP_ADMIN_ACTIONS = def(['ARCHIVED', 'UNARCHIVE', 'COMPLETED', 'CANCELLED']);
export type WorkshopAdminAction = (typeof WORKSHOP_ADMIN_ACTIONS)[number];
export const WORKSHOP_CATEGORIES = def([
  'ARTS_CRAFTS',
  'COOKING',
  'DIGITAL_SKILLS',
  'FITNESS_WELLNESS',
  'GARDENING',
  'LANGUAGES',
  'MUSIC',
  'OTHER',
]);
export type WorkshopCategory = (typeof WORKSHOP_CATEGORIES)[number];

export const SLOT_STATUSES = def(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'BOOKED']);
export type SlotStatus = (typeof SLOT_STATUSES)[number];
/** Statuses a CP may set; BOOKED is only set by approval (arch 4.6). */
export const SLOT_EDITABLE_STATUSES = def(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE']);
export type SlotEditableStatus = (typeof SLOT_EDITABLE_STATUSES)[number];
export const VENUE_REQUEST_STATUSES = def([
  'PENDING',
  'AWAITING_INFO',
  'APPROVED',
  'REJECTED',
  'CONFLICTED',
  'WITHDRAWN',
]);
export type VenueRequestStatus = (typeof VENUE_REQUEST_STATUSES)[number];
export const VENUE_DECISIONS = def(['APPROVE', 'REJECT', 'REQUEST_INFO']);
export type VenueDecision = (typeof VENUE_DECISIONS)[number];

/** CONFIRMED == spec "Registered". */
export const BOOKING_STATUSES = def(['CONFIRMED', 'ATTENDED', 'CANCELLED']);
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const ATTENDANCE_METHODS = def(['QR', 'MANUAL']);
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];
export const VOLUNTEER_ASSIGNMENT_STATUSES = def(['ASSIGNED', 'WITHDRAWN']);
export type VolunteerAssignmentStatus = (typeof VOLUNTEER_ASSIGNMENT_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = def(['EARN_ATTENDANCE', 'REDEEM_VOUCHER', 'ADJUSTMENT']);
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
/** AVAILABLE == spec "Unclaimed". */
export const VOUCHER_STATUSES = def(['AVAILABLE', 'CLAIMED', 'INVALID', 'REMOVED']);
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];
export const VOUCHER_ADMIN_STATUSES = def(['INVALID', 'REMOVED']);
export type VoucherAdminStatus = (typeof VOUCHER_ADMIN_STATUSES)[number];
export const UPLOAD_REJECT_REASONS = def([
  'INVALID_FORMAT',
  'DUPLICATE_IN_FILE',
  'DUPLICATE_EXISTING',
  'UNKNOWN_TIER',
]);
export type UploadRejectReason = (typeof UPLOAD_REJECT_REASONS)[number];

export const INCIDENT_CATEGORIES = def(['WORKSHOP', 'USER_BEHAVIOUR', 'VENUE_SAFETY', 'SOFTWARE']);
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export const INCIDENT_STATUSES = def([
  'SUBMITTED',
  'UNDER_REVIEW',
  'AWAITING_INFO',
  'RESOLVED',
  'CLOSED',
]);
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export const REPORTER_ROLES = def(['LEARNER', 'SENIOR_INSTRUCTOR', 'VOLUNTEER']);
export type ReporterRole = (typeof REPORTER_ROLES)[number];

export const NOTIFICATION_TYPES = def([
  'VENUE_REQUEST_DECIDED',
  'VENUE_REQUEST_INFO',
  'VENUE_REQUEST_CONFLICTED',
  'VENUE_REQUEST_NEW',
  'BOOKING_CONFIRMED',
  'WORKSHOP_CANCELLED',
  'PROFILE_REVIEWED',
  'INCIDENT_UPDATED',
  'ACCOUNT_STATUS_CHANGED',
]);
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const AUDIT_OUTCOMES = def(['SUCCESS', 'FAILURE', 'DENIED']);
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
export const AUDIT_ACTIONS = def([
  'STAFF_LOGIN',
  'ACCOUNT_FLAG',
  'ACCOUNT_UNFLAG',
  'ACCOUNT_SUSPEND',
  'ACCOUNT_REACTIVATE',
  'STAFF_ACCOUNT_CREATE',
  'INSTRUCTOR_REVIEW',
  'WORKSHOP_ADMIN_EDIT',
  'WORKSHOP_STATUS_CHANGE',
  'INCIDENT_UPDATE',
  'VOUCHER_UPLOAD',
  'VOUCHER_STATUS_CHANGE',
  'VOUCHER_REDEEM',
  'VOUCHER_TIER_UPSERT',
  'ATTENDANCE_RECORD',
  'PERMISSION_DENIED',
]);
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_TARGET_TYPES = def([
  'USER',
  'WORKSHOP',
  'INCIDENT',
  'VOUCHER',
  'VOUCHER_TIER',
  'VOUCHER_UPLOAD',
  'INSTRUCTOR_PROFILE',
]);
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
