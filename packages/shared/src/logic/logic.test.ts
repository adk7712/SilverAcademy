// Tests for check-in window, age, ticket/QR and voucher code helpers (UC #0-1 #1-4 #5-4).
import { isCheckInWindowOpen, isFeedbackWindowOpen } from './checkIn';
import { ageInYears, isSeniorEligible } from './age';
import {
  buildQrPayload,
  formatTicketCode,
  isValidTicketCode,
  normaliseTicketCode,
  parseQrPayload,
} from './ticket';
import {
  classifyUploadRows,
  defaultPointsCost,
  isValidVoucherCode,
  maskVoucherCode,
  normaliseVoucherCode,
  voucherTierId,
} from './voucherCode';
import { MOCK_SINGPASS_PROFILES } from '../auth/mockSingpassProfiles';

describe('ageInYears calendar validation', () => {
  const now = new Date('2026-10-19T00:00:00Z');
  it.each(['1950-02-31', '1976-13-45', '1950-99-99', '0000-01-01', '1950-00-10', '2001-02-29'])(
    'rejects impossible date %s',
    (dob) => {
      expect(ageInYears(dob, now)).toBeNull();
      expect(isSeniorEligible(dob, now)).toBe(false);
    },
  );
  it('accepts real dates including leap day', () => {
    expect(ageInYears('1952-02-29', now)).toBe(74);
    expect(isSeniorEligible('1950-02-28', now)).toBe(true);
  });
});

describe('check-in and feedback windows', () => {
  const start = new Date('2026-11-01T10:00:00Z');
  const end = new Date('2026-11-01T12:00:00Z');
  it('opens 60 min before start, closes 30 min after end, inclusive', () => {
    expect(isCheckInWindowOpen(start, end, new Date('2026-11-01T08:59:59Z'))).toBe(false);
    expect(isCheckInWindowOpen(start, end, new Date('2026-11-01T09:00:00Z'))).toBe(true);
    expect(isCheckInWindowOpen(start, end, new Date('2026-11-01T12:30:00Z'))).toBe(true);
    expect(isCheckInWindowOpen(start, end, new Date('2026-11-01T12:30:01Z'))).toBe(false);
    expect(isCheckInWindowOpen(start.getTime(), end.getTime(), start.getTime())).toBe(true);
  });
  it('feedback window is 7 days after end', () => {
    expect(isFeedbackWindowOpen(end, new Date('2026-11-08T12:00:00Z'))).toBe(true);
    expect(isFeedbackWindowOpen(end, new Date('2026-11-08T12:00:01Z'))).toBe(false);
  });
});

describe('age', () => {
  const now = new Date('2026-10-19T00:00:00Z');
  it('computes full years on birthday boundaries (SG time)', () => {
    expect(ageInYears('1976-10-19', now)).toBe(50);
    expect(ageInYears('1976-10-20', now)).toBe(49);
    expect(ageInYears('not-a-date', now)).toBeNull();
    expect(ageInYears('2030-01-01', now)).toBeNull();
    // 16:30 UTC on 18 Oct is already 19 Oct in Singapore
    expect(ageInYears('1976-10-19', new Date('2026-10-18T16:30:00Z'))).toBe(50);
  });
  it('mock profiles match their labelled eligibility', () => {
    const elig = (id: string) => {
      const p = MOCK_SINGPASS_PROFILES.find((x) => x.profileId === id);
      return p ? isSeniorEligible(p.dateOfBirth, now) : null;
    };
    expect(elig('learner-35')).toBe(false);
    expect(elig('senior-49-edge')).toBe(false);
    expect(elig('senior-50')).toBe(true);
    expect(elig('senior-62')).toBe(true);
    expect(elig('senior-72')).toBe(true);
    expect(elig('volunteer-28')).toBe(false);
    expect(
      ageInYears(
        MOCK_SINGPASS_PROFILES.find((p) => p.profileId === 'senior-72')?.dateOfBirth ?? '',
        now,
      ),
    ).toBe(72);
  });
});

describe('ticket and QR', () => {
  const sig = 'A'.repeat(22);
  it('parseQrPayload accepts the format and rejects tampering', () => {
    expect(parseQrPayload(`SA1.w1_u1.${sig}`)).toEqual({ bookingId: 'w1_u1', signature: sig });
    expect(parseQrPayload(` SA1.w1_u1.${sig} `)?.bookingId).toBe('w1_u1');
    expect(parseQrPayload(`SA1.ws-01_sp_ab.${sig}`)?.bookingId).toBe('ws-01_sp_ab');
    expect(parseQrPayload(`SA2.w1_u1.${sig}`)).toBeNull();
    expect(parseQrPayload(`SA1.w1_u1.${sig}x`)).toBeNull();
    expect(parseQrPayload(`SA1..${sig}`)).toBeNull();
    expect(parseQrPayload('https://example.com')).toBeNull();
    expect(parseQrPayload(`SA1.${'a'.repeat(129)}.${sig}`)).toBeNull();
  });
  it('buildQrPayload round trips', () => {
    expect(parseQrPayload(buildQrPayload('b1', sig))?.bookingId).toBe('b1');
  });
  it('normaliseTicketCode follows Crockford rules', () => {
    expect(normaliseTicketCode('ab0o-1il2')).toBe('AB001112');
    expect(normaliseTicketCode(' abcd 1234 ')).toBe('ABCD1234');
  });
  it('validates and formats', () => {
    expect(isValidTicketCode('abcd-1234')).toBe(true);
    expect(isValidTicketCode('ABCD123')).toBe(false);
    expect(isValidTicketCode('ABCD123U')).toBe(false); // U not in alphabet
    expect(formatTicketCode('abcd1234')).toBe('ABCD-1234');
  });
});

describe('voucher codes', () => {
  it('normalise, validate, mask', () => {
    expect(normaliseVoucherCode('  ab12-cd34 ')).toBe('AB12-CD34');
    expect(isValidVoucherCode('ab12-cd34')).toBe(true);
    expect(isValidVoucherCode('short')).toBe(false);
    expect(isValidVoucherCode('has space 123')).toBe(false);
    expect(maskVoucherCode('ab12-cd34')).toBe('****CD34');
  });
  it('tier id and points cost', () => {
    expect(voucherTierId('NTUC', 10)).toBe('NTUC_10');
    expect(defaultPointsCost(10)).toBe(20);
  });
  it('classifyUploadRows applies the documented check order', () => {
    const tiers = new Set(['NTUC_10']);
    const rows = [
      { provider: 'NTUC', denomination: 10, code: 'abcd-1111' },
      { provider: 'NTUC', denomination: 10, code: 'ABCD-1111' }, // dup after normalise
      { provider: 'NTUC', denomination: 10, code: 'bad' },
      { provider: 'NTUC', denomination: 20, code: 'ABCD-2222' }, // unknown tier
      { provider: 'NTUC', denomination: 10, code: 'ABCD-3333' },
    ];
    const v = classifyUploadRows(rows, tiers);
    expect(v.map((x) => x.reason)).toEqual([
      undefined,
      'DUPLICATE_IN_FILE',
      'INVALID_FORMAT',
      'UNKNOWN_TIER',
      undefined,
    ]);
    expect(v.map((x) => x.row)).toEqual([1, 2, 3, 4, 5]);
    expect(v[0]?.normalisedCode).toBe('ABCD-1111');
  });
});
