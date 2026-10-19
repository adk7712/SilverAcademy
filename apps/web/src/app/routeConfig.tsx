// Single route table: drives both <Routes> and the sidebar. Pages are exported by each feature's index.ts.
import type { ReactElement } from 'react';
import type { StaffRole } from '@silveracademy/shared';
import { strings } from '../strings';
import { VenueAvailabilityPage, VenueRequestsPage } from '../features/venues';
import { AccountsPage, InstructorReviewPage } from '../features/users';
import { WorkshopsPage } from '../features/workshops';
import { IncidentQueuePage } from '../features/reports';
import { VoucherInventoryPage } from '../features/vouchers';
import { PATHS } from './paths';

export interface AppRoute {
  /** Navigation path (sidebar link target). */
  path: string;
  label: string;
  roles: readonly StaffRole[];
  element: ReactElement;
}

const PARTNER: readonly StaffRole[] = ['COMMUNITY_PARTNER'];
const ADMIN: readonly StaffRole[] = ['ADMIN'];

/** Sidebar order. Feature pages may define nested routes under their own path (mounted as `<path>/*`). */
export const APP_ROUTES: readonly AppRoute[] = [
  {
    path: PATHS.partnerAvailability,
    label: strings.nav.venueAvailability,
    roles: PARTNER,
    element: <VenueAvailabilityPage />,
  },
  {
    path: PATHS.partnerRequests,
    label: strings.nav.venueRequests,
    roles: PARTNER,
    element: <VenueRequestsPage />,
  },
  {
    path: PATHS.adminAccounts,
    label: strings.nav.accounts,
    roles: ADMIN,
    element: <AccountsPage />,
  },
  {
    path: PATHS.adminWorkshops,
    label: strings.nav.workshops,
    roles: ADMIN,
    element: <WorkshopsPage />,
  },
  {
    path: PATHS.adminIncidents,
    label: strings.nav.incidentQueue,
    roles: ADMIN,
    element: <IncidentQueuePage />,
  },
  {
    path: PATHS.adminVouchers,
    label: strings.nav.voucherInventory,
    roles: ADMIN,
    element: <VoucherInventoryPage />,
  },
  {
    path: PATHS.adminInstructorReview,
    label: strings.nav.instructorReview,
    roles: ADMIN,
    element: <InstructorReviewPage />,
  },
];

/** Routes visible to any of the given roles, in sidebar order. */
export const routesForRoles = (roles: readonly StaffRole[]): AppRoute[] =>
  APP_ROUTES.filter((r) => r.roles.some((x) => roles.includes(x)));
