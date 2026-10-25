import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/client';
import type { EventTypeDto, MatchDetail, Team } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { Scoreboard } from '../../components/Scoreboard';
import { Sheet } from '../../components/Sheet';
import { TeamBadge } from '../../components/TeamBadge';
import { useNow } from '../../lib/clock';
import { useMatch } from '../../live/useTournament';
import './console.css';

interface Pending {
  event: EventTypeDto;
  team: Team;
}

/** Texto del botón para pasar de periodo según el deporte y el marcador. */
function nextPeriodLabel(d: MatchDetail): string | null {
  const { sport, match } = d;
  if (sport.scoring === 'SETS') return null;
  if (match.period < sport.periods) {
    return sport.scoring === 'GOALS' ? `Iniciar ${match.period + 1}.º tiempo` : `Iniciar cuarto ${match.period + 1}`;
  }
  if (sport.scoring === 'POINTS' && match.homeScore === match.awayScore) return 'Jugar prórroga';
  return null;
}

export default function RefereeConsole() {
  const { id } = useParams();
  const matchId = Number(id);
  const { session } = useAuth();
  const { data, error, loading, setData } = useMatch(matchId);
  const now = useNow(data?.match.status === 'LIVE');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [pens, setPens] = useState({ home: '', away: '' });

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

  if (loading) return <div className="container page"><div className="skeleton" style={{ height: 360 }} /></div>;
  if (error || !data) return <div className="container page"><div className="card empty"><h3>No se pudo abrir el partido</h3><p>{error}</p></div></div>;

  const { match, sport, home, away, events } = data;
  const live = match.status === 'LIVE';
  const backTo = session?.role === 'ORGANIZER' ? `/panel/t/${data.tournament.id}?vista=partidos` : '/arbitro/partidos';
  const nextLabel = nextPeriodLabel(data);
  const knockoutTie = match.stage === 'KNOCKOUT' && sport.scoring === 'GOALS' && match.homeScore === match.awayScore;

  // En un autogol el jugador sale del rival del equipo que suma
  const playersFor = (p: Pending) => (p.event.code === 'OWN_GOAL' ? (p.team.id === home?.id ? away : home) : p.team)?.players ?? [];
  const sendEvent = async (playerId: number | null) => {
    if (!pending) return;
    const ok = await run(() => api.event(matchId, pending.event.code, pending.team.id, playerId));
    if (ok) setPending(null);
  };

  const finish = async () => {
    if (knockoutTie) {
      setFinishing(true);
      return;
    }
    if (window.confirm('¿Finalizar el partido? El resultado pasa a la tabla.')) await run(() => api.finish(matchId));
  };

  const recent = [...events].reverse().slice(0, 6);
  const teamName = (teamId: number) => (teamId === home?.id ? home?.shortName : away?.shortName);

  return (
    <div className="container container-narrow page console">
      <Link to={backTo} className="back-link"><Icon name="back" size={18} />Partidos</Link>
      <section className="card">
        <p className="mp-round">{data.tournament.name} · {match.roundLabel}</p>
        <Scoreboard detail={data} now={now} compact />
      </section>

      {message && <p className="form-error" role="alert">{message}</p>}

      {match.status === 'SCHEDULED' && (
        <button className="btn btn-lg btn-block console-start" disabled={busy || !home || !away} onClick={() => run(() => api.start(matchId))}>
          <Icon name="play" size={18} />Iniciar partido
        </button>
      )}

      {live && sport.scoring !== 'SETS' && (
        <div className="console-teams">
          {[home, away].map((team) => team && (
            <section key={team.id} className="card console-team">
              <div className="row"><TeamBadge team={team} size={30} /><strong>{team.name}</strong></div>
              <div className="console-actions">
                {sport.events.map((ev) => (
                  <button key={ev.code} type="button" disabled={busy}
                    className={`console-btn ${ev.value > 0 && ev.code !== 'OWN_GOAL' ? 'primary' : ''} ev-${ev.code}`}
                    onClick={() => setPending({ event: ev, team })}>
                    {ev.value > 0 && ev.code !== 'OWN_GOAL' ? (ev.code === 'GOAL' ? 'Gol' : `+${ev.value}`) : ev.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {live && sport.scoring === 'SETS' && (
        <div className="console-points">
          {[home, away].map((team) => team && (
            <button key={team.id} type="button" className="console-point" disabled={busy} onClick={() => run(() => api.point(matchId, team.id))}>
              <TeamBadge team={team} size={36} />
              <span>+1 {sport.code === 'VOLEIBOL' ? 'punto' : 'juego'}</span>
              <strong>{team.name}</strong>
            </button>
          ))}
        </div>
      )}

      {live && (
        <div className="console-bar">
          <button type="button" className="btn btn-secondary" disabled={busy || events.length === 0} onClick={() => run(() => api.undo(matchId))}>
            <Icon name="undo" size={17} />Deshacer
          </button>
          {nextLabel && (
            <button type="button" className="btn btn-dark" disabled={busy} onClick={() => run(() => api.nextPeriod(matchId))}>{nextLabel}</button>
          )}
          {sport.scoring !== 'SETS' && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={finish}><Icon name="flag" size={17} />Finalizar</button>
          )}
        </div>
      )}

      {live && recent.length > 0 && (
        <section className="card">
          <div className="card-head"><h3>Últimas acciones</h3></div>
          <ul className="console-log">
            {recent.map((e) => (
              <li key={e.id}>
                <span className="num faint">{e.minute != null ? `${e.minute}'` : e.setIndex != null ? `Set ${e.setIndex + 1}` : ''}</span>
                <span>{e.label}{e.playerName ? ` · ${e.playerName}` : ''}</span>
                <span className="muted">{teamName(e.teamId)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {match.status === 'FINISHED' && (
        <div className="card card-pad stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p className="subtitle">Partido finalizado</p>
          <p className="muted">El resultado ya está en la tabla y en la página pública.</p>
          <Link to={backTo} className="btn">Volver a los partidos</Link>
        </div>
      )}

      {pending && (
        <Sheet title={`${pending.event.label} · ${pending.team.name}`} onClose={() => setPending(null)}>
          <p className="muted">¿Quién fue? {pending.event.code === 'OWN_GOAL' ? 'Elige al jugador del rival.' : ''}</p>
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
          <p className="muted">Es eliminación directa y el partido terminó empatado. Registra la tanda de penales.</p>
          <div className="grid-2">
            <label className="field"><span>{home?.name}</span>
              <input className="input" inputMode="numeric" value={pens.home} onChange={(e) => setPens({ ...pens, home: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className="field"><span>{away?.name}</span>
              <input className="input" inputMode="numeric" value={pens.away} onChange={(e) => setPens({ ...pens, away: e.target.value.replace(/\D/g, '') })} />
            </label>
          </div>
          {message && <p className="form-error">{message}</p>}
          <button type="button" className="btn btn-lg btn-block" disabled={busy || pens.home === '' || pens.away === ''}
            onClick={async () => {
              const ok = await run(() => api.finish(matchId, Number(pens.home), Number(pens.away)));
              if (ok) setFinishing(false);
            }}>
            Finalizar con penales
          </button>
        </Sheet>
      )}
    </div>
  );
}
