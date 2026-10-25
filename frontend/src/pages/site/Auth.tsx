import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from '../../components/Icon';
import { BRAND, DEMO } from '../../config';
import './site.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = (location.state as { from?: string } | null)?.from ?? '/app';

  async function submit(e: FormEvent | null, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(creds?.email ?? email, creds?.password ?? password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/" aria-label={`${BRAND.name}, inicio`}><Logo size={40} /></Link>
        <h1>Ingresa a {BRAND.name}</h1>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Correo</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Contraseña</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <div className="demo-box">
          <strong>¿Quieres probarlo sin registrarte?</strong>
          <span>Entra a las organizaciones de ejemplo con un rol de prueba.</span>
          <div className="row">
            <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => submit(null, { email: DEMO.email, password: DEMO.password })}>Como administrador</button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => submit(null, { email: DEMO.refereeEmail, password: DEMO.password })}>Como árbitro</button>
          </div>
        </div>
        <p className="auth-foot">¿No tienes cuenta? <Link to="/registro">Créala gratis</Link></p>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await register(name, email, password);
      // Si alguien ya lo había invitado, entra directo a esa organización
      navigate(session.memberships.length ? `/app/${session.memberships[0].slug}` : '/app/nueva', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/" aria-label={`${BRAND.name}, inicio`}><Logo size={40} /></Link>
        <h1>Crea tu cuenta</h1>
        <p style={{ color: '#6E6E73', marginTop: -6 }}>Gratis. En unos minutos tienes tu organización con su primer torneo.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Tu nombre</span>
          <input className="input" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field"><span>Correo</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <small>Si te invitaron a una organización, usa ese mismo correo.</small>
        </label>
        <label className="field"><span>Contraseña</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>Mínimo 8 caracteres.</small>
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
        <p className="auth-foot">¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></p>
      </form>
    </div>
  );
}
