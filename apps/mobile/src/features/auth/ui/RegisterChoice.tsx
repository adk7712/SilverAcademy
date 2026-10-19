// UC #0-1 first-login choice: join as Learner or Volunteer (ADR-008).
import { View } from 'react-native';
import { findMockProfile, type RegisterAs } from '@silveracademy/shared';
import { AppText, Button, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';

interface RegisterChoiceProps {
  profileId: string;
  onChoose: (registerAs: RegisterAs) => void;
  onCancel: () => void;
}

export function RegisterChoice({ profileId, onChoose, onCancel }: RegisterChoiceProps) {
  const { spacing } = useTheme();
  const name = findMockProfile(profileId)?.name ?? '';
  return (
    <View style={{ gap: spacing.md }} testID="register-choice">
      <AppText variant="heading">{format(strings.auth.registerTitle, { name })}</AppText>
      <AppText>{strings.auth.registerIntro}</AppText>
      <AppText color="textMuted">{strings.auth.joinLearnerHint}</AppText>
      <Button
        label={strings.auth.joinLearner}
        onPress={() => onChoose('LEARNER')}
        testID="join-learner"
      />
      <AppText color="textMuted">{strings.auth.joinVolunteerHint}</AppText>
      <Button
        label={strings.auth.joinVolunteer}
        variant="secondary"
        onPress={() => onChoose('VOLUNTEER')}
        testID="join-volunteer"
      />
      <Button label={strings.auth.chooseDifferent} variant="ghost" onPress={onCancel} />
    </View>
  );
}
