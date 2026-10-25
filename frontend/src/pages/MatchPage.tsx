import { Link, useParams } from 'react-router';
import type { MatchDetail, MatchEvent } from '../api/types';
import { Icon } from '../components/Icon';
import { Scoreboard } from '../components/Scoreboard';
import { useNow } from '../lib/clock';
import { useMatch } from '../live/useTournament';
import './match-page.css';

/** Ícono/color por tipo de evento en la línea de tiempo. */
function eventMark(e: MatchEvent) {
  switch (e.type) {
    case 'YELLOW_CARD': return <span className="ev-card yellow" />;
    case 'RED_CARD': return <span className="ev-card red" />;
    case 'SUSPENSION': return <span className="ev-tag">2'</span>;
    case 'FOUL': return <span className="ev-tag">F</span>;
    case 'POINT_1': return <span className="ev-pts">+1</span>;
    case 'POINT_2': return <span className="ev-pts">+2</span>;
    case 'POINT_3': return <span className="ev-pts">+3</span>;
    default: return <span className="ev-goal"><Icon name="FUTBOL" size={16} /></span>;
  }
}

function Timeline({ detail }: { detail: MatchDetail }) {
  const { events, home, sport } = detail;
  if (sport.scoring === 'SETS') return null;
  const shown = [...events].reverse().slice(0, 80);
  return (
    <section className="card">
      <div className="card-head"><h2>Minuto a minuto</h2><span className="muted">{events.length} acciones</span></div>
      {shown.length === 0 ? <p className="empty">Todavía no hay acciones registradas.</p> : (
        <ul className="timeline">
          {shown.map((e) => {
            const isHome = e.teamId === home?.id;
            return (
              <li key={e.id} className={isHome ? 'home' : 'away'}>
                <span className="ev-min num">{e.minute != null ? `${e.minute}'` : ''}</span>
                {eventMark(e)}
                <span className="ev-text">
                  <strong>{e.playerName ?? (isHome ? detail.home?.name : detail.away?.name)}</strong>
                  <small>{e.label}{e.playerName ? ` · ${isHome ? detail.home?.shortName : detail.away?.shortName}` : ''}</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function MatchPage() {
  const { slug, id } = useParams();
  const { data, error, loading } = useMatch(Number(id));
  const now = useNow(data?.match.status === 'LIVE');

  if (loading) return <div className="container page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !data) return <div className="container page"><div className="card empty"><h3>No encontramos el partido</h3><p>{error}</p></div></div>;

  return (
    <div className="container container-narrow page stack">
      <Link to={`/t/${slug ?? data.tournament.slug}`} className="back-link"><Icon name="back" size={18} />{data.tournament.name}</Link>
      <section className="card">
        <p className="mp-round">{data.match.group ? `Grupo ${data.match.group} · ` : ''}{data.match.roundLabel}{data.match.venue ? ` · ${data.match.venue}` : ''}</p>
        <Scoreboard detail={data} now={now} />
      </section>
      <Timeline detail={data} />
    </div>
  );
}
