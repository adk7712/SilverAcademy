// UC #0-1 fake Singpass "ID + password" tab. The password lives only in this component's state and is never checked.
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppText, Button, TextField, useTheme } from '../../../design';
import { strings } from '../../../i18n';
import { ID_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../constants';
import {
  checkIdLogin,
  idErrorMessage,
  passwordErrorMessage,
  type IdLoginCheck,
} from '../controller/fakeSingpassLogic';
import { DemoAccountList } from './DemoAccountList';

// Web: "new-password" stops browsers filling or offering to save this never-checked demo password. Native: autofill stays off.
const PASSWORD_AUTOCOMPLETE = Platform.OS === 'web' ? 'new-password' : 'off';

interface SingpassIdTabProps {
  onSubmit: (profileId: string) => void;
}

export function SingpassIdTab({ onSubmit }: SingpassIdTabProps) {
  const { spacing } = useTheme();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [check, setCheck] = useState<IdLoginCheck | null>(null);
  const failed = check && !check.ok ? check : null;

  const changeId = (value: string) => {
    setId(value);
    setCheck(null);
  };
  const changePassword = (value: string) => {
    setPassword(value);
    setCheck(null);
  };

  const submit = () => {
    const result = checkIdLogin(id, password);
    setCheck(result);
    if (result.ok) onSubmit(result.profileId); // an unknown or empty ID never reaches the server
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label={strings.auth.idLabel}
        helper={strings.auth.idHelper}
        value={id}
        onChangeText={changeId}
        error={idErrorMessage(failed?.idError)}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        maxLength={ID_MAX_LENGTH}
        returnKeyType="go"
        onSubmitEditing={submit}
        testID="singpass-id-input"
      />
      <TextField
        label={strings.auth.passwordLabel}
        value={password}
        onChangeText={changePassword}
        error={passwordErrorMessage(failed?.passwordError)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={PASSWORD_AUTOCOMPLETE}
        textContentType="none"
        importantForAutofill="no"
        maxLength={PASSWORD_MAX_LENGTH}
        returnKeyType="go"
        onSubmitEditing={submit}
        testID="singpass-password-input"
      />
      <AppText color="danger" testID="password-warning">
        {strings.auth.passwordWarning}
      </AppText>
      <Button label={strings.auth.logIn} onPress={submit} testID="singpass-submit" />
      <DemoAccountList onPick={changeId} />
    </View>
  );
}
