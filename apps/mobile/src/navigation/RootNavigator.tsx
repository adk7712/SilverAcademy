// Chooses what to show from session state: loading, login, blocked/unsupported account, or the mode's shell.
import { LoadingState, Screen } from '../design';
import { LoginScreen, SessionBlockedScreen, useSession } from '../features/auth';
import { strings } from '../i18n';
import { MainShell } from './MainShell';

export function RootNavigator() {
  const { state } = useSession();
  if (state.status === 'loading') {
    return (
      <Screen title={strings.common.appName} scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === 'signedOut') return <LoginScreen />;
  if (state.accountStatus !== 'ACTIVE') return <SessionBlockedScreen reason="blocked" />;
  if (!state.mode) return <SessionBlockedScreen reason="unsupported" />;
  return <MainShell mode={state.mode} />;
}
