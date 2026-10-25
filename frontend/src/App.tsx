import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage, RegisterPage } from './pages/site/Auth';
import Landing from './pages/site/Landing';
import { NotFoundPage, RouteError } from './pages/site/ErrorPages';
import { PublicMatchPage, PublicOrgPage, PublicTournamentPage } from './pages/public/PublicPages';

// El panel solo lo usa quien inicia sesión: se carga aparte para que el sitio y las páginas públicas abran rápido
const AppLayout = lazy(() => import('./pages/app/AppLayout'));
const AppHome = lazy(() => import('./pages/app/AppLayout').then((m) => ({ default: m.AppHome })));
const CreateOrg = lazy(() => import('./pages/app/CreateOrg'));
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Tournaments = lazy(() => import('./pages/app/Tournaments'));
const NewTournament = lazy(() => import('./pages/app/NewTournament'));
const TournamentDetail = lazy(() => import('./pages/app/TournamentDetail'));
const Calendar = lazy(() => import('./pages/app/Calendar'));
const Matches = lazy(() => import('./pages/app/Matches'));
const MatchAdmin = lazy(() => import('./pages/app/MatchAdmin'));
const Console = lazy(() => import('./pages/app/Console'));
const Teams = lazy(() => import('./pages/app/Teams'));
const Venues = lazy(() => import('./pages/app/Venues'));
const Members = lazy(() => import('./pages/app/Members'));
const Referees = lazy(() => import('./pages/app/Members').then((m) => ({ default: m.Referees })));
const Settings = lazy(() => import('./pages/app/Settings'));
const PublicPageSettings = lazy(() => import('./pages/app/Settings').then((m) => ({ default: m.PublicPageSettings })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />}>{children}</Suspense>;
}

const router = createBrowserRouter(
  [{
    // Cualquier fallo dentro de una ruta muestra la página de error en vez de una pantalla en blanco
    errorElement: <RouteError />,
    children: [
    { path: '/', element: <Landing /> },
    { path: '/ingresar', element: <LoginPage /> },
    { path: '/registro', element: <RegisterPage /> },
    { path: '/l/:org', element: <PublicOrgPage /> },
    { path: '/l/:org/partido/:id', element: <PublicMatchPage /> },
    { path: '/l/:org/:slug', element: <PublicTournamentPage /> },
    { path: '/app', element: <Lazy><AppHome /></Lazy> },
    { path: '/app/nueva', element: <Lazy><CreateOrg /></Lazy> },
    {
      path: '/app/:org',
      element: <Lazy><AppLayout /></Lazy>,
      children: [
        { index: true, element: <Lazy><Dashboard /></Lazy> },
        { path: 'torneos', element: <Lazy><Tournaments /></Lazy> },
        { path: 'torneos/nuevo', element: <Lazy><NewTournament /></Lazy> },
        { path: 'torneos/:id', element: <Lazy><TournamentDetail /></Lazy> },
        { path: 'calendario', element: <Lazy><Calendar /></Lazy> },
        { path: 'partidos', element: <Lazy><Matches /></Lazy> },
        { path: 'partido/:id', element: <Lazy><MatchAdmin /></Lazy> },
        { path: 'consola/:id', element: <Lazy><Console /></Lazy> },
        { path: 'equipos', element: <Lazy><Teams /></Lazy> },
        { path: 'canchas', element: <Lazy><Venues /></Lazy> },
        { path: 'arbitros', element: <Lazy><Referees /></Lazy> },
        { path: 'miembros', element: <Lazy><Members /></Lazy> },
        { path: 'publica', element: <Lazy><PublicPageSettings /></Lazy> },
        { path: 'ajustes', element: <Lazy><Settings /></Lazy> },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
    ],
  }],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
