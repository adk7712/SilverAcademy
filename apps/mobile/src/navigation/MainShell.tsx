// Signed-in shell: top safe area + (50+ only) mode toggle above the active role/mode tab navigator (ADR-008).
import { View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModeToggle, type ShellMode } from '../features/auth';
import { useTheme } from '../design';
import { InstructorTabs } from './InstructorTabs';
import { LearnerTabs } from './LearnerTabs';
import { VolunteerTabs } from './VolunteerTabs';

const SHELLS: Record<ShellMode, () => React.JSX.Element> = {
  LEARNER: LearnerTabs,
  SENIOR_INSTRUCTOR: InstructorTabs,
  VOLUNTEER: VolunteerTabs,
};

export function MainShell({ mode }: { mode: ShellMode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const Shell = SHELLS[mode];
  // The top inset is consumed here so screens below do not add it twice.
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top }}>
        <ModeToggle />
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <Shell />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
