// UC #0-1 tests for the demo account list and the mock Singpass provider.
import { MOCK_SINGPASS_PROFILES } from '@silveracademy/shared';
import { createAuthProvider } from '../../../services/auth/createAuthProvider';
import { canLeaveWhileLoading, decideHydrateFallback, pickerEntries } from './loginLogic';

describe('pickerEntries', () => {
  it('lists the normal demo accounts and hides the edge-case and suspended profiles', () => {
    const ids = pickerEntries().map((e) => e.profileId);
    expect(ids).toEqual(['learner-35', 'senior-50', 'senior-62', 'senior-72', 'volunteer-28']);
    expect(ids).not.toContain('senior-49-edge');
    expect(ids).not.toContain('suspended-demo');
  });
  it('only lists real mock profiles', () => {
    const all = MOCK_SINGPASS_PROFILES.map((p) => p.profileId);
    for (const e of pickerEntries()) expect(all).toContain(e.profileId);
  });
});

describe('MockSingpassProvider', () => {
  it('produces a mock:<profileId> assertion and is available', async () => {
    const provider = createAuthProvider('senior-62');
    expect(provider.kind).toBe('mock-singpass');
    expect(await provider.isAvailable()).toBe(true);
    expect(await provider.authenticate()).toEqual({ assertion: 'mock:senior-62' });
  });
});

describe('canLeaveWhileLoading', () => {
  it('allows leaving during the server exchange, not once token sign-in has started', () => {
    expect(canLeaveWhileLoading('exchange')).toBe(true);
    expect(canLeaveWhileLoading('session')).toBe(false);
  });
});

describe('decideHydrateFallback', () => {
  it('signs out and fails only for the still-current attempt', () => {
    expect(decideHydrateFallback(true)).toBe('signOutAndFail');
  });
  it('ignores a stale attempt (left, reset or unmounted, e.g. the session arrived late)', () => {
    expect(decideHydrateFallback(false)).toBe('ignore');
  });
});
