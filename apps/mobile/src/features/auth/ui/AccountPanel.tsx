// UC #0-1 account card for the Profile screen: name, roles, mode toggle, text size, logout.
import { View } from 'react-native';
import { FONT_SCALES } from '@silveracademy/shared';
import { AppText, Badge, Button, Card, Segmented, useTheme, type FontScale } from '../../../design';
import { format, strings } from '../../../i18n';
import { useSession } from '../controller/SessionProvider';

export function AccountPanel() {
  const { state, signOut } = useSession();
  const { fontScale, setFontScale, spacing } = useTheme();
  if (state.status !== 'signedIn') return null;

  const sizeOptions = FONT_SCALES.map((scale) => ({
    value: scale,
    label:
      strings.common.textSizeOptions[String(scale) as keyof typeof strings.common.textSizeOptions],
  }));
  return (
    <Card>
      <AppText variant="title">
        {format(strings.auth.signedInAs, { name: state.displayName })}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {state.roles.map((role) => (
          <Badge key={role} label={strings.nav.modes[role]} tone="info" />
        ))}
      </View>
      <AppText variant="bodyStrong">{strings.common.textSize}</AppText>
      <Segmented<FontScale>
        options={sizeOptions}
        value={fontScale}
        onChange={setFontScale}
        testID="text-size"
      />
      <Button
        label={strings.common.logout}
        variant="danger"
        onPress={() => void signOut()}
        testID="logout"
      />
    </Card>
  );
}
