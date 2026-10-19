// Route paths and role->home mapping (pure). The route table is app/routeConfig.tsx.
import type { StaffRole } from '@silveracademy/shared';

export const PATHS = {
  login: '/login',
  partnerAvailability: '/partner/availability',
  partnerRequests: '/partner/requests',
  adminAccounts: '/admin/accounts',
  adminWorkshops: '/admin/workshops',
  adminIncidents: '/admin/incidents',
  adminVouchers: '/admin/vouchers',
  adminInstructorReview: '/admin/instructor-review',
} as const;

const HOME_BY_ROLE: Record<StaffRole, string> = {
  ADMIN: PATHS.adminAccounts,
  COMMUNITY_PARTNER: PATHS.partnerAvailability,
};

/** Landing page after login; ADMIN wins when an account holds both staff roles. */
export function homePathFor(roles: readonly StaffRole[]): string {
  if (roles.includes('ADMIN')) return HOME_BY_ROLE.ADMIN;
  if (roles.includes('COMMUNITY_PARTNER')) return HOME_BY_ROLE.COMMUNITY_PARTNER;
  return PATHS.login;
}

/** Where to go after login: the page the user was sent away from, if their role may open it, else home. */
export function resolveLanding(
  roles: readonly StaffRole[],
  from: string | undefined,
  accessiblePaths: readonly string[],
): string {
  const allowed = from && accessiblePaths.some((p) => from === p || from.startsWith(`${p}/`));
  return allowed && from ? from : homePathFor(roles);
}
