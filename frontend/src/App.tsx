import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage, RefereeLoginPage, RegisterPage } from './pages/AuthPages';
import Home from './pages/Home';
import MatchPage from './pages/MatchPage';
import TournamentPage from './pages/TournamentPage';

// El panel y la consola de árbitro solo los usa quien inicia sesión: se cargan aparte
const RefereeConsole = lazy(() => import('./pages/arbitro/RefereeConsole'));
const RefereeMatches = lazy(() => import('./pages/arbitro/RefereeMatches'));
const Dashboard = lazy(() => import('./pages/panel/Dashboard'));
const ManageTournament = lazy(() => import('./pages/panel/ManageTournament'));
const NewTournament = lazy(() => import('./pages/panel/NewTournament'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="container page"><div className="skeleton" style={{ height: 280 }} /></div>}>{children}</Suspense>;
}

function RequireOrganizer({ children }: { children: ReactNode }) {
  const { isOrganizer } = useAuth();
  const location = useLocation();
  return isOrganizer ? <Lazy>{children}</Lazy> : <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
}

/** Consola de partido: árbitro con PIN o el organizador. */
function RequireOperator({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return session ? <Lazy>{children}</Lazy> : <Navigate to="/arbitro" replace />;
}

function NotFound() {
  return (
    <div className="container page">
      <div className="card empty">
        <h3>Esta página no existe</h3>
        <p>Revisa el enlace o vuelve al inicio.</p>
      </div>
    </div>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/t/:slug', element: <TournamentPage /> },
        { path: '/t/:slug/partido/:id', element: <MatchPage /> },
        { path: '/ingresar', element: <LoginPage /> },
        { path: '/registro', element: <RegisterPage /> },
        { path: '/arbitro', element: <RefereeLoginPage /> },
        { path: '/arbitro/partidos', element: <RequireOperator><RefereeMatches /></RequireOperator> },
        { path: '/arbitro/partido/:id', element: <RequireOperator><RefereeConsole /></RequireOperator> },
        { path: '/panel', element: <RequireOrganizer><Dashboard /></RequireOrganizer> },
        { path: '/panel/nuevo', element: <RequireOrganizer><NewTournament /></RequireOrganizer> },
        { path: '/panel/t/:id', element: <RequireOrganizer><ManageTournament /></RequireOrganizer> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
