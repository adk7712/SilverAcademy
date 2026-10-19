import { authMode, ignoreCheckInWindow, isEmulator, qrSecret } from './config';

describe('config', () => {
  it('detects emulators', () => {
    expect(isEmulator({ FUNCTIONS_EMULATOR: 'true' })).toBe(true);
    expect(isEmulator({ FIRESTORE_EMULATOR_HOST: 'localhost:8080' })).toBe(true);
    expect(isEmulator({})).toBe(false);
  });
  it('AUTH_MODE defaults to mock only in emulators and rejects junk', () => {
    expect(authMode({ FUNCTIONS_EMULATOR: 'true' })).toBe('mock');
    expect(authMode({})).toBe('singpass');
    expect(authMode({ AUTH_MODE: 'mock', FUNCTIONS_EMULATOR: 'true' })).toBe('mock');
    expect(() => authMode({ AUTH_MODE: 'mock' })).toThrow(/emulators/); // refused outside emulators
    expect(() => authMode({ AUTH_MODE: 'x' })).toThrow();
  });
  it('QR secret has a dev default only in emulators', () => {
    expect(qrSecret({ FUNCTIONS_EMULATOR: 'true' })).toBe('dev-only-change-me');
    expect(qrSecret({ QR_HMAC_SECRET: 's' })).toBe('s');
    expect(() => qrSecret({})).toThrow();
  });
  it('check-in window bypass is opt-in', () => {
    expect(ignoreCheckInWindow({})).toBe(false);
    const on = { DEMO_IGNORE_CHECKIN_WINDOW: 'true' };
    expect(ignoreCheckInWindow({ ...on, FUNCTIONS_EMULATOR: 'true' })).toBe(true);
    expect(ignoreCheckInWindow(on)).toBe(false); // refused outside emulators (L10)
  });
});
