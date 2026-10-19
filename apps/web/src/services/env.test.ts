import { describe, expect, it } from 'vitest';
import { readEnv } from './env';

describe('readEnv', () => {
  it('defaults to emulators and the demo project', () => {
    expect(readEnv({})).toEqual({
      useEmulators: true,
      projectId: 'demo-silveracademy',
      emulatorHost: 'localhost',
      apiKey: 'demo-api-key',
    });
  });
  it('honours explicit values', () => {
    const env = readEnv({
      VITE_USE_EMULATORS: 'false',
      VITE_FIREBASE_PROJECT_ID: 'p',
      VITE_EMULATOR_HOST: '10.0.0.2',
      VITE_FIREBASE_API_KEY: 'k',
    });
    expect(env).toEqual({
      useEmulators: false,
      projectId: 'p',
      emulatorHost: '10.0.0.2',
      apiKey: 'k',
    });
  });
});
