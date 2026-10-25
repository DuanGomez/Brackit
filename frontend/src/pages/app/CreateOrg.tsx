import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from '../../components/Icon';
import { useApplyTheme } from '../../theme/theme';
import './app.css';

const COLORS = ['#1F5BFF', '#18C46A', '#FF7A1A', '#AF52DE', '#E5484D', '#0EA5E9', '#D4A017', '#1D1D1F'];

/** Primer paso de un cliente: crear su organización (plan Gratis). */
export default function CreateOrg() {
  useApplyTheme(true);
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return <Navigate to="/ingresar" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const org = await api.createOrg(name, city, color);
      await refresh();
      navigate(`/app/${org.slug}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="app-center">
      <form className="card card-pad" style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16, padding: 32 }} onSubmit={submit}>
        <Logo size={40} />
        <div>
          <h1 className="h1" style={{ fontSize: 28 }}>Crea tu organización</h1>
          <p className="muted" style={{ marginTop: 6 }}>Tu liga, club o empresa. Aquí vivirán tus torneos, sedes, equipos y miembros.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Nombre</span>
          <input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Liga Barrial de Belén" autoFocus />
        </label>
        <label className="field"><span>Ciudad</span>
          <input className="input" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Medellín" />
        </label>
        <div className="field">
          <span>Color de tu marca</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
                style={{ width: 34, height: 34, borderRadius: 10, border: color === c ? '3px solid var(--text)' : '3px solid transparent', background: c, cursor: 'pointer', outline: color === c ? '2px solid var(--surface)' : 'none', outlineOffset: -5 }} />
            ))}
          </div>
        </div>
        <button className="btn btn-lg btn-block" disabled={busy || !name.trim()}>{busy ? 'Creando…' : 'Crear organización'}</button>
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Empiezas en el plan Gratis. Puedes cambiar de plan cuando quieras.</p>
        {session.memberships.length > 0 && <Link to="/app" style={{ textAlign: 'center', fontSize: 14 }}>Volver a mis organizaciones</Link>}
      </form>
    </div>
  );
}
