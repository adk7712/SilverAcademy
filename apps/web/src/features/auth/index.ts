// Public API of the auth feature (cross-feature imports go through here).
export { SessionProvider, useSession } from './controller/SessionProvider';
export { useSessionGuard } from './controller/useSessionGuard';
export { decideGuard, hasAnyRole } from './controller/guards';
export type { GuardDecision } from './controller/guards';
export { LoginPage } from './ui/LoginPage';
export type { LoginResult, SessionState, SessionUser } from './types';
