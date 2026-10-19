// UC #1-4 #3-4 manual ticket-code fallback (camera denied/unavailable, or damaged QR).
import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextField, useTheme } from '../../../design';
import { strings } from '../../../i18n';

const s = strings.attendanceScan;
const TICKET_INPUT_MAX = 12; // 8 chars + separators/spaces

interface Props {
  busy: boolean;
  onSubmit: (code: string) => void;
}

export function ManualEntry({ busy, onSubmit }: Props) {
  const { spacing } = useTheme();
  const [code, setCode] = useState('');
  const send = () => {
    onSubmit(code);
    setCode('');
  };
  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label={s.codeLabel}
        helper={s.codeHint}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={TICKET_INPUT_MAX}
        returnKeyType="done"
        onSubmitEditing={send}
        testID="ticket-code-input"
      />
      <Button
        label={busy ? s.checkingIn : s.checkIn}
        onPress={send}
        loading={busy}
        disabled={code.trim().length === 0}
        testID="ticket-code-submit"
      />
    </View>
  );
}
