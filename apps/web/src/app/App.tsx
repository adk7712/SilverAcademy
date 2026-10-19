// Web shell: providers, router, login route, guarded role routes.
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider, LoginPage, useSession } from '../features/auth';
import { EmptyState, Spinner, ToastProvider } from '../design';
import { strings } from '../strings';
import { AppLayout } from './AppLayout';
import { RequireRole } from './RequireRole';
import { PATHS, homePathFor, resolveLanding } from './paths';
import { APP_ROUTES, routesForRoles } from './routeConfig';

function LoginRoute() {
  const { state } = useSession();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'signedIn') {
    const accessible = routesForRoles(state.user.roles).map((r) => r.path);
    return <Navigate to={resolveLanding(state.user.roles, from, accessible)} replace />;
  }
  return <LoginPage />;
}

function HomeRedirect() {
  const { state } = useSession();
  if (state.status === 'loading') return <Spinner />;
  return (
    <Navigate
      to={state.status === 'signedIn' ? homePathFor(state.user.roles) : PATHS.login}
      replace
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
          <Routes>
            <Route path={PATHS.login} element={<LoginRoute />} />
            <Route element={<AppLayout />}>
              {APP_ROUTES.map((r) => (
                <Route
                  key={r.path}
                  path={`${r.path}/*`}
                  element={<RequireRole roles={r.roles}>{r.element}</RequireRole>}
                />
              ))}
              <Route path="*" element={<EmptyState title={strings.notFound.title} />} />
            </Route>
            <Route index element={<HomeRedirect />} />
          </Routes>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
