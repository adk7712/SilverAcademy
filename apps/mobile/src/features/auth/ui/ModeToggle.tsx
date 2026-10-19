// FR 1.3 Learner/Instructor mode switch; rendered only for 50+ eligible users (UI-only, ADR-008).
import { View } from 'react-native';
import { Segmented, useTheme, type SegmentOption } from '../../../design';
import { strings } from '../../../i18n';
import { useSession } from '../controller/SessionProvider';
import type { ShellMode } from '../types';

const TOGGLE_MODES: readonly ShellMode[] = ['LEARNER', 'SENIOR_INSTRUCTOR'];

export function ModeToggle() {
  const { state, canToggleMode, setMode } = useSession();
  const { spacing } = useTheme();
  if (state.status !== 'signedIn' || !canToggleMode || !state.mode) return null;

  const options: SegmentOption<ShellMode>[] = TOGGLE_MODES.map((mode) => ({
    value: mode,
    label: strings.nav.modes[mode],
  }));
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      <Segmented options={options} value={state.mode} onChange={setMode} testID="mode-toggle" />
    </View>
  );
}
