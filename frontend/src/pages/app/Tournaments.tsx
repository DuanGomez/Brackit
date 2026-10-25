import { Link } from 'react-router';
import { api } from '../../api/client';
import type { TournamentCard } from '../../api/types';
import { Icon } from '../../components/Icon';
import { whatsappLink } from '../../config';
import { FORMAT_LABEL, formatDateTime, plural } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useLoad, useOrgChanges } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

export function TournamentStatusChip({ t }: { t: Pick<TournamentCard, 'status' | 'liveCount'> }) {
  if (t.liveCount > 0) return <span className="chip chip-live"><span className="dot dot-live" />{plural(t.liveCount, 'partido en vivo', 'partidos en vivo')}</span>;
  if (t.status === 'FINISHED') return <span className="chip chip-done">Finalizado</span>;
  if (t.status === 'DRAFT') return <span className="chip chip-sched">Borrador</span>;
  return <span className="chip chip-primary">En curso</span>;
}

export function SportChip({ sport }: { sport: TournamentCard['sport'] }) {
  const s = SPORTS[sport];
  return <span className="sport-chip" style={{ background: `${s.color}22`, color: s.color }}><Icon name={sport} size={14} />{s.label}</span>;
}

export default function Tournaments() {
  const { org, canManage } = useOrg();
  const { data, loading, error, reload } = useLoad(() => api.tournaments(org.slug), `t-${org.slug}`);
  useOrgChanges(org.slug, reload);
  const base = `/app/${org.slug}`;
  const atLimit = org.limits.activeTournaments >= org.limits.maxActiveTournaments;

  return (
    <div className="page">
      <PageHeader title="Torneos" actions={canManage && (atLimit
        ? <a className="btn btn-whatsapp" href={whatsappLink(`Hola Duan, quiero pasar ${org.name} al plan Liga de Brackit para tener más torneos.`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />Mejorar plan</a>
        : <Link to={`${base}/torneos/nuevo`} className="btn"><Icon name="plus" size={16} strokeWidth={2.2} />Nuevo torneo</Link>)}>
        {atLimit && <p className="muted">Tu plan Gratis permite 1 torneo activo. Pásate al plan Liga para crear más.</p>}
      </PageHeader>
      {loading ? <div className="t-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 170 }} />)}</div>
        : error ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div>
        : !data?.length ? (
          <div className="card empty">
            <h3>Todavía no hay torneos</h3>
            <p>Crea el primero: eliges deporte, formato, canchas y equipos, y el calendario se arma solo.</p>
            {canManage && <Link to={`${base}/torneos/nuevo`} className="btn" style={{ marginTop: 16 }}>Crear torneo</Link>}
          </div>
        ) : (
          <div className="t-list">
            {data.map((t) => {
              const pct = t.matchesTotal ? Math.round((t.matchesPlayed / t.matchesTotal) * 100) : 0;
              return (
                <Link key={t.id} to={`${base}/torneos/${t.id}`} className="t-item">
                  <div className="t-meta"><SportChip sport={t.sport} /><TournamentStatusChip t={t} /></div>
                  <h3>{t.name}</h3>
                  <p className="muted" style={{ fontSize: 14 }}>{FORMAT_LABEL[t.format]}{t.category ? ` · ${t.category}` : ''} · {plural(t.teams, 'participante', 'participantes')}</p>
                  {t.status === 'FINISHED' && t.championName ? (
                    <p style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, color: '#D4A017' }}><Icon name="trophy" size={16} />Campeón: {t.championName}</p>
                  ) : t.status === 'DRAFT' ? (
                    <p className="muted" style={{ fontSize: 14 }}>Falta generar el calendario</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                      <span className="muted num" style={{ fontSize: 13 }}>{t.matchesPlayed} de {t.matchesTotal} partidos{t.nextMatchAt ? ` · próximo ${formatDateTime(t.nextMatchAt)}` : ''}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
