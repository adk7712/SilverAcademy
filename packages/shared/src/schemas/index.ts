// Schemas barrel; namespaced per feature to avoid name clashes (e.g. `schemas.bookings.bookWorkshopInput`).
export * from './common';
export * as authSchemas from './auth';
export * as usersSchemas from './users';
export * as workshopsSchemas from './workshops';
export * as bookingsSchemas from './bookings';
export * as attendanceSchemas from './attendance';
export * as venuesSchemas from './venues';
export * as vouchersSchemas from './vouchers';
export * as reportsSchemas from './reports';
