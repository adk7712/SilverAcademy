// English user-facing text for every AppErrorCode (architecture.md 6). Never show raw Firebase messages.
import type { AppErrorCode } from '@silveracademy/shared';

export const errorStrings: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: 'Please log in to continue.',
  PERMISSION_DENIED: 'You do not have permission to do this.',
  ACCOUNT_SUSPENDED: 'Your account is suspended. Please contact the SilverAcademy team.',
  INVALID_INPUT: 'Some details are missing or incorrect. Please check and try again.',
  NOT_FOUND: 'We could not find what you were looking for.',
  STALE_VERSION: 'This item was changed by someone else. Please reload and try again.',
  INVALID_TRANSITION: 'This change is not allowed right now.',
  REASON_REQUIRED: 'Please give a reason.',
  BUSY_TRY_AGAIN: 'The service is busy. Please try again in a moment.',
  INTERNAL: 'Something went wrong. Please try again.',

  SINGPASS_AUTH_FAILED: 'Singpass login failed. Please try again.',
  SINGPASS_UNAVAILABLE: 'Singpass is not available right now. Please try again later.',
  PROFILE_UNAVAILABLE: 'We could not read your Singpass profile. Please try again later.',
  REGISTRATION_REQUIRED: 'Please choose how you would like to join.',
  NOT_STAFF_ACCOUNT: 'This account cannot use staff login.',

  NOT_SENIOR_ELIGIBLE: 'Only users aged 50 and above can be Senior Instructors.',
  PROFILE_NOT_APPROVED: 'Your Instructor profile has not been approved yet.',
  PROFILE_ALREADY_APPROVED: 'Your Instructor profile is already approved.',
  NOT_PENDING: 'This item is no longer waiting for review.',
  CANNOT_TARGET_ADMIN: 'This action cannot be done on an administrator account.',
  USER_ID_TAKEN: 'That user ID is already in use.',

  WORKSHOP_NOT_EDITABLE: 'This workshop can no longer be edited.',
  CAPACITY_BELOW_BOOKINGS: 'Capacity cannot be lower than the number of bookings.',
  ACTIVE_BOOKINGS_CONFIRM_REQUIRED: 'This workshop has bookings. Please confirm to continue.',
  WORKSHOP_LOCKED_FIELDS: 'Some fields cannot be changed once a workshop has bookings.',

  WORKSHOP_NOT_OPEN: 'This workshop is not open for booking.',
  WORKSHOP_STARTED: 'This workshop has already started.',
  WORKSHOP_FULL: 'Sorry, this workshop is full.',
  ALREADY_BOOKED: 'You have already booked this workshop.',
  CANNOT_BOOK_OWN_WORKSHOP: 'You cannot book your own workshop.',

  INVALID_QR: 'This is not a valid SilverAcademy ticket.',
  TICKET_NOT_FOUND: 'We could not find a ticket with that code.',
  WRONG_WORKSHOP: 'This ticket is for a different workshop.',
  NO_BOOKING: 'There is no active booking for this ticket.',
  ALREADY_ATTENDED: 'This ticket has already been checked in.',
  NOT_AUTHORISED_FOR_WORKSHOP: 'You are not allowed to check in learners for this workshop.',
  SESSION_NOT_ACTIVE: 'Check-in is not open for this workshop right now.',

  NOT_ACCEPTING_VOLUNTEERS: 'This workshop is not looking for volunteers.',
  VOLUNTEERS_FULL: 'All volunteer places for this workshop are taken.',
  ALREADY_OPTED_IN: 'You have already signed up to help with this workshop.',
  NOT_ASSIGNED: 'You are not assigned to this workshop.',

  NOT_ATTENDED: 'You can only give feedback on workshops you attended.',
  FEEDBACK_WINDOW_CLOSED: 'The time to give feedback for this workshop has passed.',
  ALREADY_SUBMITTED: 'You have already submitted this.',

  SLOT_UNAVAILABLE: 'This time slot is not available.',
  SLOT_CONFLICT: 'This time slot is already taken.',
  SLOT_BOOKED_LOCKED: 'This time slot is booked and cannot be changed.',
  SLOT_OVERLAP: 'This time overlaps with another slot.',
  INVALID_TIME_RANGE: 'The end time must be after the start time.',
  SLOT_IN_PAST: 'This time slot is in the past.',
  VENUE_REQUEST_EXISTS: 'A venue request already exists for this workshop.',
  VENUE_TOO_SMALL: 'This venue is too small for your workshop.',
  REQUEST_NOT_PENDING: 'This request has already been handled.',
  NOT_FACILITY_OWNER: 'You do not manage this venue.',
  LOCATION_OUT_OF_BOUNDS: 'That location is outside Singapore.',
  MAP_UNAVAILABLE: 'The map is not available right now. You can use the list view instead.',

  TIER_NOT_FOUND: 'That voucher option is no longer available.',
  INSUFFICIENT_POINTS: 'You do not have enough points for this voucher.',
  OUT_OF_STOCK: 'Sorry, this voucher is out of stock.',
  UPLOAD_TOO_LARGE: 'The file has too many rows.',
  VOUCHER_NOT_AVAILABLE: 'This voucher is not available.',

  ATTACHMENT_INVALID: 'This attachment is not allowed. Use a JPG, PNG or PDF under 5 MB.',
  INCIDENT_CLOSED: 'This report is closed.',
};

/** Client-only failures that have no server AppErrorCode (see ERROR_REASON). */
export const clientErrorStrings = {
  network: 'You seem to be offline. Please check your connection and try again.',
} as const;
