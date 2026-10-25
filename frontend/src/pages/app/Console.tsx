import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/client';
import type { EventTypeDto, MatchDetail, Team } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { TeamBadge } from '../../components/TeamBadge';
import { liveClockLabel, useNow } from '../../lib/clock';
import { formatDateTime } from '../../lib/format';
import { useMatchLive } from '../../live/hooks';
import { useOrg } from './AppLayout';
import './console.css';

interface Pending {
  event: EventTypeDto;
  team: Team;
}

function nextPeriodLabel(d: MatchDetail): string | null {
  const { sport, match } = d;
  if (sport.scoring === 'SETS') return null;
  if (match.period < sport.periods) return sport.scoring === 'GOALS' ? `Iniciar ${match.period + 1}.º tiempo` : `Iniciar cuarto ${match.period + 1}`;
  if (sport.scoring === 'POINTS' && match.homeScore === match.awayScore) return 'Jugar prórroga';
  return null;
}

/** Texto claro del botón principal según el deporte. */
function primaryLabel(ev: EventTypeDto) {
  if (ev.code === 'GOAL') return 'Gol';
  if (ev.code.startsWith('POINT_')) return `+${ev.value}`;
  return ev.label;
}

export default function Console() {
  const { id } = useParams();
  const matchId = Number(id);
  const { org, canManage } = useOrg();
  const { data, error, loading, setData } = useMatchLive(() => api.match(org.slug, matchId), matchId);
  const now = useNow(data?.match.status === 'LIVE');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [pens, setPens] = useState({ home: '', away: '' });
  const base = `/app/${org.slug}`;

  async function run(action: () => Promise<MatchDetail>) {
    setBusy(true);
    setMessage(null);
    try {
      setData(await action());
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="console" data-theme="dark"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (error || !data) return <div className="console" data-theme="dark"><p className="form-error">{error ?? 'No se pudo abrir el partido'}</p><Link to={base} className="btn">Volver</Link></div>;

  const { match, sport, home, away, events } = data;
  const live = match.status === 'LIVE';
  const nextLabel = nextPeriodLabel(data);
  const knockout = match.stage === 'KNOCKOUT' || match.stage === 'THIRD_PLACE';
  const knockoutTie = knockout && sport.scoring === 'GOALS' && match.homeScore === match.awayScore;
  const scoring = sport.events.filter((e) => e.value > 0 && e.code !== 'OWN_GOAL');
  const extras = sport.events.filter((e) => e.value === 0 || e.code === 'OWN_GOAL');
  const playersFor = (p: Pending) => (p.event.code === 'OWN_GOAL' ? (p.team.id === home?.id ? away : home) : p.team)?.players ?? [];
  const sendEvent = async (playerId: number | null) => {
    if (!pending) return;
    if (await run(() => api.event(org.slug, matchId, pending.event.code, pending.team.id, playerId))) setPending(null);
  };
  const finish = async () => {
    if (knockoutTie) return setFinishing(true);
    if (window.confirm('¿Finalizar el partido? El resultado pasa a la tabla.')) await run(() => api.finish(org.slug, matchId));
  };
  const recent = [...events].reverse().slice(0, 5);
  const back = canManage ? `${base}/partido/${match.id}` : base;

  return (
    <div className="console" data-theme="dark">
      <div className="console-top">
        <Link to={back} className="console-back"><Icon name="back" size={18} />{canManage ? 'Partido' : 'Mis partidos'}</Link>
        <span>{data.tournament.name} · {match.roundLabel}{match.courtName ? ` · ${match.courtName}` : ''}</span>
      </div>

      <section className="console-score">
        <span className={`chip num ${live ? 'chip-live' : match.status === 'FINISHED' ? 'chip-done' : 'chip-sched'}`} style={{ height: 28, padding: '0 14px' }}>
          {live ? <><span className="dot dot-live" />{sport.scoring === 'SETS' ? match.periodLabel : `${match.periodLabel} · en vivo`}</> : match.status === 'FINISHED' ? 'Final' : formatDateTime(match.scheduledAt)}
        </span>
        <div className="console-teams">
          <div><TeamBadge team={home} size={48} /><b>{home?.name}</b></div>
          <strong className="num">{match.homeScore}<span>:</span>{match.awayScore}</strong>
          <div><TeamBadge team={away} size={48} /><b>{away?.name}</b></div>
        </div>
        {live && sport.scoring !== 'SETS' && <span className="console-clock num">{liveClockLabel(match, sport, now)}</span>}
        {sport.scoring === 'SETS' && match.sets.length > 0 && (
          <div className="console-sets num">{match.sets.map((s, i) => <span key={i} className={!s.finished && live ? 'current' : ''}>{s.home}-{s.away}</span>)}</div>
        )}
      </section>

      {message && <p className="form-error" role="alert">{message}</p>}

      {match.status === 'SCHEDULED' && (
        <button type="button" className="btn btn-lg btn-block console-start" disabled={busy || !home || !away} onClick={() => run(() => api.start(org.slug, matchId))}>
          <Icon name="play" size={18} />Iniciar partido
        </button>
      )}

      {live && sport.scoring !== 'SETS' && home && away && (
        <div className="console-grid">
          {[home, away].map((team) => (
            <div key={team.id} className="console-col">
              {scoring.map((ev) => (
                <button key={ev.code} type="button" className="console-main" disabled={busy}
                  style={{ background: team.color, color: isLight(team.color) ? '#0B0B0F' : '#fff' }} onClick={() => setPending({ event: ev, team })}>
                  {primaryLabel(ev)}<small>{team.shortName}</small>
                </button>
              ))}
              {extras.map((ev) => (
                <button key={ev.code} type="button" className="console-extra" disabled={busy} onClick={() => setPending({ event: ev, team })}>
                  {ev.code === 'YELLOW_CARD' && <span className="card-mark" style={{ background: '#FFD60A' }} />}
                  {ev.code === 'RED_CARD' && <span className="card-mark" style={{ background: '#FF3B30' }} />}
                  {ev.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {live && sport.scoring === 'SETS' && home && away && (
        <div className="console-grid">
          {[home, away].map((team) => (
            <button key={team.id} type="button" className="console-point" disabled={busy}
              style={{ background: team.color, color: isLight(team.color) ? '#0B0B0F' : '#fff' }} onClick={() => run(() => api.point(org.slug, matchId, team.id))}>
              <span>+1 {sport.code === 'VOLEIBOL' ? 'punto' : 'juego'}</span><small>{team.name}</small>
            </button>
          ))}
        </div>
      )}

      {live && recent.length > 0 && (
        <section className="console-log">
          {recent.map((e) => (
            <div key={e.id}>
              <span className="num">{e.minute != null ? `${e.minute}'` : e.setIndex != null ? `Set ${e.setIndex + 1}` : ''}</span>
              <span>{e.label}{e.playerName ? ` · ${e.playerName}` : ''}</span>
              <span>{e.teamId === home?.id ? home?.shortName : away?.shortName}</span>
            </div>
          ))}
        </section>
      )}

      {live && (
        <div className="console-bar">
          <button type="button" className="btn btn-secondary" disabled={busy || !events.length} onClick={() => run(() => api.undo(org.slug, matchId))}><Icon name="undo" size={17} />Deshacer</button>
          {nextLabel && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => api.nextPeriod(org.slug, matchId))}>{nextLabel}</button>}
          {sport.scoring !== 'SETS' && <button type="button" className="btn btn-danger" disabled={busy} onClick={finish}><Icon name="flag" size={16} />Finalizar</button>}
        </div>
      )}

      {match.status === 'FINISHED' && (
        <section className="console-done">
          <b>Partido finalizado</b>
          <p className="muted">El resultado ya está en la tabla y en la página pública.</p>
          <Link to={back} className="btn">Volver</Link>
        </section>
      )}

      {pending && (
        <Sheet title={`${pending.event.label} · ${pending.team.name}`} onClose={() => setPending(null)}>
          <p className="muted">¿Quién fue?{pending.event.code === 'OWN_GOAL' ? ' Elige al jugador del rival.' : ''}</p>
          <div className="player-grid">
            {playersFor(pending).map((p) => (
              <button key={p.id} type="button" className="player-btn" disabled={busy} onClick={() => sendEvent(p.id)}>
                <span className="num">{p.number ?? '—'}</span>{p.name}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => sendEvent(null)}>Registrar sin jugador</button>
        </Sheet>
      )}

      {finishing && (
        <Sheet title="Definición por penales" onClose={() => setFinishing(false)}>
          <p className="muted">Es eliminación directa y terminó empatado. Registra la tanda de penales.</p>
          <div className="grid-2">
            <label className="field"><span>{home?.name}</span><input className="input num" inputMode="numeric" value={pens.home} onChange={(e) => setPens({ ...pens, home: e.target.value.replace(/\D/g, '') })} /></label>
            <label className="field"><span>{away?.name}</span><input className="input num" inputMode="numeric" value={pens.away} onChange={(e) => setPens({ ...pens, away: e.target.value.replace(/\D/g, '') })} /></label>
          </div>
          {message && <p className="form-error">{message}</p>}
          <button type="button" className="btn btn-lg btn-block" disabled={busy || pens.home === '' || pens.away === ''}
            onClick={async () => { if (await run(() => api.finish(org.slug, matchId, Number(pens.home), Number(pens.away)))) setFinishing(false); }}>
            Finalizar con penales
          </button>
        </Sheet>
      )}
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}
