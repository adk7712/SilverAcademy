import { buildAuditEntry } from './audit';
import { buildNotification } from './notify';

describe('buildAuditEntry', () => {
  it('omits absent optional fields and truncates long strings', () => {
    const e = buildAuditEntry({
      actorId: null,
      actorRole: null,
      action: 'STAFF_LOGIN',
      outcome: 'FAILURE',
      details: { userId: 'x'.repeat(500), n: 1, ok: true },
    });
    expect(e).not.toHaveProperty('targetType');
    expect((e.details.userId as string).length).toBe(200);
    expect(e.details).toMatchObject({ n: 1, ok: true });
  });
  it('keeps target fields when given', () => {
    expect(
      buildAuditEntry({
        actorId: 'a',
        actorRole: 'ADMIN',
        action: 'VOUCHER_REDEEM',
        outcome: 'SUCCESS',
        targetType: 'VOUCHER',
        targetId: 'v',
      }),
    ).toMatchObject({ targetType: 'VOUCHER', targetId: 'v', details: {} });
  });
});

describe('buildNotification', () => {
  it('starts unread and only includes refPath when given', () => {
    expect(
      buildNotification({ userId: 'u', type: 'BOOKING_CONFIRMED', title: 't', body: 'b' }),
    ).toEqual({
      userId: 'u',
      type: 'BOOKING_CONFIRMED',
      title: 't',
      body: 'b',
      read: false,
    });
    expect(
      buildNotification({
        userId: 'u',
        type: 'BOOKING_CONFIRMED',
        title: 't',
        body: 'b',
        refPath: 'workshops/w',
      }),
    ).toHaveProperty('refPath', 'workshops/w');
  });
});
