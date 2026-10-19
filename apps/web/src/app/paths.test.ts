import { describe, expect, it } from 'vitest';
import { PATHS, homePathFor, resolveLanding } from './paths';

describe('homePathFor', () => {
  it('routes by role, ADMIN first', () => {
    expect(homePathFor(['ADMIN'])).toBe(PATHS.adminAccounts);
    expect(homePathFor(['COMMUNITY_PARTNER'])).toBe(PATHS.partnerAvailability);
    expect(homePathFor(['COMMUNITY_PARTNER', 'ADMIN'])).toBe(PATHS.adminAccounts);
    expect(homePathFor([])).toBe(PATHS.login);
  });
});

describe('resolveLanding', () => {
  const adminPaths = [PATHS.adminAccounts, PATHS.adminWorkshops];
  it('returns to the requested page when the role may open it (incl. nested)', () => {
    expect(resolveLanding(['ADMIN'], PATHS.adminWorkshops, adminPaths)).toBe(PATHS.adminWorkshops);
    expect(resolveLanding(['ADMIN'], `${PATHS.adminAccounts}/u1`, adminPaths)).toBe(
      `${PATHS.adminAccounts}/u1`,
    );
  });
  it('falls back to home otherwise', () => {
    expect(resolveLanding(['ADMIN'], PATHS.partnerRequests, adminPaths)).toBe(PATHS.adminAccounts);
    expect(resolveLanding(['ADMIN'], undefined, adminPaths)).toBe(PATHS.adminAccounts);
    expect(resolveLanding(['ADMIN'], '/admin/accountsX', adminPaths)).toBe(PATHS.adminAccounts);
  });
});
