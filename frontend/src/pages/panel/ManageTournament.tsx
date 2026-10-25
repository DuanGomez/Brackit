import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, type ResultInput } from '../../api/client';
import type { Match, Team, Tournament } from '../../api/types';
import { Icon } from '../../components/Icon';
import { MatchRow } from '../../components/MatchRow';
import { Sheet } from '../../components/Sheet';
import { TeamBadge } from '../../components/TeamBadge';
import { useNow } from '../../lib/clock';
import { FORMAT_LABEL, STATUS_LABEL } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useTournament } from '../../live/useTournament';
import './panel.css';

type Tab = 'equipos' | 'calendario' | 'partidos' | 'arbitros' | 'ajustes';

export default function ManageTournament() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const { data: t, teams, error, loading, reload, setData } = useTournament(`panel-${tournamentId}`, () => api.tournament(tournamentId));
  const [params, setParams] = useSearchParams();
  const draft = t?.status === 'DRAFT';
  const tab = (params.get('vista') as Tab) || (draft ? 'equipos' : 'partidos');
  const setTab = (next: Tab) => setParams({ vista: next }, { replace: true });

  if (loading) return <div className="container page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !t) return <div className="container page"><div className="card empty"><h3>No se pudo abrir el torneo</h3><p>{error}</p></div></div>;

  const tabs: { id: Tab; label: string }[] = draft
    ? [{ id: 'equipos', label: 'Equipos' }, { id: 'calendario', label: 'Calendario' }, { id: 'arbitros', label: 'Árbitros' }, { id: 'ajustes', label: 'Ajustes' }]
    : [{ id: 'partidos', label: 'Partidos' }, { id: 'equipos', label: 'Equipos' }, { id: 'arbitros', label: 'Árbitros' }, { id: 'ajustes', label: 'Ajustes' }];

  return (
    <div className="container page stack" style={{ gap: 22 }}>
      <div className="manage-head">
        <Link to="/panel" className="back-link"><Icon name="back" size={18} />Mis torneos</Link>
        <div className="row-between">
          <div>
            <p className="eyebrow" style={{ color: SPORTS[t.sport.code].color }}>{SPORTS[t.sport.code].label} · {FORMAT_LABEL[t.format]}</p>
            <h1 className="title">{t.name}</h1>
          </div>
          <div className="manage-links">
            <span className={`chip ${t.status === 'FINISHED' ? 'chip-done' : t.status === 'IN_PROGRESS' ? 'chip-accent' : ''}`}>{STATUS_LABEL[t.status]}</span>
            {!draft && <Link to={`/t/${t.slug}`} className="btn btn-sm btn-secondary"><Icon name="share" size={15} />Página pública</Link>}
          </div>
        </div>
        {t.demo && <p className="form-ok">Torneo de demostración: puedes probar todo; se reinicia solo cada cierto tiempo.</p>}
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((x) => <button key={x.id} type="button" className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>{x.label}</button>)}
      </div>

      {tab === 'equipos' && <TeamsSection t={t} reload={reload} />}
      {tab === 'calendario' && draft && <ScheduleSection t={t} onDone={(next) => { setData(next); setTab('partidos'); }} />}
      {tab === 'partidos' && !draft && <MatchesSection t={t} teams={teams} reload={reload} />}
      {tab === 'arbitros' && <RefereeSection t={t} />}
      {tab === 'ajustes' && <SettingsSection t={t} onSaved={setData} />}
    </div>
  );
}

// ---------- Equipos ----------

function TeamsSection({ t, reload }: { t: Tournament; reload: () => Promise<void> }) {
  const draft = t.status === 'DRAFT';
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const individual = t.sport.participantLabel !== 'Equipo';

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{t.teams.length} {individual ? 'participantes' : 'equipos'}</h2>
        {!draft && <span className="muted" style={{ fontSize: 13 }}>Con calendario no se agregan ni quitan participantes</span>}
      </div>
      {error && <p className="form-error" style={{ margin: '12px 20px' }}>{error}</p>}
      {t.teams.map((team) => (
        <div className="team-edit" key={team.id}>
          <div className="team-edit-row">
            <TeamBadge team={team} size={34} />
            <input className="input grow" defaultValue={team.name} aria-label="Nombre"
              onBlur={(e) => e.target.value.trim() && e.target.value !== team.name && act(() => api.updateTeam(team.id, { name: e.target.value, shortName: team.shortName, color: team.color }))} />
            <input className="input" style={{ width: 70 }} defaultValue={team.shortName} maxLength={4} aria-label="Abreviatura"
              onBlur={(e) => e.target.value !== team.shortName && act(() => api.updateTeam(team.id, { name: team.name, shortName: e.target.value, color: team.color }))} />
            <input type="color" defaultValue={team.color} aria-label="Color"
              onBlur={(e) => e.target.value.toUpperCase() !== team.color && act(() => api.updateTeam(team.id, { name: team.name, shortName: team.shortName, color: e.target.value }))} />
            {!individual && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(open === team.id ? null : team.id)}>
                {team.players.length} jugadores
              </button>
            )}
            {draft && <button type="button" className="btn btn-sm btn-danger icon-btn" title="Quitar" onClick={() => act(() => api.deleteTeam(team.id))}><Icon name="trash" size={16} /></button>}
          </div>
          {open === team.id && <PlayersEditor team={team} act={act} />}
        </div>
      ))}
      {draft && (
        <form className="inline-form" style={{ padding: '14px 20px 20px' }} onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) act(() => api.addTeam(t.id, { name })).then(() => setName(''));
        }}>
          <input className="input" placeholder={`Nuevo ${t.sport.participantLabel.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn"><Icon name="plus" size={16} />Agregar</button>
        </form>
      )}
    </section>
  );
}

function PlayersEditor({ team, act }: { team: Team; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  return (
    <div className="team-players">
      {team.players.map((p) => (
        <div className="player-line" key={p.id}>
          <span className="num">{p.number ?? '—'}</span>
          <span style={{ flex: 1 }}>{p.name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.deletePlayer(p.id))}>Quitar</button>
        </div>
      ))}
      <form className="inline-form" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        act(() => api.addPlayer(team.id, name, number ? Number(number) : null)).then(() => { setName(''); setNumber(''); });
      }}>
        <input className="input small" inputMode="numeric" placeholder="N.º" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        <input className="input" placeholder="Nombre del jugador" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn btn-secondary">Agregar</button>
      </form>
    </div>
  );
}

// ---------- Calendario ----------

function ScheduleSection({ t, onDone }: { t: Tournament; onDone: (t: Tournament) => void }) {
  const nextSaturday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return d.toISOString().slice(0, 10);
  }, []);
  const [startDate, setStartDate] = useState(t.startDate ?? nextSaturday);
  const [time, setTime] = useState('15:00');
  const [days, setDays] = useState(7);
  const [minutes, setMinutes] = useState(t.sport.scoring === 'SETS' ? 90 : 120);
  const [venues, setVenues] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await api.schedule(t.id, {
        startDate, firstMatchTime: time, daysBetweenRounds: days, minutesBetweenMatches: minutes,
        venues: venues.split(',').map((v) => v.trim()).filter(Boolean), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="card card-pad stack" onSubmit={submit}>
      <div>
        <h2 className="subtitle">Generar calendario</h2>
        <p className="muted">Se crean todos los partidos con fecha, hora y sede. Al generarlo, el torneo queda publicado.</p>
      </div>
      <div className="grid-2">
        <label className="field"><span>Primera jornada</span><input className="input" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="field"><span>Hora del primer partido</span><input className="input" type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field"><span>Días entre jornadas</span><input className="input" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <label className="field"><span>Minutos entre partidos</span><input className="input" type="number" min={30} max={600} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
      </div>
      <label className="field"><span>Canchas o sedes (separadas por coma)</span>
        <input className="input" value={venues} onChange={(e) => setVenues(e.target.value)} placeholder="Cancha 1, Cancha 2" />
        <small>Con varias sedes, los partidos de una jornada se juegan en paralelo.</small>
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-lg" disabled={busy}><Icon name="calendar" size={18} />{busy ? 'Generando…' : `Generar calendario para ${t.teams.length} participantes`}</button>
    </form>
  );
}

// ---------- Partidos ----------

function MatchesSection({ t, teams, reload }: { t: Tournament; teams: Map<number, Team>; reload: () => Promise<void> }) {
  const now = useNow(t.matches.some((m) => m.status === 'LIVE'));
  const [result, setResult] = useState<Match | null>(null);
  const [reschedule, setReschedule] = useState<Match | null>(null);
  const rounds = useMemo(() => {
    const map = new Map<string, Match[]>();
    [...t.matches].sort((a, b) => (a.stage === 'KNOCKOUT' ? 1 : 0) - (b.stage === 'KNOCKOUT' ? 1 : 0) || a.round - b.round)
      .forEach((m) => {
        const key = `${m.stage === 'KNOCKOUT' ? 'K' : 'L'}${m.round}`;
        map.set(key, [...(map.get(key) ?? []), m]);
      });
    return [...map.values()];
  }, [t.matches]);

  return (
    <div className="stack">
      {rounds.map((list) => (
        <section className="card" key={`${list[0].stage}-${list[0].round}`}>
          <div className="card-head"><h2>{list[0].roundLabel}</h2></div>
          {list.map((m) => (
            <div key={m.id}>
              <MatchRow match={m} teams={teams} sport={t.sport} now={now} showRound={!!m.group} />
              {!m.bye && m.homeId && m.awayId && (
                <div className="match-admin">
                  {m.status !== 'FINISHED' && <Link to={`/arbitro/partido/${m.id}`} className="btn btn-sm"><Icon name="whistle" size={15} />{m.status === 'LIVE' ? 'Seguir dirigiendo' : 'Dirigir en vivo'}</Link>}
                  {m.status !== 'LIVE' && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setResult(m)}>{m.status === 'FINISHED' ? 'Corregir resultado' : 'Cargar resultado'}</button>}
                  {m.status === 'SCHEDULED' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReschedule(m)}>Reprogramar</button>}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
      {result && <ResultSheet t={t} match={result} teams={teams} onClose={() => { setResult(null); reload(); }} />}
      {reschedule && <RescheduleSheet match={reschedule} onClose={() => { setReschedule(null); reload(); }} />}
    </div>
  );
}

function ResultSheet({ t, match, teams, onClose }: { t: Tournament; match: Match; teams: Map<number, Team>; onClose: () => void }) {
  const sets = t.sport.scoring === 'SETS';
  const maxSets = t.sport.setsToWin * 2 - 1;
  const [home, setHome] = useState(String(match.homeScore));
  const [away, setAway] = useState(String(match.awayScore));
  const [setRows, setSetRows] = useState(() => Array.from({ length: maxSets }, (_, i) => ({
    home: match.sets[i] ? String(match.sets[i].home) : '', away: match.sets[i] ? String(match.sets[i].away) : '',
  })));
  const [pens, setPens] = useState({ home: match.homePenalties?.toString() ?? '', away: match.awayPenalties?.toString() ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const h = teams.get(match.homeId!);
  const a = teams.get(match.awayId!);
  const needsPens = !sets && match.stage === 'KNOCKOUT' && t.sport.scoring === 'GOALS' && home !== '' && home === away;

  async function save() {
    setBusy(true);
    setError(null);
    const input: ResultInput = sets
      ? { homeScore: 0, awayScore: 0, sets: setRows.filter((r) => r.home !== '' && r.away !== '').map((r) => ({ home: Number(r.home), away: Number(r.away) })) }
      : { homeScore: Number(home), awayScore: Number(away), homePenalties: needsPens ? Number(pens.home) : null, awayPenalties: needsPens ? Number(pens.away) : null };
    try {
      await api.setResult(match.id, input);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 3);
  return (
    <Sheet title="Resultado" onClose={onClose}>
      {sets ? (
        <div className="sets-inputs">
          <span />
          <strong style={{ textAlign: 'center' }}>{h?.shortName}</strong>
          <strong style={{ textAlign: 'center' }}>{a?.shortName}</strong>
          {setRows.map((r, i) => (
            <SetRow key={i} index={i} row={r} onChange={(row) => setSetRows(setRows.map((x, j) => (j === i ? row : x)))} />
          ))}
        </div>
      ) : (
        <div className="grid-2">
          <label className="field"><span>{h?.name}</span><input className="input" inputMode="numeric" value={home} onChange={(e) => setHome(digits(e.target.value))} /></label>
          <label className="field"><span>{a?.name}</span><input className="input" inputMode="numeric" value={away} onChange={(e) => setAway(digits(e.target.value))} /></label>
        </div>
      )}
      {needsPens && (
        <div className="grid-2">
          <label className="field"><span>Penales {h?.shortName}</span><input className="input" inputMode="numeric" value={pens.home} onChange={(e) => setPens({ ...pens, home: digits(e.target.value) })} /></label>
          <label className="field"><span>Penales {a?.shortName}</span><input className="input" inputMode="numeric" value={pens.away} onChange={(e) => setPens({ ...pens, away: digits(e.target.value) })} /></label>
        </div>
      )}
      {sets && <p className="faint" style={{ fontSize: 13 }}>Llena solo los sets jugados. Gana quien llegue a {t.sport.setsToWin}.</p>}
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-lg btn-block" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar resultado'}</button>
    </Sheet>
  );
}

function SetRow({ index, row, onChange }: { index: number; row: { home: string; away: string }; onChange: (r: { home: string; away: string }) => void }) {
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 2);
  return (
    <>
      <span className="muted" style={{ fontSize: 14 }}>Set {index + 1}</span>
      <input className="input" inputMode="numeric" value={row.home} onChange={(e) => onChange({ ...row, home: digits(e.target.value) })} />
      <input className="input" inputMode="numeric" value={row.away} onChange={(e) => onChange({ ...row, away: digits(e.target.value) })} />
    </>
  );
}

function RescheduleSheet({ match, onClose }: { match: Match; onClose: () => void }) {
  const toLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [when, setWhen] = useState(toLocal(match.scheduledAt));
  const [venue, setVenue] = useState(match.venue ?? '');
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title="Reprogramar partido" onClose={onClose}>
      <label className="field"><span>Fecha y hora</span><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
      <label className="field"><span>Sede</span><input className="input" value={venue} maxLength={80} onChange={(e) => setVenue(e.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-lg btn-block" onClick={async () => {
        try {
          await api.scheduleMatch(match.id, when ? new Date(when).toISOString() : null, venue || null);
          onClose();
        } catch (e) {
          setError((e as Error).message);
        }
      }}>Guardar</button>
    </Sheet>
  );
}

// ---------- Árbitros ----------

function RefereeSection({ t }: { t: Tournament }) {
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${import.meta.env.BASE_URL}arbitro?t=${t.slug}`;

  return (
    <section className="card card-pad stack">
      <div>
        <h2 className="subtitle">Acceso para árbitros</h2>
        <p className="muted">Los árbitros no necesitan cuenta: entran con el código del torneo y un PIN de 6 dígitos. Solo pueden manejar partidos de este torneo.</p>
      </div>
      <div className="pin-box">
        <div>
          <p className="eyebrow">Código</p>
          <strong className="num">{t.slug}</strong>
        </div>
        <div>
          <p className="eyebrow">PIN</p>
          <span className="pin">{pin ?? (t.hasRefereePin ? '••••••' : '— — —')}</span>
        </div>
        <button type="button" className="btn" onClick={async () => {
          try {
            setPin((await api.refereePin(t.id)).pin);
          } catch (e) {
            setError((e as Error).message);
          }
        }}>{t.hasRefereePin || pin ? 'Generar nuevo PIN' : 'Generar PIN'}</button>
      </div>
      {pin && <p className="muted" style={{ fontSize: 14 }}>Guárdalo: por seguridad solo se muestra ahora. Generar uno nuevo invalida el anterior.</p>}
      {error && <p className="form-error">{error}</p>}
      <label className="field"><span>Enlace para compartir</span>
        <div className="share-line">
          <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-secondary" onClick={() => {
            navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
          }}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copiado' : 'Copiar'}</button>
        </div>
      </label>
    </section>
  );
}

// ---------- Ajustes ----------

function SettingsSection({ t, onSaved }: { t: Tournament; onSaved: (t: Tournament) => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(t.name);
  const [location, setLocation] = useState(t.location ?? '');
  const [description, setDescription] = useState(t.description ?? '');
  const [startDate, setStartDate] = useState(t.startDate ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="stack">
      <form className="card card-pad stack" onSubmit={async (e) => {
        e.preventDefault();
        try {
          onSaved(await api.updateTournament(t.id, { name, location, description, startDate: startDate || null }));
          setMsg({ ok: true, text: 'Cambios guardados' });
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        }
      }}>
        <h2 className="subtitle">Datos del torneo</h2>
        <label className="field"><span>Nombre</span><input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="grid-2">
          <label className="field"><span>Ciudad o sede</span><input className="input" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          <label className="field"><span>Fecha de inicio</span><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        </div>
        <label className="field"><span>Descripción</span><textarea className="textarea" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
        <button className="btn" style={{ alignSelf: 'flex-start' }}>Guardar cambios</button>
      </form>
      {!t.demo && (
        <section className="card card-pad stack danger-zone">
          <h2 className="subtitle">Eliminar torneo</h2>
          <p className="muted">Se borran equipos, partidos y resultados. No se puede deshacer.</p>
          <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={async () => {
            if (!window.confirm(`¿Eliminar "${t.name}" para siempre?`)) return;
            await api.deleteTournament(t.id);
            navigate('/panel', { replace: true });
          }}><Icon name="trash" size={16} />Eliminar torneo</button>
        </section>
      )}
    </div>
  );
}
