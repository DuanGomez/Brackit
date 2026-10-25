import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { Court, SportCode, Venue } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { whatsappLink } from '../../config';
import { bogotaInstant, DAY_NAMES, formatDateTime, todayKey } from '../../lib/format';
import { SPORT_ORDER, SPORTS } from '../../lib/sports';
import { useLoad } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

/** Sedes y canchas: deportes admitidos, horario semanal y bloqueos puntuales. */
export default function Venues() {
  const { org, reloadOrg, canManage, toast } = useOrg();
  const { data, loading, error, reload, setData } = useLoad(() => api.venues(org.slug), `venues-${org.slug}`);
  const [newVenue, setNewVenue] = useState(false);
  const [editing, setEditing] = useState<{ venue: Venue; court: Court | null } | null>(null);
  const [hours, setHours] = useState<Court | null>(null);
  const [blocks, setBlocks] = useState<Court | null>(null);
  const atLimit = org.limits.venues >= org.limits.maxVenues;
  const refresh = async () => {
    await reload();
    await reloadOrg();
  };

  return (
    <div className="page">
      <PageHeader title="Sedes y canchas" actions={canManage && (atLimit
        ? <a className="btn btn-whatsapp" href={whatsappLink(`Hola Duan, quiero más sedes para ${org.name} en Brackit.`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />Más sedes</a>
        : <button type="button" className="btn" onClick={() => setNewVenue(true)}><Icon name="plus" size={16} strokeWidth={2.2} />Nueva sede</button>)}>
        <p className="muted">Cada cancha tiene sus deportes y su horario. Brackit solo programa partidos dentro de ese horario y fuera de los bloqueos.</p>
      </PageHeader>
      {loading ? <div className="skeleton" style={{ height: 260 }} /> : error || !data ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div>
        : !data.length ? (
          <div className="card empty"><h3>Aún no tienes sedes</h3><p>Crea tu primera sede (un complejo, coliseo o club) y agrégale sus canchas.</p>
            {canManage && <button type="button" className="btn" style={{ marginTop: 16 }} onClick={() => setNewVenue(true)}>Crear sede</button>}</div>
        ) : data.map((v) => (
          <section key={v.id} className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <div><h2>{v.name}</h2>{v.address && <p className="muted" style={{ fontSize: 13, display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}><Icon name="pin" size={13} />{v.address}</p>}</div>
              {canManage && <button type="button" className="btn btn-sm" onClick={() => setEditing({ venue: v, court: null })}><Icon name="plus" size={14} />Cancha</button>}
            </div>
            {!v.courts.length && <p className="muted" style={{ padding: '16px 22px', fontSize: 14 }}>Sin canchas todavía.</p>}
            {v.courts.map((c) => (
              <div key={c.id} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary-soft)', color: 'var(--link)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="court" size={20} /></span>
                <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <b style={{ fontWeight: 600 }}>{c.name}{c.surface && <span className="muted" style={{ fontWeight: 400 }}> · {c.surface}</span>}</b>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.sports.length ? c.sports.map((s) => <span key={s} className="chip">{SPORTS[s].label}</span>)
                      : <span className="chip">Todos los deportes</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 13 }}>{summarizeHours(c)}</span>
                  {c.blocks.length > 0 && <span style={{ fontSize: 13, color: 'var(--s-live)' }}>{c.blocks.length === 1 ? '1 bloqueo' : `${c.blocks.length} bloqueos`} programados</span>}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setHours(c)}><Icon name="clock" size={14} />Horario</button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setBlocks(c)}>Bloqueos</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing({ venue: v, court: c })}>Editar</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

      {newVenue && <VenueSheet onClose={() => setNewVenue(false)} onSaved={async () => { setNewVenue(false); toast('Sede creada'); await refresh(); }} />}
      {editing && <CourtSheet venue={editing.venue} court={editing.court} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
      {hours && <HoursSheet court={hours} onClose={() => setHours(null)} onSaved={(c) => { setHours(null); toast('Horario guardado'); setData(replaceCourt(data ?? [], c)); }} />}
      {blocks && <BlocksSheet court={blocks} onClose={() => setBlocks(null)} onChanged={(c) => { setBlocks(c); setData(replaceCourt(data ?? [], c)); }} />}
    </div>
  );
}

function replaceCourt(venues: Venue[], court: Court): Venue[] {
  return venues.map((v) => (v.id !== court.venueId ? v : { ...v, courts: v.courts.map((c) => (c.id === court.id ? court : c)) }));
}

function summarizeHours(c: Court) {
  if (!c.availability.length) return 'Sin horario: no se programarán partidos';
  const byRange = new Map<string, number[]>();
  c.availability.forEach((w) => {
    const k = `${w.start}–${w.end}`;
    byRange.set(k, [...(byRange.get(k) ?? []), w.dayOfWeek]);
  });
  return [...byRange.entries()].map(([range, days]) => {
    const sorted = [...days].sort();
    const label = sorted.length === 7 ? 'Todos los días' : sorted.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
    return `${label} ${range}`;
  }).join(' · ');
}

function VenueSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { org } = useOrg();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title="Nueva sede" onClose={onClose}>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        try {
          await api.createVenue(org.slug, name, address || undefined);
          onSaved();
        } catch (err) {
          setError((err as Error).message);
        }
      }}>
        <label className="field"><span>Nombre</span><input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Unidad Deportiva Belén" autoFocus /></label>
        <label className="field"><span>Dirección</span><input className="input" maxLength={160} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-lg btn-block">Crear sede</button>
      </form>
    </Sheet>
  );
}

function CourtSheet({ venue, court, onClose, onSaved }: { venue: Venue; court: Court | null; onClose: () => void; onSaved: () => void }) {
  const { org } = useOrg();
  const [name, setName] = useState(court?.name ?? `Cancha ${venue.courts.length + 1}`);
  const [surface, setSurface] = useState(court?.surface ?? '');
  const [sports, setSports] = useState<SportCode[]>(court?.sports ?? []);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title={court ? `Editar ${court.name}` : `Nueva cancha · ${venue.name}`} onClose={onClose}>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        try {
          if (court) await api.updateCourt(org.slug, court.id, { name, surface: surface || null, sports });
          else await api.addCourt(org.slug, venue.id, { name, surface: surface || undefined, sports });
          onSaved();
        } catch (err) {
          setError((err as Error).message);
        }
      }}>
        <div className="grid-2">
          <label className="field"><span>Nombre</span><input className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Tipo o superficie</span><input className="input" maxLength={60} value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="Fútbol 11 · grama" /></label>
        </div>
        <div className="field">
          <span>Deportes que admite</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPORT_ORDER.map((s) => {
              const on = sports.includes(s);
              return <button key={s} type="button" className={`check-chip ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => setSports(on ? sports.filter((x) => x !== s) : [...sports, s])}><Icon name={s} size={15} />{SPORTS[s].label}</button>;
            })}
          </div>
          <small>Si no eliges ninguno, admite todos.</small>
        </div>
        {!court && <p className="muted" style={{ fontSize: 13 }}>Queda disponible todos los días de 8 a. m. a 10 p. m.; luego puedes ajustar el horario.</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-lg btn-block">{court ? 'Guardar' : 'Crear cancha'}</button>
        {court && <button type="button" className="btn btn-danger btn-block" onClick={async () => {
          if (!window.confirm(`¿Eliminar ${court.name}? Sus partidos quedarán sin cancha.`)) return;
          await api.deleteCourt(org.slug, court.id);
          onSaved();
        }}>Eliminar cancha</button>}
      </form>
    </Sheet>
  );
}

function HoursSheet({ court, onClose, onSaved }: { court: Court; onClose: () => void; onSaved: (c: Court) => void }) {
  const { org } = useOrg();
  const initial = Array.from({ length: 7 }, (_, i) => {
    const w = court.availability.find((a) => a.dayOfWeek === i + 1);
    return { on: !!w, start: w?.start ?? '08:00', end: w?.end ?? '22:00' };
  });
  const [days, setDays] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title={`Horario · ${court.name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 550 }}>
              <input type="checkbox" checked={d.on} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} style={{ accentColor: 'var(--primary)', width: 18, height: 18 }} />
              {DAY_NAMES[i + 1]}
            </label>
            <input className="input num" type="time" disabled={!d.on} value={d.start} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} aria-label={`Desde el ${DAY_NAMES[i + 1]}`} />
            <input className="input num" type="time" disabled={!d.on} value={d.end} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} aria-label={`Hasta el ${DAY_NAMES[i + 1]}`} />
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setDays(days.map((d) => ({ ...d, on: true, start: days[0].start, end: days[0].end })))}>Copiar el lunes a todos los días</button>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-lg btn-block" onClick={async () => {
        try {
          onSaved(await api.setAvailability(org.slug, court.id, days.map((d, i) => ({ dayOfWeek: i + 1, start: d.start, end: d.end })).filter((_, i) => days[i].on)));
        } catch (e) {
          setError((e as Error).message);
        }
      }}>Guardar horario</button>
    </Sheet>
  );
}

function BlocksSheet({ court, onClose, onChanged }: { court: Court; onClose: () => void; onChanged: (c: Court) => void }) {
  const { org } = useOrg();
  const [day, setDay] = useState(todayKey());
  const [from, setFrom] = useState('14:00');
  const [to, setTo] = useState('17:00');
  const [reason, setReason] = useState('Mantenimiento');
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title={`Bloqueos · ${court.name}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 14 }}>Mantenimiento, eventos o clima: Brackit no programará partidos en esos horarios.</p>
      {court.blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {court.blocks.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '8px 12px', borderRadius: 12, background: 'var(--fill)' }}>
              <span style={{ flex: 1 }}><b>{b.reason ?? 'Bloqueo'}</b><br /><small className="muted">{formatDateTime(b.startsAt)} — {formatDateTime(b.endsAt)}</small></span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={async () => onChanged(await api.removeBlock(org.slug, court.id, b.id))}>Quitar</button>
            </div>
          ))}
        </div>
      )}
      <div className="grid-3">
        <label className="field"><span>Día</span><input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label className="field"><span>Desde</span><input className="input num" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>Hasta</span><input className="input num" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <label className="field"><span>Motivo</span><input className="input" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-block" onClick={async () => {
        setError(null);
        try {
          onChanged(await api.addBlock(org.slug, court.id, bogotaInstant(day, from), bogotaInstant(day, to), reason));
        } catch (e) {
          setError((e as Error).message);
        }
      }}>Agregar bloqueo</button>
    </Sheet>
  );
}
