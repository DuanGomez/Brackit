import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/Layout';
import { Icon } from '../components/Icon';
import { BRAND, DEMO } from '../config';
import './auth.css';

function AuthShell({ title, lead, children, photo }: { title: string; lead: string; children: React.ReactNode; photo: string }) {
  return (
    <div className="auth">
      <div className="auth-photo" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}sports/${photo}.webp)` }} />
      <div className="auth-panel">
        <div className="auth-box">
          <BrandMark size={40} />
          <h1 className="title">{title}</h1>
          <p className="muted">{lead}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = (location.state as { from?: string } | null)?.from ?? '/panel';

  async function submit(e: FormEvent, creds?: { email: string; password: string }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(creds?.email ?? email, creds?.password ?? password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Ingresa a tu panel" lead={`Administra tus torneos en ${BRAND.name}.`} photo="futbol">
      <form className="stack" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Correo</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Contraseña</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <button type="button" className="btn btn-lg btn-block btn-secondary" disabled={busy}
          onClick={(e) => submit(e, { email: DEMO.email, password: DEMO.password })}>
          Probar con la cuenta demo
        </button>
      </form>
      <p className="auth-foot">¿No tienes cuenta? <Link to="/registro">Créala gratis</Link></p>
      <p className="auth-foot">¿Eres árbitro? <Link to="/arbitro">Entra con el PIN del torneo</Link></p>
    </AuthShell>
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
      await register(name, email, password);
      navigate('/panel/nuevo', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Crea tu cuenta" lead="Gratis. En dos minutos tienes tu torneo con calendario." photo="baloncesto">
      <form className="stack" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Tu nombre o el de tu liga</span>
          <input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field"><span>Correo</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Contraseña</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>Mínimo 8 caracteres.</small>
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="auth-foot">¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></p>
    </AuthShell>
  );
}

export function RefereeLoginPage() {
  const { refereeLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('t') ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await refereeLogin(code, pin);
      navigate('/arbitro/partidos', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Panel de árbitro" lead="Registra el marcador desde el celular. Pide el código y el PIN al organizador." photo="arbitro">
      <form className="stack" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field"><span>Código del torneo</span>
          <input className="input" required autoCapitalize="none" placeholder="liga-barrial-medellin" value={code} onChange={(e) => setCode(e.target.value.trim())} />
        </label>
        <label className="field"><span>PIN</span>
          <input className="input pin-input" required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="••••••"
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}><Icon name="whistle" size={18} />{busy ? 'Validando…' : 'Entrar a dirigir'}</button>
      </form>
      <div className="demo-hint">
        <strong>¿Quieres probarlo?</strong>
        <p className="muted">Todos los torneos de la demo usan el PIN <b className="num">{DEMO.pin}</b>.</p>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setCode('liga-barrial-medellin'); setPin(DEMO.pin); }}>
          Usar la Liga Barrial de Fútbol
        </button>
      </div>
    </AuthShell>
  );
}
