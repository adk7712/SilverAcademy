// UC #0-1 tests for the mock Singpass picker data and provider.
import { MOCK_SINGPASS_PROFILES } from '@silveracademy/shared';
import { createAuthProvider } from '../../../services/auth/createAuthProvider';
import { SIMULATIONS, pickerEntries } from './loginLogic';

describe('pickerEntries', () => {
  it('lists every mock profile', () => {
    expect(pickerEntries().map((e) => e.profileId)).toEqual(
      MOCK_SINGPASS_PROFILES.map((p) => p.profileId),
    );
  });
  it('offers FAIL and DOWN simulations separately', () => {
    expect(SIMULATIONS.map((s) => s.profileId)).toEqual(['FAIL', 'DOWN']);
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
