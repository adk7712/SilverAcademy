import { createHmac } from 'node:crypto';
import { parseQrPayload } from '@silveracademy/shared';
import { signQr, verifyQr } from './qrSigner';

const SECRET = 'test-secret';

describe('qrSigner', () => {
  it('round-trips and produces a payload the shared parser accepts', () => {
    const payload = signQr('ws-01_u1', SECRET);
    expect(parseQrPayload(payload)?.bookingId).toBe('ws-01_u1');
    expect(verifyQr(payload, SECRET)).toBe('ws-01_u1');
  });
  it('matches the documented derivation (HMAC-SHA256 of "SA1.<id>", base64url, 22 chars)', () => {
    const sig = createHmac('sha256', SECRET).update('SA1.b1').digest('base64url').slice(0, 22);
    expect(signQr('b1', SECRET)).toBe(`SA1.b1.${sig}`);
  });
  it('rejects tampering, a wrong key and malformed text with INVALID_QR', () => {
    const payload = signQr('b1', SECRET);
    const tampered = payload.replace('.b1.', '.b2.');
    for (const bad of [
      tampered,
      'garbage',
      '',
      payload.slice(0, -1) + (payload.endsWith('A') ? 'B' : 'A'),
    ]) {
      expect(() => verifyQr(bad, SECRET)).toThrow(expect.objectContaining({ code: 'INVALID_QR' }));
    }
    expect(() => verifyQr(payload, 'other-secret')).toThrow(
      expect.objectContaining({ code: 'INVALID_QR' }),
    );
  });
});
