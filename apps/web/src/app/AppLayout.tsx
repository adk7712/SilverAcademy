// Authenticated shell: role-aware sidebar (collapsible below tablet width) + content outlet.
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../features/auth';
import { Button, Spinner } from '../design';
import { strings } from '../strings';
import { PATHS } from './paths';
import { routesForRoles } from './routeConfig';

export function AppLayout() {
  const { state, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (state.status === 'signedOut') return <Navigate to={PATHS.login} replace />;
  if (state.status !== 'signedIn') return <Spinner />;
  const { user } = state;
  const roleLabel = user.roles.includes('ADMIN') ? strings.nav.roleAdmin : strings.nav.rolePartner;

  async function onLogout() {
    try {
      await logout();
    } catch {
      // Sign-out failed remotely; local state is already signed out, so continue to login.
    }
    navigate(PATHS.login, { replace: true });
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        {strings.common.skipToContent}
      </a>
      <header className="topbar">
        <Button
          variant="secondary"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {strings.nav.menu}
        </Button>
        <strong>{strings.appName}</strong>
      </header>
      <aside id="sidebar" className="sidebar" data-open={menuOpen}>
        <div>
          <div className="sidebar__brand">{strings.appName}</div>
          <div className="sidebar__role">
            {roleLabel} ({user.userId})
          </div>
        </div>
        <nav className="sidebar__nav" aria-label={strings.nav.label}>
          {routesForRoles(user.roles).map((r) => (
            <NavLink key={r.path} to={r.path} className="nav-link">
              {r.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" onClick={onLogout}>
          {strings.nav.logout}
        </Button>
      </aside>
      <main id="main" className="content">
        <Outlet />
      </main>
    </div>
  );
}
