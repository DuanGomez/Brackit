import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../../api/client';
import type { CalendarCourt, Conflict, MatchCard, Member } from '../../api/types';
import { Icon } from '../../components/Icon';
import { StatusChip } from '../../components/match';
import { TeamBadge } from '../../components/TeamBadge';
import { serverNow, useNow } from '../../lib/clock';
import { addDays, bogotaInstant, formatLongDate, formatTime, minutesOfDay, todayKey } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useLoad, useOrgChanges } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';
import './calendar.css';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const hourLabel = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1} ${m >= 720 ? 'p. m.' : 'a. m.'}`;

interface Draft {
  match: MatchCard;
  day: string;
  time: string;
  courtId: number | null;
}

export default function Calendar() {
  const { org, canManage } = useOrg();
  const location = useLocation();
  const [day, setDay] = useState<string>((location.state as { day?: string } | null)?.day ?? todayKey());
  const [venueId, setVenueId] = useState<number | null>(null);
  const { data, loading, error, reload } = useLoad(() => api.calendar(org.slug, day, venueId), `cal-${org.slug}-${day}-${venueId}`);
  useOrgChanges(org.slug, reload);
  const now = useNow(!!data?.matches.some((m) => m.status === 'LIVE'), 15000);
  const [draft, setDraft] = useState<Draft | null>(null);

  const venues = useMemo(() => {
    const map = new Map<number, string>();
    data?.courts.forEach((c) => map.set(c.venueId, c.venueName));
    return [...map.entries()];
  }, [data?.courts]);
  const [allVenues, setAllVenues] = useState<[number, string][]>([]);
  useEffect(() => {
    if (venueId == null && venues.length) setAllVenues(venues);
  }, [venues, venueId]);

  const range = useMemo(() => {
    const windows = data?.courts.flatMap((c) => c.windows) ?? [];
    const start = windows.length ? Math.min(...windows.map((w) => toMin(w.start))) : 8 * 60;
    const end = windows.length ? Math.max(...windows.map((w) => toMin(w.end))) : 22 * 60;
    return { start: Math.floor(start / 60) * 60, end: Math.ceil(end / 60) * 60 };
  }, [data?.courts]);

  const select = (m: MatchCard, courtId?: number | null, minute?: number) => {
    const base = m.scheduledAt ? minutesOfDay(m.scheduledAt) : range.start;
    setDraft({ match: m, day, time: hhmm(minute ?? base), courtId: courtId ?? m.courtId ?? data?.courts[0]?.id ?? null });
  };

  const onDrop = (court: CalendarCourt, minute: number, matchId: number) => {
    const m = data?.matches.find((x) => x.id === matchId) ?? data?.unscheduled.find((x) => x.id === matchId);
    if (m && canManage) select(m, court.id, minute);
  };

  return (
    <div className="page" style={{ maxWidth: 1440 }}>
      <PageHeader title="Calendario" actions={<>
        <div className="day-nav">
          <button type="button" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))}><Icon name="back" size={16} /></button>
          <span>{formatLongDate(day)}</span>
          <button type="button" aria-label="Día siguiente" onClick={() => setDay(addDays(day, 1))}><Icon name="chevron" size={16} /></button>
        </div>
        {day !== todayKey() && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDay(todayKey())}>Hoy</button>}
        <input type="date" className="input" style={{ width: 160, height: 38 }} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Elegir fecha" />
        {allVenues.length > 1 && (
          <select className="select" style={{ width: 'auto', height: 38 }} value={venueId ?? ''} onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : null)} aria-label="Sede">
            <option value="">Todas las sedes</option>
            {allVenues.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </>} />

      {loading ? <div className="skeleton" style={{ height: 420 }} /> : error || !data ? <div className="card empty"><h3>No se pudo cargar el calendario</h3><p>{error}</p></div>
        : data.courts.length === 0 ? (
          <div className="card empty"><h3>Aún no tienes canchas</h3><p>Crea una sede con sus canchas y horarios para programar partidos.</p>
            {canManage && <Link to={`/app/${org.slug}/canchas`} className="btn" style={{ marginTop: 16 }}>Crear sede</Link>}</div>
        ) : (
          <div className="side-panel">
            <section className="card grow cal-card">
              <CourtGrid courts={data.courts} matches={data.matches} range={range} isToday={day === todayKey()}
                selectedId={draft?.match.id} canDrag={canManage} onSelect={(m) => select(m)} onDrop={onDrop} />
              <div className="legend" style={{ padding: '4px 4px 0' }}>
                <span><span className="dot" style={{ background: '#30D158' }} />Finalizado</span>
                <span><span className="dot" style={{ background: 'var(--amber)' }} />En vivo</span>
                <span><span className="dot" style={{ background: '#8E9BB8' }} />Programado</span>
                <span><span className="dot" style={{ background: 'var(--red)' }} />Cancelado</span>
                {canManage && <span className="faint">Arrastra un partido para moverlo de cancha u hora</span>}
              </div>
            </section>
            <div className="aside">
              {draft && canManage ? (
                <PlacePanel key={draft.match.id} draft={draft} courts={data.courts} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); reload(); }} />
              ) : draft ? (
                <section className="card card-pad"><MatchSummary m={draft.match} now={now} /><Link to={`/app/${org.slug}/consola/${draft.match.id}`} className="btn btn-block" style={{ marginTop: 14 }}>Abrir consola</Link></section>
              ) : null}
              <section className="card" style={{ overflow: 'hidden' }}>
                <div className="card-head"><h3>Sin programar</h3><span className="chip num">{data.unscheduled.length}</span></div>
                {data.unscheduled.length ? data.unscheduled.slice(0, 40).map((m) => (
                  <button key={m.id} type="button" className="unsched" draggable={canManage}
                    onDragStart={(e) => e.dataTransfer.setData('text/match', String(m.id))} onClick={() => canManage && select(m)}>
                    <span>{m.home?.name ?? 'Por definir'} vs {m.away?.name ?? 'Por definir'}</span>
                    <small>{m.tournamentName} · {m.roundLabel}</small>
                  </button>
                )) : <p className="muted" style={{ padding: '14px 22px', fontSize: 14 }}>Todo está programado.</p>}
              </section>
            </div>
          </div>
        )}
    </div>
  );
}

const FILL: Record<string, string> = { FINISHED: 'is-done', LIVE: 'is-live', SCHEDULED: 'is-sched', CANCELLED: 'is-cancel' };

function CourtGrid({ courts, matches, range, isToday, selectedId, canDrag, onSelect, onDrop }: {
  courts: CalendarCourt[]; matches: MatchCard[]; range: { start: number; end: number }; isToday: boolean;
  selectedId?: number; canDrag: boolean; onSelect: (m: MatchCard) => void; onDrop: (c: CalendarCourt, minute: number, matchId: number) => void;
}) {
  const span = range.end - range.start;
  const pct = (m: number) => ((m - range.start) / span) * 100;
  const hours: number[] = [];
  for (let h = range.start; h < range.end; h += 60) hours.push(h);
  const nowMin = minutesOfDay(new Date(serverNow()).toISOString());

  return (
    <div className="cal-scroll">
      <div className="cal-grid" style={{ minWidth: Math.max(760, hours.length * 90) }}>
        <div className="cal-hours">
          <span />
          <div className="cal-hours-track">{hours.map((h) => <span key={h} style={{ left: `${pct(h)}%` }}>{hourLabel(h)}</span>)}</div>
        </div>
        {courts.map((c) => {
          const closed = closedRanges(c, range);
          return (
            <div key={c.id} className="cal-row">
              <div className="cal-court"><b>{c.name}</b><small>{c.surface ?? c.venueName}</small></div>
              <div className="cal-track"
                onDragOver={(e) => canDrag && e.preventDefault()}
                onDrop={(e) => {
                  const id = Number(e.dataTransfer.getData('text/match'));
                  if (!id) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minute = range.start + Math.round(((e.clientX - rect.left) / rect.width) * span / 15) * 15;
                  onDrop(c, Math.max(range.start, Math.min(range.end - 15, minute)), id);
                }}>
                {hours.map((h) => <span key={h} className="cal-tick" style={{ left: `${pct(h)}%` }} />)}
                {closed.map(([s, e], i) => <span key={`c${i}`} className="cal-closed" style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }} />)}
                {c.blocks.map((b) => {
                  const s = Math.max(range.start, minutesOfDay(b.startsAt));
                  const e = Math.min(range.end, minutesOfDay(b.endsAt) || range.end);
                  return <span key={b.id} className="cal-block" style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }}>{b.reason ?? 'Bloqueada'}</span>;
                })}
                {matches.filter((m) => m.courtId === c.id && m.scheduledAt).map((m) => {
                  const s = minutesOfDay(m.scheduledAt!);
                  return (
                    <button key={m.id} type="button" draggable={canDrag && m.status === 'SCHEDULED'}
                      onDragStart={(e) => e.dataTransfer.setData('text/match', String(m.id))}
                      className={`cal-match ${FILL[m.status]} ${selectedId === m.id ? 'selected' : ''}`}
                      style={{ left: `calc(${pct(s)}% + 2px)`, width: `calc(${pct(s + m.blockMinutes) - pct(s)}% - 4px)` }}
                      onClick={() => onSelect(m)} title={`${m.home?.name} vs ${m.away?.name} · ${m.tournamentName}`}>
                      <small className="num">
                        {m.status === 'LIVE' ? <><span className="dot dot-live" /> En vivo</> : m.status === 'FINISHED' ? `Final · ${m.homeScore} - ${m.awayScore}`
                          : m.status === 'CANCELLED' ? 'Cancelado' : formatTime(m.scheduledAt)}
                        {m.status === 'SCHEDULED' && !m.refereeId && <span className="cal-noref" title="Sin árbitro">· sin árbitro</span>}
                      </small>
                      <span>{m.home?.shortName ?? '?'} vs {m.away?.shortName ?? '?'}</span>
                      <small className="cal-t">{m.tournamentName}</small>
                    </button>
                  );
                })}
                {isToday && nowMin > range.start && nowMin < range.end && <span className="cal-now" style={{ left: `${pct(nowMin)}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tramos del rango visible en que la cancha no está disponible. */
function closedRanges(c: CalendarCourt, range: { start: number; end: number }): [number, number][] {
  const open = c.windows.map((w) => [toMin(w.start), toMin(w.end)] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cursor = range.start;
  for (const [s, e] of open) {
    if (s > cursor) out.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < range.end) out.push([cursor, range.end]);
  return out;
}

function MatchSummary({ m, now }: { m: MatchCard; now: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--link)' }}>{m.tournamentName} · {m.roundLabel}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TeamBadge team={m.home} size={30} /><b style={{ flex: 1, fontSize: 16 }}>{m.home?.name ?? 'Por definir'}</b>{m.status !== 'SCHEDULED' && <b className="num">{m.homeScore}</b>}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TeamBadge team={m.away} size={30} /><b style={{ flex: 1, fontSize: 16 }}>{m.away?.name ?? 'Por definir'}</b>{m.status !== 'SCHEDULED' && <b className="num">{m.awayScore}</b>}</div>
      </div>
      <div><StatusChip m={m} sport={m.sport} now={now} withDate /></div>
    </div>
  );
}

/** Panel para mover un partido: verifica choques en cada cambio y solo guarda confirmando. */
function PlacePanel({ draft, courts, onClose, onSaved }: { draft: Draft; courts: CalendarCourt[]; onClose: () => void; onSaved: () => void }) {
  const { org, toast } = useOrg();
  const m = draft.match;
  const editable = m.status === 'SCHEDULED';
  const [day, setDay] = useState(draft.day);
  const [time, setTime] = useState(draft.time);
  const [courtId, setCourtId] = useState<number | null>(draft.courtId);
  const [refereeId, setRefereeId] = useState<number | null>(m.refereeId);
  const [members, setMembers] = useState<Member[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(m.status === 'LIVE');
  const startsAt = bogotaInstant(day, time);
  const changed = courtId !== m.courtId || startsAt !== (m.scheduledAt ? new Date(m.scheduledAt).toISOString() : null);

  useEffect(() => {
    api.members(org.slug).then((list) => setMembers(list.filter((x) => x.status === 'ACTIVE' && x.userId))).catch(() => {});
  }, [org.slug]);

  useEffect(() => {
    if (!editable || !courtId || !changed) {
      setConflicts(null);
      return;
    }
    setChecking(true);
    const id = setTimeout(() => {
      api.check(org.slug, m.id, courtId, startsAt).then(setConflicts).catch(() => setConflicts(null)).finally(() => setChecking(false));
    }, 250);
    return () => clearTimeout(id);
  }, [org.slug, m.id, courtId, startsAt, editable, changed]);

  const save = async (force: boolean) => {
    if (!courtId) return;
    setBusy(true);
    setError(null);
    try {
      if (changed) await api.place(org.slug, m.id, courtId, startsAt, force);
      if (refereeId !== m.refereeId) await api.assignReferee(org.slug, m.id, refereeId);
      toast('Partido actualizado');
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.conflicts.length) setConflicts(e.conflicts);
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const hasConflicts = !!conflicts && conflicts.length > 0;
  return (
    <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <MatchSummary m={m} now={now} />
        <button type="button" className="btn btn-secondary icon-btn" aria-label="Cerrar" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>
      {editable ? (
        <>
          <div className="grid-2">
            <label className="field"><span>Fecha</span><input className="input" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></label>
            <label className="field"><span>Hora</span><input className="input num" type="time" step={900} value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></label>
          </div>
          <label className="field"><span>Cancha</span>
            <select className="select" value={courtId ?? ''} onChange={(e) => setCourtId(Number(e.target.value))}>
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.venueName}</option>)}
            </select>
            <small>Duración: {m.blockMinutes} min · {SPORTS[m.sport].label}</small>
          </label>
        </>
      ) : <p className="muted" style={{ fontSize: 14 }}>El partido ya empezó o terminó: no se puede mover.</p>}
      <label className="field"><span>Árbitro</span>
        <select className="select" value={refereeId ?? ''} onChange={(e) => setRefereeId(e.target.value ? Number(e.target.value) : null)} disabled={m.status === 'FINISHED'}>
          <option value="">Sin asignar</option>
          {members.map((x) => <option key={x.id} value={x.userId!}>{x.name ?? x.email}{x.role !== 'REFEREE' ? ' (organizador)' : ''}</option>)}
        </select>
      </label>
      {editable && changed && (checking ? <p className="muted" style={{ fontSize: 13 }}>Revisando choques…</p>
        : hasConflicts ? (
          <div className="conflicts">
            <b><Icon name="alert" size={16} />{conflicts!.length === 1 ? 'Un choque' : `${conflicts!.length} choques`}</b>
            <ul>{conflicts!.map((c, i) => <li key={i}>{c.message}</li>)}</ul>
          </div>
        ) : conflicts && <p className="form-ok" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="check" size={16} strokeWidth={2.4} />Sin choques en ese horario.</p>)}
      {error && !hasConflicts && <p className="form-error">{error}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {hasConflicts
          ? <button type="button" className="btn" style={{ flex: 1, background: 'var(--amber)', color: '#1D1D1F' }} disabled={busy} onClick={() => save(true)}>Guardar de todas formas</button>
          : <button type="button" className="btn" style={{ flex: 1 }} disabled={busy || (!changed && refereeId === m.refereeId)} onClick={() => save(false)}>{busy ? 'Guardando…' : 'Guardar'}</button>}
        <Link to={`/app/${org.slug}/partido/${m.id}`} className="btn btn-secondary">Detalle</Link>
      </div>
      {editable && m.courtId && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await api.unplace(org.slug, m.id); toast('Partido desprogramado'); onSaved(); }}>Quitar del calendario</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={async () => {
            const reason = window.prompt('Motivo de la cancelación (opcional)', 'Lluvia');
            if (reason === null) return;
            try {
              await api.cancel(org.slug, m.id, reason);
              toast('Partido cancelado');
              onSaved();
            } catch (e) {
              setError((e as Error).message);
            }
          }}>Cancelar partido</button>
        </div>
      )}
    </section>
  );
}
