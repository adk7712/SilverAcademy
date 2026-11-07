// UC #0-1 mock Singpass profile lookup.
import {
  MOCK_SINGPASS_PROFILES,
  MOCK_SUSPENDED_PROFILE_ID,
  findMockProfile,
} from './mockSingpassProfiles';

describe('findMockProfile', () => {
  it('finds a known profile and returns undefined otherwise', () => {
    const first = MOCK_SINGPASS_PROFILES[0]!;
    expect(findMockProfile(first.profileId)).toBe(first);
    expect(findMockProfile('nope')).toBeUndefined();
  });
});

describe('MOCK_SINGPASS_PROFILES', () => {
  it('has unique profile ids and subs', () => {
    const ids = MOCK_SINGPASS_PROFILES.map((p) => p.profileId);
    const subs = MOCK_SINGPASS_PROFILES.map((p) => p.sub);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(subs).size).toBe(subs.length);
  });
  it('includes the suspended demo profile', () => {
    expect(findMockProfile(MOCK_SUSPENDED_PROFILE_ID)?.profileId).toBe('suspended-demo');
  });
});
