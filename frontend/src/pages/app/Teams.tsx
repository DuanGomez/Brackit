import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { Tournament } from '../../api/types';
import { TeamBadge } from '../../components/TeamBadge';
import { TeamEditor } from '../../components/TeamEditor';
import type { Team } from '../../api/types';
import { plural } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useLoad } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

/** Equipos y jugadores de todos los torneos activos, con las planillas incompletas a la vista. */
export default function Teams() {
  const { org, canManage } = useOrg();
  const [editing, setEditing] = useState<Team | null>(null);
  const { data, loading, error, reload } = useLoad(async () => {
    const cards = await api.tournaments(org.slug);
    return Promise.all(cards.filter((c) => c.status !== 'FINISHED').map((c) => api.tournament(org.slug, c.id)));
  }, `teams-${org.slug}`);
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).flatMap((t: Tournament) => t.teams.map((team) => ({ t, team, missing: team.players.filter((p) => !p.document).length })))
      .filter((r) => !onlyMissing || r.missing > 0)
      .filter((r) => !q || r.team.name.toLowerCase().includes(q) || r.team.players.some((p) => p.name.toLowerCase().includes(q)));
  }, [data, query, onlyMissing]);
  const totalPlayers = (data ?? []).reduce((n, t) => n + t.teams.reduce((k, team) => k + team.players.length, 0), 0);
  const totalMissing = (data ?? []).reduce((n, t) => n + t.teams.reduce((k, team) => k + team.players.filter((p) => !p.document).length, 0), 0);

  return (
    <div className="page">
      <PageHeader title="Equipos y jugadores" actions={
        <label className="search"><span className="visually-hidden">Buscar</span><input placeholder="Buscar equipo o jugador" value={query} onChange={(e) => setQuery(e.target.value)} /></label>}>
        {data && <p className="muted">{plural(rows.length, 'equipo', 'equipos')} · {plural(totalPlayers, 'jugador', 'jugadores')} en torneos activos{totalMissing ? ` · ${totalMissing} sin documento` : ''}</p>}
      </PageHeader>
      <div><button type="button" className={`check-chip ${onlyMissing ? 'active' : ''}`} aria-pressed={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>Solo planillas incompletas</button></div>
      {loading ? <div className="skeleton" style={{ height: 300 }} /> : error ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div>
        : !rows.length ? <div className="card empty"><h3>No hay equipos para mostrar</h3></div> : (
          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Equipo</th><th>Torneo</th><th>Jugadores</th><th>Planilla</th><th /></tr></thead>
                <tbody>
                  {rows.map(({ t, team, missing }) => (
                    <tr key={team.id}>
                      <td><span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}><TeamBadge team={team} size={28} />{team.name}</span></td>
                      <td className="muted">{t.name} · {SPORTS[t.sport.code].label}</td>
                      <td className="num">{team.players.length}</td>
                      <td>{missing ? <span className="chip chip-cancel">{missing} sin documento</span> : <span className="chip chip-done">Completa</span>}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {canManage && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(team)}>Personalizar</button>}{' '}
                        <Link to={`/app/${org.slug}/torneos/${t.id}?vista=equipos`} className="btn btn-ghost btn-sm">Plantilla</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      {editing && <TeamEditor org={org.slug} team={editing} onClose={() => setEditing(null)} onSaved={() => reload()} />}
    </div>
  );
}
