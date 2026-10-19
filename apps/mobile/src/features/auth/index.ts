// Public API of the auth feature (cross-feature imports go through here).
export { SessionProvider, useSession } from './controller/SessionProvider';
export { LoginScreen } from './ui/LoginScreen';
export { AccountPanel } from './ui/AccountPanel';
export { ModeToggle } from './ui/ModeToggle';
export { SessionBlockedScreen } from './ui/SessionBlockedScreen';
export type { SessionApi, SessionState, ShellMode } from './types';
