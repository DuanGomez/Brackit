import { useEffect, useState, type ReactNode } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Icon, Logo } from '../../components/Icon';
import { BRAND, whatsappLink } from '../../config';
import './errors.css';

/** Plantilla de las páginas de estado: 404, sin conexión, error y versión nueva. */
function StatusPage({ code, kicker, title, text, children, details }: {
  code: ReactNode; kicker: string; title: string; text: ReactNode; children: ReactNode; details?: string;
}) {
  useEffect(() => {
    document.title = `${title} · ${BRAND.name}`;
  }, [title]);
  return (
    <div className="status-page">
      <div className="status-glow" aria-hidden />
      <header className="status-top">
        <Link to="/" className="status-brand"><Logo size={26} />{BRAND.name}</Link>
      </header>
      <main className="status-main">
        <div className="status-code" aria-hidden>{code}</div>
        <p className="status-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="status-text">{text}</p>
        <div className="status-actions">{children}</div>
        {details && (
          <details className="status-details">
            <summary>Detalles técnicos</summary>
            <code>{details}</code>
          </details>
        )}
      </main>
      <footer className="status-foot">
        ¿Necesitas ayuda? <a href={whatsappLink(`Hola, tengo un problema en ${BRAND.name}: ${title}`)} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>
      </footer>
    </div>
  );
}

export function NotFoundPage({ title = 'Esta página está fuera de la cancha', text, back }: { title?: string; text?: ReactNode; back?: { to: string; label: string } }) {
  const { session } = useAuth();
  return (
    <StatusPage code="404" kicker="Fuera de lugar" title={title}
      text={text ?? 'El enlace no existe, cambió o se escribió mal. Revisa la dirección o sigue desde aquí.'}>
      {back && <Link to={back.to} className="btn btn-lg">{back.label}</Link>}
      <Link to="/" className={back ? 'btn btn-lg status-ghost' : 'btn btn-lg'}>Ir al inicio</Link>
      {session ? <Link to="/app" className="btn btn-lg status-ghost">Ir a mi panel</Link>
        : <Link to="/" state={{ section: 'ligas' }} className="btn btn-lg status-ghost">Ver ligas en vivo</Link>}
    </StatusPage>
  );
}

export function OfflinePage({ onRetry }: { onRetry?: () => void }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return (
    <StatusPage code={<Icon name="globe" size={84} strokeWidth={1.4} />} kicker="Sin conexión"
      title={online ? 'El servidor se está despertando' : 'Parece que no tienes internet'}
      text={online
        ? 'No logramos conectar con el servidor. Si nadie lo había usado en un rato, tarda cerca de un minuto en arrancar. Intenta de nuevo en unos segundos.'
        : 'Revisa tu conexión a internet. Apenas vuelva, intenta de nuevo.'}>
      <button type="button" className="btn btn-lg" onClick={() => (onRetry ? onRetry() : window.location.reload())}><Icon name="undo" size={17} />Intentar de nuevo</button>
      <Link to="/" className="btn btn-lg status-ghost">Ir al inicio</Link>
    </StatusPage>
  );
}

export function ErrorPage({ details, onRetry }: { details?: string; onRetry?: () => void }) {
  return (
    <StatusPage code="500" kicker="Algo salió mal" title="Tuvimos un problema al mostrar esta página"
      text="No es tu culpa. Intenta de nuevo; si sigue pasando, escríbenos y lo revisamos." details={details}>
      <button type="button" className="btn btn-lg" onClick={() => (onRetry ? onRetry() : window.location.reload())}><Icon name="undo" size={17} />Intentar de nuevo</button>
      <Link to="/" className="btn btn-lg status-ghost" reloadDocument>Ir al inicio</Link>
    </StatusPage>
  );
}

function NewVersionPage() {
  return (
    <StatusPage code={<Icon name="check" size={84} strokeWidth={1.4} />} kicker="Actualización" title="Hay una versión nueva de Brackit"
      text="Publicamos mejoras mientras tenías la página abierta. Recarga para usar la versión más reciente.">
      <button type="button" className="btn btn-lg" onClick={() => window.location.reload()}>Recargar</button>
    </StatusPage>
  );
}

/** Error de carga de datos: elige la página según el código (404, sin conexión u otro). */
export function LoadError({ status, message, onRetry, notFound }: {
  status: number | null; message?: string | null; onRetry?: () => void; notFound?: { title: string; text?: string; back?: { to: string; label: string } };
}) {
  if (status === 404) return <NotFoundPage title={notFound?.title} text={notFound?.text} back={notFound?.back} />;
  if (status === 0) return <OfflinePage onRetry={onRetry} />;
  return <ErrorPage details={message ?? undefined} onRetry={onRetry} />;
}

/** Errores que llegan al enrutador: rutas inexistentes, fallos de la app o archivos de una versión anterior. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  const message = error instanceof Error ? error.message : String(error ?? '');
  // Tras publicar una versión nueva, los archivos de la anterior ya no existen
  if (/dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically/i.test(message)) {
    return <NewVersionPage />;
  }
  return <ErrorPage details={message} />;
}
