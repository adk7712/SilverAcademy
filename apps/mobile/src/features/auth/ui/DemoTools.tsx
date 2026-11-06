// UC #0-1 collapsed "Demo tools": hidden simulations (age 49, suspended, Singpass down, failed login) for presenters.
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, useTheme } from '../../../design';
import { strings } from '../../../i18n';
import { SIMULATIONS } from '../controller/fakeSingpassLogic';

interface DemoToolsProps {
  onSimulate: (profileId: string) => void;
}

export function DemoTools({ onSimulate }: DemoToolsProps) {
  const [open, setOpen] = useState(false);
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Button
        variant="ghost"
        label={open ? strings.auth.demoToolsHide : strings.auth.demoToolsShow}
        expanded={open}
        onPress={() => setOpen((v) => !v)}
        testID="demo-tools-toggle"
      />
      {open ? (
        <View style={{ gap: spacing.sm }} testID="demo-tools">
          <AppText variant="caption" color="textMuted">
            {strings.auth.demoToolsHint}
          </AppText>
          {SIMULATIONS.map((s) => (
            <Button
              key={s.profileId}
              variant="secondary"
              label={s.label()}
              onPress={() => onSimulate(s.profileId)}
              testID={`simulate-${s.profileId}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
