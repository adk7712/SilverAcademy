// UC #0-1 Login with Singpass (mock profile picker) with failure/unavailable handling and first-login choice.
import { View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  ErrorBanner,
  ListItem,
  LoadingState,
  Screen,
  useTheme,
} from '../../../design';
import { strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { SIMULATIONS, pickerEntries } from '../controller/loginLogic';
import { useLoginController } from '../controller/useLoginController';
import { RegisterChoice } from './RegisterChoice';

export function LoginScreen() {
  const { phase, login, reset } = useLoginController();
  const { spacing } = useTheme();

  if (phase.kind === 'register') {
    return (
      <Screen title={strings.auth.loginTitle}>
        <RegisterChoice
          profileId={phase.profileId}
          onChoose={(registerAs) => void login(phase.profileId, registerAs)}
          onCancel={reset}
        />
      </Screen>
    );
  }

  return (
    <Screen title={strings.auth.loginTitle} testID="login-screen">
      <AppText>{strings.auth.loginIntro}</AppText>
      {phase.kind === 'error' ? (
        <ErrorBanner message={errorMessage(phase.error)} onDismiss={reset} testID="login-error" />
      ) : null}
      {phase.kind === 'loading' ? (
        <LoadingState label={strings.auth.loggingIn} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Card>
            <AppText variant="caption" color="textMuted">
              {strings.auth.mockNotice}
            </AppText>
          </Card>
          <AppText variant="bodyStrong">{strings.auth.pickerLabel}</AppText>
          {pickerEntries().map((entry) => (
            <ListItem
              key={entry.profileId}
              title={entry.title}
              subtitle={entry.subtitle}
              accessibilityLabel={`${entry.title}, ${entry.subtitle}`}
              onPress={() => void login(entry.profileId)}
              testID={`profile-${entry.profileId}`}
            />
          ))}
          {SIMULATIONS.map((s) => (
            <Button
              key={s.profileId}
              variant="ghost"
              label={s.label()}
              onPress={() => void login(s.profileId)}
              testID={`simulate-${s.profileId}`}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
