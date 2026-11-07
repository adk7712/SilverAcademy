// Design system: a text field with a submit button; shows the error text the action resolves to.
import { useState } from 'react';
import { Button } from './Button';
import { TextField } from './TextField';

interface SubmitFieldProps {
  label: string;
  submitLabel: string;
  /** Receives the trimmed text. Resolves to an error message, or null on success. */
  onSubmit: (text: string) => Promise<string | null>;
  helper?: string;
  multiline?: boolean;
  minLength?: number;
  testID?: string;
}

export function SubmitField({ submitLabel, onSubmit, minLength = 1, ...field }: SubmitFieldProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(await onSubmit(text.trim()));
    setBusy(false);
  };
  return (
    <>
      <TextField
        {...field}
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        error={error ?? undefined}
      />
      <Button
        label={submitLabel}
        loading={busy}
        disabled={text.trim().length < minLength}
        onPress={() => void submit()}
      />
    </>
  );
}
