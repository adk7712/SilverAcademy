// UC #1-4 session-code fallback (camera unavailable, or damaged QR): the instructor sets a code for learners to type.
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, TextField, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';
import { useSessionCode } from '../controller/useSessionCode';

const s = strings.attendanceScan;
const CODE_MIN = 4;
const CODE_MAX = 12;

export function SessionCodeEntry({ workshopId }: { workshopId: string }) {
  const { spacing } = useTheme();
  const [code, setCode] = useState('');
  const c = useSessionCode(workshopId);
  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label={s.codeLabel}
        helper={s.codeHint}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CODE_MAX}
        error={c.error ?? undefined}
        testID="session-code-input"
      />
      {c.saved ? (
        <AppText variant="bodyStrong" accessibilityRole="alert">
          {format(s.codeSaved, { code: c.saved })}
        </AppText>
      ) : null}
      <Button
        label={s.saveCode}
        onPress={() => void c.save(code)}
        loading={c.busy}
        disabled={code.trim().length < CODE_MIN}
        testID="session-code-save"
      />
    </View>
  );
}
