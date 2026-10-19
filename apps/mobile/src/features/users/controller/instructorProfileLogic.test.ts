// UC #1-2 tests for the Instructor profile form rules.
import {
  canSubmitProfile,
  isProfileApproved,
  toggleExpertise,
  validateProfileForm,
} from './instructorProfileLogic';

describe('validateProfileForm', () => {
  it('flags every missing field', () => {
    const r = validateProfileForm({ bio: ' ', expertise: [], experienceYears: '' });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual(['bio', 'experienceYears', 'expertise']);
  });
  it('rejects fractional and negative years', () => {
    for (const y of ['2.5', '-1', 'abc']) {
      const r = validateProfileForm({ bio: 'x', expertise: ['MUSIC'], experienceYears: y });
      expect(r.ok).toBe(false);
    }
  });
  it('builds the callable input', () => {
    const r = validateProfileForm({
      bio: ' Teacher ',
      expertise: ['MUSIC'],
      experienceYears: '12',
    });
    expect(r).toEqual({
      ok: true,
      input: { bio: 'Teacher', expertise: ['MUSIC'], experienceYears: 12 },
    });
  });
});

describe('profile gating', () => {
  it('allows submit when none, rejected or revision only', () => {
    expect([null, 'REJECTED', 'REQUIRES_REVISION'].every((s) => canSubmitProfile(s as never))).toBe(
      true,
    );
    expect(canSubmitProfile('PENDING')).toBe(false);
    expect(canSubmitProfile('APPROVED')).toBe(false);
  });
  it('only APPROVED unlocks workshops', () => {
    expect(isProfileApproved('APPROVED')).toBe(true);
    expect(isProfileApproved('PENDING')).toBe(false);
    expect(isProfileApproved(null)).toBe(false);
  });
  it('toggles expertise', () => {
    expect(toggleExpertise([], 'MUSIC')).toEqual(['MUSIC']);
    expect(toggleExpertise(['MUSIC'], 'MUSIC')).toEqual([]);
  });
});
