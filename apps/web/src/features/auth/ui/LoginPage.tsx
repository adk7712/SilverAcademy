// UC #0-2 AuthenticateWithAdminCredentials: staff login page (Management Portal Login).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, TextField } from '../../../design';
import { strings } from '../../../strings';
import { errorMessage } from '../../../services';
import { useSession } from '../controller/SessionProvider';

const NOTICE_BY_KIND = {
  invalid: strings.login.invalid,
  suspended: strings.login.suspended,
} as const;

/** On success the session turns signedIn and the router redirects (see app/App.tsx LoginRoute). */
export function LoginPage() {
  const { login } = useSession();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !password) return setNotice(strings.login.missingFields);
    setBusy(true);
    setNotice(null);
    try {
      const result = await login(userId, password);
      if (result.kind === 'success') return;
      // Failed attempts clear the form (UC #0-2 Ex1).
      setUserId('');
      setPassword('');
      setNotice(
        result.kind === 'network'
          ? errorMessage({ code: 'functions/unavailable' })
          : NOTICE_BY_KIND[result.kind],
      );
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="card login-card stack" onSubmit={submit} noValidate>
        <div>
          <h1>{strings.login.title}</h1>
          <p>{strings.login.subtitle}</p>
        </div>
        {notice && <Alert tone="danger">{notice}</Alert>}
        <TextField
          label={strings.login.userId}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <TextField
          label={strings.login.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" busy={busy}>
          {busy ? strings.login.submitting : strings.login.submit}
        </Button>
      </form>
    </main>
  );
}
