import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { Icon, OrgBadge } from '../../components/Icon';
import { PLANS, planLabel, whatsappLink } from '../../config';
import { PageHeader, useOrg } from './AppLayout';

const COLORS = ['#1F5BFF', '#18C46A', '#FF7A1A', '#AF52DE', '#E5484D', '#0EA5E9', '#D4A017', '#1D1D1F'];

/** Datos de la organización, su marca y su plan. */
import { ThemeSwitch } from '../../theme/ThemeControls';

export default function Settings() {
  const { org, reloadOrg, isAdmin, toast } = useOrg();
  const [form, setForm] = useState({ name: org.name, shortName: org.shortName, city: org.city ?? '', description: org.description ?? '', color: org.color });
  const [error, setError] = useState<string | null>(null);
  const limit = (n: number) => (n > 1000 ? 'Ilimitados' : n);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader title="Ajustes" />
      <section className="card card-pad settings-theme">
        <div><h2 className="h2">Apariencia</h2><p className="muted" style={{ fontSize: 14 }}>Modo claro, oscuro o automático según tu dispositivo. Solo cambia en este navegador.</p></div>
        <ThemeSwitch withLabel={false} />
      </section>
      <form className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await api.updateOrg(org.slug, { ...form, city: form.city || null, description: form.description || null });
          await reloadOrg();
          toast('Cambios guardados');
        } catch (err) {
          setError((err as Error).message);
        }
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <OrgBadge shortName={form.shortName || org.shortName} color={form.color} size={56} />
          <div><h2 className="h2">Tu organización</h2><p className="muted" style={{ fontSize: 14 }}>Así aparece en tu página pública y en el panel.</p></div>
        </div>
        <div className="grid-2">
          <label className="field"><span>Nombre</span><input className="input" required maxLength={80} disabled={!isAdmin} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Iniciales</span><input className="input" maxLength={3} disabled={!isAdmin} value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })} /></label>
        </div>
        <label className="field"><span>Ciudad</span><input className="input" maxLength={80} disabled={!isAdmin} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label className="field"><span>Descripción para tu página pública</span><textarea className="textarea" maxLength={300} disabled={!isAdmin} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="field"><span>Color de marca</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLORS.map((c) => <button key={c} type="button" disabled={!isAdmin} aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })}
              style={{ width: 32, height: 32, borderRadius: 10, background: c, cursor: 'pointer', border: form.color === c ? '3px solid var(--text)' : '3px solid transparent' }} />)}
            <input type="color" disabled={!isAdmin} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} aria-label="Otro color" style={{ width: 36, height: 36, border: 0, background: 'none', cursor: 'pointer' }} />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        {isAdmin ? <button className="btn" style={{ alignSelf: 'flex-start' }}>Guardar cambios</button> : <p className="muted" style={{ fontSize: 13 }}>Solo un administrador puede cambiar estos datos.</p>}
      </form>

      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div><h2 className="h2">Plan {planLabel(org.plan)}</h2><p className="muted" style={{ fontSize: 14 }}>{PLANS.find((p) => p.id === org.plan)?.blurb}</p></div>
          {org.plan !== 'CLUB' && (
            <a className="btn btn-whatsapp" target="_blank" rel="noreferrer"
              href={whatsappLink(`Hola Duan, quiero mejorar el plan de ${org.name} en Brackit (hoy tenemos el plan ${planLabel(org.plan)}).`)}>
              <Icon name="whatsapp" size={16} />Mejorar plan
            </a>
          )}
        </div>
        <div className="stats">
          <div className="stat"><span>Torneos activos</span><b>{org.limits.activeTournaments}</b><small>de {limit(org.limits.maxActiveTournaments)}</small></div>
          <div className="stat"><span>Sedes</span><b>{org.limits.venues}</b><small>de {limit(org.limits.maxVenues)}</small></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {PLANS.filter((p) => p.id !== 'FREE').map((p) => (
            <div key={p.id} style={{ borderRadius: 16, padding: 16, background: 'var(--surface-2)', border: p.id === org.plan ? '1.5px solid var(--primary)' : '1.5px solid transparent' }}>
              <b>{p.name}</b> <span className="num muted">{p.price} {p.period}</span>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.features.slice(0, 3).join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Página pública: enlace para compartir y vista previa. */
export function PublicPageSettings() {
  const { org, toast } = useOrg();
  const url = `${window.location.origin}${import.meta.env.BASE_URL}l/${org.slug}`;
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader title="Página pública"><p className="muted">Comparte este enlace con jugadores, familias e hinchas: verán los partidos, la tabla y los marcadores en vivo.</p></PageHeader>
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: '1 1 260px' }} />
          <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado')).catch(() => {})}><Icon name="copy" size={15} />Copiar</button>
          <a className="btn" href={url} target="_blank" rel="noreferrer"><Icon name="external" size={15} />Abrir</a>
          <a className="btn btn-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`Sigue en vivo los torneos de ${org.name}: ${url}`)}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} />Compartir</a>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>La página usa tu nombre, tus iniciales y tu color. Puedes cambiarlos en <Link to={`/app/${org.slug}/ajustes`}>Ajustes</Link>.</p>
      </section>
      <section className="card" style={{ overflow: 'hidden' }}>
        <iframe title="Vista previa de la página pública" src={url} style={{ width: '100%', height: 720, border: 0, display: 'block' }} />
      </section>
    </div>
  );
}
