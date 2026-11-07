// UC #0-1 Login with Singpass: one button that opens the fake Singpass screen (demo; real Singpass replaces it later).
import { useState } from 'react';
import { AppText, Button, Screen } from '../../../design';
import { strings } from '../../../i18n';
import { useLoginController } from '../controller/useLoginController';
import { DemoBanner } from './DemoBanner';
import { FakeSingpassScreen } from './FakeSingpassScreen';

export function LoginScreen() {
  const controller = useLoginController();
  const [singpassOpen, setSingpassOpen] = useState(false);

  if (singpassOpen) {
    return <FakeSingpassScreen controller={controller} onBack={() => setSingpassOpen(false)} />;
  }

  return (
    <Screen title={strings.auth.loginTitle} banner={<DemoBanner />} testID="login-screen">
      <AppText>{strings.auth.loginIntro}</AppText>
      <Button
        label={strings.auth.loginWithSingpass}
        onPress={() => setSingpassOpen(true)}
        testID="login-singpass"
      />
      <AppText variant="caption" color="textMuted">
        {strings.auth.loginDemoNote}
      </AppText>
    </Screen>
  );
}
