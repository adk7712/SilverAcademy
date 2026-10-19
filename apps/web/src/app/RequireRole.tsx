// Route guard element: loading -> spinner, anonymous -> /login, wrong role -> access denied.
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { StaffRole } from '@silveracademy/shared';
import { decideGuard, useSession } from '../features/auth';
import { EmptyState, Spinner } from '../design';
import { strings } from '../strings';
import { PATHS } from './paths';

export function RequireRole({
  roles,
  children,
}: {
  roles: readonly StaffRole[];
  children: ReactNode;
}) {
  const { state } = useSession();
  const location = useLocation();
  const decision = decideGuard(state, roles);

  if (decision === 'loading') return <Spinner />;
  if (decision === 'login')
    return <Navigate to={PATHS.login} replace state={{ from: location.pathname }} />;
  if (decision === 'forbidden') {
    return (
      <EmptyState title={strings.forbidden.title} description={strings.forbidden.description} />
    );
  }
  return <>{children}</>;
}
