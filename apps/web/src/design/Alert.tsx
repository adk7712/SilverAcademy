// Inline alert and ErrorBanner (turns any thrown error into user-readable text).
import type { ReactNode } from 'react';
import { errorMessage } from '../services/errors';
import { strings } from '../strings';
import { Button } from './Button';
import type { Tone } from './Badge';

interface AlertProps {
  tone?: Exclude<Tone, 'neutral'>;
  children: ReactNode;
  onDismiss?: () => void;
}

export function Alert({ tone = 'info', children, onDismiss }: AlertProps) {
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <div className={`alert tone--${tone}`} role={urgent ? 'alert' : 'status'}>
      <div className="alert__body">{children}</div>
      {onDismiss && (
        <Button variant="ghost" onClick={onDismiss}>
          {strings.common.dismiss}
        </Button>
      )}
    </div>
  );
}

/** Pass the caught value; renders nothing when `error` is null/undefined. */
export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error === null || error === undefined) return null;
  return (
    <Alert tone="danger">
      <div className="row">
        <span>{errorMessage(error)}</span>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {strings.common.retry}
          </Button>
        )}
      </div>
    </Alert>
  );
}
