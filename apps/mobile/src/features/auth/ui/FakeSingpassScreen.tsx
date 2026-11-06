// UC #0-1 fake Singpass screen: app/QR and ID + password tabs, fake approval step, errors, first-login choice.
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import {
  AppText,
  Button,
  ErrorBanner,
  LoadingState,
  Screen,
  Segmented,
  useTheme,
  type SegmentOption,
} from '../../../design';
import { strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { canLeaveWhileLoading } from '../controller/loginLogic';
import { useFakeSingpassFlow } from '../controller/useFakeSingpassFlow';
import type { useLoginController } from '../controller/useLoginController';
import { DemoBanner } from './DemoBanner';
import { DemoTools } from './DemoTools';
import { RegisterChoice } from './RegisterChoice';
import { SingpassIdTab } from './SingpassIdTab';
import { SingpassQrTab } from './SingpassQrTab';

type Tab = 'app' | 'id';

const TABS: readonly SegmentOption<Tab>[] = [
  { value: 'app', label: strings.auth.tabApp, testID: 'singpass-tab-app' },
  { value: 'id', label: strings.auth.tabId, testID: 'singpass-tab-id' },
];

interface FakeSingpassScreenProps {
  controller: ReturnType<typeof useLoginController>;
  onBack: () => void;
}

export function FakeSingpassScreen({ controller, onBack }: FakeSingpassScreenProps) {
  const { spacing } = useTheme();
  const flow = useFakeSingpassFlow(controller);
  const [tab, setTab] = useState<Tab>('app');
  const { state } = flow;
  const signingIn = state.kind === 'signingIn';
  const locked = state.kind === 'signingIn' && !canLeaveWhileLoading(state.stage);

  /** Every way out cancels the attempt and resets the controller, so reopening never shows a stale result. */
  const leave = () => {
    flow.cancel();
    onBack();
  };

  // Android hardware back: same as the Back button; swallowed only once token sign-in has started. No-op on web.
  const backRef = useRef<() => void>(() => undefined);
  backRef.current = () => {
    if (!locked) leave();
  };
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Screen
      title={strings.auth.singpassScreenTitle}
      banner={<DemoBanner />}
      onBack={locked ? undefined : leave}
      testID="fake-singpass-screen"
    >
      {state.kind === 'register' ? (
        <RegisterChoice
          profileId={state.profileId}
          onChoose={(registerAs) => flow.register(state.profileId, registerAs)}
          onCancel={flow.dismissError}
        />
      ) : state.kind === 'approving' ? (
        <View style={{ gap: spacing.md }} testID="singpass-approving">
          <AppText variant="heading">{strings.auth.approveTitle}</AppText>
          <AppText>{strings.auth.approveBody}</AppText>
          <LoadingState label={strings.auth.approveTitle} />
          <Button
            variant="secondary"
            label={strings.auth.cancel}
            onPress={flow.cancel}
            testID="approve-cancel"
          />
        </View>
      ) : signingIn ? (
        <LoadingState label={strings.auth.loggingIn} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {state.kind === 'error' ? (
            <ErrorBanner
              message={errorMessage(state.error)}
              onDismiss={flow.dismissError}
              testID="login-error"
            />
          ) : null}
          <Segmented options={TABS} value={tab} onChange={setTab} testID="singpass-tabs" />
          {tab === 'app' ? (
            <SingpassQrTab onScan={(profileId) => flow.begin(profileId)} />
          ) : (
            <SingpassIdTab onSubmit={(profileId) => flow.begin(profileId)} />
          )}
          <DemoTools onSimulate={(profileId) => flow.begin(profileId, true)} />
        </View>
      )}
    </Screen>
  );
}
