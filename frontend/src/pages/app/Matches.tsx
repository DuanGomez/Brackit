import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { MatchLine } from '../../components/match';
import { useNow } from '../../lib/clock';
import { addDays, formatLongDate, dayKey, todayKey } from '../../lib/format';
import { useLoad, useOrgChanges } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

type Range = 'hoy' | 'proximos' | 'pasados';

export default function Matches() {
  const { org } = useOrg();
  const [params] = useSearchParams();
  const [range, setRange] = useState<Range>(params.get('sinArbitro') ? 'proximos' : 'hoy');
  const [status, setStatus] = useState('');
  const [tournament, setTournament] = useState('');
  const [noReferee, setNoReferee] = useState(!!params.get('sinArbitro'));
  const [query, setQuery] = useState('');
  const today = todayKey();
  const span = range === 'hoy' ? { from: today, to: today } : range === 'proximos' ? { from: today, to: addDays(today, 14) } : { from: addDays(today, -14), to: today };
  const { data, loading, error, reload } = useLoad(() => api.matches(org.slug, span), `m-${org.slug}-${range}`);
  useOrgChanges(org.slug, reload);
  const now = useNow(!!data?.some((m) => m.status === 'LIVE'));

  const tournaments = useMemo(() => [...new Map((data ?? []).map((m) => [m.tournamentId, m.tournamentName])).entries()], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((m) => !status || m.status === status)
      .filter((m) => !tournament || String(m.tournamentId) === tournament)
      .filter((m) => !noReferee || (m.status === 'SCHEDULED' && !m.refereeId))
      .filter((m) => !q || `${m.home?.name} ${m.away?.name} ${m.tournamentName} ${m.courtName ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (range === 'pasados' ? -1 : 1) * (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  }, [data, status, tournament, noReferee, query, range]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((m) => {
      const k = m.scheduledAt ? dayKey(m.scheduledAt) : 'sin-fecha';
      map.set(k, [...(map.get(k) ?? []), m]);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="page">
      <PageHeader title="Partidos" actions={
        <label className="search"><span className="visually-hidden">Buscar</span>
          <input placeholder="Buscar equipo, torneo o cancha" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="segmented" role="group" aria-label="Rango">
          {([['hoy', 'Hoy'], ['proximos', 'Próximos 14 días'], ['pasados', 'Últimos 14 días']] as [Range, string][]).map(([id, label]) => (
            <button key={id} type="button" className={range === id ? 'active' : ''} onClick={() => setRange(id)}>{label}</button>
          ))}
        </div>
        <select className="select" style={{ width: 'auto', height: 36 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option><option value="LIVE">En vivo</option><option value="SCHEDULED">Programados</option>
          <option value="FINISHED">Finalizados</option><option value="CANCELLED">Cancelados</option>
        </select>
        {tournaments.length > 1 && (
          <select className="select" style={{ width: 'auto', height: 36 }} value={tournament} onChange={(e) => setTournament(e.target.value)} aria-label="Torneo">
            <option value="">Todos los torneos</option>
            {tournaments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <button type="button" className={`check-chip ${noReferee ? 'active' : ''}`} style={{ height: 36 }} aria-pressed={noReferee} onClick={() => setNoReferee(!noReferee)}>Sin árbitro</button>
      </div>
      {loading ? <div className="skeleton" style={{ height: 300 }} /> : error ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div>
        : !byDay.length ? <div className="card empty"><h3>No hay partidos con esos filtros</h3></div>
        : byDay.map(([day, list]) => (
          <section key={day} className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head"><h3>{day === 'sin-fecha' ? 'Sin fecha' : formatLongDate(day)}</h3><span className="muted num">{list.length}</span></div>
            {list.map((m) => <MatchLine key={m.id} m={m} now={now} to={`/app/${org.slug}/partido/${m.id}`} showTournament
              action={m.status === 'SCHEDULED' ? <span className={m.refereeName ? 'muted' : 'chip chip-cancel'} style={{ fontSize: 12 }}>{m.refereeName ?? 'Sin árbitro'}</span> : undefined} />)}
          </section>
        ))}
    </div>
  );
}
