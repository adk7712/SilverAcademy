// English string catalogue: one file per area so parallel agents never edit the same file. Cross-cutting.
import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { workshops } from './workshops';
import { bookings } from './bookings';
import { workshopsLearner } from './workshopsLearner';
import { bookingsLearner } from './bookingsLearner';
import { attendance } from './attendance';
import { attendanceScan } from './attendanceScan';
import { bookingsRoster } from './bookingsRoster';
import { vouchers } from './vouchers';
import { users } from './users';
import { venues } from './venues';
import { reports } from './reports';
import { workshopsVolunteer } from './workshopsVolunteer';
import { usersProfile } from './usersProfile';
import { workshopsInstructor } from './workshopsInstructor';
import { venuesInstructor } from './venuesInstructor';
import { usersInstructor } from './usersInstructor';
import { errorStrings, clientErrorStrings } from './errors';

export const en = {
  common,
  nav,
  auth,
  workshops,
  bookings,
  workshopsLearner,
  bookingsLearner,
  attendance,
  attendanceScan,
  bookingsRoster,
  vouchers,
  users,
  venues,
  reports,
  workshopsVolunteer,
  usersProfile,
  workshopsInstructor,
  venuesInstructor,
  usersInstructor,
  errors: errorStrings,
  clientErrors: clientErrorStrings,
} as const;

export type Strings = typeof en;
