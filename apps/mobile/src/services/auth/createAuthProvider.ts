// UC #0-1 factory for the AuthProvider; swap this one function when real Singpass replaces the mock.
import type { AuthProvider } from '@silveracademy/shared';
import { MockSingpassProvider } from './MockSingpassProvider';

export const createAuthProvider = (profileId: string): AuthProvider =>
  new MockSingpassProvider(profileId);
