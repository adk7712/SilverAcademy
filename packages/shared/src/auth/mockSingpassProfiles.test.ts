// UC #0-1 mock Singpass profile lookup.
import { MOCK_SINGPASS_PROFILES, findMockProfile } from './mockSingpassProfiles';

describe('findMockProfile', () => {
  it('finds a known profile and returns undefined otherwise', () => {
    const first = MOCK_SINGPASS_PROFILES[0]!;
    expect(findMockProfile(first.profileId)).toBe(first);
    expect(findMockProfile('nope')).toBeUndefined();
  });
});
