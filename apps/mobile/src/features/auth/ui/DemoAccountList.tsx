// UC #0-1 list of seed demo accounts for the fake Singpass screen (tap to fill the ID, or to pretend-scan).
import { View } from 'react-native';
import { AppText, ListItem, useTheme } from '../../../design';
import { strings } from '../../../i18n';
import { pickerEntries } from '../controller/loginLogic';

interface DemoAccountListProps {
  onPick: (profileId: string) => void;
}

export function DemoAccountList({ onPick }: DemoAccountListProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="bodyStrong">{strings.auth.demoAccountsTitle}</AppText>
      {pickerEntries().map((entry) => (
        <ListItem
          key={entry.profileId}
          title={entry.title}
          subtitle={`${entry.subtitle} (${entry.profileId})`}
          onPress={() => onPick(entry.profileId)}
          testID={`profile-${entry.profileId}`}
        />
      ))}
    </View>
  );
}
