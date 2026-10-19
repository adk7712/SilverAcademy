// Callable registry: name -> { input, output } zod schemas and inferred types (functions.md). All UCs.
import type { z } from 'zod';
import * as auth from './schemas/auth';
import * as users from './schemas/users';
import * as workshops from './schemas/workshops';
import * as bookings from './schemas/bookings';
import * as attendance from './schemas/attendance';
import * as venues from './schemas/venues';
import * as vouchers from './schemas/vouchers';
import * as reports from './schemas/reports';

/** Deployed name is `<feature>-<name>`. */
export const CALLABLES = {
  'auth-exchangeSingpass': {
    input: auth.exchangeSingpassInput,
    output: auth.exchangeSingpassOutput,
  },
  'auth-recordStaffLogin': {
    input: auth.recordStaffLoginInput,
    output: auth.recordStaffLoginOutput,
  },

  'users-updatePreferences': {
    input: users.updatePreferencesInput,
    output: users.updatePreferencesOutput,
  },
  'users-submitInstructorProfile': {
    input: users.submitInstructorProfileInput,
    output: users.submitInstructorProfileOutput,
  },
  'users-reviewInstructorProfile': {
    input: users.reviewInstructorProfileInput,
    output: users.reviewInstructorProfileOutput,
  },
  'users-setAccountStatus': {
    input: users.setAccountStatusInput,
    output: users.setAccountStatusOutput,
  },
  'users-createStaffAccount': {
    input: users.createStaffAccountInput,
    output: users.createStaffAccountOutput,
  },
  'users-markNotificationRead': {
    input: users.markNotificationReadInput,
    output: users.markNotificationReadOutput,
  },

  'workshops-createWorkshop': {
    input: workshops.createWorkshopInput,
    output: workshops.createWorkshopOutput,
  },
  'workshops-updateWorkshop': {
    input: workshops.updateWorkshopInput,
    output: workshops.updateWorkshopOutput,
  },
  'workshops-adminUpdateWorkshop': {
    input: workshops.adminUpdateWorkshopInput,
    output: workshops.adminUpdateWorkshopOutput,
  },
  'workshops-adminSetStatus': {
    input: workshops.adminSetStatusInput,
    output: workshops.adminSetStatusOutput,
  },
  'workshops-optInVolunteer': {
    input: workshops.optInVolunteerInput,
    output: workshops.optInVolunteerOutput,
  },
  'workshops-withdrawVolunteer': {
    input: workshops.withdrawVolunteerInput,
    output: workshops.withdrawVolunteerOutput,
  },
  'workshops-submitFeedback': {
    input: workshops.submitFeedbackInput,
    output: workshops.submitFeedbackOutput,
  },

  'bookings-bookWorkshop': {
    input: bookings.bookWorkshopInput,
    output: bookings.bookWorkshopOutput,
  },
  'bookings-getRoster': { input: bookings.getRosterInput, output: bookings.getRosterOutput },

  'attendance-recordAttendance': {
    input: attendance.recordAttendanceInput,
    output: attendance.recordAttendanceOutput,
  },

  'venues-upsertFacility': {
    input: venues.upsertFacilityInput,
    output: venues.upsertFacilityOutput,
  },
  'venues-upsertSlot': { input: venues.upsertSlotInput, output: venues.upsertSlotOutput },
  'venues-deleteSlot': { input: venues.deleteSlotInput, output: venues.deleteSlotOutput },
  'venues-requestVenue': { input: venues.requestVenueInput, output: venues.requestVenueOutput },
  'venues-decideVenueRequest': {
    input: venues.decideVenueRequestInput,
    output: venues.decideVenueRequestOutput,
  },
  'venues-respondToInfoRequest': {
    input: venues.respondToInfoRequestInput,
    output: venues.respondToInfoRequestOutput,
  },
  'venues-withdrawVenueRequest': {
    input: venues.withdrawVenueRequestInput,
    output: venues.withdrawVenueRequestOutput,
  },

  'vouchers-redeemVoucher': {
    input: vouchers.redeemVoucherInput,
    output: vouchers.redeemVoucherOutput,
  },
  'vouchers-listMyVouchers': {
    input: vouchers.listMyVouchersInput,
    output: vouchers.listMyVouchersOutput,
  },
  'vouchers-upsertTier': { input: vouchers.upsertTierInput, output: vouchers.upsertTierOutput },
  'vouchers-uploadVouchers': {
    input: vouchers.uploadVouchersInput,
    output: vouchers.uploadVouchersOutput,
  },
  'vouchers-setVoucherStatus': {
    input: vouchers.setVoucherStatusInput,
    output: vouchers.setVoucherStatusOutput,
  },
  'vouchers-listInventory': {
    input: vouchers.listInventoryInput,
    output: vouchers.listInventoryOutput,
  },

  'reports-submitReport': { input: reports.submitReportInput, output: reports.submitReportOutput },
  'reports-updateIncident': {
    input: reports.updateIncidentInput,
    output: reports.updateIncidentOutput,
  },
} as const;

export type CallableName = keyof typeof CALLABLES;
export type CallableInput<N extends CallableName> = z.input<(typeof CALLABLES)[N]['input']>;
export type CallableOutput<N extends CallableName> = z.output<(typeof CALLABLES)[N]['output']>;
export const CALLABLE_NAMES = Object.keys(CALLABLES) as CallableName[];
